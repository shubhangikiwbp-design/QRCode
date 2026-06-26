import React, { useEffect, useState } from "react";
import { api, API, formatBytes } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { DownloadSimple } from "@phosphor-icons/react";

export default function QRList() {
  const [items, setItems] = useState([]);

  useEffect(() => { api.get("/qr/list").then(({ data }) => setItems(data)); }, []);

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="02" title="QR Codes" subtitle="Every uploaded file gets a unique scannable QR." />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8" data-testid="qr-grid">
        {items.map((q) => (
          <div key={q.id} className="bg-white border border-zinc-200 hover:border-[#FF4500] transition-all p-4" data-testid={`qr-card-${q.id}`}>
            <div className="relative p-3 bg-zinc-50 border border-zinc-200 flex items-center justify-center">
              <span className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-black" />
              <span className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-black" />
              <span className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-black" />
              <span className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-black" />
              <img src={`${API}/qr/image/${q.file_id}`} alt="QR" className="w-32 h-32" />
            </div>
            <div className="mt-3">
              <div className="text-sm font-medium truncate">{q.file?.file_name || "—"}</div>
              <div className="mono-label mt-1">{q.file ? `${formatBytes(q.file.file_size)} · ${q.file.file_type.toUpperCase()}` : ""}</div>
            </div>
            <a href={`${API}/qr/image/${q.file_id}`} download className="mt-3 w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-[#FF4500] px-3 py-2 font-mono uppercase text-xs tracking-wider" data-testid={`qr-dl-${q.id}`}>
              <DownloadSimple size={14} /> PNG
            </a>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="text-center py-16 text-zinc-500 font-mono text-sm">// NO QR CODES YET</div>}
    </div>
  );
}
