import { supabase } from './supabase';

export const registrarAuditoria = async ({
  empresaId,
  sucursalId,
  usuarioId,
  usuarioNombre,
  accion,
  detalle
}: {
  empresaId: string;
  sucursalId?: string | null;
  usuarioId?: string | null;
  usuarioNombre: string;
  accion: string;
  detalle: string;
}) => {
  if (!empresaId) return;

  await supabase.from('auditoria_logs').insert({
    empresa_id: empresaId,
    sucursal_id: sucursalId || null,
    usuario_id: usuarioId || null,
    usuario_nombre: usuarioNombre || 'Operador',
    accion,
    detalle
  });
};