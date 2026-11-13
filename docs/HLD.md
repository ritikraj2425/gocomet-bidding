# British Auction RFQ System - High Level Design & Schema Documentation

## 1. Executive Summary & Problem Context
In logistics freight procurement, a **Request for Quotation (RFQ)** allows buyers to invite multiple carriers/suppliers to submit competing quotes. Traditional auctions suffer from **bid sniping** (suppliers waiting until the final seconds to underbid competitors without giving others a chance to respond) and predatory bidding strategies.

The **British Auction in RFQ System** solves this via:
1. **Open and Transparent Bidding**: Real-time visibility into competitive quote levels and supplier ranks ($L_1, L_2, L_3 \dots$).
2. **Automatic Bid-Time Extension**: If qualifying bidding activity occurs in the final $X$ minutes (**Trigger Window**), the auction close time is automatically extended by $Y$ minutes (**Extension Duration**).
3. **Forced Bid Close Time (Hard Ceiling)**: A definitive deadline beyond which the auction **must never extend**, ensuring timely freight procurement and avoiding indefinite loops.
4. **Configurable Auction Triggers**: Admin-selectable extension conditions:
   - **Trigger A**: Any bid received in the last $X$ minutes.
   - **Trigger B**: Any supplier ranking change in the last $X$ minutes.
   - **Trigger C**: Lowest bidder ($L_1$) ranking change in the last $X$ minutes.

---

## 2. High-Level Architecture (HLD)

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Admin Frontend (React)      │       │   Supplier Frontend (React)     │
│  - RFQ Creation & Config (X, Y) │       │  - Live British Auction View    │
│  - Live Bid Stream & Rankings   │       │  - Real-time Bid Submission     │
│  - Dynamic System Settings      │       │  - Transparent Masked Ranks     │
│  - Manual Auction Controls      │       │  - Extension Alerts & Countdown │
│  (Port 5173 - Ant Design UI)    │       │  (Port 5174 - Ant Design UI)    │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │            HTTP REST & WebSockets       │
                 └────────────────────────┬────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │     Backend: Python (FastAPI)     │
                        │  - REST API (Auth, RFQs, Bids)    │
                        │  - WebSocket Connection Manager   │
                        │  - British Auction Rule Engine    │
                        │    * Trigger Window (X min)       │
                        │    * Extension Duration (Y min)   │
                        │    * Hard Ceiling (Forced Close)  │
                        │    * 3 Extension Trigger Modes    │
                        │  - APScheduler Auto-Closer        │
                        └─────────────────┬─────────────────┘
                                          │
                        ┌─────────────────▼─────────────────┐
                        │   Database (SQLAlchemy ORM)       │
                        │   PostgreSQL / SQLite Storage     │
                        └───────────────────────────────────┘
