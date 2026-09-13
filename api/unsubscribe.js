const UNSUB_URL = "https://reports.alvento.uk";

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!id || !/^\d+$/.test(String(id)) || !token) {
    return res.status(400).send("Invalid unsubscribe link");
  }

  try {
    const path = `/unsubscribe?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
    const upstream = await fetch(`${UNSUB_URL}${path}`, {
      method: req.method === "POST" ? "POST" : "GET",
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.text();
    res.setHeader(
      "Content-Type",
      req.method === "POST" ? "text/plain" : "text/html; charset=utf-8"
    );
    return res.status(upstream.status).send(body);
  } catch (err) {
    console.error("Unsubscribe proxy error:", err.message);
    return res.status(502).send("Unable to process unsubscribe request");
  }
}
