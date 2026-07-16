-- 003_add_version_vector_to_builder_sessions.sql
-- Migration to add version_vector column to builder_sessions for Version Vector support

ALTER TABLE builder_sessions ADD COLUMN version_vector TEXT NOT NULL DEFAULT '{}';
