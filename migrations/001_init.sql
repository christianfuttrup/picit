CREATE TABLE terminals (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL REFERENCES terminals (code),
  destination TEXT NOT NULL REFERENCES terminals (code),
  status TEXT NOT NULL CHECK (status IN ('BOOKED', 'LOADED', 'IN_TRANSIT', 'DELIVERED')),
  created_at TEXT NOT NULL
);
