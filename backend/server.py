from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import uuid
import logging
import mimetypes
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
import qrcode
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ------------------- Setup -------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", str(ROOT_DIR / "storage")))
FILES_DIR = STORAGE_DIR / "files"
QR_DIR = STORAGE_DIR / "qr"
FILES_DIR.mkdir(parents=True, exist_ok=True)
QR_DIR.mkdir(parents=True, exist_ok=True)

PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "")
JWT_ALG = "HS256"
ACCESS_TOKEN_MIN = 60 * 24  # 1 day
ALLOWED_EXT = {"pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "zip", "mp4", "txt", "csv", "ppt", "pptx"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="QR File Management API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("qrapp")


# ------------------- Helpers -------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


async def log_activity(user_id: str, action: str, target: Optional[str] = None):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "target": target,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


# ------------------- Models -------------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    mobile: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserCreateIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["super_admin", "admin", "user"] = "user"
    mobile: Optional[str] = None

class FolderIn(BaseModel):
    folder_name: str
    parent_folder_id: Optional[str] = None

class FolderUpdateIn(BaseModel):
    folder_name: Optional[str] = None
    parent_folder_id: Optional[str] = None


# ------------------- Startup -------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.folders.create_index([("created_by", 1), ("parent_folder_id", 1)])
    await db.files.create_index([("folder_id", 1), ("uploaded_by", 1)])
    await db.qr_codes.create_index("qr_unique_code", unique=True)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@qrfile.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Super Admin",
            "email": admin_email,
            "mobile": None,
            "password_hash": hash_password(admin_password),
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info(f"Seeded super_admin {admin_email}")


# ------------------- Auth -------------------
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, secure=False, samesite="lax",
        max_age=ACCESS_TOKEN_MIN * 60, path="/",
    )

