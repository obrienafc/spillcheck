import dns from 'node:dns';
import net from 'node:net';

// Every range that must never be reached from a scan. net.BlockList also
// matches IPv4-mapped IPv6 addresses (::ffff:127.0.0.1, ::ffff:7f00:1).
const blocked = new net.BlockList();
for (const [range, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
] as const) {
  blocked.addSubnet(range, prefix, 'ipv4');
}
for (const [range, prefix] of [
  ['::', 96], // unspecified, loopback and IPv4-compatible (::a.b.c.d)
  ['64:ff9b::', 96], // NAT64
  ['64:ff9b:1::', 48], // local-use NAT64
  ['100::', 64], // discard
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
] as const) {
  blocked.addSubnet(range, prefix, 'ipv6');
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public ranges. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const family = net.isIP(ip);
  if (family === 4) return blocked.check(ip, 'ipv4');
  if (family === 6) return blocked.check(ip, 'ipv6');
  return true; // not an IP at all: refuse rather than guess
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
