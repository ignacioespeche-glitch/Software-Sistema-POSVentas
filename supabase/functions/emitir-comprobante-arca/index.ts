import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URLs Oficiales de ARCA (Homologación vs Producción)
const URLS_ARCA = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
};

function extraerTagXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function formatearFechaArca(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * 1. Autenticación WSAA: Firma el TRA con PKCS#7 y obtiene Token + Sign (con caché de 11 horas)
 */
async function obtenerCredencialesWSAA(supabaseAdmin: any, config: any) {
  const ahora = new Date();

  // Reutilizar Token/Sign si todavía es válido (ARCA exige no pedir uno nuevo si el actual sigue vigente)
  if (config.wsaa_token && config.wsaa_sign && config.wsaa_expiracion) {
    const expira = new Date(config.wsaa_expiracion);
    if (expira.getTime() - ahora.getTime() > 10 * 60 * 1000) {
      return { token: config.wsaa_token, sign: config.wsaa_sign };
    }
  }

  const genTime = new Date(ahora.getTime() - 5 * 60 * 1000).toISOString();
  const expTime = new Date(ahora.getTime() + 11 * 60 * 60 * 1000).toISOString();
  const uniqueId = Math.floor(ahora.getTime() / 1000);

  const traXml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;

  // Firmar TRA usando PKCS#7 (CMS) con node-forge
  const cert = forge.pki.certificateFromPem(config.certificado_crt);
  const privateKey = forge.pki.privateKeyFromPem(config.clave_privada_key);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(traXml, "utf8");
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign();

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const cmsBase64 = forge.util.encode64(der);

  const soapLogin = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cmsBase64}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const urlWsaa = URLS_ARCA[config.entorno as "homologacion" | "produccion"].wsaa;
  const resp = await fetch(urlWsaa, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '""',
    },
    body: soapLogin,
  });

  const respXml = await resp.text();
  if (!resp.ok || respXml.includes("faultstring")) {
    const fault = extraerTagXml(respXml, "faultstring") || respXml;
    throw new Error(`Error WSAA ARCA: ${fault}`);
  }

  const loginCmsReturn = extraerTagXml(respXml, "loginCmsReturn")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  const token = extraerTagXml(loginCmsReturn, "token");
  const sign = extraerTagXml(loginCmsReturn, "sign");
  const expirationTime = extraerTagXml(loginCmsReturn, "expirationTime") || expTime;

  if (!token || !sign) {
    throw new Error("ARCA no devolvió Token/Sign válidos en WSAA.");
  }

  // Guardar Token y Sign en caché en Supabase
  await supabaseAdmin
    .from("configuracion_fiscal_arca")
    .update({
      wsaa_token: token,
      wsaa_sign: sign,
      wsaa_expiracion: expirationTime,
    })
    .eq("id", config.id);

  return { token, sign };
}

/**
 * 2. Consultar último comprobante autorizado (FECompUltimoAutorizado)
 */