```

---

## 3. Database Schema Design

The database is designed with 6 core tables in **SQLAlchemy** supporting both **PostgreSQL** in production and **SQLite** for zero-dependency execution.

### Table 1: `users`
Stores system administrators (buyers) and suppliers (freight carriers).
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Login email address |
| `hashed_password` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `name` | VARCHAR(255) | NOT NULL | Contact person name |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'SUPPLIER' | `'ADMIN'` or `'SUPPLIER'` |
| `company` | VARCHAR(255) | NULLABLE | Carrier/Firm organization name |
| `phone` | VARCHAR(50) | NULLABLE | Contact telephone |
| `is_active` | BOOLEAN | DEFAULT TRUE | Soft delete/deactivation flag |
| `created_at` | TIMESTAMP | DEFAULT UTC NOW | Record creation timestamp |
| `updated_at` | TIMESTAMP | AUTO UPDATE | Last update timestamp |

### Table 2: `rfqs`
Stores RFQ specifications, scheduling, and British Auction deadlines.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 identifier |
| `name` | VARCHAR(255) | NOT NULL | RFQ title / shipment description |
| `reference_id` | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | Human-readable ID (e.g. `RFQ-DEMO01`) |
| `description` | TEXT | NULLABLE | Cargo volume, vehicle specs, notes |
| `bid_start_time` | TIMESTAMP | NOT NULL | When bidding commences |
| `bid_close_time` | TIMESTAMP | NOT NULL | Dynamic close time (extended by engine) |
| `original_bid_close_time` | TIMESTAMP | NOT NULL | Original unextended close time |
| `forced_bid_close_time` | TIMESTAMP | NOT NULL | **Hard ceiling**; auction never extends past this |
| `pickup_date` | TIMESTAMP | NOT NULL | Cargo pickup / service date |
| `status` | VARCHAR(50) | NOT NULL, DEFAULT 'DRAFT' | `'DRAFT'`, `'ACTIVE'`, `'CLOSED'`, `'FORCE_CLOSED'` |
| `created_by_id` | VARCHAR(36) | FOREIGN KEY (`users.id`) | Admin user who authored the RFQ |
| `created_at` | TIMESTAMP | DEFAULT UTC NOW | Creation timestamp |
| `updated_at` | TIMESTAMP | AUTO UPDATE | Last update timestamp |

### Table 3: `auction_configs`
Configures British Auction parameters per RFQ.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 identifier |
| `rfq_id` | VARCHAR(36) | UNIQUE, FK (`rfqs.id` ON DELETE CASCADE) | RFQ association |
| `trigger_window_mins` | INTEGER | NOT NULL ($X \ge 1$) | Window before close monitored for extensions |
| `extension_mins` | INTEGER | NOT NULL ($Y \ge 1$) | Time added when trigger condition occurs |
| `trigger_type` | VARCHAR(50) | NOT NULL | `'BID_RECEIVED'`, `'ANY_RANK_CHANGE'`, `'L1_RANK_CHANGE'` |

### Table 4: `bids`
Stores quotes submitted by suppliers with granular cost breakdown.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 identifier |
| `rfq_id` | VARCHAR(36) | FK (`rfqs.id` ON DELETE CASCADE) | RFQ reference |
| `supplier_id` | VARCHAR(36) | FK (`users.id`) | Carrier submitting quote |
| `freight_charges` | FLOAT | NOT NULL, $\ge 0$ | Main transport freight cost |
| `origin_charges` | FLOAT | NOT NULL, $\ge 0$ | Loading / terminal origin fees |
| `destination_charges` | FLOAT | NOT NULL, $\ge 0$ | Unloading / destination handling |
| `total_amount` | FLOAT | NOT NULL, $\ge 0$ | Auto-calculated sum of charges |
| `transit_time` | INTEGER | NOT NULL, $\ge 1$ | Transit duration in days |
| `validity_date` | TIMESTAMP | NOT NULL | Expiry of quotation terms |
| `created_at` | TIMESTAMP | DEFAULT UTC NOW | Bid submission timestamp |

### Table 5: `activity_logs`
Complete audit trail of all auction events and extension reasons.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 identifier |
| `rfq_id` | VARCHAR(36) | FK (`rfqs.id` ON DELETE CASCADE) | Associated RFQ |
| `event_type` | VARCHAR(50) | NOT NULL | `BID_SUBMITTED`, `TIME_EXTENDED`, `AUCTION_STARTED`, `AUCTION_CLOSED`, `AUCTION_FORCE_CLOSED` |
| `description` | TEXT | NOT NULL | Human-readable summary |
| `metadata_json` | TEXT | NULLABLE | JSON with previous/new close times and triggers |
| `created_at` | TIMESTAMP | DEFAULT UTC NOW | Log entry timestamp |

### Table 6: `settings`
Enables dynamic administration with zero hardcoding.
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | PRIMARY KEY | UUID v4 identifier |
| `key` | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Setting identifier |
| `value` | TEXT | NOT NULL | Dynamic runtime value |
| `label` | VARCHAR(255) | NOT NULL | Display label in Admin UI |
| `input_type` | VARCHAR(50) | DEFAULT 'text' | `'text'`, `'number'`, `'color'`, `'select'` |
| `category` | VARCHAR(50) | DEFAULT 'general' | `'general'`, `'auction'`, `'theme'` |

---

## 4. British Auction Rule Engine & Validation

### 4.1 Validation Invariant
$$\text{forced\_bid\_close\_time} > \text{bid\_close\_time} \ge \text{bid\_start\_time}$$

### 4.2 Extension Window Logic
Given current time $t$:
$$\text{In Trigger Window} \iff (\text{bid\_close\_time} - X \text{ minutes}) \le t \le \text{bid\_close\_time}$$

### 4.3 Trigger Evaluation Modes
1. **Mode A (`BID_RECEIVED`)**:
   $$\text{Triggered} \iff \text{Bid placed within trigger window}$$
2. **Mode B (`ANY_RANK_CHANGE`)**:
   $$\text{Triggered} \iff \exists \text{ supplier } s \text{ such that } \text{Rank}_{\text{new}}(s) \ne \text{Rank}_{\text{old}}(s)$$
3. **Mode C (`L1_RANK_CHANGE`)**:
   $$\text{Triggered} \iff L_1 \text{ supplier changes after the new bid}$$

### 4.4 Hard Ceiling Clamping
When extension is triggered:
$$\text{new\_close} = \min\left(\text{bid\_close\_time} + Y \text{ minutes},\; \text{forced\_bid\_close\_time}\right)$$
If $\text{bid\_close\_time} \ge \text{forced\_bid\_close\_time}$, no further extension is granted.

---

## 5. REST & WebSocket API Specification

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/register` | POST | Public | Open supplier registration |
| `/api/auth/login` | POST | Public | JWT login |
| `/api/auth/me` | GET | Authenticated | Current profile |
| `/api/users` | GET, POST | Admin | Manage carriers & users |
| `/api/users/{id}` | PUT, DELETE | Admin | Edit or deactivate user |
| `/api/rfqs` | GET, POST | Authenticated | List & create RFQs |
| `/api/rfqs/{id}` | GET, PUT, DELETE | Authenticated | View details, edit draft, or delete |
| `/api/rfqs/{id}/status` | PATCH | Admin/Creator | Start auction or force close |
| `/api/rfqs/{id}/bids` | GET, POST | Authenticated | List all quotes / submit competitive quote |
| `/api/rfqs/{id}/activity` | GET | Authenticated | Audit timeline of extensions & bids |
| `/api/settings` | GET, POST, PUT | Admin | Dynamic configuration management |
| `/ws/{rfq_id}` | WebSocket | Clients | Real-time push for `bid:new`, `auction:extended`, `auction:closed` |

