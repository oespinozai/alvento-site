import dns from "node:dns";
import https from "node:https";

// Vercel's serverless functions cannot resolve .ts.net (Tailscale Funnel)
// hostnames via their default DNS path - confirmed live, ENOTFOUND every
// time, and dns.setServers() does NOT fix this because fetch()/dns.lookup()
// use the OS resolver, not the dns.resolve*() family that setServers()
// actually controls. This does real DNS resolution via an explicit
// Resolver (which does respect setServers), then connects directly to the
// resolved IP while keeping the correct SNI/Host so Tailscale's shared
// relay IP still routes to the right tailnet node's funnel.
function resolveViaPublicDNS(hostname) {
  return new Promise((resolve, reject) => {
    const resolver = new dns.Resolver();
    resolver.setServers(["1.1.1.1", "8.8.8.8"]);
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses?.length) return reject(err || new Error("no addresses"));
      resolve(addresses[0]);
    });
  });
}

export function proxyRequest(hostname, port, path, method = "GET") {
  return new Promise(async (resolve, reject) => {
    let ip;
    try {
      ip = await resolveViaPublicDNS(hostname);
    } catch (err) {
      return reject(err);
    }
    const req = https.request(
      {
        host: ip,
        port,
        path,
        method,
        servername: hostname,
        headers: { Host: `${hostname}:${port}` },
        timeout: 10000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("upstream timeout"));
    });
    req.end();
  });
}
