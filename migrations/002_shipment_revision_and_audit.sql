ALTER TABLE shipments ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1);

CREATE TABLE shipment_audit (
  id INTEGER PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments (id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  actor TEXT NOT NULL CHECK (length(trim(actor)) > 0),
  changed_at TEXT NOT NULL
);

CREATE INDEX shipment_audit_shipment_id ON shipment_audit (shipment_id);
