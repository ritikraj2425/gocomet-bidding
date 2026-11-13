"""Seed the database with rich initial data for the British Auction RFQ System."""

from datetime import datetime, timedelta, timezone

from app.auth import hash_password
from app.database import SessionLocal, engine
from app.models import ActivityLog, AuctionConfig, Base, Bid, Rfq, Setting, User


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        now = datetime.now(timezone.utc)

        # ── 1. Users ──────────────────────────────────────────────────────────
        admin = db.query(User).filter(User.email == "admin@rfq.com").first()
        if not admin:
            admin = User(
                email="admin@rfq.com",
                hashed_password=hash_password("admin123"),
                name="System Administrator",
                role="ADMIN",
                company="RFQ Platform Operations",
            )
            db.add(admin)
            db.flush()
            print("Created admin: admin@rfq.com / admin123")

        suppliers = []
        supplier_data = [
            ("supplier1@test.com", "Apex Logistics Ltd", "Rahul Verma", "+91 98765 43210"),
            ("supplier2@test.com", "BlueDart Freight Corp", "Priya Sharma", "+91 98765 43211"),
            ("supplier3@test.com", "Coastline Express Carriers", "Amit Patel", "+91 98765 43212"),
        ]

        for email, company, name, phone in supplier_data:
            sup = db.query(User).filter(User.email == email).first()
            if not sup:
                sup = User(
                    email=email,
                    hashed_password=hash_password("supplier123"),
                    name=name,
                    role="SUPPLIER",
                    company=company,
                    phone=phone,
                    is_active=True,
                )
                db.add(sup)
                db.flush()
                print(f"Created supplier: {email} ({company}) / supplier123")
            suppliers.append(sup)

        # ── 2. Settings ───────────────────────────────────────────────────────
        default_settings = [
            ("platform_name", "RFQ Auction Platform", "Platform Name", "text", "general"),
            ("currency_symbol", "INR", "Currency Symbol", "text", "general"),
            ("primary_color", "#2563EB", "Primary Color", "color", "theme"),
            ("secondary_color", "#0F172A", "Secondary Color", "color", "theme"),
            ("accent_color", "#2563EB", "Accent Color", "color", "theme"),
            ("default_trigger_window", "10", "Default Trigger Window (minutes)", "number", "auction"),
            ("default_extension_duration", "5", "Default Extension Duration (minutes)", "number", "auction"),
            ("default_trigger_type", "BID_RECEIVED", "Default Trigger Type", "select", "auction"),
        ]

        for key, value, label, input_type, category in default_settings:
            existing = db.query(Setting).filter(Setting.key == key).first()
            if not existing:
                db.add(Setting(key=key, value=value, label=label, input_type=input_type, category=category))

        # ── 3. Active Long Auction (RFQ-ACTIVE01) ──────────────────────────────
        rfq_act = db.query(Rfq).filter(Rfq.reference_id == "RFQ-ACTIVE01").first()
        if not rfq_act:
            rfq_act = Rfq(
                name="Express Full Truckload - Mumbai to Delhi (32ft MXL)",
                reference_id="RFQ-ACTIVE01",
                description="Dedicated 32ft Multi-Axle Container shipment. Route: Bhiwandi DC (MH) to Kundli Hub (HR). Cargo: Fast-moving consumer packaged goods. High priority transit.",
                bid_start_time=now - timedelta(hours=2),
                bid_close_time=now + timedelta(hours=24),
                original_bid_close_time=now + timedelta(hours=24),
                forced_bid_close_time=now + timedelta(hours=28),
                pickup_date=now + timedelta(days=5),
                status="ACTIVE",
                created_by_id=admin.id,
            )
            db.add(rfq_act)
            db.flush()

            db.add(AuctionConfig(
                rfq_id=rfq_act.id,
                trigger_window_mins=15,
                extension_mins=5,
                trigger_type="BID_RECEIVED",
            ))

            db.add(ActivityLog(
                rfq_id=rfq_act.id,
                event_type="AUCTION_STARTED",
                description="British Auction activated for open carrier bidding",
            ))

            # Competitor quotes already submitted
            db.add(Bid(
                rfq_id=rfq_act.id,
                supplier_id=suppliers[1].id,  # Supplier 2
                freight_charges=65000,
                origin_charges=7000,
                destination_charges=6000,
                total_amount=78000,
                transit_time=3,
                validity_date=now + timedelta(days=14),
            ))
            db.add(Bid(
                rfq_id=rfq_act.id,
                supplier_id=suppliers[2].id,  # Supplier 3
                freight_charges=70000,
                origin_charges=8500,
                destination_charges=6000,
                total_amount=84500,
                transit_time=4,
                validity_date=now + timedelta(days=14),
            ))
            print("Created active auction: RFQ-ACTIVE01 (closes in 24 hours, 2 initial bids)")

        # ── 4. Rapid Demo Auction (RFQ-DEMO01) ─────────────────────────────────
        # Always update or create RFQ-DEMO01 so that it has an active countdown whenever seed runs!
        rfq_demo = db.query(Rfq).filter(Rfq.reference_id == "RFQ-DEMO01").first()
        if rfq_demo:
            rfq_demo.status = "ACTIVE"
            rfq_demo.bid_start_time = now - timedelta(minutes=1)
            rfq_demo.bid_close_time = now + timedelta(minutes=15)
            rfq_demo.original_bid_close_time = now + timedelta(minutes=15)
            rfq_demo.forced_bid_close_time = now + timedelta(minutes=30)
            db.query(Bid).filter(Bid.rfq_id == rfq_demo.id).delete()
        else:
            rfq_demo = Rfq(
                name="Rapid British Auction Simulation (Live Test)",
                reference_id="RFQ-DEMO01",
                description="Short-duration live auction designed for evaluating British Auction auto-extensions. Trigger window: last 10 mins. Extension: +3 mins.",
                bid_start_time=now - timedelta(minutes=1),
                bid_close_time=now + timedelta(minutes=15),
                original_bid_close_time=now + timedelta(minutes=15),
                forced_bid_close_time=now + timedelta(minutes=30),
                pickup_date=now + timedelta(days=2),
                status="ACTIVE",
                created_by_id=admin.id,
            )
            db.add(rfq_demo)
            db.flush()

            db.add(AuctionConfig(
                rfq_id=rfq_demo.id,
                trigger_window_mins=10,
                extension_mins=3,
                trigger_type="BID_RECEIVED",
            ))

        db.add(Bid(
            rfq_id=rfq_demo.id,
            supplier_id=suppliers[1].id,
            freight_charges=42000,
            origin_charges=4000,
            destination_charges=4000,
            total_amount=50000,
            transit_time=2,
            validity_date=now + timedelta(days=14),
        ))
        db.add(Bid(
            rfq_id=rfq_demo.id,
            supplier_id=suppliers[2].id,
            freight_charges=46000,
            origin_charges=4500,
            destination_charges=4500,
            total_amount=55000,
            transit_time=3,
            validity_date=now + timedelta(days=14),
        ))
        db.add(ActivityLog(
            rfq_id=rfq_demo.id,
            event_type="AUCTION_STARTED",
            description="Rapid simulation auction initialized with 15-minute countdown",
        ))
        print("Initialized demo auction: RFQ-DEMO01 (closes in 15 minutes, 2 initial bids)")

        # ── 5. Completed / Past Auction (RFQ-PAST01) ───────────────────────────
        rfq_past = db.query(Rfq).filter(Rfq.reference_id == "RFQ-PAST01").first()
        if not rfq_past:
            rfq_past = Rfq(
                name="Temperature Controlled Pharma Cargo - Hyderabad to Bangalore",
                reference_id="RFQ-PAST01",
                description="Cold chain refrigerated 20ft container shipment. Maintained at 2-8°C with digital data logger.",
                bid_start_time=now - timedelta(hours=6),
                bid_close_time=now - timedelta(hours=2),
                original_bid_close_time=now - timedelta(hours=2, minutes=15),
                forced_bid_close_time=now - timedelta(hours=1),
                pickup_date=now + timedelta(days=1),
                status="CLOSED",
                created_by_id=admin.id,
            )
            db.add(rfq_past)
            db.flush()

            db.add(AuctionConfig(
                rfq_id=rfq_past.id,
                trigger_window_mins=15,
                extension_mins=5,
                trigger_type="BID_RECEIVED",
            ))

            # 3 bids - Supplier 1 won as L1!
            db.add(Bid(
                rfq_id=rfq_past.id,
                supplier_id=suppliers[0].id,  # Supplier 1 (Apex Logistics)
                freight_charges=38000,
                origin_charges=3500,
                destination_charges=3500,
                total_amount=45000,
                transit_time=1,
                validity_date=now + timedelta(days=10),
            ))
            db.add(Bid(
                rfq_id=rfq_past.id,
                supplier_id=suppliers[1].id,
                freight_charges=40000,
                origin_charges=4000,
                destination_charges=4000,
                total_amount=48000,
                transit_time=2,
                validity_date=now + timedelta(days=10),
            ))
            db.add(Bid(
                rfq_id=rfq_past.id,
                supplier_id=suppliers[2].id,
                freight_charges=43000,
                origin_charges=4500,
                destination_charges=4000,
                total_amount=51500,
                transit_time=2,
                validity_date=now + timedelta(days=10),
            ))

            db.add(ActivityLog(
                rfq_id=rfq_past.id,
                event_type="TIME_EXTENDED",
                description="Auction extended by 5 mins due to late competitive quote",
            ))
            db.add(ActivityLog(
                rfq_id=rfq_past.id,
                event_type="AUCTION_CLOSED",
                description="Auction closed. Winning carrier: Apex Logistics Ltd at INR 45,000",
            ))
            print("Created past auction: RFQ-PAST01 (CLOSED, won by Apex Logistics at 45,000)")

        # ── 6. Draft RFQ (RFQ-DRAFT01) ─────────────────────────────────────────
        rfq_draft = db.query(Rfq).filter(Rfq.reference_id == "RFQ-DRAFT01").first()
        if not rfq_draft:
            rfq_draft = Rfq(
                name="Chennai Port to Sri City Industrial Corridor",
                reference_id="RFQ-DRAFT01",
                description="Import cargo movement from Chennai port terminal to Sri City manufacturing zone.",
                bid_start_time=now + timedelta(hours=4),
                bid_close_time=now + timedelta(hours=28),
                original_bid_close_time=now + timedelta(hours=28),
                forced_bid_close_time=now + timedelta(hours=32),
                pickup_date=now + timedelta(days=8),
                status="DRAFT",
                created_by_id=admin.id,
            )
            db.add(rfq_draft)
            db.flush()

            db.add(AuctionConfig(
                rfq_id=rfq_draft.id,
                trigger_window_mins=10,
                extension_mins=5,
                trigger_type="BID_RECEIVED",
            ))
            print("Created draft RFQ: RFQ-DRAFT01")

        db.commit()
        print("\nSeed successful. Database ready with active, demo, completed, and draft auctions.")

    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
