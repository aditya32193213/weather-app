// src/App.jsx

import { BrowserRouter } from "react-router-dom";
import Navbar from "./component/common/Navbar";
import AnimatedBackground from "./component/common/AnimatedBackground";
import { ErrorBoundary } from "./component/common/ErrorBoundary";
import AppRoutes from "./appRoutes";

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      {/*
        FIX: AnimatedBackground gets its own ErrorBoundary so a crash in the
        SVG/canvas background layer (e.g. a browser that doesn't support a CSS
        feature or a WebGL context loss) doesn't unmount the entire app. The
        title/description are intentionally empty so the fallback renders nothing
        visible — the app should still function without the decorative background.
      */}
      <ErrorBoundary title="" description="">
        <AnimatedBackground />
      </ErrorBoundary>

      <div className="relative min-h-screen z-10">
        <Navbar />
        <main className="relative z-10">
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
      </div>

      <div id="datepicker-root" />
    </BrowserRouter>
  );
}