import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { api } from "@/lib/api";
import { Printer } from "@phosphor-icons/react";

/* ---------------- Draft Tax Assessment List (Marathi) ---------------- */
const DRAFT_COLS = [
  { k: "s_no",              en: "S.No.",            mr: "अ.क्र" },
  { k: "zone",              en: "Zone",             mr: "झोन" },
  { k: "old_ward",          en: "Old Ward",         mr: "जुना वाड" },
  { k: "old_property_no",   en: "Old Prop No",      mr: "जुना मालमत्ता क्र" },
  { k: "ward",              en: "Ward",             mr: "वाड" },
  { k: "property_no",       en: "Property No",      mr: "मालमत्ता क्र" },
  { k: "city_survey_no",    en: "C.S. No.",         mr: "सी.स.नं" },
  { k: "property_desc",     en: "Description",      mr: "मालमत्ता वर्णन" },
  { k: "occupier_name",     en: "Occupier / Owner", mr: "भोगवटादाराचे नाव" },
  { k: "mobile",            en: "Mobile",           mr: "मोबाईल क्र" },
  { k: "aadhaar",           en: "Aadhaar",          mr: "आधार क्र" },
  { k: "property_address",  en: "Address",          mr: "मालमत्ता पत्ता" },
  { k: "area_sqm",          en: "Area (sqm)",       mr: "क्षेत्रफळ चौ.मी" },
  { k: "floor",             en: "Floor",            mr: "मजला" },
  { k: "year_built",        en: "Yr Built",         mr: "बांधकामाचे वर्ष" },
  { k: "construction_type", en: "Const Type",       mr: "बांधकामाचे प्रकार" },
  { k: "usage",             en: "Usage",            mr: "उपयोग" },
  { k: "built_up_area",     en: "Built-up",         mr: "बांधकाम क्षेत्रफळ" },
  { k: "rate",              en: "Rate",             mr: "दर" },
  { k: "alv",               en: "ALV",              mr: "वार्षिक करयोग्य मूल्य" },
  { k: "rv",                en: "RV",               mr: "करयोग्य मूल्य" },
];
const DRAFT_TAX_COLS = [
  { k: "education_tax",    mr: "शिक्षण कर",        en: "Edu" },
  { k: "employment_tax",   mr: "रोजगार हमी कर",   en: "Emp Grtee" },
  { k: "tree_tax",         mr: "वृक्ष कर",         en: "Tree" },
  { k: "fire_tax",         mr: "अग्निशमन कर",     en: "Fire" },
  { k: "sanitation_tax",   mr: "स्वच्छता कर",     en: "Sanit" },
  { k: "environment_tax",  mr: "पर्यावरण कर",     en: "Env" },
  { k: "street_light_tax", mr: "दिवा बत्ती कर",   en: "Lights" },
];

function num(v) {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return Number(n.toFixed(2)).toLocaleString("en-IN");
}

