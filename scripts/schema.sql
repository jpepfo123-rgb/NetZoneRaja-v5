-- Net Zone CRM Dialer — PostgreSQL Schema
-- Idempotent: safe to re-run at any time (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS).
-- The API server calls initDb() on startup to seed default users on top of this schema.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255)  NOT NULL,
  username      VARCHAR(100)  UNIQUE NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   DEFAULT 'agent' CHECK (role IN ('admin','agent')),
  phone         VARCHAR(20),
  active        BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255)  NOT NULL,
  mobile           VARCHAR(20)   NOT NULL,
  alternate_number VARCHAR(20),
  company          VARCHAR(255),
  email            VARCHAR(255),
  address          TEXT,
  city             VARCHAR(100),
  category         VARCHAR(50)   DEFAULT 'New Lead',
  priority         VARCHAR(20)   DEFAULT 'Medium',
  notes            TEXT,
  follow_up_date   TIMESTAMPTZ,
  agent_id         UUID          REFERENCES users(id),
  total_calls      INTEGER       DEFAULT 0,
  last_call_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_agent    ON customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(category);

CREATE TABLE IF NOT EXISTS calls (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID          REFERENCES customers(id),
  customer_name    VARCHAR(255),
  customer_mobile  VARCHAR(20),
  agent_id         UUID          REFERENCES users(id),
  agent_name       VARCHAR(255),
  type             VARCHAR(20)   NOT NULL CHECK (type IN ('Incoming','Outgoing','Missed')),
  duration         VARCHAR(20)   DEFAULT '0:00',
  duration_seconds INTEGER       DEFAULT 0,
  phone_number     VARCHAR(20),
  remarks          TEXT,
  category         VARCHAR(100),
  follow_up_date   TIMESTAMPTZ,
  reminder_date    TIMESTAMPTZ,
  device_id        VARCHAR(255),
  created_at       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calls_customer ON calls(customer_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent    ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_created  ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_type     ON calls(type);

CREATE TABLE IF NOT EXISTS remarks (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID         REFERENCES customers(id),
  agent_id     UUID         REFERENCES users(id),
  agent_name   VARCHAR(255),
  text         TEXT         NOT NULL,
  is_call_note BOOLEAN      DEFAULT FALSE,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_remarks_customer ON remarks(customer_id);

CREATE TABLE IF NOT EXISTS reminders (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID         REFERENCES customers(id),
  customer_name   VARCHAR(255),
  customer_mobile VARCHAR(20),
  date_time       TIMESTAMPTZ  NOT NULL,
  notes           TEXT,
  status          VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','completed','overdue')),
  agent_id        UUID         REFERENCES users(id),
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminders_customer ON reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status   ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_date     ON reminders(date_time);

-- ---------------------------------------------------------------------------
-- Idempotent migrations: add columns that may be missing on existing installs.
-- Safe to run repeatedly; no-ops if the columns already exist.
-- ---------------------------------------------------------------------------
ALTER TABLE calls     ADD COLUMN IF NOT EXISTS reminder_date TIMESTAMPTZ;
ALTER TABLE calls     ADD COLUMN IF NOT EXISTS device_id     VARCHAR(255);
ALTER TABLE remarks   ADD COLUMN IF NOT EXISTS agent_id      UUID REFERENCES users(id);
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();
-- Customer status fields (Active / Closed)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status        VARCHAR(20)  DEFAULT 'Active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS close_date    TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS close_remark  TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS close_by      VARCHAR(255);
-- Reminder type (Call Back / Meeting / Follow-up / Payment Due / Other)
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reminder_type VARCHAR(50)  DEFAULT 'Call Back';
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20)  DEFAULT '#1565C0',
  description TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);
