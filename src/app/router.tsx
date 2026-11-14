import { Component, type ErrorInfo, type ReactNode, lazy, Suspense } from "react";
import {
  createBrowserRouter,
  type RouteObject,
} from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RouteSkeleton } from "@/components/ui/RouteSkeleton";
import { Button } from "@/components/ui/primitives";
import Dashboard from "@/pages/Dashboard"; // eager: first paint

const Forecast = lazy(() => import("@/pages/Forecast"));
const Maps = lazy(() => import("@/pages/Maps"));
const AirQuality = lazy(() => import("@/pages/AirQuality"));
const Climate = lazy(() => import("@/pages/Climate"));
const Compare = lazy(() => import("@/pages/Compare"));
const Travel = lazy(() => import("@/pages/Travel"));
const Insights = lazy(() => import("@/pages/Insights"));
const Alerts = lazy(() => import("@/pages/Alerts"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function lazyPage(element: ReactNode) {
  return <Suspense fallback={<RouteSkeleton />}>{element}</Suspense>;
}

/** Last-resort boundary so a render bug never white-screens the app. */
class RouteErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Logged for diagnostics; production telemetry can be wired here later.
    console.error("[climate-chaser] route error", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="card mx-auto max-w-md p-6 text-center">
          <h1 className="text-lg font-extrabold text-[var(--text)]">
            Something broke on this page
          </h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {this.state.error.message}
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-white">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-xl font-bold">The app failed to start</h1>
          <p className="mt-2 text-sm text-slate-400">
            A hard refresh usually fixes this. If it persists, the latest deploy may be
            broken — check the repository Actions/Netlify log.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "forecast", element: <RouteErrorBoundary>{lazyPage(<Forecast />)}</RouteErrorBoundary> },
      { path: "maps", element: <RouteErrorBoundary>{lazyPage(<Maps />)}</RouteErrorBoundary> },
      { path: "air-quality", element: <RouteErrorBoundary>{lazyPage(<AirQuality />)}</RouteErrorBoundary> },
      { path: "climate", element: <RouteErrorBoundary>{lazyPage(<Climate />)}</RouteErrorBoundary> },
      { path: "compare", element: <RouteErrorBoundary>{lazyPage(<Compare />)}</RouteErrorBoundary> },
      { path: "travel", element: <RouteErrorBoundary>{lazyPage(<Travel />)}</RouteErrorBoundary> },
      { path: "insights", element: <RouteErrorBoundary>{lazyPage(<Insights />)}</RouteErrorBoundary> },
      { path: "alerts", element: <RouteErrorBoundary>{lazyPage(<Alerts />)}</RouteErrorBoundary> },
      { path: "settings", element: <RouteErrorBoundary>{lazyPage(<Settings />)}</RouteErrorBoundary> },
      { path: "*", element: lazyPage(<NotFound />) },
    ],
  },
];

export const router = createBrowserRouter(routes);
