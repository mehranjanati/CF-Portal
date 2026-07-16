-- 002_add_version_to_builder_sessions.sql
-- Migration to add version column to builder_sessions for optimistic concurrency control

ALTER TABLE builder_sessions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
