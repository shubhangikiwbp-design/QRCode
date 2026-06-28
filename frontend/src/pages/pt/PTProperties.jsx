import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { toast } from "sonner";
import { Plus, Pencil, Trash, ArrowsClockwise, X, MagnifyingGlass } from "@phosphor-icons/react";

const EMPTY = {
  property_no: "", owner_name: "", address: "", mobile: "",
  ward_id: "", zone_id: "", construction_type_id: "", usage_type_id: "",
  carpet_area_sqm: "", year_built: new Date().getFullYear() - 5,
};

function PropertyForm({ initial, masters, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [preview, setPreview] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ready = form.property_no && form.owner_name && form.ward_id && form.zone_id && form.construction_type_id && form.usage_type_id && Number(form.carpet_area_sqm) > 0 && form.year_built;

  const computePreview = async () => {
    if (!ready) return;
    try {
      const { data } = await ptApi.properties.preview({
        ...form,
        carpet_area_sqm: Number(form.carpet_area_sqm),
        year_built: Number(form.year_built),
      });
      setPreview(data);
    } catch (e) { toast.error(e.response?.data?.detail || "Preview failed"); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await onSave({
        ...form,
        carpet_area_sqm: Number(form.carpet_area_sqm),
        year_built: Number(form.year_built),
        mobile: form.mobile || null,
      });
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const F = (k, label, props={}) => (
    <div>
      <label className="mono-label block mb-1">{label}</label>
      <input value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-full border border-zinc-300 px-3 py-2 bg-white focus:outline-none focus:border-black" data-testid={`prop-${k}`} {...props} />
    </div>
  );
  const S = (k, label, options) => (
    <div>
      <label className="mono-label block mb-1">{label}</label>
      <select value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid={`prop-${k}`}>
        <option value="">— select —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="bg-white border-2 border-black brutal-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="mono-label">FORM / PROPERTY</div>
          <h3 className="font-heading font-bold text-xl">{initial?.id ? "Edit property" : "New property"}</h3>
        </div>
        <button type="button" onClick={onCancel} className="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white"><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {F("property_no", "Property No", { required: true })}
        {F("owner_name", "Owner Name", { required: true })}
        {F("mobile", "Mobile")}
        <div className="md:col-span-3">{F("address", "Address", { required: true })}</div>
        {S("ward_id", "Ward", masters.wards.map((w) => ({ id: w.id, label: `${w.ward_no} · ${w.ward_name}` })))}
        {S("zone_id", "Zone", masters.zones.map((z) => ({ id: z.id, label: `${z.zone_no} · ${z.zone_name} (₹${z.base_rate}/sqm)` })))}
        {S("construction_type_id", "Construction Type", masters.construction.map((c) => ({ id: c.id, label: `${c.name} (×${c.factor})` })))}
        {S("usage_type_id", "Usage Type", masters.usage.map((u) => ({ id: u.id, label: `${u.name} (×${u.factor})` })))}
        {F("carpet_area_sqm", "Carpet Area (sqm)", { type: "number", min: 1, step: "0.01", required: true })}
        {F("year_built", "Year Built", { type: "number", min: 1800, max: new Date().getFullYear(), required: true })}
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <button type="button" onClick={computePreview} disabled={!ready} className="bg-white text-black border border-black hover:bg-black hover:text-white disabled:opacity-50 px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="prop-preview">
          Preview Tax
        </button>
        <button type="submit" className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="prop-submit">
          {initial?.id ? "Update" : "Save"} Property
        </button>
      </div>

      {preview && (
        <div className="mt-5 border border-black p-4 bg-zinc-50" data-testid="prop-preview-out">
          <div className="mono-label">COMPUTED — PREVIEW</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 font-mono">
            <div><div className="mono-label">ALV</div><div>{inr(preview.alv)}</div></div>
            <div><div className="mono-label">RV</div><div>{inr(preview.rv)}</div></div>
            <div><div className="mono-label">AGE / DEP</div><div>{preview.years_old}y · {preview.depreciation_pct}%</div></div>
            <div><div className="mono-label">TOTAL TAX</div><div className="text-[#FF4500] font-semibold">{inr(preview.total_tax)}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            {Object.entries(preview.breakup).map(([k, v]) => (
              <div key={k} className="border border-zinc-200 p-2"><div className="mono-label">{k.replace(/_/g," ").toUpperCase()}</div><div>{inr(v)}</div></div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export default function PTProperties() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | property object
  const [masters, setMasters] = useState({ wards: [], zones: [], construction: [], usage: [] });

  const load = async () => {
    const { data } = await ptApi.properties.list({ q: q || undefined });
    setRows(data);
  };

  useEffect(() => {
    Promise.all([ptApi.wards.list(), ptApi.zones.list(), ptApi.construction.list(), ptApi.usage.list()])
      .then(([w, z, c, u]) => setMasters({ wards: w.data, zones: z.data, construction: c.data, usage: u.data }));
    load();
    // eslint-disable-next-line
  }, []);

  const mastersMap = useMemo(() => ({
    wards: Object.fromEntries(masters.wards.map((x) => [x.id, x])),
    zones: Object.fromEntries(masters.zones.map((x) => [x.id, x])),
  }), [masters]);

  const onSave = async (payload) => {
    if (editing?.id) {
      await ptApi.properties.update(editing.id, payload);
      toast.success("Property updated");
    } else {
      await ptApi.properties.create(payload);
      toast.success("Property created");
    }
    setEditing(null);
    load();
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this property?")) return;
    try { await ptApi.properties.del(id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const recompute = async (id) => {
    try { await ptApi.properties.recompute(id); toast.success("Recomputed"); load(); }
    catch (e) { toast.error("Failed"); }
  };

  if (editing) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader index="PT-02" title="Property" subtitle="Live tax preview using current masters & rates." />
        <div className="mt-6">
          <PropertyForm initial={editing === "new" ? null : editing} masters={masters} onSave={onSave} onCancel={() => setEditing(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-02" title="Properties" subtitle="Data entry of properties with live ALV / RV computation."
        right={
          <button onClick={() => setEditing("new")} className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider flex items-center gap-2" data-testid="prop-new">
            <Plus size={14} /> New Property
          </button>
        }
      />

      <div className="bg-white border border-zinc-200 mt-6 p-4 flex gap-2">
        <div className="flex items-center border border-zinc-300 px-3 flex-1">
          <MagnifyingGlass size={16} />
          <input placeholder="Search by property no / owner / address" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1 px-2 py-2 outline-none bg-transparent" data-testid="prop-search" />
        </div>
        <button onClick={load} className="bg-black text-white hover:bg-[#FF4500] px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="prop-search-go">Search</button>
      </div>

      <div className="bg-white border border-zinc-200 mt-4">
        <table className="w-full text-sm" data-testid="prop-table">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
              <th className="p-3">Prop No</th><th className="p-3">Owner</th><th className="p-3">Ward / Zone</th><th className="p-3">Area</th><th className="p-3">ALV</th><th className="p-3">RV</th><th className="p-3">Total Tax</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 hover:bg-zinc-50" data-testid={`prop-row-${p.id}`}>
                <td className="p-3 font-mono">{p.property_no}</td>
                <td className="p-3">
                  <div className="font-medium">{p.owner_name}</div>
                  <div className="text-xs text-zinc-500 truncate max-w-xs">{p.address}</div>
                </td>
                <td className="p-3 text-xs">
                  <div>{mastersMap.wards[p.ward_id]?.ward_name || "—"}</div>
                  <div className="text-zinc-500">{mastersMap.zones[p.zone_id]?.zone_name || "—"}</div>
                </td>
                <td className="p-3 font-mono">{p.carpet_area_sqm} sqm</td>
                <td className="p-3 font-mono">{inr(p.computed?.alv)}</td>
                <td className="p-3 font-mono">{inr(p.computed?.rv)}</td>
                <td className="p-3 font-mono text-[#FF4500] font-semibold">{inr(p.computed?.total_tax)}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => recompute(p.id)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="Recompute" data-testid={`prop-recompute-${p.id}`}><ArrowsClockwise size={12} /></button>
                    <button onClick={() => setEditing(p)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="Edit" data-testid={`prop-edit-${p.id}`}><Pencil size={12} /></button>
                    <button onClick={() => onDelete(p.id)} className="px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500]" title="Delete" data-testid={`prop-del-${p.id}`}><Trash size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-sm">// NO PROPERTIES — CLICK "NEW PROPERTY" TO ADD ONE</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
