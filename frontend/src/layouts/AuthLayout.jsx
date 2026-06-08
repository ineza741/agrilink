import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="prototype-auth-layout">
      <Outlet />
    </main>
  );
}
