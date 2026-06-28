import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { toast } from "sonner";
import { Printer, ClipboardText, X, Plus } from "@phosphor-icons/react";

function NoticeView({ item, onClose }) {
  if (!item) return null;
  const p = item.property || {};
  const c = item.computed || {};
  const today = new Date().toLocaleDateString();
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose} data-testid="notice-view">
      <div className="bg-white border-2 border-black brutal-shadow max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-black no-print">
          <div>
            <div className="mono-label">SPECIAL NOTICE</div>
            <h3 className="font-heading font-bold text-xl mt-1">{item.notice_no}</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-[#FF4500] text-white hover:bg-black px-3 py-2 font-mono uppercase text-xs tracking-wider flex items-center gap-2" data-testid="notice-print"><Printer size={14}/> Print</button>
            <button onClick={onClose} className="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white"><X size={16}/></button>
          </div>
        </div>

        <div className="p-8 print:p-0">
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="font-heading font-black text-2xl tracking-tighter">MUNICIPAL COUNCIL / CORPORATION</h1>
            <div className="mono-label mt-1">SPECIAL NOTICE OF PROPERTY TAX — Section 167, MMC Act</div>
            <div className="font-mono text-sm mt-2">Notice No: <b>{item.notice_no}</b> &nbsp;·&nbsp; FY: <b>{item.fy_label}</b> &nbsp;·&nbsp; Date: <b>{today}</b></div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div><div className="mono-label">PROPERTY NO</div><div className="font-mono">{p.property_no}</div></div>
            <div><div className="mono-label">OWNER</div><div>{p.owner_name}</div></div>
            <div className="col-span-2"><div className="mono-label">ADDRESS</div><div>{p.address}</div></div>
            <div><div className="mono-label">CARPET AREA</div><div className="font-mono">{p.carpet_area_sqm} sqm</div></div>
            <div><div className="mono-label">YEAR BUILT</div><div className="font-mono">{p.year_built} ({c.years_old}y old)</div></div>
            <div><div className="mono-label">ZONE</div><div>{c.factors_snapshot?.zone}</div></div>
            <div><div className="mono-label">USAGE / CONSTRUCTION</div><div>{c.factors_snapshot?.usage_type} · {c.factors_snapshot?.construction_type}</div></div>
          </div>

          <div className="mt-6 border border-black">
            <div className="bg-black text-white p-2 font-mono text-xs uppercase tracking-widest">ASSESSMENT</div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-zinc-200"><td className="p-2 mono-label">Base ALV</td><td className="p-2 font-mono text-right">{inr(c.base_alv)}</td></tr>
                <tr className="border-b border-zinc-200"><td className="p-2 mono-label">Less: Depreciation ({c.depreciation_pct}%)</td><td className="p-2 font-mono text-right">→</td></tr>
                <tr className="border-b border-zinc-200"><td className="p-2 mono-label font-medium">ALV</td><td className="p-2 font-mono text-right">{inr(c.alv)}</td></tr>
                <tr className="border-b border-zinc-200"><td className="p-2 mono-label">Less: Statutory deduction ({c.rates_snapshot?.statutory_deduction_pct}%)</td><td className="p-2 font-mono text-right">→</td></tr>
                <tr className="border-b-2 border-black bg-zinc-50"><td className="p-2 font-bold">Rateable Value (RV)</td><td className="p-2 font-mono text-right font-bold">{inr(c.rv)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 border border-black">
            <div className="bg-black text-white p-2 font-mono text-xs uppercase tracking-widest">TAX BREAKUP</div>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(c.breakup || {}).map(([k, v]) => (
                  <tr key={k} className="border-b border-zinc-200"><td className="p-2">{k.replace(/_/g," ").replace(/\b\w/g, l=>l.toUpperCase())}</td><td className="p-2 font-mono text-right">{inr(v)}</td></tr>
                ))}
                <tr className="border-t-2 border-black bg-[#FF4500] text-white"><td className="p-2 font-bold">TOTAL DEMAND</td><td className="p-2 font-mono text-right font-bold">{inr(c.total_tax)}</td></tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-zinc-700 mt-6">
            You are hereby informed under Section 167 of the Maharashtra Municipal Corporations Act / Maharashtra Municipal Councils Act
            that the rateable value and property tax of the above property has been provisionally assessed as shown.
            Any complaint or objection may be filed in writing within twenty-one (21) days from the date of this notice.
          </p>
          <div className="mt-10 flex justify-end">
            <div className="text-right">
              <div className="border-t border-black w-48 ml-auto mt-12 pt-1 font-mono text-xs uppercase">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } body * { visibility: hidden; } [data-testid="notice-view"], [data-testid="notice-view"] * { visibility: visible; } [data-testid="notice-view"] { position: absolute; left: 0; top: 0; width: 100%; background: white; } }`}</style>
    </div>
  );
}

export default function PTNotices() {
  const [items, setItems] = useState([]);
  const [props, setProps] = useState([]);
  const [view, setView] = useState(null);
  const [genForm, setGenForm] = useState({ property_id: "", fy: new Date().getFullYear() });
  const [bulk, setBulk] = useState({ ward_id: "", zone_id: "", financial_year: new Date().getFullYear() });
  const [masters, setMasters] = useState({ wards: [], zones: [] });

  const load = async () => { const { data } = await ptApi.notices.list(); setItems(data); };

  useEffect(() => {
    load();
    ptApi.properties.list().then(({ data }) => setProps(data));
    Promise.all([ptApi.wards.list(), ptApi.zones.list()])
      .then(([w, z]) => setMasters({ wards: w.data, zones: z.data }));
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    if (!genForm.property_id) return toast.error("Pick a property");
    try { await ptApi.notices.generate(genForm.property_id, Number(genForm.fy)); toast.success("Notice generated"); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const generateBulk = async (e) => {
    e.preventDefault();
    try {
      const { data } = await ptApi.notices.bulk({
        ward_id: bulk.ward_id || null,
        zone_id: bulk.zone_id || null,
        financial_year: Number(bulk.financial_year),
      });
      toast.success(`Generated ${data.created} notices`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-03" title="Special Notices" subtitle="Generate Section 167 notices (single or bulk) and print." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <form onSubmit={generate} className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">SINGLE / BY PROPERTY</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={genForm.property_id} onChange={(e) => setGenForm({ ...genForm, property_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white md:col-span-2" data-testid="notice-prop">
              <option value="">— pick property —</option>
              {props.map((p) => <option key={p.id} value={p.id}>{p.property_no} · {p.owner_name}</option>)}
            </select>
            <input type="number" min="2000" max="2100" value={genForm.fy} onChange={(e) => setGenForm({ ...genForm, fy: e.target.value })} placeholder="FY (e.g., 2025)" className="border border-zinc-300 px-3 py-2" data-testid="notice-fy" />
          </div>
          <button className="mt-3 bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="notice-generate"><Plus size={14}/> Generate Notice</button>
        </form>

        <form onSubmit={generateBulk} className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">BULK / BY WARD or ZONE</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={bulk.ward_id} onChange={(e) => setBulk({ ...bulk, ward_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="notice-bulk-ward">
              <option value="">All wards</option>
              {masters.wards.map((w) => <option key={w.id} value={w.id}>{w.ward_no} · {w.ward_name}</option>)}
            </select>
            <select value={bulk.zone_id} onChange={(e) => setBulk({ ...bulk, zone_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="notice-bulk-zone">
              <option value="">All zones</option>
              {masters.zones.map((z) => <option key={z.id} value={z.id}>{z.zone_no} · {z.zone_name}</option>)}
            </select>
            <input type="number" value={bulk.financial_year} onChange={(e) => setBulk({ ...bulk, financial_year: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="notice-bulk-fy" />
          </div>
          <button className="mt-3 bg-black text-white hover:bg-[#FF4500] px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="notice-bulk-go"><ClipboardText size={14}/> Generate Bulk</button>
        </form>
      </div>

      <div className="bg-white border border-zinc-200 mt-6">
        <table className="w-full text-sm" data-testid="notice-table">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
              <th className="p-3">Notice No</th><th className="p-3">Property</th><th className="p-3">FY</th><th className="p-3">RV</th><th className="p-3">Tax</th><th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-3 font-mono">{n.notice_no}</td>
                <td className="p-3">{n.property?.property_no} · {n.property?.owner_name}</td>
                <td className="p-3 font-mono">{n.fy_label}</td>
                <td className="p-3 font-mono">{inr(n.computed?.rv)}</td>
                <td className="p-3 font-mono text-[#FF4500] font-semibold">{inr(n.computed?.total_tax)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setView(n)} className="px-2 py-1 border border-black hover:bg-black hover:text-white font-mono text-xs uppercase" data-testid={`notice-view-${n.id}`}>VIEW</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-500 font-mono text-sm">// NO NOTICES YET</td></tr>}
          </tbody>
        </table>
      </div>

      <NoticeView item={view} onClose={() => setView(null)} />
    </div>
  );
}
