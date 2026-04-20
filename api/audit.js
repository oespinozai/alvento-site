const WEBHOOK_URL = "https://openclaw.ghost-truck.ts.net:8443/lead";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "alv-leads-k8m2x9";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { business, location, website, email } = req.body;

  if (!business || !location || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WEBHOOK_SECRET}`,
      },
      body: JSON.stringify({ business, location, website, email }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Webhook error:", resp.status, text);
      return res.status(502).json({ error: "Failed to process request" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook failed:", err.message);
    return res.status(500).json({ error: "Failed to process request" });
  }
}
