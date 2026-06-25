import { AppRouter } from "./routes/AppRouter";
import { AppErrorBoundary } from "./components/common/AppErrorBoundary";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppRouter />
    </AppErrorBoundary>
  );
}
