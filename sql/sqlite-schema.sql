-- Core PRAGMAs for local/offline reliability.
PRAGMA foreign_keys = ON;

-- Backward-compatible auth table used by current app auth.
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (
    role IN (
      'admin',
      'manager',
      'cashier',
      'staff',
      'reception',
      'lab',
      'reviewer'
    )
  ),
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_employees_email ON employees (email);

-- Project.md lab schema.
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reception', 'lab', 'reviewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS patients (
  patient_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  first_name TEXT,
  father_name TEXT,
  last_name TEXT,
  gender TEXT NOT NULL DEFAULT 'Unknown' CHECK (
    gender IN ('Male', 'Female', 'Other', 'Unknown')
  ),
  date_of_birth TEXT,
  phone TEXT,
  location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS visits (
  visit_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients (patient_id) ON DELETE RESTRICT,
  case_no TEXT NOT NULL UNIQUE,
  physician_name TEXT,
  branch TEXT,
  visit_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'ready', 'verified', 'printed')
  ),
  created_by TEXT REFERENCES users (user_id) ON DELETE SET NULL,
  verified_by TEXT REFERENCES users (user_id) ON DELETE SET NULL,
  verified_at TEXT,
  printed_at TEXT,
  print_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS departments (
  department_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  ordering INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS panels (
  panel_id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES departments (department_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ordering INTEGER NOT NULL DEFAULT 0,
  print_if_empty INTEGER NOT NULL DEFAULT 0 CHECK (print_if_empty IN (0, 1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (department_id, name)
);

CREATE TABLE IF NOT EXISTS tests (
  test_id TEXT PRIMARY KEY,
  panel_id TEXT NOT NULL REFERENCES panels (panel_id) ON DELETE CASCADE,
  test_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  result_type TEXT NOT NULL DEFAULT 'number' CHECK (
    result_type IN ('number', 'text', 'select', 'boolean')
  ),
  allowed_values TEXT,
  default_unit TEXT,
  decimal_precision INTEGER NOT NULL DEFAULT 2,
  print_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (allowed_values IS NULL OR json_valid(allowed_values))
);

CREATE TABLE IF NOT EXISTS reference_ranges (
  range_id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL REFERENCES tests (test_id) ON DELETE CASCADE,
  gender TEXT NOT NULL DEFAULT 'Any' CHECK (gender IN ('Any', 'Male', 'Female')),
  age_min INTEGER,
  age_max INTEGER,
  unit TEXT,
  range_text TEXT,
  normal_low REAL,
  normal_high REAL,
  critical_low REAL,
  critical_high REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (age_min IS NULL OR age_min >= 0),
  CHECK (age_max IS NULL OR age_max >= 0),
  CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
);

CREATE TABLE IF NOT EXISTS results (
  result_id TEXT PRIMARY KEY,
  visit_id TEXT NOT NULL REFERENCES visits (visit_id) ON DELETE CASCADE,
  test_id TEXT NOT NULL REFERENCES tests (test_id) ON DELETE RESTRICT,
  value TEXT,
  unit TEXT,
  range_snapshot TEXT,
  abnormal_flag TEXT CHECK (
    abnormal_flag IN ('Normal', 'Low', 'High', 'CriticalLow', 'CriticalHigh')
  ),
  entered_by TEXT REFERENCES users (user_id) ON DELETE SET NULL,
  entered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT REFERENCES users (user_id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (visit_id, test_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN ('create', 'update', 'delete', 'unlock', 'verify', 'print')
  ),
  before_json TEXT,
  after_json TEXT,
  user_id TEXT REFERENCES users (user_id) ON DELETE SET NULL,
  "timestamp" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reason TEXT,
  CHECK (before_json IS NULL OR json_valid(before_json)),
  CHECK (after_json IS NULL OR json_valid(after_json))
);

CREATE TABLE IF NOT EXISTS report_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  report_header_image_url TEXT NOT NULL DEFAULT '',
  lab_name TEXT NOT NULL DEFAULT '',
  lab_address TEXT NOT NULL DEFAULT '',
  lab_phone TEXT NOT NULL DEFAULT '',
  lab_email TEXT NOT NULL DEFAULT '',
  report_header_text TEXT NOT NULL DEFAULT '',
  report_footer_text TEXT NOT NULL DEFAULT 'Tripoli - Rue Maarad - Imm. Mir - Tel: 06 / 445 455 - 03 / 104 999 - Autorisation 677/1 - Email: labazamokaddem@hotmail.com - Results Website: www.labazamokaddem.online',
  show_last_result INTEGER NOT NULL DEFAULT 1 CHECK (show_last_result IN (0, 1)),
  no_range_placeholder TEXT NOT NULL DEFAULT '—',
  hide_empty_rows INTEGER NOT NULL DEFAULT 1 CHECK (hide_empty_rows IN (0, 1)),
  hide_empty_panels INTEGER NOT NULL DEFAULT 1 CHECK (hide_empty_panels IN (0, 1)),
  hide_empty_departments INTEGER NOT NULL DEFAULT 1 CHECK (hide_empty_departments IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO report_settings (
  id,
  report_header_image_url,
  lab_name,
  lab_address,
  lab_phone,
  lab_email,
  report_header_text,
  report_footer_text,
  show_last_result,
  no_range_placeholder,
  hide_empty_rows,
  hide_empty_panels,
  hide_empty_departments
) VALUES (
  1,
  '/default-logo.png',
  '',
  '',
  '',
  '',
  '',
  'Tripoli - Rue Maarad - Imm. Mir - Tel: 06 / 445 455 - 03 / 104 999 - Autorisation 677/1 - Email: labazamokaddem@hotmail.com - Results Website: www.labazamokaddem.online',
  1,
  '—',
  1,
  1,
  1
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role, active);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients (full_name);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits (patient_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits (status, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_panels_dept ON panels (department_id, ordering);
CREATE INDEX IF NOT EXISTS idx_tests_panel ON tests (panel_id, print_order);
CREATE INDEX IF NOT EXISTS idx_ranges_test ON reference_ranges (test_id, gender, age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_results_visit ON results (visit_id);
CREATE INDEX IF NOT EXISTS idx_results_test ON results (test_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_tests_panel_code ON tests (panel_id, test_code);
CREATE INDEX IF NOT EXISTS idx_results_visit_test ON results (visit_id, test_id);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE user_id = OLD.user_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_patients_updated_at
AFTER UPDATE ON patients
FOR EACH ROW
BEGIN
  UPDATE patients
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE patient_id = OLD.patient_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_visits_updated_at
AFTER UPDATE ON visits
FOR EACH ROW
BEGIN
  UPDATE visits
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE visit_id = OLD.visit_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_departments_updated_at
AFTER UPDATE ON departments
FOR EACH ROW
BEGIN
  UPDATE departments
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE department_id = OLD.department_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_panels_updated_at
AFTER UPDATE ON panels
FOR EACH ROW
BEGIN
  UPDATE panels
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE panel_id = OLD.panel_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tests_updated_at
AFTER UPDATE ON tests
FOR EACH ROW
BEGIN
  UPDATE tests
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE test_id = OLD.test_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_reference_ranges_updated_at
AFTER UPDATE ON reference_ranges
FOR EACH ROW
BEGIN
  UPDATE reference_ranges
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE range_id = OLD.range_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_results_updated_at
AFTER UPDATE ON results
FOR EACH ROW
BEGIN
  UPDATE results
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE result_id = OLD.result_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_report_settings_updated_at
AFTER UPDATE ON report_settings
FOR EACH ROW
BEGIN
  UPDATE report_settings
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = OLD.id;
END;
