import React, { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Trash, Plus, FloppyDisk } from "@phosphor-icons/react";

/* ---------- Master groups (left vertical nav) ---------- */
const GROUPS = [
  {
    title: "GEOGRAPHY",
    items: [
      { k: "wards",         label: "Wards" },
      { k: "zones",         label: "Zones" },
    ],
  },
  {
    title: "VALUATION INPUTS",
    items: [
      { k: "construction",  label: "Construction Types" },
      { k: "constClasses",  label: "Construction Class Master" },
      { k: "usage",         label: "Usage Types" },
      { k: "age",           label: "Age Factors" },
      { k: "factorEntries", label: "Factor Entry" },
      { k: "standardRates", label: "Standard Rate Master" },
      { k: "readyReckoner", label: "Ready Reckoner Rate" },
    ],
  },
  {
    title: "VALUATION RULES",
    items: [
      { k: "valFormulas",   label: "Valuation Formula" },
      { k: "valMappings",   label: "Valuation Formula Mapping" },
    ],
  },
  {
    title: "TAX & CHARGES",
    items: [
      { k: "rates",         label: "Tax Rates (Global)" },
      { k: "taxes",         label: "Tax Master" },
      { k: "taxDetails",    label: "Tax Master Details" },
      { k: "serviceCharges",label: "ServiceWise Charge Master" },
    ],
  },
  {
    title: "REBATES & EXEMPTIONS",
    items: [
      { k: "exemptions",    label: "Exemption Entry" },
      { k: "rebates",       label: "Rebate Master" },
      { k: "receiptRebates",label: "Receipt Rebate Entry" },
      { k: "abhay",         label: "Abhay Yojna Master" },
    ],
  },
];

