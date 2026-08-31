import { proxyRequest } from "../_ts-net-proxy.js";

const REPORT_HOST = "openclaw.ghost-truck.ts.net";
const REPORT_PORT = 8443;

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(400).send("Invalid token");
  }

  try {
    const { status, body } = await proxyRequest(
      REPORT_HOST,
      REPORT_PORT,
      `/report/${encodeURIComponent(token)}`
    );
    if (status !== 200) {
      return res.status(status).send(body || "Report not found");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(body);
  } catch (err) {
    console.error("Report proxy error:", err.message);
    return res.status(502).send("Unable to load report");
  }
}
