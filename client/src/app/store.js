import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api.js";
import { authReducer } from "../features/auth/authSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});
