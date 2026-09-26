# Spillcheck

**What does your website spill?**

Enter a URL and Spillcheck lists every third party the page talks to: fonts,
analytics, ad pixels, session replay, embeds, CDNs. Each one is named, explained
and weighed, and the page gets a privacy grade from A+ to F.

![Spillcheck showing a page that contacts 2 third parties: Google Fonts and Google Tag Manager](docs/screenshot.png)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fobrienafc%2Fspillcheck&project-name=spillcheck)

## Features

- **Names the parties.** A hand-curated list of 160+ services (Google Analytics,
  Meta Pixel, Hotjar, Google Fonts, jsDelivr and so on) with the company behind each.
- **Explains why it matters.** Every category says what that kind of third party
  collects.
- **Grades the page.** Ad pixels and session replay cost the most; privacy-friendly
  analytics and fonts cost the least. Known-malicious domains (like polyfill.io)
  are flagged.
- **Honest about evidence.** Resources the page *loads* are separated from domains
  it only *references* (inline script URLs, preconnect hints, form targets), which
  count half.
- **Shareable results.** `/?url=example.com` runs the scan on load.
- **JSON API.** `GET /api/scan?url=example.com`.
- **Badges.** Show a site's grade in a README or footer (see below).
- **Every state in one place.** `/states` renders the empty, invalid, loading,
  result and error states from saved fixtures, for design review.

## Badges

[![Spillcheck privacy grade](https://spillcheck.patrickob.tech/badge?url=patrickob.tech)](https://spillcheck.patrickob.tech/?url=patrickob.tech)

```markdown
[![Spillcheck privacy grade](https://spillcheck.patrickob.tech/badge?url=example.com)](https://spillcheck.patrickob.tech/?url=example.com)
```

| Parameter | Default   | Description |
| --------- | --------- | ----------- |
| `url`     | required  | The page to grade. |
| `label`   | `privacy` | Left-hand text, up to 24 characters. |
| `detail`  | off       | `detail=1` adds the count: `B · 2 third parties`. |

Badges are cached for a day. If a scan fails, the badge shows `unknown` rather
than a broken image. Every result page has copy-ready Markdown and HTML.

## How it works

1. The server fetches the page HTML like a browser would.
2. It collects everything the page loads: scripts, stylesheets, fonts, images,
   iframes, media, preconnect hints, and URLs inside inline scripts.
3. It follows stylesheets and their `@import`s (up to 12) to find fonts and images
   loaded from CSS.
4. Anything outside the page's own registrable domain is matched against
   `lib/parties.ts` and scored using the weights in `lib/categories.ts`.

**Limitation:** Spillcheck doesn't run JavaScript. Scripts, especially tag
managers, can load more than it sees. When a tag manager is present, the report
says so.

## Safety

Scanning arbitrary URLs from a server is a classic SSRF risk, so `lib/safe-fetch.ts`:

- only allows `http`/`https` on ports 80 and 443, without credentials;
- checks every resolved IP **at connection time** (so redirects and DNS
  rebinding can't reach private, loopback, link-local or cloud-metadata
  addresses);
- limits redirects (5), response size (3 MB) and time (10 s).

Results are cached on the CDN for 10 minutes.

## Run it

```bash
npm install
npm run dev
```

Or deploy to Vercel with the button above. Node 20+.

## Contributing

The service list in [`lib/parties.ts`](lib/parties.ts) is the heart of the
project. PRs adding or correcting services are very welcome.

## License

MIT. Sister project: [Glyphyard](https://github.com/obrienafc/glyphyard), which
self-hosts Google Fonts on your own domain.
