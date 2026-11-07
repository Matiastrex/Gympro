import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Avatar } from "./Avatar";
import { BellIcon } from "./icons";
import { ROL_LABEL } from "../constants/roles";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/embudo": "Embudo comercial",
  "/oportunidades": "Oportunidades",
  "/contactos": "Contactos",
  "/empresas": "Empresas",
  "/actividades": "Actividades",
  "/notificaciones": "Notificaciones",
  "/usuarios": "Usuarios",
};

/** Evento que dispara quien cambia el estado de las notificaciones (leer, aprobar…). */
export const EVENTO_NOTIFICACIONES = "gympro:notificaciones";

const REFRESCO_MS = 60_000;

function useNoLeidas() {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let vigente = true;
    const actualizar = () =>
      api
        .get<{ total: number }>("/notificaciones/no-leidas")
        .then((res) => vigente && setTotal(res.data.total))
        .catch(() => undefined);

    actualizar();
    const intervalo = setInterval(actualizar, REFRESCO_MS);
    window.addEventListener("focus", actualizar);
    window.addEventListener(EVENTO_NOTIFICACIONES, actualizar);
    return () => {
      vigente = false;
      clearInterval(intervalo);
      window.removeEventListener("focus", actualizar);
      window.removeEventListener(EVENTO_NOTIFICACIONES, actualizar);
    };
  }, []);

  return total;
}

export function Topbar() {
  const { pathname } = useLocation();
  const { usuario } = useAuth();
  const title = TITLES[pathname] ?? "GymPro CRM";
  const noLeidas = useNoLeidas();

  return (
    <header className="topbar">
      <h1>{title}</h1>
      {usuario && (
        <div className="topbar-actions">
          <Link
            to="/notificaciones"
            className={`topbar-bell${noLeidas > 0 ? " has-unread" : ""}`}
            aria-label={noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : "Notificaciones"}
          >
            <BellIcon />
            {noLeidas > 0 && <span className="topbar-bell-count">{noLeidas > 9 ? "9+" : noLeidas}</span>}
          </Link>
          <div className="topbar-user">
            <div className="topbar-user-info">
              <strong>
                {usuario.nombre} {usuario.apellido}
              </strong>
              <span>{ROL_LABEL[usuario.rol]}</span>
            </div>
            <Avatar nombre={usuario.nombre} apellido={usuario.apellido} size={36} />
          </div>
        </div>
      )}
    </header>
  );
}
