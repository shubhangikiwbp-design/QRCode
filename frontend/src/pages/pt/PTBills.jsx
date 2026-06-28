import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { toast } from "sonner";
import { Trash, CheckSquare, X, Printer, Plus, ClipboardText, Prohibit } from "@phosphor-icons/react";

function BillView({ item, onClose }) {
  if (!item) return null;
  const p = item.property || {};
  const c = item.computed || {};
  const today = new Date().toLocaleDateString();
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose} data-testid="bill-view">
      <div className="bg-white border-2 border-black brutal-shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-black no-print">
          <div>
            <div className="mono-label">PROPERTY TAX BILL</div>
            <h3 className="font-heading font-bold text-xl mt-1">{item.bill_no}</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-[#FF4500] text-white hover:bg-black px-3 py-2 font-mono uppercase text-xs tracking-wider flex items-center gap-2" data-testid="bill-print"><Printer size={14}/> Print</button>
            <button onClick={onClose} className="w-9 h-9 border border-black flex items-center justify-center hover:bg-black hover:text-white"><X size={16}/></button>
          </div>
        </div>
        <div className="p-8">
          <div className="text-center border-b-2 border-black pb-3">
            <h1 className="font-heading font-black text-2xl tracking-tighter">PROPERTY TAX DEMAND BILL</h1>
            <div className="mono-label mt-1">FY {item.fy_label} · Bill {item.bill_no} · {today}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div><div className="mono-label">PROPERTY NO</div><div className="font-mono">{p.property_no}</div></div>
            <div><div className="mono-label">OWNER</div><div>{p.owner_name}</div></div>
            <div className="col-span-2"><div className="mono-label">ADDRESS</div><div>{p.address}</div></div>
          </div>
          <table className="w-full text-sm mt-6 border border-black">
            <tbody>
              <tr className="border-b border-zinc-200"><td className="p-2 mono-label">ALV</td><td className="p-2 font-mono text-right">{inr(c.alv)}</td></tr>
              <tr className="border-b border-zinc-200"><td className="p-2 mono-label">Rateable Value (RV)</td><td className="p-2 font-mono text-right">{inr(c.rv)}</td></tr>
              {Object.entries(c.breakup || {}).map(([k, v]) => (
                <tr key={k} className="border-b border-zinc-200"><td className="p-2">{k.replace(/_/g," ").replace(/\b\w/g, l=>l.toUpperCase())}</td><td className="p-2 font-mono text-right">{inr(v)}</td></tr>
              ))}
              <tr className="border-t-2 border-black bg-[#FF4500] text-white"><td className="p-2 font-bold">AMOUNT DUE</td><td className="p-2 font-mono text-right font-bold">{inr(item.tax_amount)}</td></tr>
            </tbody>
          </table>
          {item.due_date && <div className="mt-4 text-sm">Due date: <b>{item.due_date}</b></div>}
          <div className="mt-2 text-sm">Status: <span className="font-mono uppercase font-bold">{item.status}</span></div>
        </div>
      </div>
      <style>{`@media print { .no-print { display: none !important; } body * { visibility: hidden; } [data-testid="bill-view"], [data-testid="bill-view"] * { visibility: visible; } [data-testid="bill-view"] { position: absolute; left: 0; top: 0; width: 100%; background: white; } }`}</style>
    </div>
  );
}

