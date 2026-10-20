import "@fontsource-variable/figtree";
import "@fontsource-variable/literata";
import "@fontsource-variable/literata/wght-italic.css";
import "./styles/app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createHashRouter, Navigate, RouterProvider } from "react-router";
import { loadState, persist } from "./app/persistence";
import { makeStore } from "./app/store";
import { Layout } from "./components/Layout";
import { Acordes } from "./pages/Acordes";
import { Ajustes } from "./pages/Ajustes";
import { Biblioteca } from "./pages/Biblioteca";
import { Cancion } from "./pages/Cancion";
import { EditarCancion } from "./pages/EditarCancion";
import { Escalas } from "./pages/Escalas";
import { Progresion } from "./pages/Progresion";
import { VideoImport } from "./pages/VideoImport";

const store = makeStore(loadState());
persist(store);

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Biblioteca /> },
      { path: "cancion/:id", element: <Cancion /> },
      { path: "video/:id", element: <VideoImport /> },
      { path: "nueva", element: <EditarCancion /> },
      { path: "editar/:id", element: <EditarCancion /> },
      { path: "progresion", element: <Progresion /> },
      { path: "acordes", element: <Acordes /> },
      { path: "escalas", element: <Escalas /> },
      { path: "ajustes", element: <Ajustes /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
