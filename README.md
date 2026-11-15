# British Auction RFQ System

A freight procurement platform where an administrator publishes a request for quotation (RFQ) and suppliers compete in a live British auction. The system ranks bids, extends closing time when configured activity occurs, and records auction events for review.

## At a glance

| Part | Technology | Local address |
| --- | --- | --- |
| API and auction rules | FastAPI, SQLAlchemy, Uvicorn, WebSockets | `http://localhost:3000` |
| Admin application | React, TypeScript, Vite, Ant Design | `http://localhost:5173` |
| Supplier application | React, TypeScript, Vite, Ant Design | `http://localhost:5174` |

The API serves interactive documentation at `http://localhost:3000/docs`. SQLite is the default database; `DATABASE_URL` can select another compatible SQLAlchemy database.

## How the auction works

1. An administrator creates an RFQ, sets its schedule, and chooses the extension window (**X**), extension length (**Y**), and trigger rule.
2. Suppliers submit an itemized quote, transit time, and validity date while bidding is open.
3. Bids rank by lowest total price, then shortest transit time, then earliest submission.
4. A configured trigger can extend the current closing time by **Y** minutes. The forced closing time is a hard limit.
5. The system closes the auction and keeps an activity history. Admins see supplier identities; competitive supplier views mask competitors.

## Main features

- Admin tools for RFQ scheduling, supplier accounts, platform settings, live monitoring, and audit history.
- Supplier registration, RFQ browsing, quote submission, live rank updates, and auction countdowns.
- Extension triggers for a bid received, any rank change, or a change to the leading bid.
- Background checks that activate scheduled RFQs and close auctions at their deadline.
- Real-time updates through WebSockets and role-aware access through JWT authentication.

## Run locally

Start each part in its own terminal from the project root.

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

To restore the sample data, run this from the project root:

```bash
backend/venv/bin/python backend/seed.py
```

### 2. Admin application

```bash
cd admin-frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The seeded admin account is `admin@rfq.com` / `admin123`.

### 3. Supplier application

```bash
cd supplier-frontend
npm install
npm run dev
```

Open `http://localhost:5174`. The seeded supplier account is `supplier1@test.com` / `supplier123`; suppliers can also register from the site.

## Project documentation

- [Readable project guide](docs/readme.html)
- [High-level design](docs/hld.html) — application components, data and event paths, auction rules, and request lifecycle.
- [Schema design](docs/schema_design.html) — entity relationships, table fields, and data integrity notes.
- [Backend models](backend/app/models.py) — SQLAlchemy table definitions.

Open the HTML documents in a browser for their interactive diagrams. The project documentation reflects the current implementation.
