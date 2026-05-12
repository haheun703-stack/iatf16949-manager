-- 0003_company_profile.sql
-- Company profile key-value store for document generation

CREATE TABLE IF NOT EXISTS company_profile (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
