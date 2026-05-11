-- 0001_initial_schema.sql
-- IATF 16949 QMS Initial Schema

CREATE TABLE IF NOT EXISTS clauses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  parent_id TEXT REFERENCES clauses(id),
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  category TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  clause_id TEXT NOT NULL REFERENCES clauses(id),
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('form','record','procedure','manual')) DEFAULT 'form',
  template_path TEXT,
  current_version TEXT DEFAULT '1.0',
  retention_days INTEGER DEFAULT 1095,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manager_id TEXT
);

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team_id TEXT REFERENCES teams(id),
  role TEXT,
  email TEXT,
  qualifications TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  clause_id TEXT NOT NULL REFERENCES clauses(id),
  assignee_id TEXT REFERENCES persons(id),
  team_id TEXT REFERENCES teams(id),
  status TEXT CHECK(status IN ('plan','do','check','act','done')) DEFAULT 'plan',
  priority TEXT CHECK(priority IN ('high','medium','low')) DEFAULT 'medium',
  deadline TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_pdca_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT DEFAULT (datetime('now')),
  changed_by TEXT REFERENCES persons(id),
  note TEXT
);

CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  scheduled_date TEXT,
  actual_date TEXT,
  status TEXT DEFAULT 'planned',
  lead_auditor TEXT,
  scope TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  audit_id TEXT REFERENCES audits(id),
  clause_id TEXT REFERENCES clauses(id),
  type TEXT CHECK(type IN ('major_nc','minor_nc','observation','opportunity')),
  description TEXT NOT NULL,
  root_cause TEXT,
  corrective_action TEXT,
  due_date TEXT,
  verification_date TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_clauses_parent ON clauses(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_clause ON documents(clause_id);
CREATE INDEX IF NOT EXISTS idx_tasks_clause ON tasks(clause_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_pdca_history(task_id);
CREATE INDEX IF NOT EXISTS idx_findings_audit ON findings(audit_id);
CREATE INDEX IF NOT EXISTS idx_findings_clause ON findings(clause_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
