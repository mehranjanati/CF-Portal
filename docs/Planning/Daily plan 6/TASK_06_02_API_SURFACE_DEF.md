# Task 06.2: API Surface Definition

## Goal
Define the REST API contracts for the Builder orchestration layer in `platform-api`, focusing on session management, generation, and history endpoints.

## Endpoints

### 1. Create Builder Session
**POST** `/api/builder/sessions`
- **Request Body**:
  ```json
  {
    "tenantId": "string",
    "appId": "string",
    "template": "string",
    "intent": "string"
  }
  ```
- **Response (201)**:
  ```json
  {
    "sessionId": "string",
    "status": "idle",
    "createdAt": "ISO timestamp"
  }
  ```

### 2. Get Session Details
**GET** `/api/builder/sessions/:sessionId`
- **Response (200)**:
  ```json
  {
    "id": "string",
    "status": "idle|generating|success|error",
    "prompt": "string | null",
    "result": {
      "summary": "string",
      "files": ["{path: string, action: string}"],
      "nextActions": ["string"]
    },
    "history": [
      {
        "generationId": "string",
        "status": "success|failed",
        "createdAt": "timestamp"
      }
    ],
    "updatedAt": "timestamp"
  }
  ```

### 3. Generate Content
**POST** `/api/builder/sessions/:sessionId/generate`
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response (200)**:
  ```json
  {
    "status": "generating|success|error",
    "result": {
      "summary": "string",
      "files": ["{path: string, action: string}"],
      "suggestedRoutes": ["string"],
      "suggestedComponents": ["string"],
      "nextActions": ["string"]
    },
    "error": {
      "code": "string | null",
      "message": "string | null"
    }
  }
  ```

### 4. Get Generation History
**GET** `/api/builder/apps/:appId/history`
- **Response (200)**:
  ```json
  {
    "appId": "string",
    "sessions": [
      {
        "id": "string",
        "summary": "string",
        "status": "success|failed",
        "createdAt": "timestamp"
      }
    ],
    "latest": {
      "sessionId": "string",
      "status": "string",
      "createdAt": "timestamp"
    }
  }
  ```

## Error Normalization
All errors must conform to:
```json
{
  "success": false,
  "error": "string",
  "details": {
    "code": "string",
    "metadata": "object"
  }
}
```

## Provider Abstraction
- All provider-specific logic must be isolated in `platform-api/src/modules/builder/providers/`.
- Responses must be normalized to the internal `BuilderResult` model before returning.

---