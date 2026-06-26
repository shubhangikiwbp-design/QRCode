import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";

export default function Logs() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (["super_admin", "admin"].includes(user?.role)) {
      api.get("/logs", { params: { limit: 200 } }).then(({ data }) => setItems(data));
    }
  }, [user]);

  if (!["super_admin", "admin"].includes(user?.role)) {
    return <div className="p-12 font-mono text-sm">// ADMIN ACCESS REQUIRED</div>;
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="06" title="Audit Logs" subtitle="Recent system activity." />

      <div className="bg-white border border-zinc-200 mt-6">
        <table className="w-full text-sm" data-testid="logs-table">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
              <th className="p-3">When</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Target</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-3 font-mono text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                <td className="p-3">{l.user?.name || l.user_id}</td>
                <td className="p-3 font-mono uppercase text-xs"><span className="bg-black text-white px-2 py-1">{l.action}</span></td>
                <td className="p-3 font-mono text-xs text-zinc-500 truncate max-w-xs">{l.target || "—"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-zinc-500 font-mono text-sm">// NO ACTIVITY</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
