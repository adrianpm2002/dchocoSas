CREATE TABLE IF NOT EXISTS compras_insumos (
  id TEXT PRIMARY KEY,
  insumo_id TEXT,
  insumo_nombre TEXT NOT NULL,
  cantidad REAL NOT NULL,
  unidad TEXT NOT NULL DEFAULT '',
  costo_por_unidad REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  forma_pago TEXT NOT NULL,
  fecha TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras_insumos(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_insumo ON compras_insumos(insumo_id);
