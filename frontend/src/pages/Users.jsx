import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import { Trash, Plus } from "@phosphor-icons/react";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", mobile: "" });
  const [show, setShow] = useState(false);

  const load = async () => {
    const { data } = await api.get("/users");
    setUsers(data);
  };

  useEffect(() => { if (user?.role === "super_admin") load(); }, [user]);

  if (user?.role !== "super_admin") {
    return <div className="p-12 font-mono text-sm">// SUPER ADMIN ACCESS REQUIRED</div>;
  }

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      toast.success("User created");
      setForm({ name: "", email: "", password: "", role: "user", mobile: "" });
      setShow(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await api.delete(`/users/${id}`); toast.success("Deleted"); load();
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="05" title="Users" subtitle="Manage roles and access (super admin only)."
        right={
          <button data-testid="user-create-toggle" onClick={() => setShow(!show)} className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase tracking-wider text-xs flex items-center gap-2">
            <Plus size={14} /> {show ? "Close" : "New User"}
          </button>
        }
      />

      {show && (
        <form onSubmit={create} className="mt-6 bg-white border-2 border-black brutal-shadow p-5 grid grid-cols-1 md:grid-cols-5 gap-3" data-testid="user-create-form">
          <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="user-name" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="user-email" />
          <input required type="password" placeholder="Password (≥6)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="user-password" />
          <input placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="user-mobile" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="user-role">
            <option value="user">user</option>
            <option value="admin">admin</option>
            <option value="super_admin">super_admin</option>
          </select>
          <button type="submit" className="md:col-span-5 bg-black text-white px-4 py-2 font-mono uppercase tracking-wider text-xs hover:bg-[#FF4500]" data-testid="user-create-submit">CREATE</button>
        </form>
      )}

      <div className="bg-white border border-zinc-200 mt-6">
        <table className="w-full text-sm" data-testid="users-table">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
              <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-zinc-100 hover:bg-zinc-50" data-testid={`user-row-${u.id}`}>
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 font-mono uppercase text-xs"><span className="bg-black text-white px-2 py-1">{u.role}</span></td>
                <td className="p-3 font-mono text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {u.id !== user.id && (
                    <button onClick={() => del(u.id)} className="inline-flex items-center gap-1 px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500] font-mono text-xs uppercase" data-testid={`user-del-${u.id}`}>
                      <Trash size={12} /> DEL
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
