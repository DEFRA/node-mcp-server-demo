#!/bin/bash

# MCP Transport Test Script
# Tests the new StreamableHTTPServerTransport implementation

BASE_URL="http://localhost:3000/mcp/v1/mcp"
HEADERS=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream")

echo "=== Testing MCP Transport Implementation ==="
echo

# Test 1: Initialize and extract session ID
echo "1. Testing initialize..."
INIT_RESPONSE=$(curl -s -X POST "${BASE_URL}" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}')

echo "Initialize Response:"
echo "$INIT_RESPONSE"
echo

# Extract session ID from response headers (if any) - for now we'll make a new session each time
# In a real implementation, the client would store and reuse the session ID

# Test 2: List tools with session management
echo "2. Testing tools/list..."
LIST_RESPONSE=$(curl -s -X POST "${BASE_URL}" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}')

echo "Tools List Response:"
echo "$LIST_RESPONSE"
echo

# Test 3: Create a note
echo "3. Testing create_note tool..."
CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "create_note", "arguments": {"title": "Transport Test Note", "content": "This note was created using the MCP SDK StreamableHTTPServerTransport!"}}}')

echo "Create Note Response:"
echo "$CREATE_RESPONSE"
echo

# Test 4: List notes
echo "4. Testing list_notes tool..."
LIST_NOTES_RESPONSE=$(curl -s -X POST "${BASE_URL}" "${HEADERS[@]}" \
  -d '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "list_notes", "arguments": {}}}')

echo "List Notes Response:"
echo "$LIST_NOTES_RESPONSE"
echo

echo "=== MCP Transport Test Complete ==="
