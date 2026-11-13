
CREATE TABLE IF NOT EXISTS instrument_type (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS supplier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT
);

CREATE TABLE IF NOT EXISTS asset (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instrument_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type_id INTEGER,
    supplier_id INTEGER,
    location TEXT,
    status TEXT DEFAULT 'Active',
    FOREIGN KEY (type_id) REFERENCES instrument_type(id),
    FOREIGN KEY (supplier_id) REFERENCES supplier(id)
);

CREATE TABLE IF NOT EXISTS calibration_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    frequency_months INTEGER NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS calibration_event (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    calibration_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    result TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS certificate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    certificate_number TEXT UNIQUE,
    file_path TEXT,
    FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS work_order (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Open',
    FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS production_use (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    usage_date TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS alert (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS audit_record (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS impact_assessment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calibration_event_id INTEGER NOT NULL,
    findings TEXT,
    action_taken TEXT,
    FOREIGN KEY (calibration_event_id) REFERENCES calibration_event(id)
);
