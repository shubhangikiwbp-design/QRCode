import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { QrCode, Buildings, SignOut, ArrowRight } from "@phosphor-icons/react";

const MODULES = [
  {
    key: "qr",
    path: "/qr-app",
    title: "QRFILE",
    name: "File & QR Manager",
    desc: "Upload files, generate scannable QR codes, organize folders, scan QRs, audit access.",
    accent: "#FF4500",
    Icon: QrCode,
    bullets: ["Drag-drop file upload", "Auto QR per file (PNG + SVG)", "Webcam scanner", "Audit logs"],
  },
  {
    key: "pt",
    path: "/pt",
    title: "PROPTAX",
    name: "Property Tax",
    desc: "Maharashtra Municipal ALV / RV based assessment with masters, properties, notices, bills & reports.",
    accent: "#0EA5E9",
    Icon: Buildings,
    bullets: ["Ward / Zone masters", "Live ALV & RV computation", "Section 167 notices", "Bills + Demand register"],
  },
];

export default function ModulePicker() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#0A0A0A] text-white border-b border-black">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div>
            <div className="font-heading font-black text-lg leading-none">CONTROL ROOM</div>
            <div className="mono-label text-zinc-500 mt-1">MODULE SELECTOR</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="mono-label text-zinc-500">LOGGED IN</div>
              <div className="text-sm">{user?.name} · <span className="text-[#FF4500] font-mono uppercase text-xs">{user?.role}</span></div>
            </div>
            <button
              data-testid="picker-logout"
              onClick={() => { logout(); navigate("/login"); }}
              className="bg-white text-black hover:bg-[#FF4500] hover:text-white px-3 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2 transition-colors"
            >
              <SignOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-6xl w-full">
          <div className="text-center mb-10">
            <div className="mono-label">SELECT / 001</div>
            <h1 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter mt-2">Pick a module</h1>
            <p className="text-sm text-zinc-600 mt-3">Each module is independent. You can switch any time from the sidebar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MODULES.map((m) => (
              <button
                key={m.key}
                data-testid={`module-card-${m.key}`}
                onClick={() => navigate(m.path)}
                className="group bg-white border-2 border-black brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform text-left"
              >
                <div className="p-6 flex items-start justify-between border-b border-black" style={{ background: m.accent, color: "white" }}>
                  <div>
                    <div className="font-mono uppercase text-xs tracking-widest opacity-80">MODULE</div>
                    <div className="font-heading font-black text-3xl tracking-tighter mt-1">{m.title}</div>
                    <div className="font-mono uppercase text-xs tracking-widest mt-1 opacity-80">{m.name}</div>
                  </div>
                  <div className="w-14 h-14 bg-black flex items-center justify-center">
                    <m.Icon size={28} weight="bold" color="white" />
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-zinc-700">{m.desc}</p>
                  <ul className="mt-4 space-y-1">
                    {m.bullets.map((b) => (
                      <li key={b} className="text-xs font-mono uppercase tracking-wider text-zinc-600">— {b}</li>
                    ))}
                  </ul>
                  <div className="mt-6 inline-flex items-center gap-2 font-mono uppercase text-xs tracking-wider text-black group-hover:translate-x-1 transition-transform">
                    Enter module <ArrowRight size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
