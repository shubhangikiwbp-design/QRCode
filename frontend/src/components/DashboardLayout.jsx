import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  House, FolderSimple, QrCode, MagnifyingGlass, Users as UsersIcon, ListBullets, Scan, SignOut,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/", label: "Dashboard", icon: House, testid: "nav-dashboard" },
  { to: "/files", label: "Files", icon: FolderSimple, testid: "nav-files" },
  { to: "/qr", label: "QR Codes", icon: QrCode, testid: "nav-qr" },
  { to: "/scanner", label: "Scanner", icon: Scan, testid: "nav-scanner" },
  { to: "/search", label: "Search", icon: MagnifyingGlass, testid: "nav-search" },
  { to: "/users", label: "Users", icon: UsersIcon, testid: "nav-users", roles: ["super_admin"] },
  { to: "/logs", label: "Audit Logs", icon: ListBullets, testid: "nav-logs", roles: ["super_admin", "admin"] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(user?.role));

  return (
    <div className="min-h-screen grid" style={{ gridTemplateColumns: "260px 1fr" }}>
      {/* Sidebar */}
      <aside className="bg-[#0A0A0A] text-white border-r border-black flex flex-col" data-testid="sidebar">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#FF4500] flex items-center justify-center">
              <QrCode size={22} weight="bold" color="white" />
            </div>
            <div>
              <div className="font-heading font-black text-lg leading-none">QRFILE</div>
              <div className="mono-label text-zinc-500 mt-1">CONTROL ROOM</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-6 py-3 text-sm font-mono uppercase tracking-wider transition-colors border-l-2 ${
                    isActive
                      ? "bg-[#FF4500] text-white border-white"
                      : "text-zinc-400 border-transparent hover:text-white hover:bg-zinc-900"
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
          <div className="mono-label mt-1 text-[#FF4500]" data-testid="current-user-role">{user?.role}</div>
          <button
            data-testid="logout-btn"
            onClick={() => { logout(); navigate("/login"); }}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-[#FF4500] hover:text-white px-3 py-2 font-mono uppercase text-xs tracking-wider transition-colors"
          >
            <SignOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="bg-[#F4F4F5] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
