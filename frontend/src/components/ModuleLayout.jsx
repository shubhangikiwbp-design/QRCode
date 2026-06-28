import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  House, FolderSimple, QrCode, MagnifyingGlass, Users as UsersIcon, ListBullets, Scan, SignOut,
  Buildings, Bank, Receipt, ChartBar, Database, ArrowsLeftRight, Money, PencilLine,
} from "@phosphor-icons/react";

const QR_NAV = [
  { to: "/qr-app",          label: "Dashboard",  icon: House,           testid: "nav-dashboard" },
  { to: "/qr-app/files",    label: "Files",      icon: FolderSimple,    testid: "nav-files" },
  { to: "/qr-app/qr",       label: "QR Codes",   icon: QrCode,          testid: "nav-qr" },
  { to: "/qr-app/scanner",  label: "Scanner",    icon: Scan,            testid: "nav-scanner" },
  { to: "/qr-app/search",   label: "Search",     icon: MagnifyingGlass, testid: "nav-search" },
  { to: "/qr-app/users",    label: "Users",      icon: UsersIcon,       testid: "nav-users",  roles: ["super_admin"] },
  { to: "/qr-app/logs",     label: "Audit Logs", icon: ListBullets,     testid: "nav-logs",   roles: ["super_admin", "admin"] },
];

const PT_NAV = [
  { to: "/pt",            label: "Dashboard",  icon: ChartBar,   testid: "nav-pt-dashboard" },
  { to: "/pt/masters",    label: "Masters",    icon: Database,   testid: "nav-pt-masters",    roles: ["super_admin", "admin"] },
  { to: "/pt/properties", label: "Properties", icon: Buildings,  testid: "nav-pt-properties" },
  { to: "/pt/notices",    label: "Notices",    icon: Bank,       testid: "nav-pt-notices" },
  { to: "/pt/bills",      label: "Bills",      icon: Receipt,    testid: "nav-pt-bills" },
  { to: "/pt/arrears/new", label: "Arrears Entry", icon: Money,    testid: "nav-pt-arrears-new" },
  { to: "/pt/arrears",    label: "Arrears Edit",  icon: PencilLine, testid: "nav-pt-arrears" },
  { to: "/pt/reports",    label: "Reports",    icon: ChartBar,   testid: "nav-pt-reports",    roles: ["super_admin", "admin"] },
];

const MODULES = {
  qr: {
    title: "QRFILE",
    subtitle: "FILE CONTROL",
    accent: "#FF4500",
    iconBg: "#FF4500",
    Icon: QrCode,
    nav: QR_NAV,
  },
  pt: {
    title: "PROPTAX",
    subtitle: "MUNICIPAL ASSESSMENT",
    accent: "#0EA5E9",        // distinct accent so the user can tell modules apart
    iconBg: "#0EA5E9",
    Icon: Buildings,
    nav: PT_NAV,
  },
};

export default function ModuleLayout({ module }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mod = MODULES[module];
  const visible = mod.nav.filter((n) => !n.roles || n.roles.includes(user?.role));

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: "260px 1fr" }}>
      <aside className="bg-[#0A0A0A] text-white border-r border-black flex flex-col" data-testid="sidebar">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 flex items-center justify-center" style={{ background: mod.iconBg }}>
              <mod.Icon size={22} weight="bold" color="white" />
            </div>
            <div>
              <div className="font-heading font-black text-lg leading-none" data-testid="module-title">{mod.title}</div>
              <div className="mono-label text-zinc-500 mt-1">{mod.subtitle}</div>
            </div>
          </div>
          <button
            onClick={() => navigate("/modules")}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3 py-2 font-mono uppercase text-[10px] tracking-wider border border-zinc-800"
            data-testid="switch-module-btn"
          >
            <ArrowsLeftRight size={12} /> Switch Module
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {visible.map((item) => {
            const Icon = item.icon;
            const isRoot = item.to === "/qr-app" || item.to === "/pt";
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={isRoot}
                data-testid={item.testid}
                style={({ isActive }) => isActive ? { background: mod.accent, color: "white", borderLeftColor: "white" } : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 text-sm font-mono uppercase tracking-wider transition-colors border-l-2 ${
                    isActive ? "" : "text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900"
                  }`
                }
              >
                <Icon size={18} weight="regular" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="mono-label text-zinc-500 mb-1">LOGGED IN</div>
          <div className="text-sm font-medium truncate" data-testid="current-user-name">{user?.name}</div>
          <div className="text-xs text-zinc-400 truncate">{user?.email}</div>
          <div className="mono-label mt-1" style={{ color: mod.accent }} data-testid="current-user-role">{user?.role}</div>
          <button
            data-testid="logout-btn"
            onClick={() => { logout(); navigate("/login"); }}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-black hover:text-white px-3 py-2 font-mono uppercase text-xs tracking-wider transition-colors"
            style={{ "--h": mod.accent }}
            onMouseEnter={(e) => (e.currentTarget.style.background = mod.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <SignOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <main className="bg-[#F4F4F5] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
