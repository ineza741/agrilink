import { useLocation } from "react-router-dom";
import { AppRouter } from "./routes/AppRouter";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";

export default function App() {
  const location = useLocation();
  const componentName = `Route: ${location.pathname}`;

  return (
    <AppErrorBoundary componentName={componentName}>
      <AppRouter />
    </AppErrorBoundary>
  );
}
