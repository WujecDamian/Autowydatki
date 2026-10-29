import { useSelector } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppLayout } from "./components/AppLayout/AppLayout.jsx";
import { CarDetails } from "./components/CarDetails/CarDetails.jsx";
import { FuelSection } from "./components/FuelSection/FuelSection.jsx";
import { Login } from "./components/Login/Login.jsx";
import { ServiceSection } from "./components/ServiceSection/ServiceSection.jsx";
import { Summary } from "./components/Summary/Summary.jsx";

const App = () => {
  const token = useSelector((state) => state.auth.token);

  if (!token) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Summary />} />
          <Route path="paliwo" element={<FuelSection />} />
          <Route path="serwis" element={<ServiceSection />} />
          <Route path="auto" element={<CarDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
