#!/bin/bash
# British Auction RFQ System - Startup Script

echo "Starting British Auction RFQ System..."

# 1. Start Backend
echo "Starting FastAPI Backend on port 3000..."
cd /Users/ritikraj/gocomet/backend
./venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload &
BACKEND_PID=$!


# 2. Start Admin Frontend
echo "Starting Admin Frontend on port 5173..."
cd /Users/ritikraj/gocomet/admin-frontend
npm run dev &
ADMIN_PID=$!

# 3. Start Supplier Frontend
echo "Starting Supplier Frontend on port 5174..."
cd /Users/ritikraj/gocomet/supplier-frontend
npm run dev &
SUPPLIER_PID=$!

echo "All services initiated:"
echo "- Backend:           http://localhost:3000 (API & Docs: http://localhost:3000/docs)"
echo "- Admin Frontend:    http://localhost:5173 (admin@rfq.com / admin123)"
echo "- Supplier Frontend: http://localhost:5174 (supplier1@test.com / supplier123)"

trap "kill $BACKEND_PID $ADMIN_PID $SUPPLIER_PID" EXIT
wait

