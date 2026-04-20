const REPORT_BASE = "https://openclaw.ghost-truck.ts.net:8443/report";

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return res.status(400).send("Invalid token");
  }

  try {
    const resp = await fetch(`${REPORT_BASE}/${token}`);
    if (!resp.ok) {
      return res.status(resp.status).send("Report not found");
    }
    const html = await resp.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(html);
  } catch (err) {
    console.error("Report proxy error:", err.message);
    return res.status(502).send("Unable to load report");
  }
}
