#!/bin/bash

# Quick API Testing Script
# Make sure the server is running: npm run dev

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🧪 Testing Markopy API at $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
curl -s "$BASE_URL/api/health" | jq '.' || echo "❌ Health check failed"
echo ""

# Test 2: Create Checkout
echo "2️⃣  Testing Create Checkout..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/create-checkout" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-'$(date +%s)'"}')

echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
echo ""

# Test 3: Generate Free License (requires ADMIN_KEY)
if [ -n "$ADMIN_KEY" ]; then
  echo "3️⃣  Testing Free License Generation..."
  LICENSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/generate-free-license" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ADMIN_KEY" \
    -d '{
      "userId": "test-user-'$(date +%s)'",
      "email": "test@example.com"
    }')

  echo "$LICENSE_RESPONSE" | jq '.' || echo "$LICENSE_RESPONSE"

  # Extract license key if successful
  LICENSE_KEY=$(echo "$LICENSE_RESPONSE" | jq -r '.licenseKey // empty')
  if [ -n "$LICENSE_KEY" ] && [ "$LICENSE_KEY" != "null" ]; then
    echo ""
    echo "✅ License Key: $LICENSE_KEY"
    echo ""
    echo "4️⃣  Testing License Check..."
    curl -s -X POST "$BASE_URL/api/check-license" \
      -H "Content-Type: application/json" \
      -d "{\"userId\": \"test-user\", \"licenseKey\": \"$LICENSE_KEY\"}" | jq '.'
  fi
else
  echo "⚠️  Skipping license test (ADMIN_KEY not set)"
fi

echo ""
echo "✅ Testing complete!"
