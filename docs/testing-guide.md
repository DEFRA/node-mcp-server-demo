# Testing Guide: MCP Server with cURL

## Overview

This guide provides comprehensive testing instructions for the MCP transport endpoint using cURL commands. These tests can be run once Docker is up and running.

## Prerequisites

1. **Start the Docker environment**:
   ```bash
   docker-compose up -d
   ```

2. **Verify services are running**:
   ```bash
   docker ps
   ```

3. **Check server health**:
   ```bash
   curl http://localhost:3000/health
   ```

## MCP Protocol Testing

### 1. Initialize MCP Session

**Purpose**: Establish a new MCP session and get session ID from response headers

```bash
curl -i -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "capabilities": { "tools": {} },
      "clientInfo": { "name": "test-client", "version": "1.0.0" },
      "protocolVersion": "2024-11-05"
    }
  }'
```

**Expected Response**:

The session ID will be returned in the response headers as `mcp-session-id`:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
...other headers...
mcp-session-id: <SESSION_ID>

event: message
data: {...}
```

**Extract Session ID** for subsequent requests:**
You can extract the session ID from the response headers using grep/awk:

```bash
SESSION_ID=$(curl -i -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "capabilities": { "tools": {} },
      "clientInfo": { "name": "test-client", "version": "1.0.0" },
      "protocolVersion": "2024-11-05"
    }
  }' | grep -i '^mcp-session-id:' | awk '{print $2}' | tr -d '\r')

echo "Session ID: $SESSION_ID"
```

### 2. List Available Tools

**Purpose**: Get list of all available MCP tools

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' | grep '^data:' | sed 's/^data: //' | jq '.'
```

**Expected Response**:
```json
{
  "result": {
    "tools": [
      {
        "name": "create_note",
        "description": "Create a new note with title and content",
        "inputSchema": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 255
            },
            "content": {
              "type": "string",
              "maxLength": 10000
            }
          },
          "required": [
            "title",
            "content"
          ],
          "additionalProperties": false,
          "$schema": "http://json-schema.org/draft-07/schema#"
        }
      },
      {
        "name": "get_note",
        "description": "Retrieve a note by its unique ID",
        "inputSchema": {
          "type": "object",
          "properties": {
            "noteId": {
              "type": "string",
              "pattern": "^note_\\d+_[a-z0-9]+$"
            }
          },
          "required": [
            "noteId"
          ],
          "additionalProperties": false,
          "$schema": "http://json-schema.org/draft-07/schema#"
        }
      },
      {
        "name": "list_notes",
        "description": "List all available notes with their metadata",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 2
}
```

### 3. Create a Note

**Purpose**: Test note creation using MCP protocol

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_note",
      "arguments": {
        "title": "Test Note via MCP",
        "content": "This note was created using the MCP protocol for testing purposes."
      }
    }
  }' | grep '^data:' | sed 's/^data: //' | jq '.'
```

**Expected Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Note created successfully with ID: note_1754321234567_xyz789abc"
    }
  ]
}
```

**Store Note ID** for subsequent tests:
```bash
NOTE_ID=$(curl -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "create_note",
      "arguments": {
        "title": "Sample Note",
        "content": "Sample content for testing"
      }
    }
  }' | jq -r '.result.content[0].text' | grep -Eo 'ID: note_[0-9]+_[a-z0-9]+' | grep -Eo 'note_[0-9]+_[a-z0-9]+')

echo "Created Note ID: $NOTE_ID"
```

### 4. List All Notes

**Purpose**: Test listing functionality

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "list_notes",
      "arguments": {}
    }
  }' | grep '^data:' | sed 's/^data: //' | jq '.'
```

**Expected Response**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📝 **Available Notes** (4 total)\n\n- **My Note Title** (ID: note_1234567890_abc123def) - Created: Thu Jul 31 2025 10:30:00 GMT+0000 (Coordinated Universal Time)\n- **Refactored Success Note** (ID: note_1754047843665_63mdounjb) - Created: Fri Aug 01 2025 11:30:43 GMT+0000 (Coordinated Universal Time)\n- **No Static Methods Test** (ID: note_1754048150071_h5rxn2njn) - Created: Fri Aug 01 2025 11:35:50 GMT+0000 (Coordinated Universal Time)\n- **new note** (ID: note_1754059902901_d6esmmtwx) - Created: Fri Aug 01 2025 14:51:42 GMT+0000 (Coordinated Universal Time)\n- **MCP SDK Success!** (ID:  (Coordinated Universal Time)\n\nUse the get_note tool with a specific ID to retrieve a note's content."
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 4
}
```

### 5. Retrieve Specific Note

**Purpose**: Test note retrieval by ID

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 5,
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"get_note\",
      \"arguments\": {
        \"noteId\": \"$NOTE_ID\"
      }
    }
  }" | grep '^data:' | sed 's/^data: //' | jq '.'
```

**Expected Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Title: Sample Note\nContent: Sample content for testing\nCreated: 2025-01-04T15:47:14.567Z"
    }
  ]
}
```

### 6. Test Error Handling

**Purpose**: Verify proper error responses

**Invalid Note ID**:
```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "get_note",
      "arguments": {
        "noteId": "invalid_note_id"
      }
    }
  }' | grep '^data:' | sed 's/^data: //' | jq '.'
```

