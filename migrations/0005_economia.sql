CREATE TABLE IF NOT EXISTS economia_capital (
  id TEXT PRIMARY KEY,
  efectivo REAL NOT NULL DEFAULT 0,
  transferencia REAL NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  concepto TEXT NOT NULL,
  efectivo REAL NOT NULL DEFAULT 0,
  transferencia REAL NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_caja(fecha);