async function obtenerUltimoComprobante(
  urlWsfe: string,
  token: string,
  sign: string,
  cuit: string,
  ptoVta: number,
  cbteTipo: number
): Promise<number> {
  const soapUltimo = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <FECompUltimoAutorizado xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${token}</Token>
        <Sign>${sign}</Sign>
        <Cuit>${cuit}</Cuit>
      </Auth>
      <PtoVta>${ptoVta}</PtoVta>
      <CbteTipo>${cbteTipo}</CbteTipo>
    </FECompUltimoAutorizado>
  </soap:Body>
</soap:Envelope>`;

  const resp = await fetch(urlWsfe, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '"http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado"',
    },
    body: soapUltimo,
  });

  const xml = await resp.text();
  const nroStr = extraerTagXml(xml, "CbteNro");
  return nroStr ? Number(nroStr) : 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      venta_id,
      empresa_id,
      sucursal_id,
      total_final,
      receptor_doc_tipo = 99, // 80: CUIT, 96: DNI, 99: Consumidor Final
      receptor_doc_nro = "0",
      receptor_nombre = "Consumidor Final",
      receptor_condicion_iva = "consumidor_final", // 'responsable_inscripto' | 'monotributo' | 'consumidor_final' | 'exento'
    } = await req.json();

    if (!venta_id || !empresa_id) {
      throw new Error("Faltan parámetros obligatorios (venta_id, empresa_id).");
    }

    // 1. Obtener configuración fiscal de la empresa
    const { data: config, error: errCfg } = await supabaseAdmin
      .from("configuracion_fiscal_arca")
      .select("*")
      .eq("empresa_id", empresa_id)
      .single();

    if (errCfg || !config || !config.activo) {
      throw new Error("La facturación electrónica ARCA no está activa o configurada para esta empresa.");
    }

    // 2. Obtener punto de venta de la sucursal
    const { data: sucursal } = await supabaseAdmin
      .from("sucursales")
      .select("punto_venta_arca")
      .eq("id", sucursal_id)
      .maybeSingle();

    const ptoVta = Number(sucursal?.punto_venta_arca || 1);
    const total = Number(Number(total_final).toFixed(2));

    // 3. Determinar tipo de comprobante según condición IVA del emisor y receptor
    // 1 = Factura A | 6 = Factura B | 11 = Factura C
    let cbteTipo = 11;
    let letra = "C";
    let impNeto = total;
    let impIVA = 0;
    let bloqueIvaXml = "";

    if (config.condicion_iva === "responsable_inscripto") {
      if (receptor_condicion_iva === "responsable_inscripto" && Number(receptor_doc_tipo) === 80) {
        cbteTipo = 1; // Factura A
        letra = "A";
      } else {
        cbteTipo = 6; // Factura B
        letra = "B";
      }

      // Discriminar IVA 21%
      impNeto = Number((total / 1.21).toFixed(2));
      impIVA = Number((total - impNeto).toFixed(2));

      bloqueIvaXml = `
        <Iva>
          <AlicIva>
            <Id>5</Id>
            <BaseImp>${impNeto.toFixed(2)}</BaseImp>
            <Importe>${impIVA.toFixed(2)}</Importe>
          </AlicIva>
        </Iva>`;
    }

    // Condición IVA Receptor (RG 5616 ARCA): 1=RI, 5=Consumidor Final, 6=Monotributo, 4=Exento
    const condIvaReceptorCodigo =
      receptor_condicion_iva === "responsable_inscripto"
        ? 1
        : receptor_condicion_iva === "monotributo"
        ? 6
        : receptor_condicion_iva === "exento"
        ? 4
        : 5;

    // 4. Autenticar en WSAA y consultar último número
    const { token, sign } = await obtenerCredencialesWSAA(supabaseAdmin, config);
    const urlWsfe = URLS_ARCA[config.entorno as "homologacion" | "produccion"].wsfe;

    const ultimoNro = await obtenerUltimoComprobante(
      urlWsfe,
      token,
      sign,
      config.cuit,
      ptoVta,
      cbteTipo
    );
    const proximoNro = ultimoNro + 1;
    const fechaHoyArca = formatearFechaArca(new Date());

    // 5. Solicitar CAE (FECAESolicitar)
    const docTipoFinal = Number(receptor_doc_tipo) || 99;
    const docNroFinal = docTipoFinal === 99 ? "0" : String(receptor_doc_nro).replace(/\D/g, "") || "0";

    const soapCae = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <FECAESolicitar xmlns="http://ar.gov.afip.dif.FEV1/">
      <Auth>
        <Token>${token}</Token>
        <Sign>${sign}</Sign>
        <Cuit>${config.cuit}</Cuit>
      </Auth>
      <FeCAEReq>
        <FeCabReq>
          <CantReg>1</CantReg>
          <PtoVta>${ptoVta}</PtoVta>
          <CbteTipo>${cbteTipo}</CbteTipo>
        </FeCabReq>
        <FeDetReq>
          <FECAEDetRequest>
            <Concepto>1</Concepto>
            <DocTipo>${docTipoFinal}</DocTipo>
            <DocNro>${docNroFinal}</DocNro>
            <CbteDesde>${proximoNro}</CbteDesde>
            <CbteHasta>${proximoNro}</CbteHasta>
            <CbteFch>${fechaHoyArca}</CbteFch>
            <ImpTotal>${total.toFixed(2)}</ImpTotal>
            <ImpTotConc>0.00</ImpTotConc>
            <ImpNeto>${impNeto.toFixed(2)}</ImpNeto>
            <ImpOpEx>0.00</ImpOpEx>
            <ImpTrib>0.00</ImpTrib>
            <ImpIVA>${impIVA.toFixed(2)}</ImpIVA>
            <MonId>PES</MonId>
            <MonCotiz>1</MonCotiz>
            <CondicionIVAReceptorId>${condIvaReceptorCodigo}</CondicionIVAReceptorId>
            ${bloqueIvaXml}
          </FECAEDetRequest>
        </FeDetReq>
      </FeCAEReq>
    </FECAESolicitar>
  </soap:Body>
</soap:Envelope>`;

    const respCae = await fetch(urlWsfe, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '"http://ar.gov.afip.dif.FEV1/FECAESolicitar"',
      },
      body: soapCae,
    });

    const xmlCae = await respCae.text();
    const resultado = extraerTagXml(xmlCae, "Resultado"); // 'A' = Aprobado, 'R' = Rechazado
    const cae = extraerTagXml(xmlCae, "CAE");
    const caeFchVto = extraerTagXml(xmlCae, "CAEFchVto"); // YYYYMMDD

    if (resultado !== "A" || !cae) {
      const msgError =
        extraerTagXml(xmlCae, "Msg") ||
        extraerTagXml(xmlCae, "faultstring") ||
        "ARCA rechazó el comprobante sin especificar detalle.";

      await supabaseAdmin
        .from("ventas")
        .update({ arca_error_ultimo: msgError })
        .eq("id", venta_id);

      throw new Error(`ARCA rechazó la factura: ${msgError}`);
    }

    // Formatear vencimiento YYYY-MM-DD
    const vtoFormateado =
      caeFchVto.length === 8
        ? `${caeFchVto.slice(0, 4)}-${caeFchVto.slice(4, 6)}-${caeFchVto.slice(6, 8)}`
        : null;

    // 6. Guardar datos fiscales oficiales en la venta
    await supabaseAdmin
      .from("ventas")
      .update({
        es_fiscal: true,
        tipo_comprobante_arca: cbteTipo,
        letra_comprobante: letra,
        punto_venta_arca: ptoVta,
        numero_comprobante_arca: proximoNro,
        cae,
        cae_vencimiento: vtoFormateado,
        receptor_doc_tipo: docTipoFinal,
        receptor_doc_nro: docNroFinal,
        receptor_nombre,
        receptor_condicion_iva,
        importe_neto: impNeto,
        importe_iva: impIVA,
        arca_error_ultimo: null,
      })
      .eq("id", venta_id);

    return new Response(
      JSON.stringify({
        ok: true,
        letra,
        tipo_comprobante_arca: cbteTipo,
        punto_venta_arca: ptoVta,
        numero_comprobante_arca: proximoNro,
        cae,
        cae_vencimiento: vtoFormateado,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message || "Error interno en Fiscal Core" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});