import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export const LegalesView = ({ tipo }: { tipo: 'terminos' | 'privacidad' }) => {
  const esTerminos = tipo === 'terminos';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-black text-white">
            <ShieldCheck className="w-4 h-4 text-sky-400" /> G.E.M.I.
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {esTerminos ? 'Términos y Condiciones de Uso' : 'Política de Privacidad y Protección de Datos'}
        </h1>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {esTerminos ? (
            <>
              <p>
                <strong>1. Objeto del Servicio:</strong> G.E.M.I. provee una plataforma de software como servicio (SaaS) en la nube destinada a la gestión comercial, control de inventario, punto de venta y administración multisucursal para comercios.
              </p>
              <p>
                <strong>2. Cuentas y Responsabilidad:</strong> Cada comercio titular es responsable de la confidencialidad de sus credenciales de administrador, la asignación de permisos a sus empleados y la veracidad de los precios y productos cargados en su catálogo.
              </p>
              <p>
                <strong>3. Suscripción y Renovación:</strong> Tras el período de prueba inicial, el uso continuo del sistema requiere el abono del plan mensual vigente. En caso de falta de pago vencido, el acceso operativo podrá suspenderse temporalmente hasta regularizar el abono, conservando intactos los datos históricos del comercio.
              </p>
              <p>
                <strong>4. Disponibilidad:</strong> G.E.M.I. realiza copias de seguridad periódicas y cuenta con almacenamiento local temporal (modo offline) para garantizar la continuidad operativa ante cortes de conectividad del local.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>1. Propiedad de los Datos:</strong> Toda la información comercial, catálogos, movimientos de caja, ventas y registros de clientes cargados en G.E.M.I. pertenecen exclusivamente a la empresa titular de la cuenta.
              </p>
              <p>
                <strong>2. Aislamiento Multi-Empresa:</strong> Nuestra arquitectura implementa aislamiento estricto a nivel de base de datos (Row Level Security), garantizando que ningún comercio pueda acceder ni visualizar información de otras tiendas registradas en la plataforma.
              </p>
              <p>
                <strong>3. Uso de la Información:</strong> Los datos de contacto del titular se utilizan únicamente para soporte técnico, notificaciones de servicio y gestión de facturación del abono mensual. G.E.M.I. no vende ni cede bases de datos a terceros.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};