import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { api, API } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Camera, StopCircle, Image as ImageIcon } from "@phosphor-icons/react";

export default function Scanner() {
  const elemId = "qr-reader";
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, []);

  const onScanSuccess = async (decodedText) => {
    setResult(decodedText);
    try {
      const match = decodedText.match(/\/api\/file\/public\/([0-9a-f-]+)/i);
      if (match) {
        const id = match[1];
        const { data } = await api.get(`/qr/resolve/${id}`);
        setFileMeta(data);
        toast.success("Match found");
      } else {
        toast.info("Scanned content is not a known QRFile URL");
      }
    } catch (e) {
      toast.error("Could not resolve file");
    }
    stop();
  };

  const start = async () => {
    setResult(null); setFileMeta(null);
    try {
      const html5 = new Html5Qrcode(elemId);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        onScanSuccess,
        () => {}
      );
      setScanning(true);
    } catch (e) {
      toast.error("Camera access denied or unavailable");
    }
  };

  const stop = async () => {
    setScanning(false);
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
  };

  const scanFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const html5 = new Html5Qrcode(elemId);
      const r = await html5.scanFile(f, true);
      onScanSuccess(r);
    } catch {
      toast.error("Could not decode QR from image");
    }
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="03" title="QR Scanner" subtitle="Scan via camera or upload an image." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white border border-zinc-200 p-6">
          <div className="mono-label">RETICLE</div>
          <div className="relative mt-3 bg-zinc-950 aspect-square overflow-hidden">
            <div id={elemId} className="w-full h-full" data-testid="qr-reader" />
            {scanning && (
              <>
                <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#FF4500]" />
                <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#FF4500]" />
                <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#FF4500]" />
                <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#FF4500]" />
                <div className="scan-line" />
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {!scanning ? (
              <button onClick={start} className="bg-[#FF4500] text-white hover:bg-black px-3 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="scanner-start"><Camera size={14} /> Start</button>
            ) : (
              <button onClick={stop} className="bg-black text-white px-3 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="scanner-stop"><StopCircle size={14} /> Stop</button>
            )}
            <label className="bg-white text-black border border-black hover:bg-black hover:text-white px-3 py-3 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer" data-testid="scanner-file-label">
              <ImageIcon size={14} /> Image
              <input type="file" accept="image/*" hidden onChange={scanFile} data-testid="scanner-file" />
            </label>
            <button onClick={() => { setResult(null); setFileMeta(null); }} className="bg-white text-black border border-black hover:bg-black hover:text-white px-3 py-3 font-mono uppercase text-xs tracking-wider" data-testid="scanner-reset">Reset</button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6">
          <div className="mono-label">RESULT</div>
          {!result && <div className="text-zinc-500 font-mono text-sm mt-4">// AWAITING SCAN…</div>}
          {result && (
            <div className="mt-3" data-testid="scanner-result">
              <div className="mono-label">RAW</div>
              <div className="text-xs font-mono break-all border border-zinc-200 p-2 bg-zinc-50 mt-1">{result}</div>
              {fileMeta && (
                <div className="mt-4 border border-black p-4">
                  <div className="mono-label">MATCH</div>
                  <h4 className="font-heading font-bold text-lg mt-1 break-all">{fileMeta.file_name}</h4>
                  <div className="mono-label mt-1">{fileMeta.file_type.toUpperCase()} · {fileMeta.uploaded_by_name}</div>
                  <a href={`${API}/file/public/${fileMeta.id}`} className="mt-3 inline-block bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="scanner-open-file">Open / Download →</a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
