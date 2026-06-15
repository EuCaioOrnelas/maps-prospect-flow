import { Navigate } from "react-router-dom";
export default function AIWorkforceLegacy() {
  // Versão clássica permanece em /agents — apenas redireciona.
  return <Navigate to="/agents" replace />;
}
