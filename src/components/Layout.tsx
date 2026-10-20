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
  // Al cambiar de página se empieza desde arriba, como en un sitio normal.
  // Con llaves: en Chrome reciente scrollTo devuelve una promesa, y React la tomaría como función de limpieza.
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
