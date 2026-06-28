"""
Property Tax Module — Maharashtra Municipal Council / Corporation.

Calculation (ALV / RV based, per MMC Act):
    ALV  = carpet_area_sqm × zone_base_rate × construction_factor × usage_factor × (1 - age_depreciation_pct/100)
    RV   = ALV × (1 - statutory_deduction_pct/100)        # statutory deduction (commonly 10%)
    TAX  = RV × (general + water + sewerage + education + tree) / 100

All endpoints mounted under /api/pt/.
"""

from datetime import datetime, timezone
from typing import Optional, List, Literal
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fy_label(year: int) -> str:
    return f"{year}-{(year + 1) % 100:02d}"


# ----------------------- Models -----------------------
class WardIn(BaseModel):
    ward_no: str
    ward_name: str
    zone_id: Optional[str] = None


class ZoneIn(BaseModel):
    zone_no: str
    zone_name: str
    base_rate: float = Field(ge=0, description="₹ per sqm per year (annual base letting value)")


class ConstructionTypeIn(BaseModel):
    name: str
    factor: float = Field(ge=0, description="Multiplier applied to ALV (RCC=1.0, Tin=0.6, etc.)")


class UsageTypeIn(BaseModel):
    name: str
    factor: float = Field(ge=0, description="Multiplier (Residential=1.0, Commercial=2.5, etc.)")


class AgeFactorIn(BaseModel):
    min_age: int = Field(ge=0)
    max_age: int = Field(ge=0)
    depreciation_pct: float = Field(ge=0, le=100)


class TaxRatesIn(BaseModel):
    general_tax_pct: float = 12.0
    water_tax_pct: float = 5.0
    sewerage_tax_pct: float = 3.0
    education_cess_pct: float = 2.0
    tree_cess_pct: float = 1.0
    statutory_deduction_pct: float = 10.0


class PropertyIn(BaseModel):
    model_config = ConfigDict(extra="allow")  # accept extended fields from the New Property Entry form

    property_no: str
    owner_name: str
    address: str
    mobile: Optional[str] = None
    ward_id: str
    zone_id: str
    construction_type_id: str
    usage_type_id: str
    carpet_area_sqm: float = Field(gt=0)
    year_built: int = Field(ge=1800)


class GenerateBulkIn(BaseModel):
    financial_year: int = Field(ge=2000, le=2100)
    ward_id: Optional[str] = None
    zone_id: Optional[str] = None
    due_date: Optional[str] = None


