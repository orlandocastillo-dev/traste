import { createApi, fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { Song } from "../../types";

interface CatalogResponse {
  aviso: string;
  canciones: Song[];
}

// El catálogo se sirve como un JSON estático
// Se resuelve contra la página actual para que funcione en cualquier subcarpeta.
const httpQuery = fetchBaseQuery({ baseUrl: new URL(import.meta.env.BASE_URL, window.location.href).href });

// En la versión portable (un solo HTML que se abre con doble clic) no hay servidor del que pedir el JSON, así que el catálogo viaja dentro del archivo
const portableQuery: BaseQueryFn<string, unknown, unknown> = async () => ({
  data: (await import("../../../public/data/canciones.json")).default,
});

export const catalogApi = createApi({
  reducerPath: "catalogApi",
  baseQuery: import.meta.env.MODE === "portable" ? portableQuery : httpQuery,
  endpoints: (build) => ({
    getCatalog: build.query<Song[], void>({
      query: () => "data/canciones.json",
      transformResponse: (response: CatalogResponse) => response.canciones,
    }),
  }),
});

export const { useGetCatalogQuery } = catalogApi;
