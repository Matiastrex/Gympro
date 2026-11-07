import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { LoginPage } from "./pages/LoginPage";
import { EmbudoPage } from "./pages/EmbudoPage";
import { OportunidadesPage } from "./pages/OportunidadesPage";
import { ContactosPage } from "./pages/ContactosPage";
import { EmpresasPage } from "./pages/EmpresasPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { ActividadesPage } from "./pages/ActividadesPage";
import { NotificacionesPage } from "./pages/NotificacionesPage";
import { ConfiguracionPage } from "./pages/ConfiguracionPage";

// recharts pesa: el dashboard se baja aparte para no agrandar el bundle del resto de la app.
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={
            <AppLayout>
              <Suspense fallback={<div className="container cell-muted">Cargando métricas…</div>}>
                <DashboardPage />
              </Suspense>
            </AppLayout>
          }
        />
        <Route
          path="/embudo"
          element={
            <AppLayout>
              <EmbudoPage />
            </AppLayout>
          }
        />
        <Route
          path="/notificaciones"
          element={
            <AppLayout>
              <NotificacionesPage />
            </AppLayout>
          }
        />
        <Route
          path="/oportunidades"
          element={
            <AppLayout>
              <OportunidadesPage />
            </AppLayout>
          }
        />
        <Route
          path="/contactos"
          element={
            <AppLayout>
              <ContactosPage />
            </AppLayout>
          }
        />
        <Route
          path="/empresas"
          element={
            <AppLayout>
              <EmpresasPage />
            </AppLayout>
          }
        />
        <Route
          path="/actividades"
          element={
            <AppLayout>
              <ActividadesPage />
            </AppLayout>
          }
        />
        <Route element={<ProtectedRoute roles={["ADMINISTRADOR"]} />}>
          <Route path="/configuracion" element={<Navigate to="/configuracion/etapas" replace />} />
          <Route
            path="/configuracion/:seccion"
            element={
              <AppLayout>
                <ConfiguracionPage />
              </AppLayout>
            }
          />
          <Route
            path="/usuarios"
            element={
              <AppLayout>
                <UsuariosPage />
              </AppLayout>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
