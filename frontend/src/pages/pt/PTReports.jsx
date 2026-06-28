import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { Printer } from "@phosphor-icons/react";

const TABS = [
  { k: "demand",      label: "Demand Register" },
  { k: "collection",  label: "Collection" },
  { k: "defaulters",  label: "Defaulters" },
];

export default function PTReports() {
  const [tab, setTab] = useState("demand");
  const [fy, setFy] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [masters, setMasters] = useState({ wards: [], zones: [] });
  const [filter, setFilter] = useState({ ward_id: "", zone_id: "" });

  const load = async () => {
    let res;
    if (tab === "demand")     res = await ptApi.reports.demand({ financial_year: fy || undefined, ward_id: filter.ward_id || undefined, zone_id: filter.zone_id || undefined });
    else if (tab === "collection") res = await ptApi.reports.collection({ financial_year: fy || undefined });
    else                      res = await ptApi.reports.defaulters();
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
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
