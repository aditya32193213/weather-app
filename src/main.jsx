import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "react-datepicker/dist/react-datepicker.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { GPSProvider }   from "./context/GPSContext.jsx";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error(
    '[App] Could not find <div id="root"> in index.html. ' +
    "Check your HTML template.",
  );
}

createRoot(rootEl).render(
 <StrictMode>
    <ThemeProvider>
      {/* GPSProvider wraps the whole app so GPS is resolved once and shared. */}
      <GPSProvider>
        <App />
      </GPSProvider>
    </ThemeProvider>
  </StrictMode>
);