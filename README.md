# 🖨️ CampusPrint

> **Campus-focused online printing platform** allowing students to upload documents from phone or laptop, select stationary vendors, choose print specifications, pay seamlessly, get a unique print pickup token & QR code, and collect without physical queues.

---

## 🏗️ Architecture & Roles

1. **Student Experience (Mobile-First PWA & Desktop)**
   - 5-step print wizard: Upload PDF, select campus vendor, configure print settings (B&W/Color, single/duplex, page ranges, copies), live cost estimation, instant payment, and digital token issuance (`CP-XXXX` with live QR code).
   - Real-time job timeline (Queued → Accepted → Printing → Ready for Pickup → Collected).
   - Order history & PDF redownload.

2. **Vendor / Stationery Dashboard**
   - Live queue management with real-time Socket.IO synchronization.
   - 1-click status transitions (Accept Job, Start Printing, Mark Ready).
   - Pickup verification modal with token input & QR scanner validation.
   - Live availability toggle (`OPEN`, `CLOSED`, `UNAVAILABLE`).
   - Dynamic pricing management (per B&W page, per Color page, duplex discounts).
   - Daily & weekly analytics with revenue charts and print volume breakdown.

3. **Admin Dashboard**
   - Global KPIs: Students, active vendors, revenue volume, active queue count.
   - Vendor approval & suspension lifecycle.
   - Comprehensive multi-campus & university hierarchy management.
   - System audit logs and student complaint resolution.

---

## 🚀 Getting Started

### 1. Environment Configuration

In `server/.env`, enter your MongoDB connection string (leave blank or provide your local/Atlas URI):
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/campusprint
```

### 2. Seed Demo Data (Optional but Recommended)

Once your `MONGO_URI` is in `server/.env`, seed default universities, vendors, admin, and demo student:
```bash
npm run seed
```

**Default Credentials after seeding:**
- **Admin:** `admin@campusprint.com` / `CampusPrint@123`
- **Vendor 1:** `vendor1@campusprint.com` / `CampusPrint@123` *(QuickPrint Express)*
- **Vendor 2:** `vendor2@campusprint.com` / `CampusPrint@123` *(Apex Xerox)*
- **Student:** `student@campusprint.com` / `CampusPrint@123` *(Aarav Gupta)*

### 3. Run Development Servers

Run backend and frontend:

**Backend (Express + Socket.IO on port 5000):**
```bash
npm run dev:server
```

**Frontend (Vite + React + PWA on port 5173):**
```bash
npm run dev:client
```

Open your browser at `http://localhost:5173`.
Vite is pre-configured to proxy `/api`, `/uploads`, and `/socket.io` directly to the backend.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router v7, Recharts, Lucide React, Sonner, React QR Code, Vite PWA.
- **Backend:** Node.js, Express, TypeScript, Mongoose, Socket.IO, JWT + Refresh Cookies, Multer, Helmet, Rate Limiting, Zod.
