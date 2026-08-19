import { Outlet } from "react-router-dom";

export default function BlogAdminGuard() {
  // /admin já exige sessão válida e papel administrativo no servidor.
  return <Outlet />;
}
