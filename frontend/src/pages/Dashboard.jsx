import React, { useEffect, useState } from "react";
import { api, formatBytes } from "@/lib/api";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { FileArrowUp, FolderSimple, QrCode, Users, HardDrives, ChartLineUp } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";

const StatCard = ({ label, value, icon: Icon, testid }) => (
  <div data-testid={testid} className="flex items-start justify-between p-6 bg-white border border-zinc-200 hover:border-black transition-colors">
    <div>
      <div className="mono-label">{label}</div>
      <div className="font-mono text-3xl font-semibold mt-2 text-black">{value}</div>
    </div>
    <div className="w-10 h-10 bg-black flex items-center justify-center">
      <Icon size={22} color="white" weight="regular" />
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <div className="p-12 font-mono text-sm">LOADING STATS…</div>;

  return (
    <div className="p-8 lg:p-12">
      <PageHeader index="00" title="Dashboard" subtitle="System overview & live statistics" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        <StatCard label="TOTAL USERS" value={stats.total_users} icon={Users} testid="stat-users" />
        <StatCard label="TOTAL FILES" value={stats.total_files} icon={FileArrowUp} testid="stat-files" />
        <StatCard label="TOTAL FOLDERS" value={stats.total_folders} icon={FolderSimple} testid="stat-folders" />
        <StatCard label="QR CODES" value={stats.total_qrs} icon={QrCode} testid="stat-qrs" />
        <StatCard label="TODAY UPLOADS" value={stats.today_uploads} icon={ChartLineUp} testid="stat-today" />
        <StatCard label="STORAGE USED" value={formatBytes(stats.storage_bytes)} icon={HardDrives} testid="stat-storage" />
      </div>

      <div className="mt-8 bg-white border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="mono-label">SIGNAL / TREND</div>
            <h3 className="font-heading font-bold text-xl mt-1">Uploads — last 7 days</h3>
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }} data-testid="upload-trend-chart">
          <ResponsiveContainer>
            <LineChart data={stats.trend}>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="0" vertical={false} />
              <XAxis dataKey="date" stroke="#52525B" tickLine={false} axisLine={{ stroke: "#000" }} tick={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#52525B" tickLine={false} axisLine={{ stroke: "#000" }} tick={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ border: "2px solid #000", borderRadius: 0, fontFamily: "IBM Plex Mono", fontSize: 12 }} />
              <Line type="linear" dataKey="uploads" stroke="#FF4500" strokeWidth={2.5} dot={{ fill: "#000", r: 4 }} activeDot={{ r: 6, fill: "#FF4500" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
