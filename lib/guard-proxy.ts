import http from 'node:http';
import net from 'node:net';
import { BlockedAddressError, guardedLookup } from './net-guard';

const isBlocked = (err: unknown) =>
  err instanceof BlockedAddressError || (err as Error)?.message === new BlockedAddressError().message;

/**
 * A tiny forward proxy on 127.0.0.1 that every request from the headless
 * browser goes through. It only allows ports 80 and 443 and resolves each
 * destination with guardedLookup, so pages can't make the browser reach
 * private or internal addresses, whatever tricks they use.
 */
export async function startGuardProxy() {
  const sockets = new Set<net.Socket>();
  /** Hosts refused because they resolve to private addresses or use other ports. */
  const blocked: string[] = [];

  const connectTo = (host: string, port: number) =>
    net.connect({ host, port, lookup: guardedLookup as never, timeout: 15_000 });

  const server = http.createServer((req, res) => {
    // Plain-HTTP requests arrive with an absolute URL.
    let target: URL;
    try {
      target = new URL(req.url ?? '');
    } catch {
      res.writeHead(400).end();
      return;
    }
    const port = Number(target.port || 80);
    if (target.protocol !== 'http:' || (port !== 80 && port !== 443)) {
      blocked.push(target.hostname);
      res.writeHead(403).end();
      return;
    }
    const upstream = http.request(
      {
        host: target.hostname,
        port,
        path: target.pathname + target.search,
        method: req.method,
        headers: req.headers,
        lookup: guardedLookup as never,
        timeout: 15_000,
      },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    upstream.on('error', (err) => {
      if (isBlocked(err)) blocked.push(target.hostname);
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  });

  // HTTPS and WebSocket traffic tunnels through CONNECT.
  server.on('connect', (req, client: net.Socket, head: Buffer) => {
    const [host, portText] = (req.url ?? '').split(/:(?=\d+$)/);
    const port = Number(portText);
    if (!host || (port !== 443 && port !== 80)) {
      blocked.push(host ?? '');
      client.end('HTTP/1.1 403 Forbidden\r\n\r\n');
      return;
    }
    const upstream = connectTo(host.replace(/^\[|\]$/g, ''), port);
    sockets.add(client).add(upstream);
    upstream.on('connect', () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    const fail = (err?: unknown) => {
      if (isBlocked(err)) blocked.push(host.replace(/^\[|\]$/g, ''));
      client.destroy();
      upstream.destroy();
    };
    upstream.on('error', fail);
    upstream.on('timeout', () => fail());
    client.on('error', () => upstream.destroy());
    client.on('close', () => sockets.delete(client));
    upstream.on('close', () => sockets.delete(upstream));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as net.AddressInfo;

  return {
    port,
    blocked,
    close: () =>
      new Promise<void>((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}
