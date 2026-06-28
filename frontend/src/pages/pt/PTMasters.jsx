import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi } from "@/lib/ptApi";
import { toast } from "sonner";
import { Trash, Plus, FloppyDisk } from "@phosphor-icons/react";

const TABS = [
  { k: "wards", label: "Wards" },
  { k: "zones", label: "Zones" },
  { k: "construction", label: "Construction Types" },
  { k: "usage", label: "Usage Types" },
  { k: "age", label: "Age Factors" },
  { k: "rates", label: "Tax Rates" },
];

function Section({ title, children }) {
  return (
    <div className="bg-white border border-zinc-200 p-5">
      <div className="mono-label mb-3">{title}</div>
      {children}
    </div>
  );
}

function MasterTable({ rows, columns, onDelete, emptyText, testidPrefix }) {
  return (
    <div className="border border-zinc-200 mt-3">
      <table className="w-full text-sm" data-testid={`${testidPrefix}-table`}>
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
            {columns.map((c) => <th key={c.k} className="p-3">{c.label}</th>)}
            <th className="p-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 hover:bg-zinc-50">
              {columns.map((c) => <td key={c.k} className="p-3">{c.fmt ? c.fmt(r[c.k]) : r[c.k]}</td>)}
              <td className="p-3 text-right">
                <button onClick={() => onDelete(r.id)} className="inline-flex items-center gap-1 px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500] font-mono text-xs uppercase" data-testid={`${testidPrefix}-del-${r.id}`}>
                  <Trash size={12} /> DEL
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="p-6 text-center text-zinc-500 font-mono text-sm">// EMPTY</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function WardsPanel() {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ ward_no: "", ward_name: "", zone_id: "" });
  const load = async () => { const { data } = await ptApi.wards.list(); setRows(data); };
  useEffect(() => { load(); ptApi.zones.list().then(({ data }) => setZones(data)); }, []);
  const submit = async (e) => {
    e.preventDefault();
    try { await ptApi.wards.create({ ...form, zone_id: form.zone_id || null }); toast.success("Ward added"); setForm({ ward_no: "", ward_name: "", zone_id: "" }); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const del = async (id) => { if (!window.confirm("Delete ward?")) return; try { await ptApi.wards.del(id); load(); } catch (e) { toast.error(e.response?.data?.detail); } };
  return (
    <Section title="WARDS / ADD">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input required placeholder="Ward No (e.g., W1)" value={form.ward_no} onChange={(e) => setForm({ ...form, ward_no: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="ward-no" />
        <input required placeholder="Ward Name" value={form.ward_name} onChange={(e) => setForm({ ...form, ward_name: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="ward-name" />
        <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="ward-zone">
          <option value="">— No zone —</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.zone_no} · {z.zone_name}</option>)}
        </select>
        <button className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="ward-add"><Plus size={14} /> Add</button>
      </form>
      <MasterTable
        rows={rows}
        columns={[{k:"ward_no",label:"Ward No"},{k:"ward_name",label:"Name"},{k:"zone_id",label:"Zone", fmt:(z) => zones.find((x)=>x.id===z)?.zone_name || "—"}]}
        onDelete={del}
        emptyText="No wards yet."
        testidPrefix="ward"
      />
    </Section>
  );
}

function ZonesPanel() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ zone_no: "", zone_name: "", base_rate: 100 });
  const load = async () => { const { data } = await ptApi.zones.list(); setRows(data); };
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    try { await ptApi.zones.create({ ...form, base_rate: Number(form.base_rate) }); toast.success("Zone added"); setForm({ zone_no: "", zone_name: "", base_rate: 100 }); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const del = async (id) => { if (!window.confirm("Delete zone?")) return; try { await ptApi.zones.del(id); load(); } catch (e) { toast.error(e.response?.data?.detail); } };
  return (
    <Section title="ZONES / ADD">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input required placeholder="Zone No" value={form.zone_no} onChange={(e) => setForm({ ...form, zone_no: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="zone-no" />
        <input required placeholder="Zone Name" value={form.zone_name} onChange={(e) => setForm({ ...form, zone_name: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="zone-name" />
        <input required type="number" min="0" step="0.01" placeholder="Base rate ₹/sqm/year" value={form.base_rate} onChange={(e) => setForm({ ...form, base_rate: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="zone-rate" />
        <button className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid="zone-add"><Plus size={14} /> Add</button>
      </form>
      <MasterTable
        rows={rows}
        columns={[{k:"zone_no",label:"No"},{k:"zone_name",label:"Name"},{k:"base_rate",label:"Base Rate ₹/sqm"}]}
        onDelete={del}
        testidPrefix="zone"
      />
    </Section>
  );
}

function FactorPanel({ resource, title, fields, testidPrefix }) {
  const [rows, setRows] = useState([]);
  const empty = fields.reduce((a, f) => ({ ...a, [f.k]: f.def ?? "" }), {});
  const [form, setForm] = useState(empty);
  const load = async () => { const { data } = await resource.list(); setRows(data); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const submit = async (e) => {
    e.preventDefault();
    const payload = {};
    for (const f of fields) payload[f.k] = f.type === "number" ? Number(form[f.k]) : form[f.k];
    try { await resource.create(payload); toast.success("Added"); setForm(empty); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };
  const del = async (id) => { if (!window.confirm("Delete?")) return; try { await resource.del(id); load(); } catch (e) { toast.error(e.response?.data?.detail); } };
  return (
    <Section title={title}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {fields.map((f) => (
          <input key={f.k} required type={f.type || "text"} step={f.step} placeholder={f.label} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid={`${testidPrefix}-${f.k}`} />
        ))}
        <button className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider flex items-center justify-center gap-2" data-testid={`${testidPrefix}-add`}><Plus size={14} /> Add</button>
      </form>
      <MasterTable rows={rows} columns={fields.map((f) => ({ k: f.k, label: f.label }))} onDelete={del} testidPrefix={testidPrefix} />
    </Section>
  );
}

function RatesPanel() {
  const [r, setR] = useState(null);
  useEffect(() => { ptApi.rates.get().then(({ data }) => setR(data)); }, []);
  if (!r) return null;
  const save = async () => {
    try {
      await ptApi.rates.update({
        general_tax_pct: Number(r.general_tax_pct),
        water_tax_pct: Number(r.water_tax_pct),
        sewerage_tax_pct: Number(r.sewerage_tax_pct),
        education_cess_pct: Number(r.education_cess_pct),
        tree_cess_pct: Number(r.tree_cess_pct),
        statutory_deduction_pct: Number(r.statutory_deduction_pct),
      });
      toast.success("Tax rates updated");
    } catch (e) { toast.error("Failed"); }
  };
  const F = (k, label) => (
    <div>
      <label className="mono-label block mb-1">{label} (%)</label>
      <input type="number" min="0" step="0.01" value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} className="w-full border border-zinc-300 px-3 py-2" data-testid={`rate-${k}`} />
    </div>
  );
  return (
    <Section title="TAX RATES / GLOBAL">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {F("general_tax_pct", "General Tax")}
        {F("water_tax_pct", "Water Tax")}
        {F("sewerage_tax_pct", "Sewerage Tax")}
        {F("education_cess_pct", "Education Cess")}
        {F("tree_cess_pct", "Tree Cess")}
        {F("statutory_deduction_pct", "Statutory Deduction (from ALV)")}
      </div>
      <button onClick={save} className="mt-4 bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="rate-save">
        <FloppyDisk size={14} /> Save Rates
      </button>
    </Section>
  );
}

export default function PTMasters() {
  const [tab, setTab] = useState("wards");
  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-01" title="Masters" subtitle="Configure wards, zones, construction types, usage, age factors and tax rates." />
      <div className="flex flex-wrap gap-2 mt-6">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 font-mono uppercase text-xs tracking-wider border ${tab===t.k?"bg-black text-white border-black":"bg-white text-black border-zinc-300 hover:border-black"}`} data-testid={`pt-tab-${t.k}`}>{t.label}</button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "wards" && <WardsPanel />}
        {tab === "zones" && <ZonesPanel />}
        {tab === "construction" && (
          <FactorPanel resource={ptApi.construction} title="CONSTRUCTION TYPES" testidPrefix="ct"
            fields={[{k:"name",label:"Name"},{k:"factor",label:"Factor",type:"number",step:"0.01",def:1}]} />
        )}
        {tab === "usage" && (
          <FactorPanel resource={ptApi.usage} title="USAGE TYPES" testidPrefix="ut"
            fields={[{k:"name",label:"Name"},{k:"factor",label:"Factor",type:"number",step:"0.01",def:1}]} />
        )}
        {tab === "age" && (
          <FactorPanel resource={ptApi.age} title="AGE FACTORS (Depreciation %)" testidPrefix="age"
            fields={[
              {k:"min_age",label:"Min Years",type:"number",def:0},
              {k:"max_age",label:"Max Years",type:"number",def:0},
              {k:"depreciation_pct",label:"Depreciation %",type:"number",step:"0.01",def:0},
            ]} />
        )}
        {tab === "rates" && <RatesPanel />}
      </div>
    </div>
  );
}
