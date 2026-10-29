import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAppSelector } from "../app/hooks";

const NAV = [
  { to: "/", label: "Canciones" },
  { to: "/progresion", label: "Progresión" },
  { to: "/acordes", label: "Acordes" },
  { to: "/escalas", label: "Escalas" },
  { to: "/ajustes", label: "Ajustes" },
];

export function Layout() {
  const { pathname } = useLocation();
  // Al cambiar de página se empieza desde arriba, como en un sitio normal
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const theme = useAppSelector((s) => s.prefs.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme === "oscuro" ? "dark" : "light";
  }, [theme]);

  return (
    <>
      <a href="#contenido" className="skip">
        Ir al contenido
      </a>
      <header className="top">
        <NavLink to="/" className="brand">
          <svg viewBox="0 0 26 26" aria-hidden="true">
            <rect x="1" y="5" width="24" height="16" rx="3" fill="#3a2216" />
            <path d="M9 5v16M17 5v16" stroke="#d9dade" strokeWidth="1.6" />
            <path d="M1 9.5h24M1 13h24M1 16.5h24" stroke="#c4a26a" strokeWidth="0.8" />
            <circle cx="13" cy="13" r="3.4" fill="#2b47d6" stroke="#fff" strokeWidth="1.2" />
          </svg>
          traste
        </NavLink>
        <nav aria-label="Principal">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                isActive || (n.to === "/" && /^\/(cancion|video|nueva|editar)/.test(pathname)) ? "is-on" : ""
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="contenido" className="main">
        <Outlet />
      </main>
    </>
  );
}
