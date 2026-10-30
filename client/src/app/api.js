import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "../features/auth/authSlice.js";
import { isSessionExpired } from "../lib/session.js";

const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const baseQuery = fetchBaseQuery({
  baseUrl: `${apiUrl}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

// Wraps every request: when the server rejects our token, sign out so the login page
// shows instead of every screen failing with "Zaloguj się".
const baseQueryWithLogout = async (args, queryApi, extraOptions) => {
  const result = await baseQuery(args, queryApi, extraOptions);

  if (isSessionExpired(result, queryApi.getState().auth.token)) {
    queryApi.dispatch(logout());
    // Drop cached data so the next person to sign in on this browser never sees it.
    queryApi.dispatch(api.util.resetApiState());
  }

  return result;
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithLogout,
  tagTypes: ["Car", "Fuel", "Service", "Station", "Photo", "Note"],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({
        url: "/login",
        method: "POST",
        body,
      }),
    }),
    googleLogin: builder.mutation({
      query: (credential) => ({
        url: "/auth/google",
        method: "POST",
        body: { credential },
      }),
    }),
    getMe: builder.query({
      query: () => "/me",
    }),
    getCars: builder.query({
      query: () => "/cars",
      transformResponse: (entries) =>
        entries.map((car) => ({
          ...car,
          purchasePrice: car.purchasePrice === null ? null : Number(car.purchasePrice),
        })),
      providesTags: ["Car"],
    }),
    addCar: builder.mutation({
      query: (body) => ({
        url: "/cars",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Car"],
    }),
    updateCar: builder.mutation({
      query: ({ id, ...changes }) => ({
        url: `/cars/${id}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: ["Car"],
    }),
    deleteCar: builder.mutation({
      query: (id) => ({
        url: `/cars/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Car", "Fuel", "Service", "Photo", "Note"],
    }),
    getNotes: builder.query({
      query: (carId) => `/notes?carId=${carId}`,
      providesTags: ["Note"],
    }),
    addNote: builder.mutation({
      query: (body) => ({
        url: "/notes",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Note"],
    }),
    updateNote: builder.mutation({
      query: ({ id, ...changes }) => ({
        url: `/notes/${id}`,
        method: "PATCH",
        body: changes,
      }),
      invalidatesTags: ["Note"],
    }),
    deleteNote: builder.mutation({
      query: (id) => ({
        url: `/notes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Note"],
    }),
    getPhotos: builder.query({
      query: (carId) => `/cars/${carId}/photos`,
      providesTags: ["Photo"],
    }),
    uploadPhoto: builder.mutation({
      query: ({ carId, file }) => {
        const body = new FormData();
        body.append("photo", file);

        return { url: `/cars/${carId}/photos`, method: "POST", body };
      },
      // The first photo becomes the car's cover.
      invalidatesTags: ["Photo", "Car"],
    }),
    deletePhoto: builder.mutation({
      query: (id) => ({
        url: `/photos/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Photo", "Car"],
    }),
    getFuel: builder.query({
      query: (carId) => `/fuel?carId=${carId}`,
      transformResponse: (entries) =>
        entries.map((entry) => ({
          ...entry,
          odometerKm: Number(entry.odometerKm),
          liters: Number(entry.liters),
          totalCost: Number(entry.totalCost),
        })),
      providesTags: ["Fuel"],
    }),
    addFuel: builder.mutation({
      query: (body) => ({
        url: "/fuel",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fuel"],
    }),
    updateFuel: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/fuel/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Fuel"],
    }),
    deleteFuel: builder.mutation({
      query: (id) => ({
        url: `/fuel/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Fuel"],
    }),
    getStations: builder.query({
      query: () => "/stations",
      providesTags: ["Station"],
    }),
    addStation: builder.mutation({
      query: (name) => ({
        url: "/stations",
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["Station"],
    }),
    deleteStation: builder.mutation({
      query: (id) => ({
        url: `/stations/${id}`,
        method: "DELETE",
      }),
      // Fuel entries lose the deleted station's name, so they are refetched too.
      invalidatesTags: ["Station", "Fuel"],
    }),
    getServices: builder.query({
      query: (carId) => `/services?carId=${carId}`,
      transformResponse: (entries) =>
        entries.map((entry) => ({
          ...entry,
          odometerKm: Number(entry.odometerKm),
          cost: Number(entry.cost),
          items: entry.items.map((item) => ({ ...item, cost: Number(item.cost) })),
        })),
      providesTags: ["Service"],
    }),
    addService: builder.mutation({
      query: (body) => ({
        url: "/services",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Service", "Car"],
    }),
    updateService: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/services/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Service", "Car"],
    }),
    deleteService: builder.mutation({
      query: (id) => ({
        url: `/services/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Service"],
    }),
  }),
});

export const {
  useLoginMutation,
  useGoogleLoginMutation,
  useGetMeQuery,
  useGetCarsQuery,
  useAddCarMutation,
  useUpdateCarMutation,
  useDeleteCarMutation,
  useGetNotesQuery,
  useAddNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useGetPhotosQuery,
  useUploadPhotoMutation,
  useDeletePhotoMutation,
  useGetFuelQuery,
  useAddFuelMutation,
  useUpdateFuelMutation,
  useDeleteFuelMutation,
  useGetStationsQuery,
  useAddStationMutation,
  useDeleteStationMutation,
  useGetServicesQuery,
  useAddServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = api;
