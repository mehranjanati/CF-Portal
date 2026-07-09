# D1 Schema V1

## Goal
Define the initial schema for persisting Builder session and generation metadata in Cloudflare D1.

## Tables

### 1. `builder_sessions`
Stores metadata about each builder session.

| Column          | Type        | Nullable | Description |
|-----------------|-------------|----------|-------------|
| `id`            | TEXT        | NO       | UUID session identifier |
| `tenant_id`     | TEXT        | NO       | Foreign key to `tenants` table |
| `app_id`        | TEXT        | NO       | Foreign key to `apps` table |
| `template`      | TEXT        | YES      | Selected template name |
| `intent`        | TEXT        | YES      | User intent description |
| `status`        | TEXT        | YES      | Current status (`idle`, `generating`, `success`, `error`) |
| `created_at`    | TIMESTAMP   | NO       | ISO timestamp |
| `updated_at`    | TIMESTAMP   | YES      | ISO timestamp |
| `ended_at`      | TIMESTAMP   | YES      | Optional end timestamp |

**Indexes:**
- `INDEX session_tenant_app ON builder_sessions(tenant_id, app_id)`
- `INDEX session_status ON builder_sessions(status)`

### 2. `builder_generations`
Stores generation results linked to sessions.

| Column               | Type        | Nullable | Description |
|----------------------|-------------|----------|-------------|
| `id`                 | TEXT        | NO       | UUID generation identifier |
| `session_id`         | TEXT        | NO       | Foreign key to `builder_sessions.id` |
| `prompt`             | TEXT        | NO       | Original user prompt |
| `summary`            | TEXT        | YES      | Generated summary |
| `result_json`        | TEXT        | YES      | JSON string of file plan/structure |
| `status`             | TEXT        | YES      | (`success`, `failed`) |
| `error_code`         | TEXT        | YES      | Optional error code |
| `error_message`      | TEXT        | YES      | Human-readable error |
| `created_at`         | TIMESTAMP   | NO       | ISO timestamp |
| `completed_at`       | TIMESTAMP   | YES      | Optional completion timestamp |

**Indexes:**
- `INDEX generation_session ON builder_generations(session_id)`
- `INDEX generation_status ON builder_generations(status)`

### 3. `builder_history`
Optional table for fast history lookup by app.

| Column        | Type        | Nullable | Description |
|---------------|-------------|----------|-------------|
| `id`          | TEXT        | NO       | UUID entry |
| `app_id`      | TEXT        | NO       | Foreign key to `apps` |
| `session_id`  | TEXT        | YES      | Link to session |
| `generation_id`| TEXT       | YES      | Link to generation |
| `status`      | TEXT        | YES      | Status snapshot |
| `created_at`  | TIMESTAMP   | NO       | ISO timestamp |

**Indexes:**
- `INDEX history_app ON builder_history(app_id)`
- `INDEX history_session ON builder_history(session_id)`

## Migration Commands (SQL)

```sql
CREATE TABLE builder_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  template TEXT,
  intent TEXT,
  status TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE TABLE builder_generations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  summary TEXT,
  result_json TEXT,
  status TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);

CREATE TABLE builder_history (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  session_id TEXT,
  generation_id TEXT,
  status TEXT,
  created_at TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX session_tenant_app ON builder_sessions(tenant_id, app_id);
CREATE INDEX session_status ON builder_sessions(status);
CREATE INDEX generation_session ON builder_generations(session_id);
CREATE INDEX generation_status ON builder_generations(status);
CREATE INDEX history_app ON builder_history(app_id);
CREATE INDEX history_session ON builder_history(session_id);
```