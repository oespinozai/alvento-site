import { proxyRequest } from "./_ts-net-proxy.js";

const UNSUB_HOST = "openclaw.ghost-truck.ts.net";
const UNSUB_PORT = 8443;

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!id || !/^\d+$/.test(String(id)) || !token) {
    return res.status(400).send("Invalid unsubscribe link");
  }

  try {
    const path = `/unsubscribe?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    const { status, body } = await proxyRequest(
      UNSUB_HOST,
      UNSUB_PORT,
      path,
      req.method === "POST" ? "POST" : "GET"
    );
    res.setHeader(
      "Content-Type",
      req.method === "POST" ? "text/plain" : "text/html; charset=utf-8"
    );
    return res.status(status).send(body);
  } catch (err) {
    console.error("Unsubscribe proxy error:", err.message);
    return res.status(502).send("Unable to process unsubscribe request");
  }
}
