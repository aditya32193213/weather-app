import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { RouteErrorBoundary } from "./component/common/ErrorBoundary";
import Home from "./pages/Home";

const Historical = React.lazy(() => import("./pages/Historical"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div
    role="status"
    aria-label="Loading page"
    className="flex items-center justify-center min-h-[60vh]"
  >
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-400" />
    <span className="sr-only">Loading…</span>
  </div>
);


const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route
        path="/"
        element={
          <RouteErrorBoundary pageName="Today">
            <Home />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="/historical"
        element={
          <RouteErrorBoundary pageName="Historical">
            <Historical />
          </RouteErrorBoundary>
        }
      />
      <Route
        path="*"
        element={
          <RouteErrorBoundary pageName="NotFound">
            <NotFound />
          </RouteErrorBoundary>
        }
      />
    </Routes>
  </Suspense>
);

export default AppRoutes;