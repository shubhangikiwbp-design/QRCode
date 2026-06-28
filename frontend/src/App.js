import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ModulePicker from "@/pages/ModulePicker";
import ModuleLayout from "@/components/ModuleLayout";
import Dashboard from "@/pages/Dashboard";
import Files from "@/pages/Files";
import QRList from "@/pages/QRList";
import Scanner from "@/pages/Scanner";
import Search from "@/pages/Search";
import Users from "@/pages/Users";
import Logs from "@/pages/Logs";
import PTDashboard from "@/pages/pt/PTDashboard";
import PTMasters from "@/pages/pt/PTMasters";
import PTProperties from "@/pages/pt/PTProperties";
import PTNotices from "@/pages/pt/PTNotices";
import PTBills from "@/pages/pt/PTBills";
import PTReports from "@/pages/pt/PTReports";
import "@/App.css";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-mono text-sm">LOADING…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/modules" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

          {/* After login, default to module picker */}
          <Route path="/modules" element={<Protected><ModulePicker /></Protected>} />

          {/* QR File Management module — own sidebar, own routes */}
          <Route element={<Protected><ModuleLayout module="qr" /></Protected>}>
            <Route path="/qr-app" element={<Dashboard />} />
            <Route path="/qr-app/files" element={<Files />} />
            <Route path="/qr-app/files/:folderId" element={<Files />} />
            <Route path="/qr-app/qr" element={<QRList />} />
            <Route path="/qr-app/scanner" element={<Scanner />} />
            <Route path="/qr-app/search" element={<Search />} />
            <Route path="/qr-app/users" element={<Users />} />
            <Route path="/qr-app/logs" element={<Logs />} />
          </Route>

          {/* Property Tax module — own sidebar, own routes */}
          <Route element={<Protected><ModuleLayout module="pt" /></Protected>}>
            <Route path="/pt" element={<PTDashboard />} />
            <Route path="/pt/masters" element={<PTMasters />} />
            <Route path="/pt/properties" element={<PTProperties />} />
            <Route path="/pt/notices" element={<PTNotices />} />
            <Route path="/pt/bills" element={<PTBills />} />
            <Route path="/pt/reports" element={<PTReports />} />
          </Route>

          {/* Root and unknown → module picker (or login if not authed) */}
          <Route path="/" element={<Navigate to="/modules" replace />} />
          <Route path="*" element={<Navigate to="/modules" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
