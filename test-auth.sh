#!/bin/bash

# Test script for debugging 401 issues
# Usage: ./test-auth.sh "<admin_session_cookie>" "<csrf_token>"

ADMIN_SESSION="${1:-d558d86b5e2c753358c1d23aad3b76bc5f63ce0536941926183faad4d2159b83.f5021ec8bc9561f1511a7bd8536a32671360d2459d9ce2b5afabce946939ce3b}"
CSRF_TOKEN="${2:-87db94da27f444ed8669ff02d952008b317b0ee6bb4d2a3a99aba90fda2380fb}"

GATEWAY="http://localhost:3004"

echo "================================================"
echo "Auth Debug Test Script"
echo "================================================"
echo ""

# Test 1: Check what cookies the server receives
echo "TEST 1: Cookie Debug Endpoint"
echo "--------------------------------"
echo "Sending: proofa_admin_session cookie"
curl -s "$GATEWAY/v1/debug/cookies" \
  -H "Cookie: proofa_admin_session=$ADMIN_SESSION" \
  -H "Content-Type: application/json" | jq . || echo "FAILED"
echo ""

# Test 2: Try to get auth status
echo "TEST 2: Auth Status Endpoint"
echo "--------------------------------"
echo "Sending: proofa_admin_session cookie"
curl -s "$GATEWAY/v1/debug/auth-status" \
  -H "Cookie: proofa_admin_session=$ADMIN_SESSION" \
  -H "Content-Type: application/json" -w "\nStatus: %{http_code}\n"
echo ""

# Test 3: Actually try to get projects
echo "TEST 3: Projects Endpoint"
echo "--------------------------------"
echo "Sending: proofa_admin_session and CSRF token"
curl -s "$GATEWAY/v1/admin/projects" \
  -H "Cookie: proofa_admin_session=$ADMIN_SESSION" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5174" \
  -w "\nStatus: %{http_code}\n" | jq . || echo "FAILED"
echo ""

echo "================================================"
echo "Check Gateway logs with: LOG_LEVEL=debug pnpm dev"
echo "Look for logs from 'middleware/auth' and 'core-client'"
echo "================================================"
