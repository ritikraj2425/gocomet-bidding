"""Integration tests for the British Auction RFQ System."""

from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_british_auction_full_workflow():
    print("\n--- 1. Testing Health & Public Endpoints ---")
    res = client.get("/api/health")
    assert res.status_code == 200
    print("Health check OK:", res.json())

    print("\n--- 2. Testing Authentication ---")
    # Admin login
    res = client.post("/api/auth/login", json={"email": "admin@rfq.com", "password": "admin123"})
    assert res.status_code == 200, res.text
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("Admin login passed.")

    # Supplier 1 login
    res = client.post("/api/auth/login", json={"email": "supplier1@test.com", "password": "supplier123"})
    assert res.status_code == 200, res.text
    s1_token = res.json()["access_token"]
    s1_headers = {"Authorization": f"Bearer {s1_token}"}
    print("Supplier 1 login passed.")

    # Supplier 2 login
    res = client.post("/api/auth/login", json={"email": "supplier2@test.com", "password": "supplier123"})
    assert res.status_code == 200, res.text
    s2_token = res.json()["access_token"]
    s2_headers = {"Authorization": f"Bearer {s2_token}"}
    print("Supplier 2 login passed.")

    print("\n--- 3. Testing Dynamic Settings (Editable by Admin, No Hardcoding) ---")
    res = client.get("/api/settings", headers=admin_headers)
    assert res.status_code == 200
    settings_list = res.json()
    print(f"Total dynamic settings: {len(settings_list)}")

    # Update platform title and default trigger window
    res = client.put("/api/settings/default_trigger_window", json={"value": "15"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["value"] == "15"
    print("Admin successfully updated 'default_trigger_window' to 15.")

    print("\n--- 4. Testing Validation Rules ---")
    now = datetime.now(timezone.utc)
    # Test: Forced close <= bid close MUST fail with 400
    invalid_rfq = {
        "name": "Invalid RFQ Test",
        "description": "This should fail validation",
        "bid_start_time": now.isoformat(),
        "bid_close_time": (now + timedelta(hours=2)).isoformat(),
        "forced_bid_close_time": (now + timedelta(hours=1)).isoformat(),  # Earlier!
        "pickup_date": (now + timedelta(days=5)).isoformat(),
        "auction_config": {
            "trigger_window_mins": 10,
            "extension_mins": 5,
            "trigger_type": "BID_RECEIVED",
        },
    }
    res = client.post("/api/rfqs", json=invalid_rfq, headers=admin_headers)
    assert res.status_code == 400, "Should reject forced close <= bid close"
    print("Validation passed: Forced close time must be later than Bid close time.")

    print("\n--- 5. Creating British Auction RFQ ---")
    # Auction setup: closes in 5 mins, trigger window 10 mins (so right now is inside window), extension 3 mins, forced close in 9 mins
    valid_rfq = {
        "name": "High-Tech Cargo Delhi to Bangalore",
        "description": "Sensitive electronics freight transport in temperature-controlled truck",
        "bid_start_time": (now - timedelta(minutes=5)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=5)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=9)).isoformat(),
        "pickup_date": (now + timedelta(days=3)).isoformat(),
        "auction_config": {
            "trigger_window_mins": 10,
            "extension_mins": 3,
            "trigger_type": "BID_RECEIVED",
        },
    }
    res = client.post("/api/rfqs", json=valid_rfq, headers=admin_headers)
    assert res.status_code == 200, res.text
    rfq = res.json()
    rfq_id = rfq["id"]
    initial_close_time = rfq["bid_close_time"]
    print(f"Created RFQ: {rfq['reference_id']} (Initial close: {initial_close_time})")

    # Activate the auction
    res = client.patch(f"/api/rfqs/{rfq_id}/status?status=ACTIVE", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ACTIVE"
    print("Auction activated to ACTIVE status.")

    print("\n--- 6. Testing Supplier 1 Initial Quote Submission ---")
    # Supplier 1 submits: Freight 50,000 + Origin 5,000 + Destination 5,000 = Total 60,000
    s1_bid = {
        "freight_charges": 50000.0,
        "origin_charges": 5000.0,
        "destination_charges": 5000.0,
        "transit_time": 4,
        "validity_date": (now + timedelta(days=15)).isoformat(),
    }
    res = client.post(f"/api/rfqs/{rfq_id}/bids", json=s1_bid, headers=s1_headers)
    assert res.status_code == 200, res.text
    bid_result = res.json()
    assert bid_result["bid"]["total_amount"] == 60000.0
    assert bid_result["bid"]["rank"] == 1
    print(f"Supplier 1 bid accepted: Total {bid_result['bid']['total_amount']}, Rank L{bid_result['bid']['rank']}")

    # Check that extension was triggered
    assert bid_result["extension"] is not None
    assert bid_result["extension"]["extended"] is True
    first_extended_close = bid_result["extension"]["new_close_time"]
    print(f"British Auction extended close time to: {first_extended_close}")

    print("\n--- 7. Testing Competitive Underbidding by Supplier 2 ---")
    # Supplier 2 underbids: Freight 42,000 + Origin 4,000 + Destination 4,000 = Total 50,000 (takes L1!)
    s2_bid = {
        "freight_charges": 42000.0,
        "origin_charges": 4000.0,
        "destination_charges": 4000.0,
        "transit_time": 3,
        "validity_date": (now + timedelta(days=15)).isoformat(),
    }
    res = client.post(f"/api/rfqs/{rfq_id}/bids", json=s2_bid, headers=s2_headers)
    assert res.status_code == 200, res.text
    s2_result = res.json()
    assert s2_result["bid"]["total_amount"] == 50000.0
    assert s2_result["bid"]["rank"] == 1
    print(f"Supplier 2 underbid Supplier 1: Total {s2_result['bid']['total_amount']}, Takes Rank L1!")

    print("\n--- 8. Verifying Hard Ceiling Enforcement (Forced Close Cap) ---")
    # Submit another bid to trigger extension up to forced close cap
    s1_counter_bid = {
        "freight_charges": 38000.0,
        "origin_charges": 3000.0,
        "destination_charges": 3000.0,
        "transit_time": 3,
        "validity_date": (now + timedelta(days=15)).isoformat(),
    }
    res = client.post(f"/api/rfqs/{rfq_id}/bids", json=s1_counter_bid, headers=s1_headers)
    assert res.status_code == 200, res.text
    counter_result = res.json()
    print(f"Supplier 1 counter-bid: Total {counter_result['bid']['total_amount']}, Recovers L1!")

    # Check RFQ final state
    res = client.get(f"/api/rfqs/{rfq_id}", headers=admin_headers)
    final_rfq = res.json()
    final_close = datetime.fromisoformat(final_rfq["bid_close_time"])
    forced_close = datetime.fromisoformat(final_rfq["forced_bid_close_time"])
    assert final_close <= forced_close, "Auction close time must NEVER exceed forced close time!"
    print(f"Cap verification passed: Current Close ({final_close}) <= Forced Close ({forced_close})")

    print("\n--- 9. Verifying Leaderboard Rankings & Activity Logs ---")
    bids = final_rfq["bids"]
    assert len(bids) == 3
    assert bids[0]["rank"] == 1
    assert bids[0]["total_amount"] == 44000.0  # Lowest
    assert bids[1]["rank"] == 2
    assert bids[1]["total_amount"] == 50000.0
    assert bids[2]["rank"] == 3
    assert bids[2]["total_amount"] == 60000.0
    print("Leaderboard verified: Bids correctly sorted ASC by price (L1, L2, L3).")

    logs = final_rfq["activity_logs"]
    extension_logs = [l for l in logs if l["event_type"] == "TIME_EXTENDED"]
    assert len(extension_logs) > 0
    print(f"Activity logs verified: {len(logs)} total events, {len(extension_logs)} time extensions recorded with reasons.")

    print("\nAll British Auction test scenarios PASSED successfully!")


if __name__ == "__main__":
    test_british_auction_full_workflow()

