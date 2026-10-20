import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { catalogApi } from "../features/catalog/catalogApi";
import { webApi } from "../features/web/webApi";
import libraryReducer from "../features/library/librarySlice";
import prefsReducer from "../features/prefs/prefsSlice";

const rootReducer = combineReducers({
  library: libraryReducer,
  prefs: prefsReducer,
  [catalogApi.reducerPath]: catalogApi.reducer,
  [webApi.reducerPath]: webApi.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export type PersistedState = Pick<RootState, "library" | "prefs">;

export function makeStore(preloaded?: Partial<PersistedState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded as RootState | undefined,
    middleware: (getDefault) => getDefault().concat(catalogApi.middleware, webApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
