type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  end: () => void;
};

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(
    JSON.stringify({
      service: "Wiize API",
      status: "ok",
      docs: "https://wiize.com.br/api/docs",
      base_url: "https://api.wiize.com.br/v1",
      health: "/v1/health",
      endpoints: [
        "/v1/prospecting/search",
        "/v1/prospecting/analyze",
        "/v1/prospecting/approach",
      ],
    }),
  );
}
