import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { Navbar } from './components/Navbar';
import { SuscripcionGuard } from './components/SuscripcionGuard';
import { BurbujaSuperAdmin, CORREOS_FUNDADORES } from './components/BurbujaSuperAdmin';
import { CajaTurnosView } from './views/CajaTurnosView';
import { CatalogoStockView } from './views/CatalogoStockView';
import { PosView } from './views/PosView';
import { TraspasosView } from './views/TraspasosView';
import { AdminView } from './views/AdminView';
import { CambiosDevolucionesView } from './views/CambiosDevolucionesView';
import { ReservasView } from './views/ReservasView';
import { LoginView } from './views/LoginView';
import { TicketPublicoView } from './views/TicketPublicoView';
import { OnboardingView } from './views/OnboardingView';
import { TareasView } from './views/TareasView';
import { CalendarioView } from './views/CalendarioView';
import { SuperAdminView } from './views/SuperAdminView';

const RutaProtegida = ({ children, soloAdmin = false }: { children: React.ReactNode; soloAdmin?: boolean }) => {
  const { perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Verificando credenciales del sistema...
      </div>
    );
  }

  if (!perfil || !perfil.activo) {
    return <Navigate to="/login" replace />;
  }

  if (soloAdmin && perfil.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RutaSuperAdmin = ({ children }: { children: React.ReactNode }) => {
  const [autorizado, setAutorizado] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email?.toLowerCase() || '';
      setAutorizado(CORREOS_FUNDADORES.includes(email));
    });
  }, []);

  if (autorizado === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Validando acceso de fundador...
      </div>
    );
  }

  if (!autorizado) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const ContenedorPrincipal = () => {
  const { perfil, loading } = useAuth();
  const location = useLocation();

  const esRutaPublica =
    location.pathname === '/login' ||
    location.pathname === '/onboarding' ||
    location.pathname === '/registro' ||
    location.pathname === '/superadmin' ||
    location.pathname.startsWith('/ticket/');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Cargando sistema...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      <SuscripcionGuard>
        {!esRutaPublica && perfil && perfil.activo && <Navbar />}

        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/onboarding" element={<OnboardingView />} />
          <Route path="/registro" element={<OnboardingView />} />
          <Route path="/ticket/:id" element={<TicketPublicoView />} />

          <Route
            path="/superadmin"
            element={
              <RutaSuperAdmin>
                <SuperAdminView />
              </RutaSuperAdmin>
            }
          />

          <Route
            path="/"
            element={
              <RutaProtegida>
                <PosView />
              </RutaProtegida>
            }
          />
          <Route
            path="/caja"
            element={
              <RutaProtegida>
                <CajaTurnosView />
              </RutaProtegida>
            }
          />
          <Route
            path="/reservas"
            element={
              <RutaProtegida>
                <ReservasView />
              </RutaProtegida>
            }
          />
          <Route
            path="/cambios"
            element={
              <RutaProtegida>
                <CambiosDevolucionesView />
              </RutaProtegida>
            }
          />
          <Route
            path="/catalogo"
            element={
              <RutaProtegida>
                <CatalogoStockView />
              </RutaProtegida>
            }
          />
          <Route
            path="/traspasos"
            element={
              <RutaProtegida>
                <TraspasosView />
              </RutaProtegida>
            }
          />
          <Route
            path="/tareas"
            element={
              <RutaProtegida>
                <TareasView />
              </RutaProtegida>
            }
          />
          <Route
            path="/calendario"
            element={
              <RutaProtegida>
                <CalendarioView />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin"
            element={
              <RutaProtegida soloAdmin={true}>
                <AdminView />
              </RutaProtegida>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SuscripcionGuard>

      {/* Burbuja flotante exclusiva para los 3 fundadores en la esquina inferior izquierda */}
      <BurbujaSuperAdmin />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ContenedorPrincipal />
      </AuthProvider>
    </BrowserRouter>
  );
}