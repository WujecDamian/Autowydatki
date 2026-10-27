import { createSlice } from "@reduxjs/toolkit";

const tokenKey = "autowydatki-token";

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: localStorage.getItem(tokenKey),
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
      localStorage.setItem(tokenKey, action.payload);
    },
    logout(state) {
      state.token = null;
      localStorage.removeItem(tokenKey);
    },
  },
});

export const { setToken, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
