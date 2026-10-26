CREATE TABLE IF NOT EXISTS ventas (
  id TEXT PRIMARY KEY,
  pedido_id TEXT,
  cliente_nombre TEXT NOT NULL,
  origen TEXT NOT NULL,
  total REAL NOT NULL DEFAULT 0,
  efectivo REAL NOT NULL DEFAULT 0,
  transferencia REAL NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_pedido ON ventas(pedido_id);
