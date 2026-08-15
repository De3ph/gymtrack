const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 8080;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

const latestMeasurement = {
  measurementId: 1,
  athleteId: 1,
  date: new Date().toISOString(),
  weight: 75.5,
  weightUnit: "kg",
  bodyFatPct: 18.5,
  parts: { chest: { value: 100 }, waist: { value: 80 } },
  notes: "Latest measurement",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  if (path === "/api/health" && req.method === "GET") {
    return send(res, 200, { ok: true });
  }

  if (path === "/api/measurements/latest" && req.method === "GET") {
    return send(res, 200, latestMeasurement);
  }

  // Default empty success for unhandled SSR endpoints so tests don't crash.
  if (req.method === "GET") {
    return send(res, 200, { data: null });
  }

  return send(res, 200, { data: null });
});

server.listen(PORT, () => {
  console.log(`Mock backend listening on port ${PORT}`);
});