@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": email,
        "mobile": data.mobile,
        "password_hash": hash_password(data.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    await log_activity(user["id"], "register")
    return {"id": user["id"], "name": user["name"], "email": email, "role": user["role"], "token": token}


@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    await log_activity(user["id"], "login")
    return {"id": user["id"], "name": user["name"], "email": email, "role": user["role"], "token": token}


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    await log_activity(user["id"], "logout")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ------------------- Users (Super Admin) -------------------
@api.get("/users")
async def list_users(user: dict = Depends(require_role("super_admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api.post("/users")
async def create_user(data: UserCreateIn, _: dict = Depends(require_role("super_admin"))):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": email,
        "mobile": data.mobile,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    return {k: v for k, v in new_user.items() if k != "password_hash"}

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_role("super_admin"))):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ------------------- Folders -------------------
@api.post("/folder/create")
async def create_folder(data: FolderIn, user: dict = Depends(get_current_user)):
    folder = {
        "id": str(uuid.uuid4()),
        "folder_name": data.folder_name,
        "parent_folder_id": data.parent_folder_id,
        "created_by": user["id"],
        "created_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.folders.insert_one(folder)
    await log_activity(user["id"], "create_folder", folder["id"])
    folder.pop("_id", None)
    return folder

@api.get("/folder/list")
async def list_folders(parent_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {"parent_folder_id": parent_id}
    if user["role"] == "user":
        q["created_by"] = user["id"]
    folders = await db.folders.find(q, {"_id": 0}).sort("folder_name", 1).to_list(1000)
    return folders

@api.get("/folder/all")
async def all_folders(user: dict = Depends(get_current_user)):
    q: dict = {}
    if user["role"] == "user":
        q["created_by"] = user["id"]
    return await db.folders.find(q, {"_id": 0}).to_list(2000)

@api.get("/folder/{folder_id}/path")
async def folder_path(folder_id: str, user: dict = Depends(get_current_user)):
    chain = []
    current_id: Optional[str] = folder_id
    while current_id:
        f = await db.folders.find_one({"id": current_id}, {"_id": 0})
        if not f:
            break
        chain.append({"id": f["id"], "folder_name": f["folder_name"]})
        current_id = f.get("parent_folder_id")
    return list(reversed(chain))

@api.put("/folder/{folder_id}")
async def update_folder(folder_id: str, data: FolderUpdateIn, user: dict = Depends(get_current_user)):
    f = await db.folders.find_one({"id": folder_id})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] == "user" and f["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.folders.update_one({"id": folder_id}, {"$set": update})
    return {"ok": True}

@api.delete("/folder/{folder_id}")
async def delete_folder(folder_id: str, user: dict = Depends(get_current_user)):
    f = await db.folders.find_one({"id": folder_id})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] == "user" and f["created_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    # cascade delete children folders and files
    to_delete = [folder_id]
    stack = [folder_id]
    while stack:
        pid = stack.pop()
        async for child in db.folders.find({"parent_folder_id": pid}):
            to_delete.append(child["id"])
            stack.append(child["id"])
    await db.folders.delete_many({"id": {"$in": to_delete}})
    files = await db.files.find({"folder_id": {"$in": to_delete}}).to_list(10000)
    for fi in files:
        try:
            Path(fi["file_path"]).unlink(missing_ok=True)
        except Exception:
            pass
        await db.qr_codes.delete_many({"file_id": fi["id"]})
    await db.files.delete_many({"folder_id": {"$in": to_delete}})
    await log_activity(user["id"], "delete_folder", folder_id)
    return {"ok": True}


# ------------------- Files -------------------
def file_ext_ok(filename: str) -> bool:
    if "." not in filename:
        return False
    return filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


async def generate_qr_for_file(file_id: str, download_url: str) -> dict:
    qr_unique = str(uuid.uuid4())
    qr_path = QR_DIR / f"{file_id}.png"
    img = qrcode.make(download_url)
    img.save(qr_path)
    doc = {
        "id": str(uuid.uuid4()),
        "file_id": file_id,
        "qr_unique_code": qr_unique,
        "qr_image_path": str(qr_path),
        "download_url": download_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.qr_codes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/file/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    if not file.filename or not file_ext_ok(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")
    file_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[1].lower()
    safe_name = f"{file_id}.{ext}"
    file_path = FILES_DIR / safe_name
    file_path.write_bytes(contents)

    doc = {
        "id": file_id,
        "folder_id": folder_id,
        "file_name": file.filename,
        "file_path": str(file_path),
        "file_size": len(contents),
        "file_type": ext,
        "uploaded_by": user["id"],
        "uploaded_by_name": user["name"],
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.files.insert_one(doc)

    base = PUBLIC_BASE_URL or ""
    download_url = f"{base}/api/file/public/{file_id}"
    qr = await generate_qr_for_file(file_id, download_url)
    await log_activity(user["id"], "upload_file", file_id)
    doc.pop("_id", None)
    return {**doc, "qr": qr}


@api.get("/file/list")
async def list_files(folder_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q: dict = {"folder_id": folder_id}
    if user["role"] == "user":
        q["uploaded_by"] = user["id"]
    files = await db.files.find(q, {"_id": 0}).sort("uploaded_at", -1).to_list(2000)
    # attach qr
    ids = [f["id"] for f in files]
    qrs = await db.qr_codes.find({"file_id": {"$in": ids}}, {"_id": 0}).to_list(5000)
    qr_map = {q["file_id"]: q for q in qrs}
    for f in files:
        f["qr"] = qr_map.get(f["id"])
    return files

@api.get("/file/all")
async def all_files(user: dict = Depends(get_current_user)):
    q: dict = {}
    if user["role"] == "user":
        q["uploaded_by"] = user["id"]
    files = await db.files.find(q, {"_id": 0}).sort("uploaded_at", -1).limit(500).to_list(500)
    ids = [f["id"] for f in files]
    qrs = await db.qr_codes.find({"file_id": {"$in": ids}}, {"_id": 0}).to_list(2000)
    qr_map = {q["file_id"]: q for q in qrs}
    for f in files:
        f["qr"] = qr_map.get(f["id"])
    return files

@api.get("/file/{file_id}")
async def file_detail(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] == "user" and f["uploaded_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    qr = await db.qr_codes.find_one({"file_id": file_id}, {"_id": 0})
    f["qr"] = qr
    return f

@api.get("/file/download/{file_id}")
async def download_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] == "user" and f["uploaded_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.downloads.insert_one({
        "id": str(uuid.uuid4()),
        "file_id": file_id,
        "downloaded_by": user["id"],
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
    })
    await log_activity(user["id"], "download_file", file_id)
    mime, _ = mimetypes.guess_type(f["file_name"])
    return FileResponse(f["file_path"], filename=f["file_name"], media_type=mime or "application/octet-stream")

@api.get("/file/public/{file_id}")
async def public_download(file_id: str):
    f = await db.files.find_one({"id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    await db.downloads.insert_one({
        "id": str(uuid.uuid4()),
        "file_id": file_id,
        "downloaded_by": "qr_scan",
        "downloaded_at": datetime.now(timezone.utc).isoformat(),
    })
    mime, _ = mimetypes.guess_type(f["file_name"])
    return FileResponse(f["file_path"], filename=f["file_name"], media_type=mime or "application/octet-stream")

@api.delete("/file/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    if user["role"] == "user" and f["uploaded_by"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        Path(f["file_path"]).unlink(missing_ok=True)
    except Exception:
        pass
    await db.files.delete_one({"id": file_id})
    qrs = await db.qr_codes.find({"file_id": file_id}).to_list(10)
    for q in qrs:
        try:
            Path(q["qr_image_path"]).unlink(missing_ok=True)
        except Exception:
            pass
    await db.qr_codes.delete_many({"file_id": file_id})
    await log_activity(user["id"], "delete_file", file_id)
    return {"ok": True}


# ------------------- QR -------------------
@api.get("/qr/list")
async def qr_list(user: dict = Depends(get_current_user)):
    q_files: dict = {}
    if user["role"] == "user":
        q_files["uploaded_by"] = user["id"]
    files = await db.files.find(q_files, {"_id": 0}).to_list(2000)
    file_ids = [f["id"] for f in files]
    qrs = await db.qr_codes.find({"file_id": {"$in": file_ids}}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    file_map = {f["id"]: f for f in files}
    for q in qrs:
        q["file"] = file_map.get(q["file_id"])
    return qrs

@api.get("/qr/image/{file_id}")
async def qr_image(file_id: str):
    qr = await db.qr_codes.find_one({"file_id": file_id})
    if not qr:
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(qr["qr_image_path"], media_type="image/png")

@api.get("/qr/svg/{file_id}")
async def qr_svg(file_id: str):
    f = await db.files.find_one({"id": file_id})
    qr = await db.qr_codes.find_one({"file_id": file_id})
    if not f or not qr:
        raise HTTPException(status_code=404, detail="Not found")
    import qrcode.image.svg as qrsvg
    img = qrcode.make(qr["download_url"], image_factory=qrsvg.SvgImage)
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/svg+xml", headers={
        "Content-Disposition": f'attachment; filename="qr-{f["file_name"]}.svg"'
    })


# ------------------- Search -------------------
@api.get("/search")
async def search_all(
    q: str = Query(""),
    type: Optional[str] = Query(None, description="folders | files | qr"),
    file_type: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    base_user: dict = {}
    if user["role"] == "user":
        base_user["uploaded_by"] = user["id"]
    folder_user: dict = {}
    if user["role"] == "user":
        folder_user["created_by"] = user["id"]

    result: dict = {"folders": [], "files": []}
    regex = {"$regex": q, "$options": "i"} if q else None

    if type in (None, "folders"):
        fq = dict(folder_user)
        if regex:
            fq["folder_name"] = regex
        result["folders"] = await db.folders.find(fq, {"_id": 0}).limit(100).to_list(100)

    if type in (None, "files", "qr"):
        fq = dict(base_user)
        if regex:
            fq["file_name"] = regex
        if file_type:
            fq["file_type"] = file_type.lower()
        if user_id:
            fq["uploaded_by"] = user_id
        if date_from or date_to:
            rng: dict = {}
            if date_from:
                rng["$gte"] = date_from
            if date_to:
                rng["$lte"] = date_to
            fq["uploaded_at"] = rng
        files = await db.files.find(fq, {"_id": 0}).sort("uploaded_at", -1).limit(200).to_list(200)
        ids = [f["id"] for f in files]
        qrs = await db.qr_codes.find({"file_id": {"$in": ids}}, {"_id": 0}).to_list(500)
        qr_map = {q["file_id"]: q for q in qrs}
        for f in files:
            f["qr"] = qr_map.get(f["id"])
        result["files"] = files
    return result


# ------------------- Dashboard -------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_filter: dict = {}
    folder_filter: dict = {}
    if user["role"] == "user":
        user_filter = {"uploaded_by": user["id"]}
        folder_filter = {"created_by": user["id"]}

    total_users = await db.users.count_documents({}) if user["role"] in ("super_admin", "admin") else 1
    total_files = await db.files.count_documents(user_filter)
    total_folders = await db.folders.count_documents(folder_filter)
    total_qrs = await db.qr_codes.count_documents({})
    today_uploads = await db.files.count_documents({**user_filter, "uploaded_at": {"$regex": f"^{today_iso}"}})

    pipeline = [{"$match": user_filter}, {"$group": {"_id": None, "total": {"$sum": "$file_size"}}}]
    agg = await db.files.aggregate(pipeline).to_list(1)
    storage_bytes = agg[0]["total"] if agg else 0

    # 7-day trend
    trend = []
    today = datetime.now(timezone.utc).date()
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        prefix = day.strftime("%Y-%m-%d")
        c = await db.files.count_documents({**user_filter, "uploaded_at": {"$regex": f"^{prefix}"}})
        trend.append({"date": prefix, "uploads": c})

    return {
        "total_users": total_users,
        "total_files": total_files,
        "total_folders": total_folders,
        "total_qrs": total_qrs,
        "today_uploads": today_uploads,
        "storage_bytes": storage_bytes,
        "trend": trend,
    }


# ------------------- Activity Logs -------------------
@api.get("/logs")
async def logs(limit: int = 100, user: dict = Depends(require_role("super_admin", "admin"))):
    items = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    user_ids = list({i["user_id"] for i in items if i.get("user_id")})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(1000)
    umap = {u["id"]: u for u in users}
    for it in items:
        it["user"] = umap.get(it.get("user_id"))
    return items


# ------------------- QR Resolve (public) -------------------
@api.get("/qr/resolve/{file_id}")
async def qr_resolve(file_id: str):
    f = await db.files.find_one({"id": file_id}, {"_id": 0, "password_hash": 0})
    if not f:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "id": f["id"],
        "file_name": f["file_name"],
        "file_size": f["file_size"],
        "file_type": f["file_type"],
        "uploaded_at": f["uploaded_at"],
        "uploaded_by_name": f.get("uploaded_by_name"),
        "download_url": f"{PUBLIC_BASE_URL}/api/file/public/{f['id']}",
    }


@api.get("/")
async def root():
    return {"ok": True, "name": "QR File Management API"}


app.include_router(api)

@app.on_event("shutdown")
async def shutdown():
    client.close()