# ----------------------- Router factory -----------------------
def build_pt_router(db, get_current_user, require_role, log_activity) -> APIRouter:
    router = APIRouter(prefix="/api/pt", tags=["property-tax"])

    # ---------------- Seed defaults (idempotent) ----------------
    async def seed_defaults():
        if await db.pt_construction_types.count_documents({}) == 0:
            await db.pt_construction_types.insert_many([
                {"id": str(uuid.uuid4()), "name": "RCC",           "factor": 1.00, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Load Bearing",  "factor": 0.85, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Tin Shed",      "factor": 0.60, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Kuccha",        "factor": 0.40, "created_at": utcnow_iso()},
            ])
        if await db.pt_usage_types.count_documents({}) == 0:
            await db.pt_usage_types.insert_many([
                {"id": str(uuid.uuid4()), "name": "Residential", "factor": 1.0, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Commercial",  "factor": 2.5, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Industrial",  "factor": 3.0, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Mixed",       "factor": 1.5, "created_at": utcnow_iso()},
            ])
        if await db.pt_age_factors.count_documents({}) == 0:
            await db.pt_age_factors.insert_many([
                {"id": str(uuid.uuid4()), "min_age": 0,  "max_age": 10, "depreciation_pct": 0.0,  "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "min_age": 11, "max_age": 20, "depreciation_pct": 10.0, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "min_age": 21, "max_age": 40, "depreciation_pct": 25.0, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "min_age": 41, "max_age": 999, "depreciation_pct": 40.0, "created_at": utcnow_iso()},
            ])
        if await db.pt_tax_rates.count_documents({}) == 0:
            await db.pt_tax_rates.insert_one({
                "id": "global",
                "general_tax_pct": 12.0, "water_tax_pct": 5.0, "sewerage_tax_pct": 3.0,
                "education_cess_pct": 2.0, "tree_cess_pct": 1.0, "statutory_deduction_pct": 10.0,
                "updated_at": utcnow_iso(),
            })

    # ---------------- Helpers ----------------
    async def get_or_404(collection, doc_id: str, label: str) -> dict:
        d = await collection.find_one({"id": doc_id}, {"_id": 0})
        if not d:
            raise HTTPException(status_code=404, detail=f"{label} not found")
        return d

    async def get_age_factor(years: int) -> float:
        slab = await db.pt_age_factors.find_one(
            {"min_age": {"$lte": years}, "max_age": {"$gte": years}}, {"_id": 0}
        )
        return float(slab["depreciation_pct"]) if slab else 0.0

    async def get_tax_rates() -> dict:
        r = await db.pt_tax_rates.find_one({"id": "global"}, {"_id": 0})
        if not r:
            await seed_defaults()
            r = await db.pt_tax_rates.find_one({"id": "global"}, {"_id": 0})
        return r

    async def compute_tax(prop: dict) -> dict:
        zone = await get_or_404(db.pt_zones, prop["zone_id"], "Zone")
        ctype = await get_or_404(db.pt_construction_types, prop["construction_type_id"], "Construction type")
        usage = await get_or_404(db.pt_usage_types, prop["usage_type_id"], "Usage type")
        rates = await get_tax_rates()
        years_old = max(0, datetime.now(timezone.utc).year - int(prop["year_built"]))
        dep_pct = await get_age_factor(years_old)

        base_alv = float(prop["carpet_area_sqm"]) * float(zone["base_rate"]) * float(ctype["factor"]) * float(usage["factor"])
        alv = base_alv * (1 - dep_pct / 100.0)
        rv = alv * (1 - float(rates["statutory_deduction_pct"]) / 100.0)
        general = rv * rates["general_tax_pct"] / 100.0
        water = rv * rates["water_tax_pct"] / 100.0
        sewerage = rv * rates["sewerage_tax_pct"] / 100.0
        education = rv * rates["education_cess_pct"] / 100.0
        tree = rv * rates["tree_cess_pct"] / 100.0
        total = general + water + sewerage + education + tree

        return {
            "years_old": years_old,
            "depreciation_pct": round(dep_pct, 2),
            "base_alv": round(base_alv, 2),
            "alv": round(alv, 2),
            "rv": round(rv, 2),
            "breakup": {
                "general_tax": round(general, 2),
                "water_tax": round(water, 2),
                "sewerage_tax": round(sewerage, 2),
                "education_cess": round(education, 2),
                "tree_cess": round(tree, 2),
            },
            "total_tax": round(total, 2),
            "rates_snapshot": {k: rates[k] for k in (
                "general_tax_pct", "water_tax_pct", "sewerage_tax_pct",
                "education_cess_pct", "tree_cess_pct", "statutory_deduction_pct",
            )},
            "factors_snapshot": {
                "zone": zone["zone_name"], "zone_base_rate": zone["base_rate"],
                "construction_type": ctype["name"], "construction_factor": ctype["factor"],
                "usage_type": usage["name"], "usage_factor": usage["factor"],
            },
        }

    # ---------------- Seed endpoint ----------------
    @router.post("/seed")
    async def seed(_: dict = Depends(require_role("super_admin", "admin"))):
        await seed_defaults()
        return {"ok": True}

    # ---------------- Wards ----------------
    @router.get("/wards")
    async def wards_list(_: dict = Depends(get_current_user)):
        return await db.pt_wards.find({}, {"_id": 0}).sort("ward_no", 1).to_list(1000)

    @router.post("/wards")
    async def wards_create(data: WardIn, _: dict = Depends(require_role("super_admin", "admin"))):
        if await db.pt_wards.find_one({"ward_no": data.ward_no}):
            raise HTTPException(status_code=409, detail="Ward number already exists")
        doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": utcnow_iso()}
        await db.pt_wards.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/wards/{id}")
    async def wards_update(id: str, data: WardIn, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_wards.update_one({"id": id}, {"$set": data.model_dump()})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Ward not found")
        return {"ok": True}

    @router.delete("/wards/{id}")
    async def wards_delete(id: str, _: dict = Depends(require_role("super_admin", "admin"))):
        if await db.pt_properties.count_documents({"ward_id": id}) > 0:
            raise HTTPException(status_code=400, detail="Cannot delete: ward has properties")
        r = await db.pt_wards.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Ward not found")
        return {"ok": True}

    # ---------------- Zones ----------------
    @router.get("/zones")
    async def zones_list(_: dict = Depends(get_current_user)):
        return await db.pt_zones.find({}, {"_id": 0}).sort("zone_no", 1).to_list(1000)

    @router.post("/zones")
    async def zones_create(data: ZoneIn, _: dict = Depends(require_role("super_admin", "admin"))):
        if await db.pt_zones.find_one({"zone_no": data.zone_no}):
            raise HTTPException(status_code=409, detail="Zone number already exists")
        doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": utcnow_iso()}
        await db.pt_zones.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/zones/{id}")
    async def zones_update(id: str, data: ZoneIn, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_zones.update_one({"id": id}, {"$set": data.model_dump()})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        return {"ok": True}

    @router.delete("/zones/{id}")
    async def zones_delete(id: str, _: dict = Depends(require_role("super_admin", "admin"))):
        if await db.pt_properties.count_documents({"zone_id": id}) > 0:
            raise HTTPException(status_code=400, detail="Cannot delete: zone has properties")
        r = await db.pt_zones.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Zone not found")
        return {"ok": True}

    # ---------------- Construction Types ----------------
    @router.get("/construction-types")
    async def ct_list(_: dict = Depends(get_current_user)):
        return await db.pt_construction_types.find({}, {"_id": 0}).sort("name", 1).to_list(1000)

    @router.post("/construction-types")
    async def ct_create(data: ConstructionTypeIn, _: dict = Depends(require_role("super_admin", "admin"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": utcnow_iso()}
        await db.pt_construction_types.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/construction-types/{id}")
    async def ct_update(id: str, data: ConstructionTypeIn, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_construction_types.update_one({"id": id}, {"$set": data.model_dump()})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}

    @router.delete("/construction-types/{id}")
    async def ct_delete(id: str, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_construction_types.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}

    # ---------------- Usage Types ----------------
    @router.get("/usage-types")
    async def ut_list(_: dict = Depends(get_current_user)):
        return await db.pt_usage_types.find({}, {"_id": 0}).sort("name", 1).to_list(1000)

    @router.post("/usage-types")
    async def ut_create(data: UsageTypeIn, _: dict = Depends(require_role("super_admin", "admin"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": utcnow_iso()}
        await db.pt_usage_types.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/usage-types/{id}")
    async def ut_update(id: str, data: UsageTypeIn, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_usage_types.update_one({"id": id}, {"$set": data.model_dump()})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}

    @router.delete("/usage-types/{id}")
    async def ut_delete(id: str, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_usage_types.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}

    # ---------------- Age Factors ----------------
    @router.get("/age-factors")
    async def age_list(_: dict = Depends(get_current_user)):
        return await db.pt_age_factors.find({}, {"_id": 0}).sort("min_age", 1).to_list(1000)

    @router.post("/age-factors")
    async def age_create(data: AgeFactorIn, _: dict = Depends(require_role("super_admin", "admin"))):
        if data.min_age > data.max_age:
            raise HTTPException(status_code=400, detail="min_age must be ≤ max_age")
        doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": utcnow_iso()}
        await db.pt_age_factors.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.put("/age-factors/{id}")
    async def age_update(id: str, data: AgeFactorIn, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_age_factors.update_one({"id": id}, {"$set": data.model_dump()})
        if r.matched_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}

    @router.delete("/age-factors/{id}")
    async def age_delete(id: str, _: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_age_factors.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Not found")
        return {"ok": True}

    # ---------------- Tax Rates ----------------
    @router.get("/tax-rates")
    async def rates_get(_: dict = Depends(get_current_user)):
        return await get_tax_rates()

    @router.put("/tax-rates")
    async def rates_update(data: TaxRatesIn, _: dict = Depends(require_role("super_admin", "admin"))):
        await db.pt_tax_rates.update_one(
            {"id": "global"},
            {"$set": {**data.model_dump(), "updated_at": utcnow_iso()}},
            upsert=True,
        )
        return {"ok": True}

    # ---------------- Properties ----------------
    @router.get("/properties")
    async def prop_list(ward_id: Optional[str] = None, zone_id: Optional[str] = None, q: Optional[str] = None,
                        _: dict = Depends(get_current_user)):
        flt: dict = {}
        if ward_id: flt["ward_id"] = ward_id
        if zone_id: flt["zone_id"] = zone_id
        if q:
            flt["$or"] = [
                {"property_no": {"$regex": q, "$options": "i"}},
                {"owner_name": {"$regex": q, "$options": "i"}},
                {"address": {"$regex": q, "$options": "i"}},
            ]
        return await db.pt_properties.find(flt, {"_id": 0}).sort("property_no", 1).limit(500).to_list(500)

    @router.get("/properties/{id}")
    async def prop_get(id: str, _: dict = Depends(get_current_user)):
        return await get_or_404(db.pt_properties, id, "Property")

    @router.post("/properties")
    async def prop_create(data: PropertyIn, user: dict = Depends(get_current_user)):
        if await db.pt_properties.find_one({"property_no": data.property_no}):
            raise HTTPException(status_code=409, detail="Property number already exists")
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "created_by": user["id"], "created_by_name": user["name"],
               "created_at": utcnow_iso()}
        calc = await compute_tax(doc)
        doc["computed"] = calc
        await db.pt_properties.insert_one(doc)
        await log_activity(user["id"], "pt_property_create", doc["id"])
        doc.pop("_id", None)
        return doc

    @router.put("/properties/{id}")
    async def prop_update(id: str, data: PropertyIn, user: dict = Depends(get_current_user)):
        existing = await get_or_404(db.pt_properties, id, "Property")
        if data.property_no != existing["property_no"]:
            if await db.pt_properties.find_one({"property_no": data.property_no}):
                raise HTTPException(status_code=409, detail="Property number already exists")
        merged = {**existing, **data.model_dump()}
        merged["computed"] = await compute_tax(merged)
        merged.pop("_id", None)
        await db.pt_properties.update_one({"id": id}, {"$set": merged})
        await log_activity(user["id"], "pt_property_update", id)
        return merged

    @router.delete("/properties/{id}")
    async def prop_delete(id: str, user: dict = Depends(require_role("super_admin", "admin"))):
        if await db.pt_bills.count_documents({"property_id": id}) > 0:
            raise HTTPException(status_code=400, detail="Cannot delete: bills exist for this property")
        r = await db.pt_properties.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Property not found")
        await db.pt_notices.delete_many({"property_id": id})
        await log_activity(user["id"], "pt_property_delete", id)
        return {"ok": True}

    @router.post("/properties/preview")
    async def prop_preview(data: PropertyIn, _: dict = Depends(get_current_user)):
        return await compute_tax(data.model_dump())

    @router.post("/properties/{id}/recompute")
    async def prop_recompute(id: str, _: dict = Depends(get_current_user)):
        prop = await get_or_404(db.pt_properties, id, "Property")
        calc = await compute_tax(prop)
        await db.pt_properties.update_one({"id": id}, {"$set": {"computed": calc}})
        return calc

    # ---------------- Notices ----------------
    async def _next_seq(name: str) -> int:
        r = await db.pt_counters.find_one_and_update(
            {"_id": name}, {"$inc": {"seq": 1}}, upsert=True, return_document=True,
        )
        return r["seq"] if r else 1

    @router.get("/notices")
    async def notices_list(_: dict = Depends(get_current_user)):
        items = await db.pt_notices.find({}, {"_id": 0}).sort("generated_at", -1).limit(500).to_list(500)
        prop_ids = [n["property_id"] for n in items]
        props = await db.pt_properties.find({"id": {"$in": prop_ids}}, {"_id": 0}).to_list(1000)
        pmap = {p["id"]: p for p in props}
        for n in items:
            n["property"] = pmap.get(n["property_id"])
        return items

    @router.get("/notices/{id}")
    async def notice_get(id: str, _: dict = Depends(get_current_user)):
        n = await get_or_404(db.pt_notices, id, "Notice")
        n["property"] = await db.pt_properties.find_one({"id": n["property_id"]}, {"_id": 0})
        return n

    @router.post("/notices/generate/{property_id}")
    async def notice_generate(property_id: str, financial_year: int, user: dict = Depends(get_current_user)):
        prop = await get_or_404(db.pt_properties, property_id, "Property")
        calc = await compute_tax(prop)
        seq = await _next_seq(f"notice_{financial_year}")
        notice = {
            "id": str(uuid.uuid4()),
            "notice_no": f"SN/{financial_year}/{seq:06d}",
            "property_id": property_id,
            "financial_year": financial_year,
            "fy_label": fy_label(financial_year),
            "computed": calc,
            "status": "issued",
            "generated_by": user["id"],
            "generated_at": utcnow_iso(),
        }
        await db.pt_notices.insert_one(notice)
        await log_activity(user["id"], "pt_notice_generate", notice["id"])
        notice.pop("_id", None)
        notice["property"] = prop
        return notice

    @router.post("/notices/generate-bulk")
    async def notice_generate_bulk(data: GenerateBulkIn, user: dict = Depends(require_role("super_admin", "admin"))):
        flt: dict = {}
        if data.ward_id: flt["ward_id"] = data.ward_id
        if data.zone_id: flt["zone_id"] = data.zone_id
        props = await db.pt_properties.find(flt, {"_id": 0}).to_list(5000)
        created = 0
        for prop in props:
            calc = await compute_tax(prop)
            seq = await _next_seq(f"notice_{data.financial_year}")
            await db.pt_notices.insert_one({
                "id": str(uuid.uuid4()),
                "notice_no": f"SN/{data.financial_year}/{seq:06d}",
                "property_id": prop["id"],
                "financial_year": data.financial_year,
                "fy_label": fy_label(data.financial_year),
                "computed": calc,
                "status": "issued",
                "generated_by": user["id"],
                "generated_at": utcnow_iso(),
            })
            created += 1
        await log_activity(user["id"], "pt_notice_bulk", f"count={created}")
        return {"created": created}

    # ---------------- Bills ----------------
    @router.get("/bills")
    async def bills_list(status: Optional[str] = None, financial_year: Optional[int] = None,
                         _: dict = Depends(get_current_user)):
        flt: dict = {}
        if status: flt["status"] = status
        if financial_year: flt["financial_year"] = financial_year
        items = await db.pt_bills.find(flt, {"_id": 0}).sort("generated_at", -1).limit(500).to_list(500)
        prop_ids = [b["property_id"] for b in items]
        props = await db.pt_properties.find({"id": {"$in": prop_ids}}, {"_id": 0}).to_list(2000)
        pmap = {p["id"]: p for p in props}
        for b in items:
            b["property"] = pmap.get(b["property_id"])
        return items

    @router.get("/bills/{id}")
    async def bill_get(id: str, _: dict = Depends(get_current_user)):
        b = await get_or_404(db.pt_bills, id, "Bill")
        b["property"] = await db.pt_properties.find_one({"id": b["property_id"]}, {"_id": 0})
        return b

    @router.post("/bills/generate/{property_id}")
    async def bill_generate(property_id: str, financial_year: int, due_date: Optional[str] = None,
                            user: dict = Depends(get_current_user)):
        prop = await get_or_404(db.pt_properties, property_id, "Property")
        existing = await db.pt_bills.find_one({"property_id": property_id, "financial_year": financial_year, "status": {"$ne": "cancelled"}})
        if existing:
            raise HTTPException(status_code=409, detail=f"Bill already exists for FY {fy_label(financial_year)}")
        calc = await compute_tax(prop)
        seq = await _next_seq(f"bill_{financial_year}")
        bill = {
            "id": str(uuid.uuid4()),
            "bill_no": f"PT/{financial_year}/{seq:06d}",
            "property_id": property_id,
            "financial_year": financial_year,
            "fy_label": fy_label(financial_year),
            "computed": calc,
            "tax_amount": calc["total_tax"],
            "amount_paid": 0.0,
            "due_date": due_date,
            "status": "unpaid",
            "generated_by": user["id"],
            "generated_at": utcnow_iso(),
        }
        await db.pt_bills.insert_one(bill)
        await log_activity(user["id"], "pt_bill_generate", bill["id"])
        bill.pop("_id", None)
        bill["property"] = prop
        return bill

    @router.post("/bills/generate-bulk")
    async def bill_generate_bulk(data: GenerateBulkIn, user: dict = Depends(require_role("super_admin", "admin"))):
        flt: dict = {}
        if data.ward_id: flt["ward_id"] = data.ward_id
        if data.zone_id: flt["zone_id"] = data.zone_id
        props = await db.pt_properties.find(flt, {"_id": 0}).to_list(5000)
        created, skipped = 0, 0
        for prop in props:
            existing = await db.pt_bills.find_one({
                "property_id": prop["id"], "financial_year": data.financial_year, "status": {"$ne": "cancelled"},
            })
            if existing:
                skipped += 1
                continue
            calc = await compute_tax(prop)
            seq = await _next_seq(f"bill_{data.financial_year}")
            await db.pt_bills.insert_one({
                "id": str(uuid.uuid4()),
                "bill_no": f"PT/{data.financial_year}/{seq:06d}",
                "property_id": prop["id"],
                "financial_year": data.financial_year,
                "fy_label": fy_label(data.financial_year),
                "computed": calc,
                "tax_amount": calc["total_tax"],
                "amount_paid": 0.0,
                "due_date": data.due_date,
                "status": "unpaid",
                "generated_by": user["id"],
                "generated_at": utcnow_iso(),
            })
            created += 1
        await log_activity(user["id"], "pt_bill_bulk", f"created={created} skipped={skipped}")
        return {"created": created, "skipped": skipped, "total": len(props)}

    @router.post("/bills/{id}/pay")
    async def bill_mark_paid(id: str, user: dict = Depends(require_role("super_admin", "admin"))):
        b = await get_or_404(db.pt_bills, id, "Bill")
        await db.pt_bills.update_one({"id": id}, {"$set": {
            "status": "paid", "amount_paid": b["tax_amount"], "paid_at": utcnow_iso(), "paid_by": user["id"],
        }})
        await log_activity(user["id"], "pt_bill_pay", id)
        return {"ok": True}

    @router.delete("/bills/{id}")
    async def bill_delete(id: str, user: dict = Depends(require_role("super_admin", "admin"))):
        b = await get_or_404(db.pt_bills, id, "Bill")
        if b["status"] == "paid":
            raise HTTPException(status_code=400, detail="Cannot delete a paid bill — use cancel instead")
        await db.pt_bills.delete_one({"id": id})
        await log_activity(user["id"], "pt_bill_delete", id)
        return {"ok": True}

    @router.post("/bills/{id}/cancel")
    async def bill_cancel(id: str, user: dict = Depends(require_role("super_admin", "admin"))):
        await get_or_404(db.pt_bills, id, "Bill")
        await db.pt_bills.update_one({"id": id}, {"$set": {"status": "cancelled", "cancelled_at": utcnow_iso(), "cancelled_by": user["id"]}})
        await log_activity(user["id"], "pt_bill_cancel", id)
        return {"ok": True}

    # ---------------- Reports ----------------
    @router.get("/reports/demand")
    async def report_demand(financial_year: Optional[int] = None, ward_id: Optional[str] = None, zone_id: Optional[str] = None,
                            _: dict = Depends(get_current_user)):
        flt: dict = {}
        if financial_year: flt["financial_year"] = financial_year
        bills = await db.pt_bills.find(flt, {"_id": 0}).to_list(20000)
        prop_ids = [b["property_id"] for b in bills]
        props = await db.pt_properties.find({"id": {"$in": prop_ids}}, {"_id": 0}).to_list(20000)
        pmap = {p["id"]: p for p in props}
        if ward_id:
            bills = [b for b in bills if pmap.get(b["property_id"], {}).get("ward_id") == ward_id]
        if zone_id:
            bills = [b for b in bills if pmap.get(b["property_id"], {}).get("zone_id") == zone_id]
        for b in bills:
            b["property"] = pmap.get(b["property_id"])
        total_demand = sum(b["tax_amount"] for b in bills)
        total_collected = sum(b.get("amount_paid", 0) for b in bills if b["status"] == "paid")
        return {
            "count": len(bills),
            "total_demand": round(total_demand, 2),
            "total_collected": round(total_collected, 2),
            "total_outstanding": round(total_demand - total_collected, 2),
            "rows": bills,
        }

    @router.get("/reports/collection")
    async def report_collection(financial_year: Optional[int] = None, _: dict = Depends(get_current_user)):
        flt: dict = {"status": "paid"}
        if financial_year: flt["financial_year"] = financial_year
        bills = await db.pt_bills.find(flt, {"_id": 0}).sort("paid_at", -1).to_list(20000)
        prop_ids = [b["property_id"] for b in bills]
        props = await db.pt_properties.find({"id": {"$in": prop_ids}}, {"_id": 0}).to_list(20000)
        pmap = {p["id"]: p for p in props}
        for b in bills:
            b["property"] = pmap.get(b["property_id"])
        total = sum(b.get("amount_paid", 0) for b in bills)
        return {"count": len(bills), "total_collected": round(total, 2), "rows": bills}

    @router.get("/reports/defaulters")
    async def report_defaulters(_: dict = Depends(get_current_user)):
        bills = await db.pt_bills.find({"status": "unpaid"}, {"_id": 0}).sort("generated_at", 1).to_list(20000)
        prop_ids = [b["property_id"] for b in bills]
        props = await db.pt_properties.find({"id": {"$in": prop_ids}}, {"_id": 0}).to_list(20000)
        pmap = {p["id"]: p for p in props}
        for b in bills:
            b["property"] = pmap.get(b["property_id"])
        total = sum(b["tax_amount"] for b in bills)
        return {"count": len(bills), "total_outstanding": round(total, 2), "rows": bills}

    # =====================================================================
    # ARREARS — Past-dues entry for newly added properties
    # =====================================================================
    ARREARS_LINES = [
        ("general_tax",                 "General Tax"),
        ("education_cess_tax",          "Education Cess Tax"),
        ("tree_tax",                    "Tree Tax"),
        ("employment_guarantee_cess",   "Employment Guarantee Cess"),
        ("solid_waste_management_fee",  "Solid Waste Management Fee"),
        ("other",                       "Other"),
        ("user_charges",                "User Charges"),
        ("drainage_tax",                "Drainage Tax"),
        ("fire_tax",                    "Fire Tax"),
        ("interest_on_arrears",         "Interest on Arrears Bill"),
    ]
    ARREARS_KEYS = [k for k, _ in ARREARS_LINES]

    @router.get("/arrears/schema")
    async def arrears_schema(_: dict = Depends(get_current_user)):
        # Returns the canonical line-items (id + label) so the UI can render the same table without hardcoding.
        return [{"key": k, "label": label} for k, label in ARREARS_LINES]

    @router.get("/property-lookup")
    async def property_lookup(
        search_type: str = "property_no",
        value: str = "",
        _: dict = Depends(get_current_user),
    ):
        # search_type: property_no | property_old_no | manual_property_no
        if not value:
            raise HTTPException(status_code=400, detail="value required")
        field = {
            "property_no": "property_no",
            "property_old_no": "property_old_no",
            "manual_property_no": "manual_property_no",
        }.get(search_type)
        if not field:
            raise HTTPException(status_code=400, detail="Invalid search_type")
        prop = await db.pt_properties.find_one({field: value}, {"_id": 0})
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        return prop

    def _arrears_total(doc: dict) -> float:
        return round(sum(float(doc.get(k) or 0) for k in ARREARS_KEYS), 2)

    @router.get("/arrears")
    async def arrears_list(
        property_id: Optional[str] = None,
        bill_year: Optional[str] = None,
        _: dict = Depends(get_current_user),
    ):
        flt: dict = {}
        if property_id:
            flt["property_id"] = property_id
        if bill_year:
            flt["bill_year"] = bill_year
        items = await db.pt_arrears.find(flt, {"_id": 0}).sort("created_at", -1).limit(2000).to_list(2000)
        pids = [x["property_id"] for x in items]
        props = await db.pt_properties.find({"id": {"$in": pids}}, {"_id": 0}).to_list(5000)
        pmap = {p["id"]: p for p in props}
        for it in items:
            it["property"] = pmap.get(it["property_id"])
        return items

    @router.get("/arrears/{id}")
    async def arrears_get(id: str, _: dict = Depends(get_current_user)):
        a = await db.pt_arrears.find_one({"id": id}, {"_id": 0})
        if not a:
            raise HTTPException(status_code=404, detail="Arrears entry not found")
        a["property"] = await db.pt_properties.find_one({"id": a["property_id"]}, {"_id": 0})
        return a

    @router.post("/arrears")
    async def arrears_create(data: dict, user: dict = Depends(get_current_user)):
        if not data.get("property_id"):
            raise HTTPException(status_code=400, detail="property_id required")
        if not data.get("bill_no"):
            raise HTTPException(status_code=400, detail="bill_no required")
        if await db.pt_arrears.find_one({"bill_no": data["bill_no"]}):
            raise HTTPException(status_code=409, detail="Bill No already exists for arrears")
        prop = await db.pt_properties.find_one({"id": data["property_id"]}, {"_id": 0})
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        doc = {
            "id": str(uuid.uuid4()),
            "property_id": prop["id"],
            "bill_no": data["bill_no"],
            "bill_year": data.get("bill_year") or "",
            "bill_date": data.get("bill_date") or "",
            "due_date": data.get("due_date") or "",
            "remarks": data.get("remarks") or "",
            "created_by": user["id"],
            "created_at": utcnow_iso(),
        }
        for k in ARREARS_KEYS:
            doc[k] = round(float(data.get(k) or 0), 2)
        doc["total_amount"] = _arrears_total(doc)
        await db.pt_arrears.insert_one(doc)
        await log_activity(user["id"], "pt_arrears_create", doc["id"])
        doc.pop("_id", None)
        doc["property"] = prop
        return doc

    @router.put("/arrears/{id}")
    async def arrears_update(id: str, data: dict, user: dict = Depends(get_current_user)):
        existing = await db.pt_arrears.find_one({"id": id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Arrears entry not found")
        if data.get("bill_no") and data["bill_no"] != existing["bill_no"]:
            if await db.pt_arrears.find_one({"bill_no": data["bill_no"]}):
                raise HTTPException(status_code=409, detail="Bill No already exists")
        patch = {
            "bill_no": data.get("bill_no", existing["bill_no"]),
            "bill_year": data.get("bill_year", existing.get("bill_year", "")),
            "bill_date": data.get("bill_date", existing.get("bill_date", "")),
            "due_date": data.get("due_date", existing.get("due_date", "")),
            "remarks": data.get("remarks", existing.get("remarks", "")),
            "updated_by": user["id"],
            "updated_at": utcnow_iso(),
        }
        for k in ARREARS_KEYS:
            patch[k] = round(float(data.get(k) if data.get(k) is not None else existing.get(k, 0)), 2)
        merged = {**existing, **patch}
        merged["total_amount"] = _arrears_total(merged)
        await db.pt_arrears.update_one({"id": id}, {"$set": {**patch, "total_amount": merged["total_amount"]}})
        await log_activity(user["id"], "pt_arrears_update", id)
        return await arrears_get(id, user)

    @router.delete("/arrears/{id}")
    async def arrears_delete(id: str, user: dict = Depends(require_role("super_admin", "admin"))):
        r = await db.pt_arrears.delete_one({"id": id})
        if r.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Arrears entry not found")
        await log_activity(user["id"], "pt_arrears_delete", id)
        return {"ok": True}

    @router.get("/reports/draft-assessment")
    async def report_draft_assessment(
        ward_id: Optional[str] = None,
        zone_id: Optional[str] = None,
        _: dict = Depends(get_current_user),
    ):
        flt: dict = {}
        if ward_id: flt["ward_id"] = ward_id
        if zone_id: flt["zone_id"] = zone_id
        props = await db.pt_properties.find(flt, {"_id": 0}).sort("property_no", 1).limit(5000).to_list(5000)

        wards = await db.pt_wards.find({}, {"_id": 0}).to_list(2000)
        zones = await db.pt_zones.find({}, {"_id": 0}).to_list(2000)
        cts   = await db.pt_construction_types.find({}, {"_id": 0}).to_list(2000)
        uts   = await db.pt_usage_types.find({}, {"_id": 0}).to_list(2000)
        wmap = {w["id"]: w for w in wards}
        zmap = {z["id"]: z for z in zones}
        cmap = {c["id"]: c for c in cts}
        umap = {u["id"]: u for u in uts}

        ward_label = None
        zone_label = None
        if ward_id and wmap.get(ward_id):
            w = wmap[ward_id]; ward_label = f"{w['ward_no']} · {w['ward_name']}"
        if zone_id and zmap.get(zone_id):
            z = zmap[zone_id]; zone_label = f"{z['zone_no']} · {z['zone_name']}"

        rows = []
        totals = {"alv": 0.0, "rv": 0.0, "education": 0.0, "employment": 0.0, "tree": 0.0,
                  "fire": 0.0, "sanitation": 0.0, "environment": 0.0, "street_light": 0.0, "total_tax": 0.0}
        for i, p in enumerate(props, 1):
            comp = p.get("computed") or {}
            brk = comp.get("breakup") or {}
            owners = p.get("owners") or []
            primary = next((o for o in owners if o.get("owner_type") == "Primary"), owners[0] if owners else {})
            mobile = primary.get("mobile") or p.get("mobile") or ""
            aadhaar = primary.get("aadhaar") or ""
            usage_name = umap.get(p.get("usage_type_id"), {}).get("name", "")
            ct_name    = cmap.get(p.get("construction_type_id"), {}).get("name", "")
            w_obj = wmap.get(p.get("ward_id"), {})
            z_obj = zmap.get(p.get("zone_id"), {})

            # tax-component mapping (existing engine has 5 components; map to PDF's 7 heads where possible)
            education     = float(brk.get("education_cess") or 0)
            tree          = float(brk.get("tree_cess") or 0)
            sanitation    = float(brk.get("sewerage_tax") or 0)         # closest analogue
            employment    = float(p.get("employment_guarantee_tax") or 0)
            fire          = float(p.get("fire_tax") or 0)
            environment   = float(p.get("environment_tax") or 0)
            street_light  = float(p.get("street_light_tax") or 0)

            row = {
                "s_no": i,
                "zone":              z_obj.get("zone_no", ""),
                "zone_name":         z_obj.get("zone_name", ""),
                "old_ward":          p.get("old_ward", ""),
                "old_property_no":   p.get("property_old_no", ""),
                "ward":              w_obj.get("ward_no", ""),
                "ward_name":         w_obj.get("ward_name", ""),
                "property_no":       p.get("property_no", ""),
                "city_survey_no":    p.get("city_survey_no", ""),
                "property_desc":     p.get("property_description") or p.get("property_sub_type") or "",
                "occupier_name":     p.get("owner_name", ""),
                "mobile":            mobile,
                "aadhaar":           aadhaar,
                "property_address":  p.get("address", ""),
                "area_sqm":          p.get("carpet_area_sqm", 0),
                "floor":             (p.get("units") or [{}])[0].get("floor", "") if p.get("units") else "",
                "year_built":        p.get("year_built", ""),
                "construction_type": ct_name,
                "usage":             usage_name,
                "built_up_area":     p.get("carpet_area_sqm", 0),
                "rate":              z_obj.get("base_rate", 0),
                "alv":               round(float(comp.get("alv") or 0), 2),
                "rv":                round(float(comp.get("rv") or 0), 2),
                "education_tax":     round(education, 2),
                "employment_tax":    round(employment, 2),
                "tree_tax":          round(tree, 2),
                "fire_tax":          round(fire, 2),
                "sanitation_tax":    round(sanitation, 2),
                "environment_tax":   round(environment, 2),
                "street_light_tax":  round(street_light, 2),
                "total_tax":         round(float(comp.get("total_tax") or 0), 2),
            }
            rows.append(row)
            totals["alv"]          += row["alv"]
            totals["rv"]           += row["rv"]
            totals["education"]    += row["education_tax"]
            totals["employment"]   += row["employment_tax"]
            totals["tree"]         += row["tree_tax"]
            totals["fire"]         += row["fire_tax"]
            totals["sanitation"]   += row["sanitation_tax"]
            totals["environment"]  += row["environment_tax"]
            totals["street_light"] += row["street_light_tax"]
            totals["total_tax"]    += row["total_tax"]
        return {
            "count": len(rows),
            "ward_label": ward_label,
            "zone_label": zone_label,
            "rows": rows,
            "totals": {k: round(v, 2) for k, v in totals.items()},
        }

    @router.get("/reports/summary")
    async def report_summary(_: dict = Depends(get_current_user)):
        total_properties = await db.pt_properties.count_documents({})
        total_wards = await db.pt_wards.count_documents({})
        total_zones = await db.pt_zones.count_documents({})
        total_bills = await db.pt_bills.count_documents({})
        paid = await db.pt_bills.count_documents({"status": "paid"})
        unpaid = await db.pt_bills.count_documents({"status": "unpaid"})
        cancelled = await db.pt_bills.count_documents({"status": "cancelled"})

        pipeline_demand = [{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {"_id": None, "t": {"$sum": "$tax_amount"}}}]
        pipeline_paid = [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "t": {"$sum": "$amount_paid"}}}]
        d = await db.pt_bills.aggregate(pipeline_demand).to_list(1)
        p = await db.pt_bills.aggregate(pipeline_paid).to_list(1)
        demand = d[0]["t"] if d else 0.0
        collected = p[0]["t"] if p else 0.0
        return {
            "total_properties": total_properties,
            "total_wards": total_wards,
            "total_zones": total_zones,
            "total_bills": total_bills,
            "bills_paid": paid, "bills_unpaid": unpaid, "bills_cancelled": cancelled,
            "total_demand": round(demand, 2),
            "total_collected": round(collected, 2),
            "total_outstanding": round(demand - collected, 2),
        }

    # =====================================================================
    # ADDITIONAL MASTERS (per Maharashtra Municipal Property Tax)
    # =====================================================================

    # Generic CRUD helper for a flat master collection.
    def add_master(path: str, coll_name: str, allowed_fields: list, label: str):
        coll = db[coll_name]

        @router.get(f"/{path}", name=f"{coll_name}_list")
        async def _list(_: dict = Depends(get_current_user)):
            return await coll.find({}, {"_id": 0}).limit(5000).to_list(5000)

        @router.post(f"/{path}", name=f"{coll_name}_create")
        async def _create(data: dict, _: dict = Depends(require_role("super_admin", "admin"))):
            doc = {k: data.get(k) for k in allowed_fields}
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = utcnow_iso()
            await coll.insert_one(doc)
            doc.pop("_id", None)
            return doc

        @router.put(f"/{path}/{{id}}", name=f"{coll_name}_update")
        async def _update(id: str, data: dict, _: dict = Depends(require_role("super_admin", "admin"))):
            patch = {k: data.get(k) for k in allowed_fields if k in data}
            patch["updated_at"] = utcnow_iso()
            r = await coll.update_one({"id": id}, {"$set": patch})
            if r.matched_count == 0:
                raise HTTPException(status_code=404, detail=f"{label} not found")
            return {"ok": True}

        @router.delete(f"/{path}/{{id}}", name=f"{coll_name}_delete")
        async def _delete(id: str, _: dict = Depends(require_role("super_admin", "admin"))):
            r = await coll.delete_one({"id": id})
            if r.deleted_count == 0:
                raise HTTPException(status_code=404, detail=f"{label} not found")
            return {"ok": True}

    add_master("standard-rates",      "pt_standard_rates",
               ["name", "year", "usage_type_id", "construction_type_id", "rate_per_sqm", "remarks"], "Standard Rate")
    add_master("exemptions",          "pt_exemptions",
               ["name", "category", "exemption_pct", "max_amount", "remarks"], "Exemption")
    add_master("factor-entries",      "pt_factor_entries",
               ["name", "factor_type", "value", "remarks"], "Factor")
    add_master("ready-reckoner",      "pt_ready_reckoner",
               ["area_name", "year", "residential_rate", "commercial_rate", "industrial_rate", "remarks"], "Ready Reckoner Rate")
    add_master("receipt-rebates",     "pt_receipt_rebates",
               ["name", "rebate_pct", "valid_from", "valid_to", "remarks"], "Receipt Rebate")
    add_master("service-charges",     "pt_service_charges",
               ["service_name", "usage_type_id", "rate", "unit", "remarks"], "Service Charge")
    add_master("taxes",               "pt_taxes",
               ["tax_code", "tax_name", "calculation_type", "default_rate", "remarks"], "Tax Master")
    add_master("tax-details",         "pt_tax_details",
               ["tax_master_id", "slab_from", "slab_to", "rate", "remarks"], "Tax Master Detail")
    add_master("valuation-formulas",  "pt_valuation_formulas",
               ["formula_code", "formula_name", "formula_expression", "description"], "Valuation Formula")
    add_master("valuation-mappings",  "pt_valuation_mappings",
               ["formula_id", "ward_id", "zone_id", "usage_type_id", "effective_from", "remarks"], "Valuation Formula Mapping")
    add_master("rebates",             "pt_rebates",
               ["scheme_name", "rebate_pct", "valid_from", "valid_to", "conditions", "remarks"], "Rebate")
    add_master("construction-classes", "pt_construction_classes",
               ["class_code", "class_name", "factor", "remarks"], "Construction Class")
    add_master("abhay-yojna",         "pt_abhay_yojna",
               ["scheme_name", "waiver_pct", "interest_waiver_pct", "valid_from", "valid_to", "conditions", "remarks"], "Abhay Yojna")

    # ---- Seed a couple of sensible defaults for the new masters ----
    async def seed_extra_masters():
        if await db.pt_exemptions.count_documents({}) == 0:
            await db.pt_exemptions.insert_many([
                {"id": str(uuid.uuid4()), "name": "Senior Citizen",     "category": "individual",   "exemption_pct": 30, "max_amount": 5000,  "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Ex-Serviceman",      "category": "individual",   "exemption_pct": 50, "max_amount": 10000, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Widow",              "category": "individual",   "exemption_pct": 30, "max_amount": 5000,  "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Disabled (40%+)",    "category": "individual",   "exemption_pct": 50, "max_amount": 10000, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "name": "Government Property","category": "institutional","exemption_pct": 100,"max_amount": None,  "created_at": utcnow_iso()},
            ])
        if await db.pt_taxes.count_documents({}) == 0:
            await db.pt_taxes.insert_many([
                {"id": str(uuid.uuid4()), "tax_code": "GEN", "tax_name": "General Tax",     "calculation_type": "percentage", "default_rate": 12, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "tax_code": "WAT", "tax_name": "Water Tax",       "calculation_type": "percentage", "default_rate": 5,  "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "tax_code": "SEW", "tax_name": "Sewerage Tax",    "calculation_type": "percentage", "default_rate": 3,  "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "tax_code": "EDU", "tax_name": "Education Cess",  "calculation_type": "percentage", "default_rate": 2,  "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "tax_code": "TRE", "tax_name": "Tree Cess",       "calculation_type": "percentage", "default_rate": 1,  "created_at": utcnow_iso()},
            ])
        if await db.pt_valuation_formulas.count_documents({}) == 0:
            await db.pt_valuation_formulas.insert_many([
                {"id": str(uuid.uuid4()), "formula_code": "ALV-STD",   "formula_name": "Standard ALV",    "formula_expression": "area * base_rate * construction_factor * usage_factor * (1 - age_dep_pct/100)", "description": "Annual Letting Value as per MMC Act", "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "formula_code": "RV-STD",    "formula_name": "Standard RV",     "formula_expression": "ALV * (1 - statutory_deduction_pct/100)",                                          "description": "Rateable Value (post statutory deduction)", "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "formula_code": "CV-MARKET", "formula_name": "Capital Value",   "formula_expression": "area * ready_reckoner_rate * usage_factor * construction_factor",                  "description": "Capital Value method (alternative)",         "created_at": utcnow_iso()},
            ])
        if await db.pt_rebates.count_documents({}) == 0:
            await db.pt_rebates.insert_many([
                {"id": str(uuid.uuid4()), "scheme_name": "Early Payment (Apr-Jun)", "rebate_pct": 10, "valid_from": "2025-04-01", "valid_to": "2025-06-30", "conditions": "Pay full year before 30 June", "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "scheme_name": "Online Payment",          "rebate_pct": 2,  "valid_from": "2025-04-01", "valid_to": "2026-03-31", "conditions": "Online digital payments only",  "created_at": utcnow_iso()},
            ])
        if await db.pt_construction_classes.count_documents({}) == 0:
            await db.pt_construction_classes.insert_many([
                {"id": str(uuid.uuid4()), "class_code": "A", "class_name": "Class A — Pucca RCC",       "factor": 1.00, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "class_code": "B", "class_name": "Class B — Load Bearing",    "factor": 0.85, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "class_code": "C", "class_name": "Class C — Semi-Pucca",      "factor": 0.65, "created_at": utcnow_iso()},
                {"id": str(uuid.uuid4()), "class_code": "D", "class_name": "Class D — Kuccha / Tin",    "factor": 0.40, "created_at": utcnow_iso()},
            ])

    async def seed_all():
        await seed_defaults()
        await seed_extra_masters()

    return router, seed_all
