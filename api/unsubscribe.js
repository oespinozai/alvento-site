import dns from "node:dns";
// Vercel's serverless runtime cannot resolve .ts.net (Tailscale Funnel)
// hostnames via its default DNS resolver (ENOTFOUND, confirmed live).
// Force a normal public resolver instead - the address itself is genuinely
// public once `tailscale funnel` is on, this is purely a DNS-resolution gap.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const UNSUB_BASE = "https://openclaw.ghost-truck.ts.net:8443/unsubscribe";

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!id || !/^\d+$/.test(String(id)) || !token) {
    return res.status(400).send("Invalid unsubscribe link");
  }

  try {
    const resp = await fetch(
      `${UNSUB_BASE}?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`,
      { method: req.method === "POST" ? "POST" : "GET" }
    );
    const body = await resp.text();
    if (req.method === "POST") {
      res.setHeader("Content-Type", "text/plain");
    } else {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    }
    return res.status(resp.status).send(body);
  } catch (err) {
    console.error("Unsubscribe proxy error:", err.message, "cause:", err.cause?.code || err.cause?.message || err.cause);
    return res.status(502).send("Unable to process unsubscribe request");
  }
}
