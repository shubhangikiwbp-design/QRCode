import React, { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { ptApi, inr } from "@/lib/ptApi";
import { Buildings, Bank, Receipt, Warning, ChartBar, Wallet } from "@phosphor-icons/react";

const Tile = ({ label, value, icon: Icon, accent, testid }) => (
  <div data-testid={testid} className="flex items-start justify-between p-6 bg-white border border-zinc-200 hover:border-black transition-colors">
    <div>
      <div className="mono-label">{label}</div>
      <div className={`font-mono text-2xl font-semibold mt-2 ${accent ? "text-[#FF4500]" : "text-black"}`}>{value}</div>
    </div>
    <div className="w-10 h-10 bg-black flex items-center justify-center"><Icon size={22} color="white" /></div>
  </div>
);

export default function PTDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { ptApi.reports.summary().then(({ data }) => setS(data)).catch((e) => console.error(e)); }, []);

  if (!s) return <div className="p-12 font-mono text-sm">LOADING…</div>;

  const collection_pct = s.total_demand > 0 ? Math.round((s.total_collected / s.total_demand) * 100) : 0;

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="PT-00" title="Property Tax" subtitle="Maharashtra Municipal — ALV / RV based assessment & demand register." />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <Tile label="PROPERTIES" value={s.total_properties} icon={Buildings} testid="pt-stat-properties" />
        <Tile label="WARDS / ZONES" value={`${s.total_wards} / ${s.total_zones}`} icon={Bank} testid="pt-stat-w-z" />
        <Tile label="BILLS ISSUED" value={s.total_bills} icon={Receipt} testid="pt-stat-bills" />
        <Tile label="TOTAL DEMAND" value={inr(s.total_demand)} icon={ChartBar} accent testid="pt-stat-demand" />
        <Tile label="COLLECTED" value={inr(s.total_collected)} icon={Wallet} testid="pt-stat-collected" />
        <Tile label="OUTSTANDING" value={inr(s.total_outstanding)} icon={Warning} accent testid="pt-stat-outstanding" />
      </div>

      <div className="mt-8 bg-white border border-zinc-200 p-6">
        <div className="mono-label">COLLECTION EFFICIENCY</div>
        <div className="flex items-end gap-3 mt-2">
          <div className="font-mono text-4xl font-semibold">{collection_pct}%</div>
          <div className="text-sm text-zinc-600 mb-1">of total demand</div>
        </div>
        <div className="h-2 bg-zinc-100 mt-4 border border-black">
          <div className="h-full bg-[#FF4500]" style={{ width: `${Math.min(100, collection_pct)}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="border border-zinc-200 p-3"><div className="mono-label">PAID</div><div className="font-mono text-xl mt-1">{s.bills_paid}</div></div>
          <div className="border border-zinc-200 p-3"><div className="mono-label">UNPAID</div><div className="font-mono text-xl mt-1 text-[#FF4500]">{s.bills_unpaid}</div></div>
          <div className="border border-zinc-200 p-3"><div className="mono-label">CANCELLED</div><div className="font-mono text-xl mt-1">{s.bills_cancelled}</div></div>
        </div>
      </div>
    </div>
  );
}