function DraftAssessment({ data }) {
  if (!data) return <div className="mt-6 font-mono text-sm text-zinc-500">// CLICK RUN TO LOAD</div>;
  return (
    <div className="mt-6 bg-white border border-zinc-200" data-testid="draft-report">
      <div className="text-center p-4 border-b-2 border-black">
        <div className="font-heading font-black text-xl tracking-tight">
          {data.ward_label ? `वाड क्र. ${data.ward_label}` : "वाड क्र. — सर्व"} — प्रारुप करमूल्यांकन यादी
        </div>
        <div className="mono-label mt-1">कोरपना नगरपंचायत कोरपना · DRAFT TAX ASSESSMENT LIST</div>
        {data.zone_label && <div className="mono-label mt-1">ZONE: {data.zone_label}</div>}
        <div className="mono-label mt-1">TOTAL PROPERTIES: {data.count}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="text-[11px] border-collapse" style={{ minWidth: "1800px" }} data-testid="draft-table">
          <thead>
            <tr className="bg-zinc-900 text-white">
              {DRAFT_COLS.map((c) => (
                <th key={c.k} className="border border-zinc-700 p-1 text-left align-top">
                  <div className="font-bold leading-tight">{c.mr}</div>
                  <div className="font-mono uppercase text-[9px] opacity-70">{c.en}</div>
                </th>
              ))}
              <th className="border border-zinc-700 p-1 text-center bg-[#0EA5E9]" colSpan={DRAFT_TAX_COLS.length}>
                <div className="font-bold leading-tight">आकारात आलेल्या करांच्या रकमा</div>
                <div className="font-mono uppercase text-[9px] opacity-90">TAX COMPONENTS (₹)</div>
              </th>
              <th className="border border-zinc-700 p-1 text-right align-top bg-[#FF4500]">
                <div className="font-bold leading-tight">एकूण कर</div>
                <div className="font-mono uppercase text-[9px] opacity-90">Total</div>
              </th>
            </tr>
            <tr className="bg-zinc-100">
              {DRAFT_COLS.map((c) => <th key={`b-${c.k}`} className="border border-zinc-300 p-1"></th>)}
              {DRAFT_TAX_COLS.map((c) => (
                <th key={c.k} className="border border-zinc-300 p-1 text-right">
                  <div className="font-bold leading-tight">{c.mr}</div>
                  <div className="font-mono uppercase text-[9px] opacity-70">{c.en}</div>
                </th>
              ))}
              <th className="border border-zinc-300 p-1"></th>
            </tr>
          </thead>
          <tbody>
            {(data.rows || []).map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                {DRAFT_COLS.map((c) => (
                  <td key={c.k} className={`border border-zinc-200 p-1 align-top ${["area_sqm","year_built","built_up_area","rate","alv","rv","s_no"].includes(c.k) ? "text-right font-mono" : ""}`}>
                    {c.k === "area_sqm" || c.k === "built_up_area" || c.k === "rate" || c.k === "alv" || c.k === "rv" ? num(r[c.k]) : (r[c.k] ?? "")}
                  </td>
                ))}
                {DRAFT_TAX_COLS.map((c) => (
                  <td key={c.k} className="border border-zinc-200 p-1 text-right font-mono">{num(r[c.k])}</td>
                ))}
                <td className="border border-zinc-200 p-1 text-right font-mono font-semibold text-[#0EA5E9]">{num(r.total_tax)}</td>
              </tr>
            ))}
            {data.rows?.length === 0 && (
              <tr><td colSpan={DRAFT_COLS.length + DRAFT_TAX_COLS.length + 1} className="p-6 text-center text-zinc-500 font-mono">// NO PROPERTIES MATCH FILTER</td></tr>
            )}
            {/* Totals row */}
            {data.rows?.length > 0 && (
              <tr className="bg-zinc-900 text-white font-bold">
                <td colSpan={DRAFT_COLS.length - 2} className="border border-zinc-700 p-1 text-right">TOTAL / एकूण</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.alv)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.rv)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.education)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.employment)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.tree)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.fire)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.sanitation)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.environment)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono">{num(data.totals.street_light)}</td>
                <td className="border border-zinc-700 p-1 text-right font-mono text-[#FF4500]">{num(data.totals.total_tax)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABS = [
  { k: "demand",      label: "Demand Register" },
  { k: "collection",  label: "Collection" },
  { k: "defaulters",  label: "Defaulters" },
  { k: "draft",       label: "Draft Assessment (प्रारुप करमुल्यांकन यादी)" },
];

export default function PTReports() {
  const [tab, setTab] = useState("demand");
  const [fy, setFy] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [masters, setMasters] = useState({ wards: [], zones: [] });
  const [filter, setFilter] = useState({ ward_id: "", zone_id: "" });

  const load = async () => {
    let res;
    if (tab === "demand")          res = await ptApi.reports.demand({ financial_year: fy || undefined, ward_id: filter.ward_id || undefined, zone_id: filter.zone_id || undefined });
    else if (tab === "collection") res = await ptApi.reports.collection({ financial_year: fy || undefined });
    else if (tab === "defaulters") res = await ptApi.reports.defaulters();
    else if (tab === "draft")      res = await api.get("/pt/reports/draft-assessment", { params: { ward_id: filter.ward_id || undefined, zone_id: filter.zone_id || undefined } });
    setData(res.data);
  };

  useEffect(() => {
    Promise.all([ptApi.wards.list(), ptApi.zones.list()]).then(([w, z]) => setMasters({ wards: w.data, zones: z.data }));
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const StatBar = ({ data }) => {
    if (!data) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div className="border border-zinc-200 p-4 bg-white"><div className="mono-label">ROWS</div><div className="font-mono text-2xl mt-1">{data.count}</div></div>
        {data.total_demand != null && <div className="border border-zinc-200 p-4 bg-white"><div className="mono-label">TOTAL DEMAND</div><div className="font-mono text-2xl mt-1">{inr(data.total_demand)}</div></div>}
        {data.total_collected != null && <div className="border border-zinc-200 p-4 bg-white"><div className="mono-label">COLLECTED</div><div className="font-mono text-2xl mt-1 text-[#FF4500]">{inr(data.total_collected)}</div></div>}
        {data.total_outstanding != null && <div className="border border-zinc-200 p-4 bg-white"><div className="mono-label">OUTSTANDING</div><div className="font-mono text-2xl mt-1 text-[#FF4500]">{inr(data.total_outstanding)}</div></div>}
      </div>
    );
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-05" title="Reports" subtitle="Demand register, collection summary and defaulter list."
        right={
          <button onClick={() => window.print()} className="bg-black text-white hover:bg-[#FF4500] px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="report-print">
            <Printer size={14}/> Print
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mt-6">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 font-mono uppercase text-xs tracking-wider border ${tab===t.k?"bg-black text-white border-black":"bg-white text-black border-zinc-300 hover:border-black"}`} data-testid={`report-tab-${t.k}`}>{t.label}</button>
        ))}
      </div>

      <div className="bg-white border border-zinc-200 mt-6 p-4 flex flex-wrap items-end gap-3 no-print">
        <div><label className="mono-label block mb-1">FY</label><input type="number" value={fy} onChange={(e) => setFy(e.target.value)} className="border border-zinc-300 px-3 py-2" data-testid="report-fy" /></div>
        {tab === "demand" && (
          <>
            <div>
              <label className="mono-label block mb-1">WARD</label>
              <select value={filter.ward_id} onChange={(e) => setFilter({ ...filter, ward_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="report-ward">
                <option value="">All</option>
                {masters.wards.map((w) => <option key={w.id} value={w.id}>{w.ward_no} · {w.ward_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mono-label block mb-1">ZONE</label>
              <select value={filter.zone_id} onChange={(e) => setFilter({ ...filter, zone_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="report-zone">
                <option value="">All</option>
                {masters.zones.map((z) => <option key={z.id} value={z.id}>{z.zone_no} · {z.zone_name}</option>)}
              </select>
            </div>
          </>
        )}
        <button onClick={load} className="bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="report-run">Run</button>
      </div>

      {/* For draft assessment also show ward filter (FY hidden) */}
      {tab === "draft" && (
        <div className="bg-white border border-zinc-200 mt-6 p-4 flex flex-wrap items-end gap-3 no-print">
          <div>
            <label className="mono-label block mb-1">WARD</label>
            <select value={filter.ward_id} onChange={(e) => setFilter({ ...filter, ward_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="draft-ward">
              <option value="">All</option>
              {masters.wards.map((w) => <option key={w.id} value={w.id}>{w.ward_no} · {w.ward_name}</option>)}
            </select>
          </div>
          <div>
            <label className="mono-label block mb-1">ZONE</label>
            <select value={filter.zone_id} onChange={(e) => setFilter({ ...filter, zone_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="draft-zone">
              <option value="">All</option>
              {masters.zones.map((z) => <option key={z.id} value={z.id}>{z.zone_no} · {z.zone_name}</option>)}
            </select>
          </div>
          <button onClick={load} className="bg-[#0EA5E9] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="draft-run">Run</button>
        </div>
      )}

      {tab === "draft" ? <DraftAssessment data={data} /> : (
        <>
          <StatBar data={data} />
          <div className="bg-white border border-zinc-200 mt-4">
            <table className="w-full text-sm" data-testid="report-table">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
                  <th className="p-3">Bill No</th><th className="p-3">Property</th><th className="p-3">FY</th><th className="p-3">Amount</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((b) => (
                  <tr key={b.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="p-3 font-mono">{b.bill_no}</td>
                    <td className="p-3">{b.property?.property_no} · {b.property?.owner_name}</td>
                    <td className="p-3 font-mono">{b.fy_label}</td>
                    <td className="p-3 font-mono">{inr(b.tax_amount)}</td>
                    <td className="p-3 font-mono uppercase text-xs">{b.status}</td>
                  </tr>
                ))}
                {(!data || data.rows?.length === 0) && <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">// NO DATA</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A3 landscape; margin: 8mm; }
        }
      `}</style>
    </div>
  );
}
