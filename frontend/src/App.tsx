import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { LoginPage } from "./pages/LoginPage";
import { EmbudoPage } from "./pages/EmbudoPage";
import { OportunidadesPage } from "./pages/OportunidadesPage";
import { ContactosPage } from "./pages/ContactosPage";
import { EmpresasPage } from "./pages/EmpresasPage";

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
              <EmbudoPage />
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
      </Route>
    </Routes>
  );
}
