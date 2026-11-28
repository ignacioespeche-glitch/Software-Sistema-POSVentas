export interface Empresa {
  id: string;
  nombre: string;
  slug?: string;
  rubro: string;
  plan_nombre?: 'base' | 'turbo' | 'elite' | string;
  modulo_traspasos: boolean;
  modulo_senas: boolean;
  modulo_cambios: boolean;
  modulo_tiendanube?: boolean;
  modulo_api_web?: boolean;
  activa: boolean;
  created_at?: string;
}

export interface Sucursal {
  id: string;
  empresa_id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activa: boolean;
  created_at: string;
}

export interface Perfil {
  id: string;
  empresa_id: string;
  nombre: string;
  apellido?: string;
  rol: 'admin' | 'vendedor';
  sucursal_id?: string;
  activo: boolean;
  created_at: string;
}

export interface Categoria {
  id: string;
  empresa_id: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export interface CurvaTalle {
  id: string;
  nombre: string;
}

export interface TalleCatalogo {
  id: string;
  curva_id: string;
  etiqueta: string;
  orden: number;
}

export interface ProductoPrecioSucursal {
  id: string;
  producto_id: string;
  sucursal_id: string;
  precio_costo: number;
  precio_venta: number;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  empresa_id: string;
  categoria_id: string;
  curva_talles_id?: string;
  nombre: string;
  descripcion?: string;
  precio_costo: number;
  precio_venta: number;
  activo: boolean;
  created_at: string;
  productos_precios_sucursal?: ProductoPrecioSucursal[];
}

export interface Variante {
  id: string;
  producto_id: string;
  color: string;
  talle_id: string;
  sku_interno?: string;
  tiendanube_product_id?: number | null;
  tiendanube_variant_id?: number | null;
  activo: boolean;
  talles_catalogo?: TalleCatalogo;
  stock_sucursal?: StockSucursal[];
}

export interface StockSucursal {
  id: string;
  variante_id: string;
  sucursal_id: string;
  cantidad: number;
  stock_minimo_alerta: number;
  updated_at: string;
}

export interface CajaTurno {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  vendedor_id: string;
  usuario_cierre_id?: string;
  fecha_apertura: string;
  fecha_cierre?: string;
  monto_inicial_efectivo: number;
  monto_cierre_declarado?: number;
  monto_cierre_esperado?: number;
  diferencia?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
}

export interface IntegracionEcommerce {
  id: string;
  empresa_id: string;
  sucursal_stock_id?: string | null;
  tiendanube_store_id?: string | null;
  tiendanube_store_name?: string | null;
  tiendanube_conectado: boolean;
  api_key_publica: string;
  ultima_sincronizacion?: string | null;
  resumen_ultima_sync?: {
    vinculados_auto?: number;
    stock_actualizado?: number;
    sin_coincidencia?: number;
    detalle_sin_coincidencia?: string[];
  } | null;
}