export default function PTBills() {
  const [items, setItems] = useState([]);
  const [props, setProps] = useState([]);
  const [masters, setMasters] = useState({ wards: [], zones: [] });
  const [view, setView] = useState(null);
  const [filter, setFilter] = useState({ status: "", fy: "" });
  const [gen, setGen] = useState({ property_id: "", fy: new Date().getFullYear(), due_date: "" });
  const [bulk, setBulk] = useState({ ward_id: "", zone_id: "", financial_year: new Date().getFullYear(), due_date: "" });

  const load = async () => {
    const params = {};
    if (filter.status) params.status = filter.status;
    if (filter.fy) params.financial_year = Number(filter.fy);
    const { data } = await ptApi.bills.list(params);
    setItems(data);
  };

  useEffect(() => {
    load();
    ptApi.properties.list().then(({ data }) => setProps(data));
    Promise.all([ptApi.wards.list(), ptApi.zones.list()])
      .then(([w, z]) => setMasters({ wards: w.data, zones: z.data }));
    // eslint-disable-next-line
  }, []);

  const single = async (e) => {
    e.preventDefault();
    if (!gen.property_id) return toast.error("Pick a property");
    try { await ptApi.bills.generate(gen.property_id, Number(gen.fy), gen.due_date || undefined); toast.success("Bill generated"); load(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const generateBulk = async (e) => {
    e.preventDefault();
    try {
      const { data } = await ptApi.bills.bulk({
        ward_id: bulk.ward_id || null,
        zone_id: bulk.zone_id || null,
        financial_year: Number(bulk.financial_year),
        due_date: bulk.due_date || null,
      });
      toast.success(`Generated ${data.created} bills · skipped ${data.skipped}`);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const pay = async (id) => { if (!window.confirm("Mark bill as paid?")) return; await ptApi.bills.pay(id); toast.success("Marked paid"); load(); };
  const cancel = async (id) => { if (!window.confirm("Cancel this bill?")) return; await ptApi.bills.cancel(id); toast.success("Cancelled"); load(); };
  const del = async (id) => {
    if (!window.confirm("Delete this bill permanently?")) return;
    try { await ptApi.bills.del(id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-04" title="Bills" subtitle="Generate, view, mark paid, cancel or delete property tax bills." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <form onSubmit={single} className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">SINGLE / BY PROPERTY</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select value={gen.property_id} onChange={(e) => setGen({ ...gen, property_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white md:col-span-2" data-testid="bill-prop">
              <option value="">— pick property —</option>
              {props.map((p) => <option key={p.id} value={p.id}>{p.property_no} · {p.owner_name}</option>)}
            </select>
            <input type="number" min="2000" max="2100" value={gen.fy} onChange={(e) => setGen({ ...gen, fy: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="bill-fy" />
            <input type="date" value={gen.due_date} onChange={(e) => setGen({ ...gen, due_date: e.target.value })} className="border border-zinc-300 px-3 py-2 md:col-span-3" data-testid="bill-due" />
          </div>
          <button className="mt-3 bg-[#FF4500] text-white hover:bg-black px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="bill-generate"><Plus size={14}/> Generate Bill</button>
        </form>

        <form onSubmit={generateBulk} className="bg-white border border-zinc-200 p-5">
          <div className="mono-label mb-3">BULK / BY WARD or ZONE</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select value={bulk.ward_id} onChange={(e) => setBulk({ ...bulk, ward_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="bill-bulk-ward">
              <option value="">All wards</option>
              {masters.wards.map((w) => <option key={w.id} value={w.id}>{w.ward_no} · {w.ward_name}</option>)}
            </select>
            <select value={bulk.zone_id} onChange={(e) => setBulk({ ...bulk, zone_id: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="bill-bulk-zone">
              <option value="">All zones</option>
              {masters.zones.map((z) => <option key={z.id} value={z.id}>{z.zone_no} · {z.zone_name}</option>)}
            </select>
            <input type="number" value={bulk.financial_year} onChange={(e) => setBulk({ ...bulk, financial_year: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="bill-bulk-fy" />
            <input type="date" value={bulk.due_date} onChange={(e) => setBulk({ ...bulk, due_date: e.target.value })} className="border border-zinc-300 px-3 py-2" data-testid="bill-bulk-due" />
          </div>
          <button className="mt-3 bg-black text-white hover:bg-[#FF4500] px-4 py-2 font-mono uppercase text-xs tracking-wider inline-flex items-center gap-2" data-testid="bill-bulk-go"><ClipboardText size={14}/> Generate Bulk</button>
        </form>
      </div>

      <div className="bg-white border border-zinc-200 mt-6 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mono-label block mb-1">STATUS</label>
          <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="border border-zinc-300 px-3 py-2 bg-white" data-testid="bill-filter-status">
            <option value="">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="mono-label block mb-1">FY</label>
          <input type="number" value={filter.fy} onChange={(e) => setFilter({ ...filter, fy: e.target.value })} className="border border-zinc-300 px-3 py-2" placeholder="2025" data-testid="bill-filter-fy" />
        </div>
        <button onClick={load} className="bg-black text-white hover:bg-[#FF4500] px-4 py-2 font-mono uppercase text-xs tracking-wider" data-testid="bill-filter-go">Apply</button>
      </div>

      <div className="bg-white border border-zinc-200 mt-4">
        <table className="w-full text-sm" data-testid="bill-table">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="font-mono text-xs uppercase tracking-widest text-zinc-600 text-left">
              <th className="p-3">Bill No</th><th className="p-3">Property</th><th className="p-3">FY</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="p-3 font-mono">{b.bill_no}</td>
                <td className="p-3">{b.property?.property_no} · {b.property?.owner_name}</td>
                <td className="p-3 font-mono">{b.fy_label}</td>
                <td className="p-3 font-mono text-[#FF4500] font-semibold">{inr(b.tax_amount)}</td>
                <td className="p-3 font-mono uppercase text-xs"><span className={`px-2 py-1 ${b.status==="paid"?"bg-black text-white":b.status==="cancelled"?"bg-zinc-300 text-black":"bg-[#FF4500] text-white"}`}>{b.status}</span></td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => setView(b)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="View" data-testid={`bill-view-${b.id}`}>VIEW</button>
                    {b.status === "unpaid" && <button onClick={() => pay(b.id)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="Mark paid" data-testid={`bill-pay-${b.id}`}><CheckSquare size={12}/></button>}
                    {b.status === "unpaid" && <button onClick={() => cancel(b.id)} className="px-2 py-1 border border-black hover:bg-black hover:text-white" title="Cancel" data-testid={`bill-cancel-${b.id}`}><Prohibit size={12}/></button>}
                    {b.status !== "paid" && <button onClick={() => del(b.id)} className="px-2 py-1 border border-black hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500]" title="Delete" data-testid={`bill-del-${b.id}`}><Trash size={12}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-500 font-mono text-sm">// NO BILLS</td></tr>}
          </tbody>
        </table>
      </div>

      <BillView item={view} onClose={() => setView(null)} />
    </div>
  );
}
