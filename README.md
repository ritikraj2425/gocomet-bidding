# British Auction in RFQ System

A full-stack, enterprise Request for Quotation (RFQ) platform implementing **British Auction** mechanics with real-time bidding, automatic time extensions, and hard ceiling forced close enforcement.

Built with **Python (FastAPI)**, **PostgreSQL / SQLAlchemy**, and **ReactJS (TypeScript + Ant Design)**.

---

## Architecture & Port Mapping

| Service | Technology | Port | Credentials |
|---|---|---|---|
| **Backend API Server** | Python (FastAPI), SQLAlchemy, Uvicorn, WebSockets | `3000` | N/A (Swagger docs at `/docs`) |
| **Admin Frontend** | React, TypeScript, Vite, Ant Design | `5173` | `admin@rfq.com` / `admin123` |
| **Supplier Frontend** | React, TypeScript, Vite, Ant Design | `5174` | `supplier1@test.com` / `supplier123` (or self-register) |

---

## Key Features

1. **British Auction Engine**:
   - Configurable **Trigger Window ($X$ minutes)**: Monitors bidding activity in the closing minutes of the auction.
   - Configurable **Extension Duration ($Y$ minutes)**: Extends the bid close time when trigger criteria are met.
   - **Forced Bid Close Time**: Enforces a strict hard ceiling beyond which the auction can **never** extend.
   - **Three Extension Trigger Modes**:
     - Mode A: *Bid Received in Last $X$ Minutes*
     - Mode B: *Any Supplier Rank Change in Last $X$ Minutes*
     - Mode C: *Lowest Bidder ($L_1$) Rank Change in Last $X$ Minutes*
   - Auto-closer background job that updates auction statuses (`ACTIVE` $\rightarrow$ `CLOSED` or `FORCE_CLOSED`).

2. **Admin Portal (`port 5173`)**:
   - RFQ creation with British Auction parameters ($X$, $Y$, and trigger modes).
   - Quick Demo / Simulation switch (sets up rapid 3-minute test auctions with 1-minute extensions).
   - Live British Auction monitoring with real-time bid updates, countdown timer, and extension tags.
   - Carrier/Supplier management (create, edit, deactivate).
   - **Dynamic System Settings**: Every parameter (platform title, currency, default $X$ and $Y$, trigger type, theme colors) is editable by admin with **zero hardcoding**.

3. **Supplier Portal (`port 5174`)**:
   - Open registration and sign-in.
   - Live auction dashboard and active shipment listings.
   - Detailed bidding view with real-time countdown timer and extension notifications.
   - Quote submission form with itemized freight charges, origin charges, destination charges, transit time, and validity.
   - Real-time competitive leaderboard with masked competitor names and transparent pricing.
   - Instant rank indicator ($L_1$, $L_2$, $L_3 \dots$) and personalized standing alerts.

4. **Design & Theme**:
   - Corporate Navy (`#0F172A`) & Blue (`#2563EB`) enterprise theme.
   - Strictly professional UI, SVG icons only, **zero emojis**.

---

## Quick Start Guide

### 1. Start the Backend API Server
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```
API runs on `http://localhost:3000`. Swagger documentation is available at `http://localhost:3000/docs`.

To re-seed sample data at any time:
```bash
cd backend && ./venv/bin/python seed.py
```

### 2. Start the Admin Frontend
```bash
cd admin-frontend
npm run dev
```
Access Admin UI at `http://localhost:5173` (Login: `admin@rfq.com` / `admin123`).

### 3. Start the Supplier Frontend
```bash
cd supplier-frontend
npm run dev
```
Access Supplier Portal at `http://localhost:5174` (Login: `supplier1@test.com` / `supplier123` or register new).

---

## Deliverables Reference
- **HLD & System Architecture**: [`docs/HLD.md`](file:///Users/ritikraj/gocomet/docs/HLD.md)
- **Database Schema**: Documented in `docs/HLD.md` and implemented in [`backend/app/models.py`](file:///Users/ritikraj/gocomet/backend/app/models.py)
- **Backend Code**: [`backend/`](file:///Users/ritikraj/gocomet/backend)
- **Frontend Code**: [`admin-frontend/`](file:///Users/ritikraj/gocomet/admin-frontend) and [`supplier-frontend/`](file:///Users/ritikraj/gocomet/supplier-frontend)

# gocomet-bidding
