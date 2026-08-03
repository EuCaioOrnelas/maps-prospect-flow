export const PUBLIC_DEMO_PROFILE = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@wiize.com.br",
  name: "Visitante",
  searches_used: 1840,
  searches_limit: 10000,
  plan: "growth",
  created_at: new Date().toISOString(),
  terms_accepted_at: new Date().toISOString(),
  admin_assigned_plan: true,
};

export function isPublicDemoPath(pathname = window.location.pathname) {
  return pathname === "/tour-guiado";
}

export function buildTourDemoSearchHistory() {
  return [
    { id: "__tour_search_1__", keyword: "Clínicas de estética", location: "São Paulo, SP", results_count: 60, created_at: new Date().toISOString(), leads: [] },
    { id: "__tour_search_2__", keyword: "Clínicas odontológicas", location: "Belo Horizonte, MG", results_count: 48, created_at: new Date(Date.now() - 86400000).toISOString(), leads: [] },
    { id: "__tour_search_3__", keyword: "Academias premium", location: "Curitiba, PR", results_count: 54, created_at: new Date(Date.now() - 172800000).toISOString(), leads: [] },
  ];
}