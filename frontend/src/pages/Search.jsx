import React, { useEffect, useState } from "react";
import { api, API, formatBytes } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { MagnifyingGlass, FolderSimple, File as FileIcon, DownloadSimple } from "@phosphor-icons/react";

const FILE_TYPES = ["pdf", "docx", "xlsx", "png", "jpg", "zip", "mp4"];

export default function Search() {
  const [q, setQ] = useState("");
  const [fileType, setFileType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/search", {
        params: { q, file_type: fileType || undefined, date_from: from || undefined, date_to: to || undefined },
      });
      setResult(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="04" title="Search" subtitle="Find folders, files, and QR codes with advanced filters." />

      <div className="bg-white border border-zinc-200 p-5 mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 flex items-center border border-zinc-300 px-3">
          <MagnifyingGlass size={16} />
          <input data-testid="search-q" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-2 py-2 outline-none bg-transparent" />
        </div>
        <select data-testid="search-file-type" value={fileType} onChange={(e) => setFileType(e.target.value)} className="border border-zinc-300 px-3 py-2 bg-white">
          <option value="">ALL TYPES</option>
          {FILE_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        <input type="date" data-testid="search-from" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-zinc-300 px-3 py-2 bg-white" />
        <input type="date" data-testid="search-to" value={to} onChange={(e) => setTo(e.target.value)} className="border border-zinc-300 px-3 py-2 bg-white" />
        <button data-testid="search-run" onClick={run} className="md:col-span-5 bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase tracking-wider text-xs">
          {loading ? "SEARCHING…" : "RUN SEARCH"}
        </button>
      </div>

      <div className="mt-8">
        <div className="mono-label mb-3">FOLDERS / {result.folders.length}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" data-testid="search-folders">
          {result.folders.map((f) => (
            <div key={f.id} className="bg-white border border-zinc-200 p-3 flex items-center gap-3">
              <FolderSimple size={28} color="#FF4500" weight="duotone" />
              <div>
                <div className="text-sm font-medium">{f.folder_name}</div>
                <div className="mono-label">{f.created_by_name}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mono-label mb-3 mt-8">FILES / {result.files.length}</div>
        <div className="bg-white border border-zinc-200">
          <table className="w-full text-sm" data-testid="search-files-table">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
                <th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Size</th><th className="p-3">By</th><th className="p-3">Date</th><th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.files.map((f) => (
                <tr key={f.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="p-3 font-medium flex items-center gap-2"><FileIcon size={16} /> {f.file_name}</td>
                  <td className="p-3 font-mono uppercase">{f.file_type}</td>
                  <td className="p-3 font-mono">{formatBytes(f.file_size)}</td>
                  <td className="p-3">{f.uploaded_by_name}</td>
                  <td className="p-3 font-mono text-xs">{new Date(f.uploaded_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <a href={`${API}/file/download/${f.id}`} className="inline-flex items-center gap-1 px-2 py-1 border border-black hover:bg-black hover:text-white font-mono text-xs uppercase" data-testid={`search-dl-${f.id}`}><DownloadSimple size={12} /> DL</a>
                  </td>
                </tr>
              ))}
              {result.files.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500 font-mono text-sm">// NO RESULTS</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
