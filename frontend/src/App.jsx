import { useLocation } from "react-router-dom";
import { AppRouter } from "./routes/AppRouter";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";
import { Toaster } from "sonner";

export default function App() {
  const location = useLocation();
  const componentName = `Route: ${location.pathname}`;

  return (
    <AppErrorBoundary componentName={componentName}>
      <AppRouter />
      <Toaster
        position="top-right"
        offset={80}
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          },
        }}
      />
    </AppErrorBoundary>
  );
}
