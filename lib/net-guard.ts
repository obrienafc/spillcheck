import dns from 'node:dns';
import net from 'node:net';

/** True for loopback, private, link-local, CGNAT, multicast and other non-public ranges. */
export function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === '::' ||
      lower === '::1' ||
      /^f[cd]/.test(lower) || // fc00::/7 unique local
      /^fe[89ab]/.test(lower) || // fe80::/10 link local
      /^ff/.test(lower) || // multicast
      lower.startsWith('64:ff9b:') // NAT64
    );
  }
  return true;
}

export class BlockedAddressError extends Error {
  constructor() {
    super('That address points to a private network.');
  }
}

/**
 * dns.lookup that refuses to return private addresses. Used for every
 * connection Spillcheck makes, including all traffic from the headless browser,
 * so redirects and DNS rebinding can't reach internal networks.
 */
export function guardedLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: Error | null, address: string | dns.LookupAddress[], family?: number) => void,
) {
  if (net.isIP(hostname)) {
    return isPrivateAddress(hostname)
      ? callback(new BlockedAddressError(), '', 4)
      : callback(null, hostname, net.isIPv6(hostname) ? 6 : 4);
  }
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 4);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      return callback(new BlockedAddressError(), '', 4);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}
