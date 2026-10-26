export const SCHEMA = `
CREATE TABLE IF NOT EXISTS insumos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cantidad REAL NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL,
  costo_por_unidad REAL NOT NULL DEFAULT 0,
  veces_comprado INTEGER NOT NULL DEFAULT 0,
  costo_total REAL NOT NULL DEFAULT 0,
  stock_minimo REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recetas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  precio_venta REAL NOT NULL DEFAULT 0,
  veces_vendido INTEGER NOT NULL DEFAULT 0,
  activa INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS receta_ingredientes (
  receta_id TEXT NOT NULL,
  insumo_id TEXT NOT NULL,
  cantidad REAL NOT NULL,
  PRIMARY KEY (receta_id, insumo_id),
  FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL DEFAULT '',
  cliente_direccion TEXT NOT NULL DEFAULT '',
  descuento REAL NOT NULL DEFAULT 0,
  envio REAL NOT NULL DEFAULT 0,
  precio_final REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL,
  fecha_creacion TEXT NOT NULL,
  fecha_entrega TEXT NOT NULL,
  notas TEXT NOT NULL DEFAULT '',
  stock_descontado INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pedido_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id TEXT NOT NULL,
  receta_id TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario REAL NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pedido_decoraciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_ingredientes_receta ON receta_ingredientes(receta_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_decos ON pedido_decoraciones(pedido_id);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  creado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  expira_en TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones(expira_en);

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

CREATE TABLE IF NOT EXISTS cuadres (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL UNIQUE,
  origen_apertura TEXT NOT NULL,
  apertura_efectivo REAL NOT NULL DEFAULT 0,
  apertura_transferencia REAL NOT NULL DEFAULT 0,
  ingresos_efectivo REAL NOT NULL DEFAULT 0,
  ingresos_transferencia REAL NOT NULL DEFAULT 0,
  costo_efectivo REAL NOT NULL DEFAULT 0,
  costo_transferencia REAL NOT NULL DEFAULT 0,
  ganancia_efectivo REAL NOT NULL DEFAULT 0,
  ganancia_transferencia REAL NOT NULL DEFAULT 0,
  otros_ingresos_efectivo REAL NOT NULL DEFAULT 0,
  otros_ingresos_transferencia REAL NOT NULL DEFAULT 0,
  gastos_efectivo REAL NOT NULL DEFAULT 0,
  gastos_transferencia REAL NOT NULL DEFAULT 0,
  extracciones_efectivo REAL NOT NULL DEFAULT 0,
  extracciones_transferencia REAL NOT NULL DEFAULT 0,
  esperado_efectivo REAL NOT NULL DEFAULT 0,
  esperado_transferencia REAL NOT NULL DEFAULT 0,
  real_efectivo REAL NOT NULL DEFAULT 0,
  real_transferencia REAL NOT NULL DEFAULT 0,
  diferencia_efectivo REAL NOT NULL DEFAULT 0,
  diferencia_transferencia REAL NOT NULL DEFAULT 0,
  sin_ganancia_efectivo REAL NOT NULL DEFAULT 0,
  sin_ganancia_transferencia REAL NOT NULL DEFAULT 0,
  ganancia_capital_efectivo REAL NOT NULL DEFAULT 0,
  ganancia_capital_transferencia REAL NOT NULL DEFAULT 0,
  cierre_efectivo REAL NOT NULL DEFAULT 0,
  cierre_transferencia REAL NOT NULL DEFAULT 0,
  cerrado INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cuadres_fecha ON cuadres(fecha);
`
