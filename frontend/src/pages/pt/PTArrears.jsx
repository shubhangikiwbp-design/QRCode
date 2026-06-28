import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { api } from "@/lib/api";
import { inr } from "@/lib/ptApi";
import { toast } from "sonner";
import { MagnifyingGlass, FloppyDisk, X, ArrowLeft } from "@phosphor-icons/react";

const SEARCH_TYPES = [
  { value: "property_no",         label: "Property No" },
  { value: "property_old_no",     label: "Old Property No" },
  { value: "manual_property_no",  label: "Manual Property No" },
];

function billYears() {
  const ys = [];
  const now = new Date().getFullYear();
  for (let y = now + 1; y >= now - 10; y--) ys.push(`${y}-${y + 1}`);
  return ys;
}

const EMPTY_LINES = {}; // populated dynamically from /arrears/schema

export default function PTArrears({ mode = "list" }) {
  // mode: "list" (Arrears Edit Entry node) | "new" (Arrears Entry node)
  const navigate = useNavigate();
  const { id } = useParams();

  const [schema, setSchema] = useState([]);
  const [searchType, setSearchType] = useState("property_no");
  const [searchValue, setSearchValue] = useState("");
  const [property, setProperty] = useState(null);
  const [form, setForm] = useState({
    bill_no: "",
    bill_year: billYears()[1],   // current FY
    bill_date: "",
    due_date: "",
    remarks: "",
    lines: {},
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load schema once
  useEffect(() => {
    api.get("/pt/arrears/schema").then(({ data }) => {
      setSchema(data);
      const lines = {};
      data.forEach((d) => { lines[d.key] = 0; });
      setForm((f) => ({ ...f, lines }));
    });
  }, []);

  // For list mode, load all arrears
  useEffect(() => {
    if (mode === "list" && !id) {
      api.get("/pt/arrears").then(({ data }) => setItems(data));
    }
  }, [mode, id]);

  // For edit (mode === "list" with id) — load arrears, populate form
  useEffect(() => {
    if (id) {
      (async () => {
        const { data } = await api.get(`/pt/arrears/${id}`);
        setProperty(data.property || null);
        const lines = {};
        schema.forEach((s) => { lines[s.key] = data[s.key] ?? 0; });
        setForm({
          bill_no: data.bill_no, bill_year: data.bill_year, bill_date: data.bill_date,
          due_date: data.due_date, remarks: data.remarks || "", lines,
        });
      })();
    }
  }, [id, schema]);

  const total = useMemo(() => {
    return Object.values(form.lines || {}).reduce((s, v) => s + (Number(v) || 0), 0);
  }, [form.lines]);

  const doLookup = async () => {
    if (!searchValue.trim()) return toast.error("Enter a value to search");
    setLoading(true);
    try {
      const { data } = await api.get(`/pt/property-lookup`, {
        params: { search_type: searchType, value: searchValue.trim() },
      });
      setProperty(data);
      toast.success(`Found ${data.property_no}`);
    } catch (e) {
      setProperty(null);
      toast.error(e.response?.data?.detail || "Property not found");
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!property) return toast.error("Search and select a property first");
    if (!form.bill_no.trim()) return toast.error("Bill No required");
    const payload = {
      property_id: property.id,
      bill_no: form.bill_no.trim(),
      bill_year: form.bill_year,
      bill_date: form.bill_date,
      due_date: form.due_date,
      remarks: form.remarks,
      ...form.lines,
    };
    try {
      if (id) {
        await api.put(`/pt/arrears/${id}`, payload);
        toast.success("Arrears updated");
      } else {
        await api.post(`/pt/arrears`, payload);
        toast.success("Arrears saved");
      }
      navigate("/pt/arrears");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const del = async (rid) => {
    if (!window.confirm("Delete this arrears entry?")) return;
    try { await api.delete(`/pt/arrears/${rid}`); toast.success("Deleted"); const { data } = await api.get("/pt/arrears"); setItems(data); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  /* ---------------- LIST mode (without id) ---------------- */
  if (mode === "list" && !id) {
    return (
      <div className="p-8 lg:p-12">
        <PageHeader index="PT-06" title="Arrears Edit Entry" subtitle="Browse and edit existing arrears entries."
          right={
            <button onClick={() => navigate("/pt/arrears/new")} className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="arrears-new-btn">
              + New Arrears Entry
            </button>
          }
        />
        <div className="bg-white border border-zinc-200 mt-6 overflow-x-auto">
          <table className="w-full text-sm" data-testid="arrears-table">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
                <th className="p-3">Bill No</th><th className="p-3">Property</th><th className="p-3">FY</th><th className="p-3">Bill Date</th><th className="p-3">Due Date</th><th className="p-3">Total</th><th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50" data-testid={`arrears-row-${a.id}`}>
                  <td className="p-3 font-mono">{a.bill_no}</td>
                  <td className="p-3">{a.property?.property_no} · {a.property?.owner_name}</td>
                  <td className="p-3 font-mono">{a.bill_year}</td>
                  <td className="p-3 font-mono text-xs">{a.bill_date}</td>
                  <td className="p-3 font-mono text-xs">{a.due_date}</td>
                  <td className="p-3 font-mono text-[#0EA5E9] font-semibold">{inr(a.total_amount)}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => navigate(`/pt/arrears/${a.id}`)} className="px-2 py-1 border border-black hover:bg-black hover:text-white font-mono text-xs uppercase" data-testid={`arrears-edit-${a.id}`}>Edit</button>
                      <button onClick={() => del(a.id)} className="px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500] font-mono text-xs uppercase" data-testid={`arrears-del-${a.id}`}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-sm">// NO ARREARS ENTRIES YET</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---------------- ENTRY / EDIT mode ---------------- */
  return (
    <div className="p-8 lg:p-12">
      <PageHeader
        index="PT-06"
        title={id ? "Edit Arrears Entry" : "New Property Arrears Entry"}
        subtitle="Enter pre-existing dues (arrears) for newly added properties — tax component-wise."
        right={
          <button onClick={() => navigate("/pt/arrears")} className="bg-white text-black border border-black hover:bg-black hover:text-white px-3 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="arrears-back">
            <ArrowLeft size={14}/> Back
          </button>
        }
      />

      <form onSubmit={submit} className="mt-6 space-y-6" data-testid="arrears-form">
        {/* Property lookup */}
        {!id && (
          <section className="bg-white border border-zinc-200 p-5">
            <div className="mono-label mb-3">LOOKUP / 01 — Find property</div>
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_140px] gap-2">
              <select value={searchType} onChange={(e) => setSearchType(e.target.value)} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="arrears-search-type">
                {SEARCH_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex items-center border border-zinc-300 px-3">
                <MagnifyingGlass size={16}/>
                <input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="Enter value…" className="flex-1 px-2 py-2 outline-none bg-transparent" data-testid="arrears-search-value" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doLookup(); } }} />
              </div>
              <button type="button" onClick={doLookup} disabled={loading} className="bg-black text-white hover:bg-[#0EA5E9] px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="arrears-search-go">
                {loading ? "…" : "Search"}
              </button>
            </div>
          </section>
        )}

        {/* Property details (read-only after lookup) */}
        <section className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">PROPERTY / 02</div>
          {!property && <div className="text-sm text-zinc-500 font-mono">// SEARCH A PROPERTY TO FILL THESE FIELDS</div>}
          {property && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <RO label="Property No" value={property.property_no} testid="ro-property-no" />
              <RO label="Old Property No" value={property.property_old_no} testid="ro-old-no" />
              <RO label="Manual Property No" value={property.manual_property_no} testid="ro-manual-no" />
              <RO label="Owner Name" value={property.owner_name} testid="ro-owner" />
              <div className="md:col-span-2"><RO label="Owner Address" value={property.address} testid="ro-address" /></div>
            </div>
          )}
        </section>

        {/* Bill meta */}
        <section className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">BILL META / 03</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="mono-label block mb-1">Bill No <span className="text-[#FF4500]">*</span></label>
              <input required value={form.bill_no} onChange={(e) => setForm({ ...form, bill_no: e.target.value })} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="arrears-bill-no" />
            </div>
            <div>
              <label className="mono-label block mb-1">Bill Year</label>
              <select value={form.bill_year} onChange={(e) => setForm({ ...form, bill_year: e.target.value })} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="arrears-bill-year">
                {billYears().map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="mono-label block mb-1">Bill Date</label>
              <input type="date" value={form.bill_date} onChange={(e) => setForm({ ...form, bill_date: e.target.value })} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="arrears-bill-date" />
            </div>
            <div>
              <label className="mono-label block mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="arrears-due-date" />
            </div>
          </div>
        </section>

        {/* Component table */}
        <section className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">COMPONENTS / 04 — enter arrears amount for each head</div>
          <div className="border border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm" data-testid="arrears-components-table">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
                  <th className="p-3 w-12">#</th>
                  <th className="p-3">Tax / Charge Head</th>
                  <th className="p-3 w-56 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {schema.map((s, idx) => (
                  <tr key={s.key} className="border-b border-zinc-100">
                    <td className="p-3 font-mono">{idx + 1}</td>
                    <td className="p-3">{s.label}</td>
                    <td className="p-3">
                      <input
                        type="number" step="0.01" min="0"
                        value={form.lines[s.key] ?? 0}
                        onChange={(e) => setForm({ ...form, lines: { ...form.lines, [s.key]: e.target.value } })}
                        className="w-full border border-zinc-300 px-3 py-2 text-right font-mono"
                        data-testid={`arrears-${s.key}`}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-900 text-white">
                  <td colSpan={2} className="p-3 font-mono uppercase tracking-widest text-xs">TOTAL AMOUNT</td>
                  <td className="p-3 text-right font-mono text-lg font-bold text-[#0EA5E9]" data-testid="arrears-total">{inr(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-2">REMARKS</div>
          <textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="w-full border border-zinc-300 px-3 py-2 bg-white" data-testid="arrears-remarks" />
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate("/pt/arrears")} className="bg-white text-black border border-black hover:bg-zinc-100 px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="arrears-cancel"><X size={14}/> Cancel</button>
          <button type="submit" className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="arrears-save"><FloppyDisk size={14}/> {id ? "Update Arrears" : "Save Arrears"}</button>
        </div>
      </form>
    </div>
  );
}

function RO({ label, value, testid }) {
  return (
    <div>
      <div className="mono-label">{label}</div>
      <div className="font-mono text-sm border border-zinc-200 bg-zinc-50 px-3 py-2 mt-1" data-testid={testid}>{value || "—"}</div>
    </div>
  );
}
