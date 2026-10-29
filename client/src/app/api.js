import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: `${apiUrl}/api`,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  tagTypes: ["Car", "Fuel", "Service", "Station"],
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
    updateCarPrice: builder.mutation({
      query: ({ id, purchasePrice }) => ({
        url: `/cars/${id}`,
        method: "PATCH",
        body: { purchasePrice },
      }),
      invalidatesTags: ["Car"],
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
      invalidatesTags: ["Service"],
    }),
    updateService: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/services/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Service"],
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
  useUpdateCarPriceMutation,
  useGetFuelQuery,
  useAddFuelMutation,
  useDeleteFuelMutation,
  useGetStationsQuery,
  useAddStationMutation,
  useDeleteStationMutation,
  useGetServicesQuery,
  useAddServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = api;
