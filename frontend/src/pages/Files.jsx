import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, API, formatBytes } from "@/lib/api";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import FilePreviewDialog from "@/components/FilePreviewDialog";
import DuplicateFolderDialog from "@/components/DuplicateFolderDialog";
import { FolderSimple, FilePdf, FileDoc, FileXls, FileImage, FileZip, FileVideo, File as FileIcon, CaretRight, House, Plus, Trash, DownloadSimple, QrCode } from "@phosphor-icons/react";

function fileIcon(ext) {
  const t = (ext || "").toLowerCase();
  if (t === "pdf") return FilePdf;
  if (["doc","docx","txt"].includes(t)) return FileDoc;
  if (["xls","xlsx","csv"].includes(t)) return FileXls;
  if (["jpg","jpeg","png"].includes(t)) return FileImage;
  if (t === "zip") return FileZip;
  if (t === "mp4") return FileVideo;
  return FileIcon;
}

export default function Files() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [duplicate, setDuplicate] = useState(null); // { folder_name, existing_id }
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    const p = folderId ? { parent_id: folderId } : {};
    const [fRes, filRes] = await Promise.all([
      api.get("/folder/list", { params: p }),
      api.get("/file/list", { params: { folder_id: folderId || null } }),
    ]);
    setFolders(fRes.data);
    setFiles(filRes.data);
    if (folderId) {
      const pRes = await api.get(`/folder/${folderId}/path`);
      setPath(pRes.data);
    } else setPath([]);
  }, [folderId]);

  useEffect(() => { load(); }, [load]);

  const createFolder = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/folder/create", { folder_name: newName.trim(), parent_folder_id: folderId || null });
      setNewName(""); toast.success("Folder created"); load();
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 409 && detail?.code === "folder_exists" && detail.existing_folder) {
        setDuplicate({
          folder_name: detail.existing_folder.folder_name,
          existing_id: detail.existing_folder.id,
        });
      } else {
        const msg = typeof detail === "string" ? detail : detail?.message || "Failed";
        toast.error(msg);
      }
    }
    finally { setCreating(false); }
  };

  const onFiles = async (selected) => {
    if (!selected?.length) return;
    setUploading(true);
    for (const f of selected) {
      const fd = new FormData();
      fd.append("file", f);
      if (folderId) fd.append("folder_id", folderId);
      try {
        await api.post("/file/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success(`Uploaded ${f.name}`);
      } catch (e) { toast.error(`${f.name}: ${e.response?.data?.detail || "Upload failed"}`); }
    }
    setUploading(false);
    load();
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onFiles(Array.from(e.dataTransfer.files));
  };

  const deleteFolder = async (id) => {
    if (!window.confirm("Delete this folder and all its contents?")) return;
    await api.delete(`/folder/${id}`); toast.success("Folder deleted"); load();
  };

  const deleteFile = async (id) => {
    if (!window.confirm("Delete this file?")) return;
    await api.delete(`/file/${id}`); toast.success("File deleted"); load();
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="01" title="Files & Folders" subtitle="Drop files anywhere. Auto-generate QR codes per upload." />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mt-6 font-mono text-xs uppercase tracking-widest text-zinc-500 flex-wrap" data-testid="breadcrumbs">
        <button onClick={() => navigate("/files")} className="flex items-center gap-1 hover:text-black"><House size={14} /> ROOT</button>
        {path.map((p) => (
          <React.Fragment key={p.id}>
            <CaretRight size={12} className="text-zinc-300" />
            <button onClick={() => navigate(`/files/${p.id}`)} className="hover:text-black">{p.folder_name}</button>
          </React.Fragment>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap gap-3">
        <form onSubmit={createFolder} className="flex gap-2 flex-1 min-w-[280px]">
          <input
            data-testid="new-folder-input"
            placeholder="New folder name"
            value={newName} onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-zinc-300 px-4 py-2 bg-white focus:outline-none focus:border-black"
          />
          <button data-testid="create-folder-btn" disabled={creating} className="bg-black text-white px-4 py-2 font-mono uppercase tracking-wider text-xs hover:bg-[#FF4500] flex items-center gap-2">
            <Plus size={14} /> Folder
          </button>
        </form>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => onFiles(Array.from(e.target.files))} data-testid="file-input" />
        <button
          data-testid="upload-files-btn"
          onClick={() => inputRef.current?.click()}
          className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase tracking-wider text-xs"
        >+ Upload Files</button>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-4 dropzone ${dragOver ? "active" : ""} p-10 text-center bg-white`}
        data-testid="dropzone"
      >
        <div className="mono-label">{uploading ? "UPLOADING…" : "DRAG & DROP FILES HERE"}</div>
        <div className="text-xs text-zinc-500 mt-2">PDF · DOC · XLS · JPG · PNG · ZIP · MP4 · max 50MB</div>
      </div>

      {/* Folders Grid */}
      {folders.length > 0 && (
        <>
          <div className="mono-label mt-10 mb-3">FOLDERS / {folders.length}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" data-testid="folders-grid">
            {folders.map((f) => (
              <div key={f.id} className="group bg-white border border-zinc-200 hover:border-[#FF4500] hover:shadow-[4px_4px_0_rgba(255,69,0,0.2)] transition-all">
                <button onClick={() => navigate(`/files/${f.id}`)} className="w-full p-4 flex flex-col items-center text-center" data-testid={`folder-${f.id}`}>
                  <FolderSimple size={48} weight="duotone" color="#FF4500" />
                  <div className="mt-2 text-sm font-medium truncate w-full">{f.folder_name}</div>
                  <div className="mono-label mt-1 truncate w-full">{(f.created_by_name || "").slice(0, 14)}</div>
                </button>
                <button onClick={() => deleteFolder(f.id)} className="w-full py-1 mono-label text-zinc-400 hover:text-[#FF4500] border-t border-zinc-100" data-testid={`folder-del-${f.id}`}>
                  <Trash size={12} className="inline mr-1" /> DELETE
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Files Grid */}
      <div className="mono-label mt-10 mb-3">FILES / {files.length}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="files-grid">
        {files.map((fl) => {
          const Icon = fileIcon(fl.file_type);
          return (
            <div key={fl.id} className="group bg-white border border-zinc-200 hover:border-[#FF4500] hover:shadow-[4px_4px_0_rgba(255,69,0,0.2)] transition-all p-4 flex flex-col" data-testid={`file-${fl.id}`}>
              <button onClick={() => setPreview(fl)} className="flex-1 flex flex-col items-center text-center" data-testid={`file-open-${fl.id}`}>
                <Icon size={40} weight="duotone" color="#000" />
                <div className="mt-2 text-sm font-medium truncate w-full">{fl.file_name}</div>
                <div className="mono-label mt-1">{formatBytes(fl.file_size)} · {fl.file_type.toUpperCase()}</div>
              </button>
              <div className="grid grid-cols-3 gap-1 mt-3 border-t border-zinc-100 pt-2">
                <a href={`${API}/file/download/${fl.id}`} className="flex items-center justify-center py-1 hover:bg-zinc-100" title="Download" data-testid={`file-dl-${fl.id}`}>
                  <DownloadSimple size={14} />
                </a>
                <a href={`${API}/qr/image/${fl.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center py-1 hover:bg-zinc-100" title="View QR" data-testid={`file-qr-${fl.id}`}>
                  <QrCode size={14} />
                </a>
                <button onClick={() => deleteFile(fl.id)} className="flex items-center justify-center py-1 hover:bg-zinc-100 hover:text-[#FF4500]" title="Delete" data-testid={`file-del-${fl.id}`}>
                  <Trash size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {folders.length === 0 && files.length === 0 && (
        <div className="text-center py-16 text-zinc-500 font-mono text-sm">// EMPTY DIRECTORY — UPLOAD A FILE OR CREATE A FOLDER</div>
      )}

      <FilePreviewDialog file={preview} onClose={() => setPreview(null)} />
      <DuplicateFolderDialog
        open={!!duplicate}
        folderName={duplicate?.folder_name}
        onCancel={() => setDuplicate(null)}
        onConfirm={() => {
          const id = duplicate.existing_id;
          setDuplicate(null);
          setNewName("");
          navigate(`/files/${id}`);
        }}
      />
    </div>
  );
}
