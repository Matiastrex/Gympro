import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { Navbar } from "./components/Navbar";
import { LoginPage } from "./pages/LoginPage";
import { EmbudoPage } from "./pages/EmbudoPage";
import { OportunidadesPage } from "./pages/OportunidadesPage";
import { ContactosPage } from "./pages/ContactosPage";
import { EmpresasPage } from "./pages/EmpresasPage";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Navbar />
      {children}
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
