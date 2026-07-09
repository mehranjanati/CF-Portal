-- Builder Generations (Results of Code Generation)
CREATE TABLE IF NOT EXISTS builder_generations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    summary TEXT,
    result_json TEXT,
    status TEXT,
    error_code TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES builder_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generation_session ON builder_generations(session_id);
CREATE INDEX IF NOT EXISTS idx_generation_status ON builder_generations(status);

-- Builder History (Fast lookup by App)
CREATE TABLE IF NOT EXISTS builder_history (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL,
    session_id TEXT,
    generation_id TEXT,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES builder_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (generation_id) REFERENCES builder_generations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_history_app ON builder_history(app_id);
CREATE INDEX IF NOT EXISTS idx_history_session ON builder_history(session_id);