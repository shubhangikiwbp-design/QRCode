import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", mobile: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await register(form);
    setSubmitting(false);
    if (res.ok) { toast.success("Account created"); navigate("/"); }
    else toast.error(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-8">
      <form onSubmit={submit} className="w-full max-w-md" data-testid="register-form">
        <div className="mono-label">ACCESS / 002</div>
        <h2 className="font-heading font-black text-4xl tracking-tighter mt-2">Create account</h2>

        <div className="mt-8 space-y-4">
          {[
            { k: "name", label: "NAME", type: "text" },
            { k: "email", label: "EMAIL", type: "email" },
            { k: "mobile", label: "MOBILE", type: "text" },
            { k: "password", label: "PASSWORD (min 6)", type: "password" },
          ].map((f) => (
            <div key={f.k}>
              <label className="mono-label block mb-2">{f.label}</label>
              <input
                data-testid={`register-${f.k}`}
                type={f.type} required={f.k !== "mobile"} value={form[f.k]}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full border border-zinc-300 px-4 py-3 focus:outline-none focus:border-black bg-white"
              />
            </div>
          ))}
          <button
            data-testid="register-submit"
            type="submit" disabled={submitting}
            className="w-full bg-[#FF4500] hover:bg-black text-white font-mono uppercase tracking-wider py-3 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "CREATING…" : "CREATE ACCOUNT →"}
          </button>
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          Have an account? <Link to="/login" className="text-[#FF4500] font-medium" data-testid="link-login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
