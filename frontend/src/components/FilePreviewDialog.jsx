import React from "react";
import { API, formatBytes } from "@/lib/api";
import { X, DownloadSimple, Share } from "@phosphor-icons/react";

export default function FilePreviewDialog({ file, onClose }) {
  if (!file) return null;
  const qrSrc = `${API}/qr/image/${file.id}`;
  const dlSrc = `${API}/file/download/${file.id}`;
  const svgSrc = `${API}/qr/svg/${file.id}`;
  const downloadUrl = file.qr?.download_url;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose} data-testid="file-preview-modal">
      <div className="bg-white border-2 border-black brutal-shadow max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-black">
          <div>
            <div className="mono-label">FILE / DETAIL</div>
            <h3 className="font-heading font-bold text-xl mt-1 break-all">{file.file_name}</h3>
            <div className="mono-label mt-1">{formatBytes(file.file_size)} · {file.file_type.toUpperCase()} · {file.uploaded_by_name}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white" data-testid="preview-close"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          <div className="relative p-8 bg-zinc-50 border border-zinc-200 flex items-center justify-center">
            <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-black" />
            <span className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-black" />
            <span className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-black" />
            <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-black" />
            <img src={qrSrc} alt="QR" className="w-56 h-56" data-testid="preview-qr-img" />
          </div>

          <div className="space-y-4">
            <div>
              <div className="mono-label">SCAN URL</div>
              <div className="mt-1 text-xs font-mono break-all text-zinc-700 border border-zinc-200 p-2 bg-zinc-50">{downloadUrl}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a href={dlSrc} className="bg-[#FF4500] text-white hover:bg-black px-4 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="preview-download-file">
                <DownloadSimple size={14} /> Download
              </a>
              <a href={qrSrc} download={`qr-${file.file_name}.png`} className="bg-white text-black border border-black hover:bg-black hover:text-white px-4 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="preview-download-qr-png">
                QR · PNG
              </a>
              <a href={svgSrc} className="bg-white text-black border border-black hover:bg-black hover:text-white px-4 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="preview-download-qr-svg">
                QR · SVG
              </a>
              <button onClick={() => { navigator.clipboard.writeText(downloadUrl || ""); }} className="bg-white text-black border border-black hover:bg-black hover:text-white px-4 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="preview-copy-link">
                <Share size={14} /> Copy Link
              </button>
            </div>
            <div className="pt-3 border-t border-zinc-200">
              <div className="mono-label">UPLOADED AT</div>
              <div className="font-mono text-sm mt-1">{new Date(file.uploaded_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