/* ---------- Reusable bits ---------- */
function Section({ title, children, hint }) {
  return (
    <div className="bg-white border border-zinc-200 p-5">
      <div className="flex items-center justify-between">
        <div className="mono-label">{title}</div>
        {hint && <div className="mono-label text-zinc-400">{hint}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MasterTable({ rows, columns, onDelete, testidPrefix }) {
  return (
    <div className="border border-zinc-200 mt-4 overflow-x-auto">
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
              {columns.map((c) => <td key={c.k} className="p-3">{c.fmt ? c.fmt(r[c.k], r) : (r[c.k] ?? "—")}</td>)}
              <td className="p-3 text-right">
                <button onClick={() => onDelete(r.id)} className="inline-flex items-center gap-1 px-2 py-1 border border-black hover:bg-[#0EA5E9] hover:text-white hover:border-[#0EA5E9] font-mono text-xs uppercase" data-testid={`${testidPrefix}-del-${r.id}`}>
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

/* ---------- Generic master panel using REST endpoints ---------- */
function GenericPanel({ title, endpoint, fields, columns, testidPrefix, transformIn, transformRow }) {
  const [rows, setRows] = useState([]);
  const empty = useMemo(() => fields.reduce((a, f) => ({ ...a, [f.k]: f.def ?? "" }), {}), [fields]);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await api.get(`/pt/${endpoint}`);
    setRows(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [endpoint]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {};
    for (const f of fields) {
      let v = form[f.k];
      if (v === "" || v == null) { payload[f.k] = null; continue; }
      if (f.type === "number") v = Number(v);
      payload[f.k] = v;
    }
    try {
      await api.post(`/pt/${endpoint}`, transformIn ? transformIn(payload) : payload);
      toast.success("Added");
      setForm(empty);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try { await api.delete(`/pt/${endpoint}/${id}`); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <Section title={title} hint={`/api/pt/${endpoint}`}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2 items-end">
        {fields.map((f) => (
          f.type === "select" ? (
            <div key={f.k}>
              <label className="mono-label block mb-1">{f.label}</label>
              <select value={form[f.k] ?? ""} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid={`${testidPrefix}-${f.k}`}>
                <option value="">— pick —</option>
                {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ) : (
            <div key={f.k}>
              <label className="mono-label block mb-1">{f.label}</label>
              <input
                required={f.required}
                type={f.type === "number" ? "number" : f.type || "text"}
                step={f.step}
                value={form[f.k] ?? ""}
                onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}
                className="w-full border border-zinc-300 px-3 py-2"
                data-testid={`${testidPrefix}-${f.k}`}
              />
            </div>
          )
        ))}
        <button className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center justify-center gap-2" data-testid={`${testidPrefix}-add`}>
          <Plus size={14} /> Add
        </button>
      </form>
      <MasterTable rows={transformRow ? rows.map(transformRow) : rows} columns={columns} onDelete={del} testidPrefix={testidPrefix} />
    </Section>
  );
}

/* ---------- Existing geo masters (kept) ---------- */
function WardsPanel() {
  const [zones, setZones] = useState([]);
  useEffect(() => { ptApi.zones.list().then(({ data }) => setZones(data)); }, []);
  return (
    <GenericPanel
      title="WARDS"
      endpoint="wards"
      testidPrefix="ward"
      fields={[
        { k: "ward_no",   label: "Ward No",  required: true },
        { k: "ward_name", label: "Name",     required: true },
        { k: "zone_id",   label: "Zone",     type: "select", options: zones.map((z) => ({ value: z.id, label: `${z.zone_no} · ${z.zone_name}` })) },
      ]}
      columns={[
        { k: "ward_no", label: "Ward No" },
        { k: "ward_name", label: "Name" },
        { k: "zone_id", label: "Zone", fmt: (v) => zones.find((z) => z.id === v)?.zone_name || "—" },
      ]}
    />
  );
}

function ZonesPanel() {
  return (
    <GenericPanel
      title="ZONES" endpoint="zones" testidPrefix="zone"
      fields={[
        { k: "zone_no",   label: "Zone No", required: true },
        { k: "zone_name", label: "Name",    required: true },
        { k: "base_rate", label: "Base Rate ₹/sqm/yr", type: "number", step: "0.01", required: true, def: 100 },
      ]}
      columns={[
        { k: "zone_no", label: "No" },
        { k: "zone_name", label: "Name" },
        { k: "base_rate", label: "Base Rate", fmt: (v) => inr(v) },
      ]}
    />
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
    <Section title="TAX RATES / GLOBAL" hint="used for active assessment">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {F("general_tax_pct", "General Tax")}
        {F("water_tax_pct", "Water Tax")}
        {F("sewerage_tax_pct", "Sewerage Tax")}
        {F("education_cess_pct", "Education Cess")}
        {F("tree_cess_pct", "Tree Cess")}
        {F("statutory_deduction_pct", "Statutory Deduction (from ALV)")}
      </div>
      <button onClick={save} className="mt-4 bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="rate-save">
        <FloppyDisk size={14} /> Save Rates
      </button>
    </Section>
  );
}

/* ---------- Page ---------- */
export default function PTMasters() {
  const [tab, setTab] = useState("wards");
  const [refs, setRefs] = useState({ usage: [], construction: [], wards: [], zones: [], taxes: [], formulas: [] });

  useEffect(() => {
    (async () => {
      const [u, c, w, z, t, f] = await Promise.all([
        ptApi.usage.list(),
        ptApi.construction.list(),
        ptApi.wards.list(),
        ptApi.zones.list(),
        api.get("/pt/taxes"),
        api.get("/pt/valuation-formulas"),
      ]);
      setRefs({ usage: u.data, construction: c.data, wards: w.data, zones: z.data, taxes: t.data, formulas: f.data });
    })();
  }, [tab]);

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-01" title="Masters" subtitle="Configure every rule the assessment engine depends on." />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 mt-6">
        {/* Left vertical nav */}
        <aside className="bg-white border border-zinc-200" data-testid="masters-nav">
          {GROUPS.map((g) => (
            <div key={g.title} className="border-b border-zinc-100 py-2">
              <div className="px-4 py-2 mono-label text-zinc-500">{g.title}</div>
              {g.items.map((it) => (
                <button
                  key={it.k}
                  onClick={() => setTab(it.k)}
                  data-testid={`master-nav-${it.k}`}
                  className={`w-full text-left px-4 py-2 text-sm font-mono uppercase tracking-wider border-l-2 ${
                    tab === it.k ? "bg-[#0EA5E9] text-white border-white" : "text-zinc-700 border-transparent hover:bg-zinc-50"
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div>
          {tab === "wards" && <WardsPanel />}
          {tab === "zones" && <ZonesPanel />}
          {tab === "construction" && (
            <GenericPanel title="CONSTRUCTION TYPES" endpoint="construction-types" testidPrefix="ct"
              fields={[
                { k: "name", label: "Name", required: true },
                { k: "factor", label: "Factor", type: "number", step: "0.01", required: true, def: 1 },
              ]}
              columns={[{ k: "name", label: "Name" }, { k: "factor", label: "Factor" }]}
            />
          )}
          {tab === "usage" && (
            <GenericPanel title="USAGE TYPES" endpoint="usage-types" testidPrefix="ut"
              fields={[
                { k: "name", label: "Name", required: true },
                { k: "factor", label: "Factor", type: "number", step: "0.01", required: true, def: 1 },
              ]}
              columns={[{ k: "name", label: "Name" }, { k: "factor", label: "Factor" }]}
            />
          )}
          {tab === "age" && (
            <GenericPanel title="AGE FACTORS (Depreciation %)" endpoint="age-factors" testidPrefix="age"
              fields={[
                { k: "min_age", label: "Min Years", type: "number", required: true, def: 0 },
                { k: "max_age", label: "Max Years", type: "number", required: true, def: 10 },
                { k: "depreciation_pct", label: "Depreciation %", type: "number", step: "0.01", required: true, def: 0 },
              ]}
              columns={[
                { k: "min_age", label: "Min Years" },
                { k: "max_age", label: "Max Years" },
                { k: "depreciation_pct", label: "Depreciation %" },
              ]}
            />
          )}
          {tab === "rates" && <RatesPanel />}

          {/* ---- New masters ---- */}
          {tab === "standardRates" && (
            <GenericPanel title="STANDARD RATE MASTER" endpoint="standard-rates" testidPrefix="srm"
              fields={[
                { k: "name", label: "Name", required: true },
                { k: "year", label: "Year", type: "number", required: true, def: new Date().getFullYear() },
                { k: "usage_type_id", label: "Usage Type", type: "select", options: refs.usage.map((x) => ({ value: x.id, label: x.name })) },
                { k: "construction_type_id", label: "Construction Type", type: "select", options: refs.construction.map((x) => ({ value: x.id, label: x.name })) },
                { k: "rate_per_sqm", label: "Rate ₹/sqm", type: "number", step: "0.01", required: true, def: 100 },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "name", label: "Name" },
                { k: "year", label: "Year" },
                { k: "usage_type_id", label: "Usage", fmt: (v) => refs.usage.find((x) => x.id === v)?.name || "—" },
                { k: "construction_type_id", label: "Construction", fmt: (v) => refs.construction.find((x) => x.id === v)?.name || "—" },
                { k: "rate_per_sqm", label: "Rate", fmt: (v) => inr(v) },
              ]}
            />
          )}

          {tab === "exemptions" && (
            <GenericPanel title="EXEMPTION ENTRY" endpoint="exemptions" testidPrefix="exm"
              fields={[
                { k: "name", label: "Name", required: true },
                { k: "category", label: "Category", type: "select", options: [
                  { value: "individual", label: "Individual" },
                  { value: "institutional", label: "Institutional" },
                  { value: "religious", label: "Religious / Charitable" },
                  { value: "other", label: "Other" },
                ]},
                { k: "exemption_pct", label: "Exemption %", type: "number", step: "0.01", required: true, def: 0 },
                { k: "max_amount", label: "Max Amount ₹", type: "number", step: "0.01" },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "name", label: "Name" },
                { k: "category", label: "Category" },
                { k: "exemption_pct", label: "Exempt %" },
                { k: "max_amount", label: "Max ₹", fmt: (v) => v != null ? inr(v) : "—" },
              ]}
            />
          )}

          {tab === "factorEntries" && (
            <GenericPanel title="FACTOR ENTRY" endpoint="factor-entries" testidPrefix="fe"
              fields={[
                { k: "name", label: "Name", required: true },
                { k: "factor_type", label: "Type", type: "select", options: [
                  { value: "occupancy", label: "Occupancy" },
                  { value: "location", label: "Location" },
                  { value: "depreciation", label: "Depreciation" },
                  { value: "amenity", label: "Amenity" },
                  { value: "other", label: "Other" },
                ]},
                { k: "value", label: "Value", type: "number", step: "0.01", required: true, def: 1 },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "name", label: "Name" },
                { k: "factor_type", label: "Type" },
                { k: "value", label: "Value" },
                { k: "remarks", label: "Remarks" },
              ]}
            />
          )}

          {tab === "readyReckoner" && (
            <GenericPanel title="READY RECKONER RATE" endpoint="ready-reckoner" testidPrefix="rrr"
              fields={[
                { k: "area_name", label: "Area / Locality", required: true },
                { k: "year", label: "Year", type: "number", required: true, def: new Date().getFullYear() },
                { k: "residential_rate", label: "Residential ₹/sqm", type: "number", step: "0.01" },
                { k: "commercial_rate", label: "Commercial ₹/sqm", type: "number", step: "0.01" },
                { k: "industrial_rate", label: "Industrial ₹/sqm", type: "number", step: "0.01" },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "area_name", label: "Area" },
                { k: "year", label: "Year" },
                { k: "residential_rate", label: "Residential", fmt: (v) => v != null ? inr(v) : "—" },
                { k: "commercial_rate", label: "Commercial", fmt: (v) => v != null ? inr(v) : "—" },
                { k: "industrial_rate", label: "Industrial", fmt: (v) => v != null ? inr(v) : "—" },
              ]}
            />
          )}

          {tab === "receiptRebates" && (
            <GenericPanel title="RECEIPT REBATE ENTRY" endpoint="receipt-rebates" testidPrefix="rrb"
              fields={[
                { k: "name", label: "Name", required: true },
                { k: "rebate_pct", label: "Rebate %", type: "number", step: "0.01", required: true, def: 0 },
                { k: "valid_from", label: "Valid From", type: "date" },
                { k: "valid_to", label: "Valid To", type: "date" },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "name", label: "Name" },
                { k: "rebate_pct", label: "Rebate %" },
                { k: "valid_from", label: "From" },
                { k: "valid_to", label: "To" },
              ]}
            />
          )}

          {tab === "serviceCharges" && (
            <GenericPanel title="SERVICEWISE CHARGE MASTER" endpoint="service-charges" testidPrefix="sc"
              fields={[
                { k: "service_name", label: "Service", required: true },
                { k: "usage_type_id", label: "Usage", type: "select", options: refs.usage.map((x) => ({ value: x.id, label: x.name })) },
                { k: "rate", label: "Rate", type: "number", step: "0.01", required: true, def: 0 },
                { k: "unit", label: "Unit", type: "select", options: [
                  { value: "per_sqm", label: "₹ per sqm" },
                  { value: "flat",    label: "Flat ₹" },
                  { value: "pct_rv",  label: "% of RV" },
                ]},
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "service_name", label: "Service" },
                { k: "usage_type_id", label: "Usage", fmt: (v) => refs.usage.find((x) => x.id === v)?.name || "—" },
                { k: "rate", label: "Rate" },
                { k: "unit", label: "Unit" },
              ]}
            />
          )}

          {tab === "taxes" && (
            <GenericPanel title="TAX MASTER" endpoint="taxes" testidPrefix="tx"
              fields={[
                { k: "tax_code", label: "Tax Code", required: true },
                { k: "tax_name", label: "Tax Name", required: true },
                { k: "calculation_type", label: "Type", type: "select", options: [
                  { value: "percentage", label: "Percentage" },
                  { value: "fixed",      label: "Fixed ₹" },
                ]},
                { k: "default_rate", label: "Default Rate", type: "number", step: "0.01", required: true, def: 0 },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "tax_code", label: "Code" },
                { k: "tax_name", label: "Name" },
                { k: "calculation_type", label: "Type" },
                { k: "default_rate", label: "Rate" },
              ]}
            />
          )}

          {tab === "taxDetails" && (
            <GenericPanel title="TAX MASTER DETAILS (Slabs)" endpoint="tax-details" testidPrefix="txd"
              fields={[
                { k: "tax_master_id", label: "Tax", type: "select", required: true, options: refs.taxes.map((t) => ({ value: t.id, label: `${t.tax_code} · ${t.tax_name}` })) },
                { k: "slab_from", label: "Slab From ₹", type: "number", step: "0.01", required: true, def: 0 },
                { k: "slab_to", label: "Slab To ₹", type: "number", step: "0.01" },
                { k: "rate", label: "Rate %", type: "number", step: "0.01", required: true, def: 0 },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "tax_master_id", label: "Tax", fmt: (v) => refs.taxes.find((t) => t.id === v)?.tax_name || "—" },
                { k: "slab_from", label: "From" },
                { k: "slab_to", label: "To" },
                { k: "rate", label: "Rate %" },
              ]}
            />
          )}

          {tab === "valFormulas" && (
            <GenericPanel title="VALUATION FORMULA" endpoint="valuation-formulas" testidPrefix="vf"
              fields={[
                { k: "formula_code", label: "Code", required: true },
                { k: "formula_name", label: "Name", required: true },
                { k: "formula_expression", label: "Expression (info)" },
                { k: "description", label: "Description" },
              ]}
              columns={[
                { k: "formula_code", label: "Code" },
                { k: "formula_name", label: "Name" },
                { k: "formula_expression", label: "Expression" },
              ]}
            />
          )}

          {tab === "valMappings" && (
            <GenericPanel title="VALUATION FORMULA MAPPING" endpoint="valuation-mappings" testidPrefix="vm"
              fields={[
                { k: "formula_id", label: "Formula", type: "select", required: true, options: refs.formulas.map((f) => ({ value: f.id, label: `${f.formula_code} · ${f.formula_name}` })) },
                { k: "ward_id", label: "Ward", type: "select", options: refs.wards.map((w) => ({ value: w.id, label: w.ward_name })) },
                { k: "zone_id", label: "Zone", type: "select", options: refs.zones.map((z) => ({ value: z.id, label: z.zone_name })) },
                { k: "usage_type_id", label: "Usage", type: "select", options: refs.usage.map((u) => ({ value: u.id, label: u.name })) },
                { k: "effective_from", label: "Effective From", type: "date" },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "formula_id", label: "Formula", fmt: (v) => refs.formulas.find((f) => f.id === v)?.formula_name || "—" },
                { k: "ward_id", label: "Ward", fmt: (v) => refs.wards.find((w) => w.id === v)?.ward_name || "—" },
                { k: "zone_id", label: "Zone", fmt: (v) => refs.zones.find((z) => z.id === v)?.zone_name || "—" },
                { k: "usage_type_id", label: "Usage", fmt: (v) => refs.usage.find((u) => u.id === v)?.name || "—" },
                { k: "effective_from", label: "Effective From" },
              ]}
            />
          )}

          {tab === "rebates" && (
            <GenericPanel title="REBATE MASTER" endpoint="rebates" testidPrefix="rb"
              fields={[
                { k: "scheme_name", label: "Scheme", required: true },
                { k: "rebate_pct", label: "Rebate %", type: "number", step: "0.01", required: true, def: 0 },
                { k: "valid_from", label: "Valid From", type: "date" },
                { k: "valid_to", label: "Valid To", type: "date" },
                { k: "conditions", label: "Conditions" },
              ]}
              columns={[
                { k: "scheme_name", label: "Scheme" },
                { k: "rebate_pct", label: "Rebate %" },
                { k: "valid_from", label: "From" },
                { k: "valid_to", label: "To" },
              ]}
            />
          )}

          {tab === "constClasses" && (
            <GenericPanel title="CONSTRUCTION CLASS MASTER" endpoint="construction-classes" testidPrefix="cc"
              fields={[
                { k: "class_code", label: "Class Code", required: true },
                { k: "class_name", label: "Class Name", required: true },
                { k: "factor", label: "Factor", type: "number", step: "0.01", required: true, def: 1 },
                { k: "remarks", label: "Remarks" },
              ]}
              columns={[
                { k: "class_code", label: "Code" },
                { k: "class_name", label: "Name" },
                { k: "factor", label: "Factor" },
              ]}
            />
          )}

          {tab === "abhay" && (
            <GenericPanel title="ABHAY YOJNA MASTER" endpoint="abhay-yojna" testidPrefix="ay"
              fields={[
                { k: "scheme_name", label: "Scheme", required: true },
                { k: "waiver_pct", label: "Waiver % (penalty)", type: "number", step: "0.01", required: true, def: 0 },
                { k: "interest_waiver_pct", label: "Interest Waiver %", type: "number", step: "0.01", def: 0 },
                { k: "valid_from", label: "Valid From", type: "date" },
                { k: "valid_to", label: "Valid To", type: "date" },
                { k: "conditions", label: "Conditions" },
              ]}
              columns={[
                { k: "scheme_name", label: "Scheme" },
                { k: "waiver_pct", label: "Waiver %" },
                { k: "interest_waiver_pct", label: "Interest Waiver %" },
                { k: "valid_from", label: "From" },
                { k: "valid_to", label: "To" },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
