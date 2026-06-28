import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { QrCode } from "@phosphor-icons/react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@qrfile.com");
  const [password, setPassword] = useState("Admin@123");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);
    if (res.ok) { toast.success("Welcome back"); navigate("/modules"); }
    else toast.error(res.error);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero */}
      <div className="hidden lg:flex relative bg-[#0A0A0A] text-white p-12 flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF4500] flex items-center justify-center">
            <QrCode size={24} weight="bold" />
          </div>
          <div>
            <div className="font-heading font-black text-xl">QRFILE</div>
            <div className="mono-label text-zinc-500">CONTROL ROOM</div>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="font-heading font-black text-5xl xl:text-6xl tracking-tighter leading-none">
            FILE.<br />SCAN.<br /><span className="text-[#FF4500]">CONTROL.</span>
          </h1>
          <p className="mt-6 text-zinc-400 max-w-md leading-relaxed">
            Enterprise QR-driven file management. Upload, organize, generate QR codes & scan them — across web and mobile.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { k: "TYPES", v: "9+" }, { k: "ROLES", v: "3" }, { k: "QR / FILE", v: "1:1" },
          ].map((s) => (
            <div key={s.k} className="border border-zinc-800 p-4">
              <div className="mono-label text-zinc-500">{s.k}</div>
              <div className="font-mono text-2xl font-semibold mt-1">{s.v}</div>
            </div>
          ))}
        </div>
        <div className="absolute -right-24 -bottom-24 w-96 h-96 border border-zinc-800" />
        <div className="absolute right-12 top-32 w-32 h-32 bg-[#FF4500] opacity-10" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="mono-label">ACCESS / 001</div>
          <h2 className="font-heading font-black text-4xl tracking-tighter mt-2">Sign in</h2>
          <p className="text-sm text-zinc-600 mt-2">Use seeded super admin <span className="font-mono">admin@qrfile.com / Admin@123</span> or your account.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mono-label block mb-2">EMAIL</label>
              <input
                data-testid="login-email"
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full border border-zinc-300 px-4 py-3 focus:outline-none focus:border-black bg-white"
              />
            </div>
            <div>
              <label className="mono-label block mb-2">PASSWORD</label>
              <input
                data-testid="login-password"
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full border border-zinc-300 px-4 py-3 focus:outline-none focus:border-black bg-white"
              />
            </div>
            <button
              data-testid="login-submit"
              type="submit" disabled={submitting}
              className="w-full bg-[#FF4500] hover:bg-black text-white font-mono uppercase tracking-wider py-3 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? "ENTERING…" : "ENTER →"}
            </button>
          </div>

          <p className="mt-6 text-sm text-zinc-600">
            New here? <Link to="/register" className="text-[#FF4500] font-medium" data-testid="link-register">Create account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
