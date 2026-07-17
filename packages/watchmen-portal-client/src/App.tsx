import { BrowserRouter, Routes, Route } from "react-router-dom";
import Portal from "@/pages/Portal";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
