import { useSelector } from "react-redux";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router";
import { AppLayout } from "./components/AppLayout/AppLayout.jsx";
import { ErrorBoundary, RouteError } from "./components/ErrorBoundary/ErrorBoundary.jsx";
import { CarDetails } from "./components/CarDetails/CarDetails.jsx";
import { FuelSection } from "./components/FuelSection/FuelSection.jsx";
import { Login } from "./components/Login/Login.jsx";
import { NotesSection } from "./components/NotesSection/NotesSection.jsx";
import { ServiceSection } from "./components/ServiceSection/ServiceSection.jsx";
import { Summary } from "./components/Summary/Summary.jsx";

// A data router, so pages can block navigation (unsaved changes on /auto).
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />} errorElement={<RouteError />}>
      <Route index element={<Summary />} />
      <Route path="paliwo" element={<FuelSection />} />
      <Route path="serwis" element={<ServiceSection />} />
      <Route path="notatki" element={<NotesSection />} />
      <Route path="auto" element={<CarDetails />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
  ),
);

const App = () => {
  const token = useSelector((state) => state.auth.token);

  if (!token) {
    return <Login />;
  }

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
};

export default App;
