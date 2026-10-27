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
  tagTypes: ["Car", "Fuel", "Service"],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({
        url: "/login",
        method: "POST",
        body,
      }),
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
    getServices: builder.query({
      query: (carId) => `/services?carId=${carId}`,
      transformResponse: (entries) =>
        entries.map((entry) => ({
          ...entry,
          odometerKm: Number(entry.odometerKm),
          cost: Number(entry.cost),
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
  useGetCarsQuery,
  useAddCarMutation,
  useUpdateCarPriceMutation,
  useGetFuelQuery,
  useAddFuelMutation,
  useDeleteFuelMutation,
  useGetServicesQuery,
  useAddServiceMutation,
  useDeleteServiceMutation,
} = api;
