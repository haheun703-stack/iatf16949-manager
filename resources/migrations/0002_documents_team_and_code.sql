-- 0002_documents_team_and_code.sql
-- Add team_id and doc_code to documents for regulation-team mapping

ALTER TABLE documents ADD COLUMN team_id TEXT REFERENCES teams(id);
ALTER TABLE documents ADD COLUMN doc_code TEXT;
ALTER TABLE documents ADD COLUMN revision TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_team ON documents(team_id);
CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(doc_code);
