const ORIGIN = 'https://reports.alvento.uk/arrears-demo';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const action = req.query.route;
  const methods = { session: 'POST', state: 'GET', action: 'POST' };
  if (!Object.hasOwn(methods, action) || req.method !== methods[action]) {
    return res.status(405).json({ error: 'Unsupported demo request.' });
  }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof req.headers.authorization === 'string') headers.Authorization = req.headers.authorization;
    const upstream = await fetch(`${ORIGIN}/${action}`, {
      method: req.method, headers,
      body: req.method === 'POST' ? JSON.stringify(req.body || {}) : undefined,
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: 'The demo is temporarily unavailable. Please try again.' });
  }
}