**Expected Error Response**:
```json
{
  "error": {
    "code": -32602,
    "message": "Invalid arguments",
    "data": {
      "details": "Validation failed"
    }
  }
}
```

**Non-existent Note**:
```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "get_note",
      "arguments": {
        "noteId": "note_9999999999999_nonexistent"
      }
    }
  }' | grep '^data:' | sed 's/^data: //' | jq '.'
```

### 7. Session Management

**Create Multiple Sessions**:
# Session 1
```bash
SESSION_1=$(curl -i -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "client-1", "version": "1.0.0"},
      "protocolVersion": "2024-11-05"
    }
  }' | grep -i '^mcp-session-id:' | awk '{print $2}' | tr -d '\r')
```
# Session 2
```bash
SESSION_2=$(curl -i -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "initialize",
    "params": {
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "client-2", "version": "1.0.0"},
      "protocolVersion": "2024-11-05"
    }
  }' | grep -i '^mcp-session-id:' | awk '{print $2}' | tr -d '\r')

echo "Session 1: $SESSION_1"
echo "Session 2: $SESSION_2"
```

**Test Session Isolation**:
```bash
# Both sessions should work independently
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -H "Mcp-Session-Id: $SESSION_1" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/list",
    "params": {}
  }' | grep '^data:' | sed 's/^data: //' | jq '.tools | length'

curl -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Host: localhost:3000" \
  -H "Origin: http://localhost:3000" \
  -H "Mcp-Session-Id: $SESSION_2" \
  -d '{
    "jsonrpc": "2.0",
    "id": 11,
    "method": "tools/list",
    "params": {}
  }' | grep '^data:' | sed 's/^data: //' | jq '.tools | length'
```


## Complete Test Suite Script

Create a comprehensive test script:

```bash
#!/bin/bash
# test-mcp-server.sh

set -e

echo "🚀 Starting MCP Server Tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -e "${YELLOW}Testing: ${test_name}${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if result=$(eval "$test_command" 2>&1) && echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Command: $test_command"
        echo "Result: $result"
    fi
    echo ""
}

# Check if server is running
echo "🔍 Checking server health..."
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ Server is not running. Please start Docker containers first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Initialize MCP session
echo "🔗 Initializing MCP session..."
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/v1/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "initialize",
    "params": {
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "test-client", "version": "1.0.0"},
      "protocolVersion": "2024-11-05"
    }
  }' | jq -r '.sessionId')

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
    echo -e "${RED}❌ Failed to initialize MCP session${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Session initialized: $SESSION_ID${NC}"
echo ""

# MCP Protocol Tests
echo "🧪 Running MCP Protocol Tests..."

run_test "MCP: List tools" \
    "curl -s -X POST http://localhost:3000/api/v1/mcp -H 'Content-Type: application/json' -H 'Mcp-Session-Id: $SESSION_ID' -d '{\"method\": \"tools/list\", \"params\": {}}'" \
    "create_note"

run_test "MCP: Create note" \
    "curl -s -X POST http://localhost:3000/api/v1/mcp -H 'Content-Type: application/json' -H 'Mcp-Session-Id: $SESSION_ID' -d '{\"method\": \"tools/call\", \"params\": {\"name\": \"create_note\", \"arguments\": {\"title\": \"Test Note\", \"content\": \"Test content\"}}}'" \
    "Note created successfully"

run_test "MCP: List notes" \
    "curl -s -X POST http://localhost:3000/api/v1/mcp -H 'Content-Type: application/json' -H 'Mcp-Session-Id: $SESSION_ID' -d '{\"method\": \"tools/call\", \"params\": {\"name\": \"list_notes\", \"arguments\": {}}}'" \
    "Found.*notes"


# Results
echo "📊 Test Results:"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Total:  $TESTS_TOTAL"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
```

**Make the script executable and run it**:
```bash
chmod +x test-mcp-server.sh
./test-mcp-server.sh
```

## Performance Testing

### Load Testing with Multiple Sessions

```bash
#!/bin/bash
# load-test.sh

echo "🚀 Starting load test..."

# Create 10 concurrent sessions
for i in {1..10}; do
    (
        SESSION_ID=$(curl -s -X POST http://localhost:3000/api/v1/mcp \
          -H "Content-Type: application/json" \
          -H "Accept: application/json, text/event-stream" \
          -d '{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
              "capabilities": {"tools": {}},
              "clientInfo": {"name": "load-test-'$i'", "version": "1.0.0"},
              "protocolVersion": "2024-11-05"
            }
          }' | grep '^data:' | sed 's/^data: //' | jq -r '.sessionId')
        
        # Create 5 notes per session
        for j in {1..5}; do
            curl -s -X POST http://localhost:3000/api/v1/mcp \
              -H "Content-Type: application/json" \
              -H "Mcp-Session-Id: $SESSION_ID" \
              -d '{
                "method": "tools/call",
                "params": {
                  "name": "create_note",
                  "arguments": {
                    "title": "Load Test Note '$i'-'$j'",
                    "content": "Content for session '$i' note '$j'"
                  }
                }
              }' > /dev/null
        done
        
        echo "Session $i completed"
    ) &
done

wait
echo "Load test completed"
```

This comprehensive testing guide ensures that both MCP protocol and REST API functionality work correctly, providing confidence in the implementation's reliability and performance.
