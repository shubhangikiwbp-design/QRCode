# PRD — QRFILE Control Room

## Problem Statement
Enterprise QR Code File Management System where users can create folders, upload files, auto-generate QR codes per file, scan QR codes, search/filter, manage users with role-based access (super_admin / admin / user), see dashboard statistics and audit logs. Originally specced for Python + MySQL + Web + Android + iOS; first iteration targets Web (React + FastAPI + MongoDB) with full feature parity for web.

## Personas
- **Super Admin** — full system access, manages users, sees all files/QRs/logs.
- **Admin** — folder/file/QR management, search, downloads, sees audit logs.
- **User** — personal folders, file upload, QR generation, sees only own data.

## Core Requirements (static)
- JWT auth (cookie + Bearer), bcrypt passwords, admin seeded on startup.
- Nested folders with cascade delete.
- File upload (PDF, DOC(X), XLS(X), JPG, PNG, ZIP, MP4, TXT, CSV, PPT(X), max 50MB).
- Auto QR generation per file (PNG + SVG).
- Public download endpoint for QR scans.
- QR Scanner (camera + image upload, html5-qrcode).
- Search with filters (text, file type, date range).
- Dashboard stats (users, files, folders, QRs, today uploads, storage usage, 7-day trend).
- User management (super_admin only).
- Audit logs (admin + super_admin).

## Implemented (2026-06-26)
- ✅ Backend: FastAPI with /api routes, MongoDB (uuid ids, no ObjectId leaks), JWT auth, bcrypt, role-based dependency, admin seed on startup, indexes.
- ✅ Endpoints: /api/auth/{register,login,logout,me}, /api/folder/*, /api/file/* (upload + auto-QR), /api/qr/{list,image,svg,resolve}, /api/file/public/{id} (unauth, for QR), /api/search, /api/dashboard/stats, /api/users (CRUD super_admin), /api/logs.
- ✅ Frontend: React + Sonner + Phosphor icons + Recharts + html5-qrcode.
- ✅ Pages: Login, Register, Dashboard (stats + 7-day line chart), Files (breadcrumb, dropzone, multi-upload, grid, preview dialog with QR), QR Codes grid, Scanner (camera + image), Search, Users, Audit Logs.
- ✅ Design: Bespoke "Control Room" aesthetic — Chivo + IBM Plex Sans/Mono, safety-orange `#FF4500` accent, sharp 0-radius, brutalist shadows, no AI-slop gradients.
- ✅ Testing: backend 94%, frontend 100%. Fixed POST /api/users `_id` leak post-insert.
- ✅ Deployment health check: PASS (warns only, no blockers).

## Test Credentials
- Super Admin: `admin@qrfile.com` / `Admin@123`

## Backlog (P0/P1/P2)
- **P1**: Flutter mobile apps (Android APK + iOS IPA) per original spec.
- **P1**: S3-compatible cloud storage backend (currently disk).
- **P1**: File versioning & in-place rename.
- **P2**: Move folder (drag-drop relocate) and rename folder UI.
- **P2**: User activity & QR generation trend additional charts.
- **P2**: Rate limiting (slowapi) + brute-force lockout.
- **P2**: Swagger/OpenAPI doc theming.
- **P2**: DB query optimizations ($graphLookup for nested folder walks, single aggregation for 7-day trend).
- **P2**: MySQL adapter (if needed by enterprise customers).
- **P2**: Docker / Nginx configs + deployment guide.

## Next Tasks
1. Plug Flutter scaffold for QR scan + upload from mobile.
2. Add file versioning (`versions[]` sub-array in `files` collection).
3. Drag-drop folder move.
