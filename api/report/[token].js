const REPORT_URL = "https://reports.alvento.uk";

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(400).send("Invalid token");
  }

  try {
    const upstream = await fetch(`${REPORT_URL}/report/${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).send(body || "Report not found");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(body);
  } catch (err) {
    console.error("Report proxy error:", err.message);
    return res.status(502).send("Unable to load report");
  }
}