---

## 6. Professional Color Theme & UI Design
- **Primary Navy**: `#0F172A` (Side navigation & header bar)
- **Accent Blue**: `#2563EB` (Primary buttons, links, active badges)
- **Neutral Background**: `#F8FAFC` (Clean canvas, zero visual noise)
- **Cards & Surfaces**: `#FFFFFF` with `#E2E8F0` subtle borders
- **Success / L1 Leader**: `#059669` (Lowest bid indicator)
- **Warning / Extension**: `#D97706` (Trigger alerts)
- **Error / Forced Close**: `#DC2626` (Hard close indicator)
- **Icons**: Clean SVG icons from Ant Design (`@ant-design/icons`). **Zero emojis** anywhere in user or admin views.

---

## 7. Carrier Lifecycle, Localization & UX Architecture

### Carrier Account States & Moderation
- **Active (`is_active = True`)**: Carrier can authenticate, browse live tenders, and submit bids.
- **Deactivated (`is_active = False`)**: Admin can deactivate carrier with one click. Login fails with HTTP 403 and descriptive message.
- **Reactivation**: Admin can instantly reactivate deactivated carriers from the Carrier Network table via `/api/users/{id}/toggle-status`.

### Indian Standard Time (IST) & 12-Hour Presentation
- Backend stores and serializes UTC timestamps conforming strictly to ISO 8601 with explicit timezone offsets (`2026-11-13T16:30:00+00:00`).
- Both frontends convert all UTC datetimes to **Indian Standard Time (`Asia/Kolkata`, UTC+5:30)** using Day.js timezone extensions.
- All timestamps display in 12-hour format: e.g. `14 Nov 2026, 03:30:00 PM IST` and `03:30 PM (14 Nov)`.
- Real-time countdown timers compute exact epoch millisecond differences against UTC, avoiding local browser timezone drift.

### Auction State Segmentation & UI Flow
- **Live Auctions Table**: Restricted strictly to auctions that are both marked `ACTIVE` and whose current close time is in the future. Bidding button is labeled `Participate & Bid` (primary blue).
- **Past / Completed Auctions Table**: Dedicated section displaying auctions that have reached their close time or forced close ceiling. Button automatically changes to `View Results` (default grey).
- **Demo Re-arming**: Admin can reset the demo simulation auction anytime with a single click via `POST /api/rfqs/reset-demo-auctions`, setting a fresh 10-minute countdown with pre-seeded competitor quotes.

