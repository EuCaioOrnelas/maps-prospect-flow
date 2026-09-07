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
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(
    JSON.stringify({
      service: "Wiize API",
      status: "ok",
      docs: "https://wiize.com.br/api/docs",
      base_url: "https://api.wiize.com.br/v1",
      endpoints: ["/v1/leads/search", "/v1/opportunities/score", "/v1/leads/approach"],
    }),
  );
}
