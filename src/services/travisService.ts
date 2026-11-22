import { supabase } from '../lib/supabase';

export interface OportunidadCampana {
  producto_id: string;
  producto_nombre: string;
  imagen_url: string | null;
  precio_costo: number;
  precio_venta: number;
  margen_actual_pct: number;
  stock_total: number;
  unidades_vendidas_30d: number;
  tipo_oportunidad: 'liquidacion' | 'producto_estrella' | 'exceso_inventario' | 'venta_cruzada' | 'caida_ventas' | 'estacional';
  prioridad: number;
  descuento_max_sugerido_pct: number;
  motivo_recomendacion: string;
}

export interface BrandKit {
  id?: string;
  empresa_id: string;
  nombre_marca: string;
  logo_principal_url: string | null;
  logo_secundario_url?: string | null;
  color_primario: string;
  color_secundario: string;
  color_acento: string;
  tipografia_titulos: string;
  tipografia_cuerpo: string;
  tono_comunicacion: string;
  estilo_fotografico: string;
  reglas_identidad?: string | null;
  margen_minimo_pct: number;
}

export const travisService = {
  // 1. Detectar oportunidades comerciales reales de la empresa
  async obtenerOportunidades(empresaId: string): Promise<OportunidadCampana[]> {
    const { data, error } = await supabase.rpc('detectar_oportunidades_campana', {
      p_empresa_id: empresaId,
    });
    if (error) throw error;
    return (data ?? []).map((item: any) => ({
      ...item,
      precio_costo: Number(item.precio_costo),
      precio_venta: Number(item.precio_venta),
      margen_actual_pct: Number(item.margen_actual_pct),
      stock_total: Number(item.stock_total),
      unidades_vendidas_30d: Number(item.unidades_vendidas_30d),
      descuento_max_sugerido_pct: Number(item.descuento_max_sugerido_pct),
    }));
  },

  // 2. Listar campañas de la empresa
  async listarCampanas(empresaId: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        campaign_promotions (*),
        campaign_objectives (*),
        campaign_metrics (*)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // 3. Obtener detalle completo de una campaña
  async obtenerDetalleCampana(campaignId: string) {
    const [
      { data: campana, error: cErr },
      { data: productos },
      { data: promociones },
      { data: copies },
      { data: assets },
      { data: calendario },
      { data: objetivos },
      { data: metricas },
    ] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', campaignId).single(),
      supabase.from('campaign_products').select('*, productos(imagen_url)').eq('campaign_id', campaignId),
      supabase.from('campaign_promotions').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }),
      supabase.from('campaign_copies').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
      supabase.from('campaign_assets').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true }),
      supabase.from('campaign_calendar').select('*').eq('campaign_id', campaignId).order('fecha_programada', { ascending: true }),
      supabase.from('campaign_objectives').select('*').eq('campaign_id', campaignId),
      supabase.from('campaign_metrics').select('*').eq('campaign_id', campaignId).maybeSingle(),
    ]);

    if (cErr) throw cErr;
    return {
      campana,
      productos: productos ?? [],
      promociones: promociones ?? [],
      copies: copies ?? [],
      assets: assets ?? [],
      calendario: calendario ?? [],
      objetivos: objetivos ?? [],
      metricas,
    };
  },

  // 4. Invocar a GEMI AI Orchestrator (con respaldo inteligente local si la Edge Function falla)
  async generarCampanaConIA(payload: {
    origen: 'manual' | 'opportunity_finder';
    tipo_oportunidad?: string;
    datos_respaldo?: Record<string, unknown>;
    objetivo_usuario?: string;
    productos: { producto_id: string; rol_en_campana?: 'principal' | 'combo' | 'cross_sell' }[];
    descuento_solicitado_pct?: number;
  }) {
    // Intento 1: Edge Function remota
    try {
      const { data, error } = await supabase.functions.invoke('travis-orchestrator', {
        body: payload,
      });

      if (!error && data && !data.error && data.campaign_id) {
        return data;
      }
    } catch {
      // Si falla la Edge Function, continúa automáticamente al respaldo local
    }

    // Intento 2 (Respaldo Inteligente Directo): Arma la campaña con datos reales en Supabase
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error('Sesión expirada. Volvé a iniciar sesión.');

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('empresa_id')
      .eq('id', userId)
      .single();

    if (!perfil?.empresa_id) throw new Error('No se encontró la empresa del usuario.');
    const empresaId = perfil.empresa_id;

    const [{ data: empresa }, brandKit] = await Promise.all([
      supabase.from('empresas').select('nombre').eq('id', empresaId).single(),
      this.obtenerBrandKit(empresaId),
    ]);

    const productIds = payload.productos.map((p) => p.producto_id);
    const { data: prodsDB, error: prodsErr } = await supabase
      .from('productos')
      .select('id, nombre, precio_venta, precio_costo')
      .in('id', productIds);

    if (prodsErr || !prodsDB || prodsDB.length === 0) {
      throw new Error('No se pudieron cargar los productos seleccionados.');
    }

    const nombreMarca = brandKit?.nombre_marca || empresa?.nombre || 'Nuestra Marca';
    const descuento = Number(payload.descuento_solicitado_pct ?? 15);
    const prodPrincipal = prodsDB[0];

    const nombreCampana =
      prodsDB.length === 1
        ? `Especial ${prodPrincipal.nombre}`
        : `Cápsula ${nombreMarca} (${prodsDB.length} prendas)`;

    const conceptoCampana =
      payload.objetivo_usuario ||
      `Acción comercial enfocada en impulsar la rotación de ${prodPrincipal.nombre} con ${descuento}% OFF cuidando la rentabilidad del local.`;

    // Crear campaña principal
    const { data: nuevaCampana, error: campErr } = await supabase
      .from('campaigns')
      .insert({
        empresa_id: empresaId,
        nombre: nombreCampana,
        concepto: conceptoCampana,
        origen: payload.origen,
        estado: 'borrador',
        creado_por: userId,
      })
      .select('id')
      .single();

    if (campErr || !nuevaCampana) throw campErr || new Error('No se pudo crear la campaña.');
    const campaignId = nuevaCampana.id;

    // Guardar productos asociados con snapshot de costos y precios
    const stockEstimado = Number((payload.datos_respaldo as any)?.stock_total ?? 10);
    await supabase.from('campaign_products').insert(
      prodsDB.map((p) => ({
        empresa_id: empresaId,
        campaign_id: campaignId,
        producto_id: p.id,
        rol_en_campana: 'principal',
        snapshot_nombre: p.nombre,
        snapshot_precio_lista: Number(p.precio_venta ?? 0),
        snapshot_costo: Number(p.precio_costo ?? 0),
        snapshot_stock_total: stockEstimado,
        costo_faltante: !p.precio_costo || Number(p.precio_costo) <= 0,
      }))
    );

    // Calcular simulación financiera
    const precioListaProm =
      prodsDB.reduce((acc, p) => acc + Number(p.precio_venta ?? 0), 0) / prodsDB.length;
    const costoProm =
      prodsDB.reduce((acc, p) => acc + Number(p.precio_costo ?? 0), 0) / prodsDB.length;
    const precioFinal = precioListaProm * (1 - descuento / 100);
    const margenPct = precioFinal > 0 ? Number((((precioFinal - costoProm) / precioFinal) * 100).toFixed(2)) : 0;
    const margenMin = Number(brandKit?.margen_minimo_pct ?? 25);
    const alertaMargen = margenPct < margenMin;

    await supabase.from('campaign_promotions').insert({
      empresa_id: empresaId,
      campaign_id: campaignId,
      nombre_promo: `${descuento}% OFF ${prodPrincipal.nombre}`,
      tipo_descuento: 'porcentaje',
      valor_descuento: descuento,
      precio_promocional_promedio: Number(precioFinal.toFixed(2)),
      margen_bruto_resultante_pct: margenPct,
      alerta_margen: alertaMargen,
      mensaje_alerta: alertaMargen
        ? `Margen (${margenPct}%) inferior al mínimo configurado (${margenMin}%)`
        : null,
      estado_aprobacion: 'pendiente',
    });

    // Generar textos listos para redes y local
    const precioFormateado = `$${Math.round(precioFinal).toLocaleString('es-AR')}`;
    const listaFormateado = `$${Math.round(precioListaProm).toLocaleString('es-AR')}`;

    await supabase.from('campaign_copies').insert([
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        canal: 'instagram_post',
        titulo: `${descuento}% OFF EN ${prodPrincipal.nombre.toUpperCase()}`,
        cuerpo: `Aprovechá por tiempo limitado ${descuento}% OFF en ${prodPrincipal.nombre} en ${nombreMarca}.\n\nAntes ${listaFormateado} → Ahora ${precioFormateado}.\nStock limitado por talle en sucursal.`,
        llamado_accion: 'Escribinos por DM o pasá hoy por el local antes de que vuelen los talles.',
        estado_aprobacion: 'pendiente',
      },
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        canal: 'instagram_story',
        titulo: `DROP & PROMO · ${descuento}% OFF`,
        cuerpo: `Solo por 48 hs: ${prodPrincipal.nombre} a ${precioFormateado} (${descuento}% OFF). Consultá talles disponibles ahora.`,
        llamado_accion: 'Respondé esta historia con tu talle y te lo reservamos.',
        estado_aprobacion: 'pendiente',
      },
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        canal: 'whatsapp_difusion',
        titulo: `Beneficio exclusivo ${nombreMarca}`,
        cuerpo: `Hola! Te avisamos antes que a nadie: activamos un ${descuento}% OFF especial en ${prodPrincipal.nombre} (queda en ${precioFormateado}). Si querés que te separemos un talle, respondé este mensaje.`,
        llamado_accion: 'Reservá tu talle por acá.',
        estado_aprobacion: 'pendiente',
      },
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        canal: 'cartel_local',
        titulo: `PROMO ESPECIAL ${descuento}% OFF`,
        cuerpo: `${prodPrincipal.nombre.toUpperCase()} · ANTES ${listaFormateado} · AHORA ${precioFormateado}`,
        llamado_accion: 'Consultá talles disponibles en caja.',
        estado_aprobacion: 'pendiente',
      },
    ]);

    // Cronograma de ejecución de 3 pasos
    const hoy = new Date();
    const mas2Dias = new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000);
    const mas4Dias = new Date(hoy.getTime() + 4 * 24 * 60 * 60 * 1000);

    await supabase.from('campaign_calendar').insert([
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        actividad: `Lanzamiento oficial: publicar post y difusión WhatsApp (${descuento}% OFF)`,
        canal: 'Instagram + WhatsApp',
        fecha_programada: hoy.toISOString(),
        estado: 'pendiente',
      },
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        actividad: 'Recordatorio en Historias mostrando talles disponibles en local',
        canal: 'Instagram Stories',
        fecha_programada: mas2Dias.toISOString(),
        estado: 'pendiente',
      },
      {
        empresa_id: empresaId,
        campaign_id: campaignId,
        actividad: 'Últimas horas de promoción y evaluación de rotación de stock',
        canal: 'Mostrador + Redes',
        fecha_programada: mas4Dias.toISOString(),
        estado: 'pendiente',
      },
    ]);

    return { campaign_id: campaignId, fallback: true };
  },

  // 5. Actualizar simulación de promoción (Promotion Engine en vivo)
  async actualizarPromocion(
    promoId: string,
    updates: {
      nombre_promo?: string;
      valor_descuento: number;
      precio_promocional_promedio: number;
      margen_bruto_resultante_pct: number;
      alerta_margen: boolean;
      mensaje_alerta: string | null;
      estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado' | 'requiere_cambios';
    }
  ) {
    const { data, error } = await supabase
      .from('campaign_promotions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', promoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 6. Editar o aprobar un copy
  async actualizarCopy(
    copyId: string,
    updates: {
      titulo?: string;
      cuerpo?: string;
      llamado_accion?: string;
      estado_aprobacion?: 'pendiente' | 'aprobado' | 'rechazado' | 'requiere_cambios';
    }
  ) {
    const { data, error } = await supabase
      .from('campaign_copies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', copyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 7. Aprobar pieza visual o campaña completa
  async aprobarComponente(params: {
    empresaId: string;
    campaignId: string;
    componenteTipo: 'estrategia' | 'promocion' | 'copy' | 'pieza_grafica' | 'calendario' | 'campana_completa';
    componenteId: string;
    accion: 'aprobado' | 'rechazado' | 'requiere_cambios';
    usuarioId: string;
    comentarios?: string;
  }) {
    await supabase.from('campaign_approvals').insert({
      empresa_id: params.empresaId,
      campaign_id: params.campaignId,
      componente_tipo: params.componenteTipo,
      componente_id: params.componenteId,
      accion: params.accion,
      comentarios: params.comentarios ?? null,
      revisado_por: params.usuarioId,
    });

    if (params.componenteTipo === 'campana_completa' && params.accion === 'aprobado') {
      await supabase
        .from('campaigns')
        .update({ estado: 'activa', updated_at: new Date().toISOString() })
        .eq('id', params.campaignId);
    }
  },

  // 8. Obtener y guardar Brand Kit
  async obtenerBrandKit(empresaId: string): Promise<BrandKit | null> {
    const { data, error } = await supabase
      .from('brand_kits')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async guardarBrandKit(kit: BrandKit): Promise<BrandKit> {
    const { data, error } = await supabase
      .from('brand_kits')
      .upsert(
        {
          ...kit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 9. Subir logo o foto de producto al bucket privado 'campaign-studio'
  async subirArchivoPrivado(empresaId: string, carpeta: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${empresaId}/${carpeta}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('campaign-studio').upload(path, file, {
      upsert: true,
    });
    if (error) throw error;

    const { data: signed } = await supabase.storage
      .from('campaign-studio')
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    return signed?.signedUrl ?? path;
  },
};