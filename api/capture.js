import nodemailer from "nodemailer";

// Vercel-native: capture tool-page email signups by emailing a notification
// via OCI SMTP. No tailnet/webhook dependency.
const SMTP_HOST = "smtp.email.uk-london-1.oci.oraclecloud.com";
const SMTP_PORT = 587;
const FROM = "Alvento <hello@alvento.uk>";
const NOTIFY_TO = process.env.CAPTURE_NOTIFY_TO || "leads@alvento.uk";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, product, context } = req.body || {};

  if (!email) return res.status(400).json({ error: "Email required" });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email" });

  const user = process.env.OCI_SMTP_USER;
  const pass = process.env.OCI_SMTP_PASS;
  if (!user || !pass) {
    console.error("capture: SMTP credentials not configured");
    // Don't block the user — capture failure is non-critical.
    return res.status(200).json({ ok: true });
  }

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
    });

    const lead = {
      email,
      product: product || "unknown",
      context: context || "",
      source: "tool-capture",
      timestamp: new Date().toISOString(),
    };

    await transport.sendMail({
      from: FROM,
      to: NOTIFY_TO,
      replyTo: email,
      subject: `New tool capture: ${lead.product}`,
      text: [
        `Email:   ${lead.email}`,
        `Product: ${lead.product}`,
        `Context: ${lead.context}`,
        `Source:  ${lead.source}`,
        `Time:    ${lead.timestamp}`,
      ].join("\n"),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("capture: send failed:", err.message);
    // Don't block the user — capture failure is non-critical.
    return res.status(200).json({ ok: true });
  }
}
