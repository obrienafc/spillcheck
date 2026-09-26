// Hand-curated list of common third-party services. Matching is by hostname
// suffix, most specific first, so "snap.licdn.com" (LinkedIn ads) wins over
// "licdn.com" (LinkedIn). Contributions welcome.

import type { Category } from './categories';

type Service = { name: string; company: string; category: Category; domains: string[] };

const SERVICES: Service[] = [
  // Known risk
  { name: 'polyfill.io', company: 'Funnull', category: 'risk', domains: ['polyfill.io', 'bootcss.com', 'bootcdn.net', 'staticfile.org', 'staticfile.net'] },

  // Advertising
  { name: 'Google Ads & DoubleClick', company: 'Google', category: 'advertising', domains: ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'googletagservices.com', 'adservice.google.com', 'pagead2.googlesyndication.com'] },
  { name: 'Meta Pixel', company: 'Meta', category: 'advertising', domains: ['connect.facebook.net', 'facebook.net'] },
  { name: 'X Ads', company: 'X', category: 'advertising', domains: ['ads-twitter.com', 'ads-api.twitter.com', 'analytics.twitter.com'] },
  { name: 'LinkedIn Insight Tag', company: 'Microsoft', category: 'advertising', domains: ['snap.licdn.com', 'px.ads.linkedin.com', 'ads.linkedin.com'] },
  { name: 'Microsoft Advertising', company: 'Microsoft', category: 'advertising', domains: ['bat.bing.com', 'bat.bing.net'] },
  { name: 'Xandr', company: 'Microsoft', category: 'advertising', domains: ['adnxs.com'] },
  { name: 'Amazon Ads', company: 'Amazon', category: 'advertising', domains: ['amazon-adsystem.com'] },
  { name: 'TikTok Pixel', company: 'TikTok', category: 'advertising', domains: ['analytics.tiktok.com'] },
  { name: 'Pinterest Tag', company: 'Pinterest', category: 'advertising', domains: ['ct.pinterest.com'] },
  { name: 'Reddit Pixel', company: 'Reddit', category: 'advertising', domains: ['redditstatic.com', 'alb.reddit.com', 'pixel-config.reddit.com'] },
  { name: 'Snap Pixel', company: 'Snap', category: 'advertising', domains: ['sc-static.net', 'tr.snapchat.com'] },
  { name: 'Criteo', company: 'Criteo', category: 'advertising', domains: ['criteo.com', 'criteo.net'] },
  { name: 'Taboola', company: 'Taboola', category: 'advertising', domains: ['taboola.com'] },
  { name: 'Outbrain', company: 'Outbrain', category: 'advertising', domains: ['outbrain.com', 'outbrainimg.com'] },
  { name: 'The Trade Desk', company: 'The Trade Desk', category: 'advertising', domains: ['adsrvr.org'] },
  { name: 'Magnite', company: 'Magnite', category: 'advertising', domains: ['rubiconproject.com'] },
  { name: 'PubMatic', company: 'PubMatic', category: 'advertising', domains: ['pubmatic.com'] },
  { name: 'OpenX', company: 'OpenX', category: 'advertising', domains: ['openx.net'] },
  { name: 'Index Exchange', company: 'Index Exchange', category: 'advertising', domains: ['casalemedia.com'] },
  { name: 'Quantcast', company: 'Quantcast', category: 'advertising', domains: ['quantserve.com', 'quantcount.com'] },
  { name: 'Adobe Audience Manager', company: 'Adobe', category: 'advertising', domains: ['demdex.net', 'everesttech.net'] },
  { name: 'Integral Ad Science', company: 'Integral Ad Science', category: 'advertising', domains: ['adsafeprotected.com'] },
  { name: 'DoubleVerify', company: 'DoubleVerify', category: 'advertising', domains: ['doubleverify.com'] },
  { name: 'Moat', company: 'Oracle', category: 'advertising', domains: ['moatads.com'] },
  { name: 'LiveRamp', company: 'LiveRamp', category: 'advertising', domains: ['rlcdn.com'] },
  { name: 'FreeWheel', company: 'Comcast', category: 'advertising', domains: ['fwmrm.net'] },
  { name: 'Magnite (SpotX, Tremor)', company: 'Magnite', category: 'advertising', domains: ['spotxchange.com', 'tremorhub.com'] },
  { name: 'Index Exchange', company: 'Index Exchange', category: 'advertising', domains: ['indexww.com'] },
  { name: 'Nativo', company: 'Nativo', category: 'advertising', domains: ['ntv.io'] },
  { name: 'Dianomi', company: 'Dianomi', category: 'advertising', domains: ['dianomi.com'] },
  { name: 'TripleLift', company: 'Vista Equity Partners', category: 'advertising', domains: ['3lift.com'] },
  { name: 'Sharethrough', company: 'Equativ', category: 'advertising', domains: ['sharethrough.com'] },
  { name: 'Equativ', company: 'Equativ', category: 'advertising', domains: ['smartadserver.com'] },
  { name: 'Teads', company: 'Teads', category: 'advertising', domains: ['teads.tv', 'teads.com'] },
  { name: 'Media.net', company: 'Media.net', category: 'advertising', domains: ['media.net'] },
  { name: 'Sovrn', company: 'Sovrn', category: 'advertising', domains: ['lijit.com', 'sovrn.com'] },
  { name: 'GumGum', company: 'GumGum', category: 'advertising', domains: ['gumgum.com'] },
  { name: '33Across', company: '33Across', category: 'advertising', domains: ['33across.com'] },
  { name: 'Yieldmo', company: 'Yieldmo', category: 'advertising', domains: ['yieldmo.com'] },
  { name: 'Sonobi', company: 'Sonobi', category: 'advertising', domains: ['sonobi.com'] },
  { name: 'BidSwitch', company: 'Criteo', category: 'advertising', domains: ['bidswitch.net'] },
  { name: 'MediaMath', company: 'Infillion', category: 'advertising', domains: ['mathtag.com'] },
  { name: 'Lotame', company: 'Lotame', category: 'advertising', domains: ['crwdcntrl.net'] },
  { name: 'LiveIntent', company: 'Zeta Global', category: 'advertising', domains: ['liadm.com'] },
  { name: 'ID5', company: 'ID5', category: 'advertising', domains: ['id5-sync.com'] },
  { name: 'Oracle BlueKai', company: 'Oracle', category: 'advertising', domains: ['bluekai.com', 'bkrtx.com'] },
  { name: 'Permutive', company: 'Permutive', category: 'advertising', domains: ['permutive.com', 'permutive.app'] },
  { name: 'Carbon Ads', company: 'BuySellAds', category: 'advertising', domains: ['carbonads.com', 'carbonads.net', 'buysellads.com', 'srv.buysellads.com'] },
  { name: 'HubSpot', company: 'HubSpot', category: 'advertising', domains: ['hs-scripts.com', 'hs-analytics.net', 'hs-banner.com', 'hsforms.net', 'hsforms.com', 'hubspot.com', 'hscollectedforms.net', 'hsadspixel.net', 'usemessages.com'] },

  // Session replay
  { name: 'Hotjar', company: 'Contentsquare', category: 'session-replay', domains: ['hotjar.com', 'hotjar.io'] },
  { name: 'Microsoft Clarity', company: 'Microsoft', category: 'session-replay', domains: ['clarity.ms'] },
  { name: 'FullStory', company: 'FullStory', category: 'session-replay', domains: ['fullstory.com'] },
  { name: 'Mouseflow', company: 'Mouseflow', category: 'session-replay', domains: ['mouseflow.com'] },
  { name: 'LogRocket', company: 'LogRocket', category: 'session-replay', domains: ['logrocket.com', 'logr-in.com', 'lr-ingest.com', 'lr-in-prod.com'] },
  { name: 'Smartlook', company: 'Cisco', category: 'session-replay', domains: ['smartlook.com', 'smartlook.cloud'] },
  { name: 'Contentsquare', company: 'Contentsquare', category: 'session-replay', domains: ['contentsquare.net'] },

  // Analytics
  { name: 'Google Analytics', company: 'Google', category: 'analytics', domains: ['google-analytics.com', 'analytics.google.com', 'region1.google-analytics.com'] },
  { name: 'Adobe Analytics', company: 'Adobe', category: 'analytics', domains: ['omtrdc.net', '2o7.net'] },
  { name: 'Segment', company: 'Twilio', category: 'analytics', domains: ['segment.com', 'segment.io'] },
  { name: 'Mixpanel', company: 'Mixpanel', category: 'analytics', domains: ['mixpanel.com', 'mxpnl.com'] },
  { name: 'Amplitude', company: 'Amplitude', category: 'analytics', domains: ['amplitude.com'] },
  { name: 'Heap', company: 'Contentsquare', category: 'analytics', domains: ['heapanalytics.com', 'heap-api.com'] },
  { name: 'PostHog', company: 'PostHog', category: 'analytics', domains: ['posthog.com'] },
  { name: 'Yandex Metrica', company: 'Yandex', category: 'analytics', domains: ['mc.yandex.ru', 'mc.yandex.com'] },
  { name: 'Comscore', company: 'Comscore', category: 'analytics', domains: ['scorecardresearch.com'] },
  { name: 'Chartbeat', company: 'Chartbeat', category: 'analytics', domains: ['chartbeat.com', 'chartbeat.net'] },
  { name: 'Jetpack Stats', company: 'Automattic', category: 'analytics', domains: ['stats.wp.com', 'pixel.wp.com'] },
  { name: 'Marketo', company: 'Adobe', category: 'analytics', domains: ['marketo.net', 'mktoresp.com'] },
  { name: 'Optimizely', company: 'Optimizely', category: 'analytics', domains: ['optimizely.com'] },
  { name: 'VWO', company: 'Wingify', category: 'analytics', domains: ['visualwebsiteoptimizer.com', 'wingify.com'] },
  { name: 'Klaviyo', company: 'Klaviyo', category: 'analytics', domains: ['klaviyo.com'] },
  { name: 'Nielsen', company: 'Nielsen', category: 'analytics', domains: ['imrworldwide.com', 'exelator.com'] },
  { name: 'Piano', company: 'Piano', category: 'analytics', domains: ['piano.io', 'tinypass.com'] },
  { name: 'Salesforce Audience Studio', company: 'Salesforce', category: 'analytics', domains: ['krxd.net'] },
  { name: 'Mailchimp', company: 'Intuit', category: 'analytics', domains: ['list-manage.com', 'chimpstatic.com', 'mailchimp.com'] },

  // Privacy-friendly analytics
  { name: 'Plausible', company: 'Plausible', category: 'private-analytics', domains: ['plausible.io'] },
  { name: 'Fathom', company: 'Fathom', category: 'private-analytics', domains: ['usefathom.com'] },
  { name: 'Simple Analytics', company: 'Simple Analytics', category: 'private-analytics', domains: ['simpleanalyticscdn.com', 'simpleanalytics.com'] },
  { name: 'Umami Cloud', company: 'Umami', category: 'private-analytics', domains: ['umami.is'] },
  { name: 'GoatCounter', company: 'GoatCounter', category: 'private-analytics', domains: ['goatcounter.com', 'gc.zgo.at'] },
  { name: 'Pirsch', company: 'Pirsch', category: 'private-analytics', domains: ['pirsch.io'] },
  { name: 'Cloudflare Web Analytics', company: 'Cloudflare', category: 'private-analytics', domains: ['cloudflareinsights.com'] },
  { name: 'Vercel Web Analytics', company: 'Vercel', category: 'private-analytics', domains: ['vercel-scripts.com', 'vercel-insights.com'] },
  { name: 'Matomo Cloud', company: 'Matomo', category: 'private-analytics', domains: ['matomo.cloud'] },

  // Tag managers
  { name: 'Google Tag Manager', company: 'Google', category: 'tag-manager', domains: ['googletagmanager.com'] },
  { name: 'Tealium', company: 'Tealium', category: 'tag-manager', domains: ['tiqcdn.com', 'tealiumiq.com'] },
  { name: 'Adobe Experience Platform Tags', company: 'Adobe', category: 'tag-manager', domains: ['adobedtm.com'] },

  // Social
  { name: 'Facebook', company: 'Meta', category: 'social', domains: ['facebook.com', 'fbcdn.net', 'fbsbx.com'] },
  { name: 'Instagram', company: 'Meta', category: 'social', domains: ['instagram.com', 'cdninstagram.com'] },
  { name: 'X (Twitter)', company: 'X', category: 'social', domains: ['twitter.com', 'x.com', 'twimg.com', 't.co'] },
  { name: 'LinkedIn', company: 'Microsoft', category: 'social', domains: ['linkedin.com', 'licdn.com'] },
  { name: 'Pinterest', company: 'Pinterest', category: 'social', domains: ['pinterest.com', 'pinimg.com'] },
  { name: 'TikTok', company: 'TikTok', category: 'social', domains: ['tiktok.com', 'tiktokcdn.com', 'ttwstatic.com'] },
  { name: 'AddThis', company: 'Oracle', category: 'social', domains: ['addthis.com', 'addthisedge.com'] },
  { name: 'ShareThis', company: 'ShareThis', category: 'social', domains: ['sharethis.com'] },
  { name: 'Disqus', company: 'Disqus', category: 'social', domains: ['disqus.com', 'disquscdn.com'] },
  { name: 'Gravatar', company: 'Automattic', category: 'social', domains: ['gravatar.com'] },
  { name: 'OpenWeb comments', company: 'OpenWeb', category: 'social', domains: ['spot.im', 'openweb.com'] },

  // Embeds
  { name: 'YouTube', company: 'Google', category: 'embeds', domains: ['youtube.com', 'youtube-nocookie.com', 'ytimg.com', 'googlevideo.com', 'youtu.be'] },
  { name: 'Google Maps', company: 'Google', category: 'embeds', domains: ['maps.googleapis.com', 'maps.gstatic.com', 'maps.google.com'] },
  { name: 'Vimeo', company: 'Vimeo', category: 'embeds', domains: ['vimeo.com', 'vimeocdn.com'] },
  { name: 'Mapbox', company: 'Mapbox', category: 'embeds', domains: ['mapbox.com'] },
  { name: 'Spotify', company: 'Spotify', category: 'embeds', domains: ['spotify.com', 'scdn.co'] },
  { name: 'SoundCloud', company: 'SoundCloud', category: 'embeds', domains: ['soundcloud.com', 'sndcdn.com'] },
  { name: 'CodePen', company: 'CodePen', category: 'embeds', domains: ['codepen.io'] },
  { name: 'Calendly', company: 'Calendly', category: 'embeds', domains: ['calendly.com'] },
  { name: 'Typeform', company: 'Typeform', category: 'embeds', domains: ['typeform.com'] },
  { name: 'Wistia', company: 'Wistia', category: 'embeds', domains: ['wistia.com', 'wistia.net'] },

  // Fonts
  { name: 'Google Fonts', company: 'Google', category: 'fonts', domains: ['fonts.googleapis.com', 'fonts.gstatic.com'] },
  { name: 'Adobe Fonts', company: 'Adobe', category: 'fonts', domains: ['typekit.net', 'typekit.com'] },
  { name: 'Font Awesome', company: 'Fonticons', category: 'fonts', domains: ['fontawesome.com'] },
  { name: 'Monotype Fonts', company: 'Monotype', category: 'fonts', domains: ['fonts.net', 'fonts.com'] },
  { name: 'Hoefler&Co Cloud.typography', company: 'Monotype', category: 'fonts', domains: ['cloud.typography.com'] },
  { name: 'Bunny Fonts', company: 'BunnyWay', category: 'private-fonts', domains: ['fonts.bunny.net'] },

  // Chat & support
  { name: 'Intercom', company: 'Intercom', category: 'support', domains: ['intercom.io', 'intercomcdn.com', 'intercomassets.com'] },
  { name: 'Zendesk', company: 'Zendesk', category: 'support', domains: ['zdassets.com', 'zendesk.com', 'zopim.com'] },
  { name: 'Drift', company: 'Salesloft', category: 'support', domains: ['driftt.com', 'drift.com'] },
  { name: 'Crisp', company: 'Crisp', category: 'support', domains: ['crisp.chat'] },
  { name: 'tawk.to', company: 'tawk.to', category: 'support', domains: ['tawk.to'] },
  { name: 'LiveChat', company: 'Text', category: 'support', domains: ['livechatinc.com'] },
  { name: 'Freshchat', company: 'Freshworks', category: 'support', domains: ['freshchat.com', 'freshworks.com'] },
  { name: 'Tidio', company: 'Tidio', category: 'support', domains: ['tidio.co', 'tidiochat.com'] },

  // Consent
  { name: 'OneTrust', company: 'OneTrust', category: 'consent', domains: ['cookielaw.org', 'onetrust.com'] },
  { name: 'Cookiebot', company: 'Usercentrics', category: 'consent', domains: ['cookiebot.com', 'cookiebot.eu'] },
  { name: 'Usercentrics', company: 'Usercentrics', category: 'consent', domains: ['usercentrics.eu'] },
  { name: 'Termly', company: 'Termly', category: 'consent', domains: ['termly.io'] },
  { name: 'iubenda', company: 'iubenda', category: 'consent', domains: ['iubenda.com'] },
  { name: 'IAB consent framework', company: 'IAB Europe', category: 'consent', domains: ['consensu.org'] },

  // Bot protection
  { name: 'reCAPTCHA', company: 'Google', category: 'security', domains: ['recaptcha.net', 'www.google.com/recaptcha'] },
  { name: 'hCaptcha', company: 'Intuition Machines', category: 'security', domains: ['hcaptcha.com'] },
  { name: 'Cloudflare Turnstile', company: 'Cloudflare', category: 'security', domains: ['challenges.cloudflare.com'] },
  { name: 'Arkose Labs', company: 'Arkose Labs', category: 'security', domains: ['arkoselabs.com'] },

  // Monitoring
  { name: 'Sentry', company: 'Sentry', category: 'monitoring', domains: ['sentry.io', 'sentry-cdn.com'] },
  { name: 'New Relic', company: 'New Relic', category: 'monitoring', domains: ['newrelic.com', 'nr-data.net'] },
  { name: 'Datadog RUM', company: 'Datadog', category: 'monitoring', domains: ['datadoghq-browser-agent.com', 'datadoghq.com', 'datadoghq.eu'] },
  { name: 'Bugsnag', company: 'SmartBear', category: 'monitoring', domains: ['bugsnag.com'] },

  // Payments
  { name: 'Stripe', company: 'Stripe', category: 'payments', domains: ['stripe.com', 'stripe.network'] },
  { name: 'PayPal', company: 'PayPal', category: 'payments', domains: ['paypal.com', 'paypalobjects.com'] },

  // Public CDNs
  { name: 'cdnjs', company: 'Cloudflare', category: 'cdn', domains: ['cdnjs.cloudflare.com'] },
  { name: 'jsDelivr', company: 'jsDelivr', category: 'cdn', domains: ['jsdelivr.net'] },
  { name: 'unpkg', company: 'unpkg', category: 'cdn', domains: ['unpkg.com'] },
  { name: 'Google Hosted Libraries', company: 'Google', category: 'cdn', domains: ['ajax.googleapis.com'] },
  { name: 'jQuery CDN', company: 'OpenJS Foundation', category: 'cdn', domains: ['code.jquery.com'] },
  { name: 'BootstrapCDN', company: 'jsDelivr', category: 'cdn', domains: ['bootstrapcdn.com'] },
  { name: 'Google static content', company: 'Google', category: 'cdn', domains: ['gstatic.com'] },
  { name: 'Cloudinary', company: 'Cloudinary', category: 'cdn', domains: ['cloudinary.com'] },
  { name: 'imgix', company: 'imgix', category: 'cdn', domains: ['imgix.net'] },
  { name: 'WordPress.com CDN', company: 'Automattic', category: 'cdn', domains: ['wp.com'] },
  { name: 'Unsplash', company: 'Getty Images', category: 'cdn', domains: ['unsplash.com'] },
  { name: 'GitHub', company: 'Microsoft', category: 'cdn', domains: ['githubassets.com', 'githubusercontent.com', 'github.com'] },

  // Hosting & storage
  { name: 'Amazon CloudFront', company: 'Amazon', category: 'hosting', domains: ['cloudfront.net'] },
  { name: 'Amazon S3 / AWS', company: 'Amazon', category: 'hosting', domains: ['amazonaws.com'] },
  { name: 'Google Cloud Storage', company: 'Google', category: 'hosting', domains: ['googleusercontent.com', 'storage.googleapis.com', 'firebasestorage.googleapis.com'] },
  { name: 'Akamai', company: 'Akamai', category: 'hosting', domains: ['akamaihd.net', 'akamaized.net', 'akamai.net'] },
  { name: 'Fastly', company: 'Fastly', category: 'hosting', domains: ['fastly.net'] },
  { name: 'Azure CDN', company: 'Microsoft', category: 'hosting', domains: ['azureedge.net', 'azurefd.net', 'windows.net'] },
  { name: 'Bunny CDN', company: 'BunnyWay', category: 'hosting', domains: ['b-cdn.net'] },
  { name: 'Shopify', company: 'Shopify', category: 'hosting', domains: ['shopify.com', 'shopifycdn.com'] },
  { name: 'Squarespace', company: 'Squarespace', category: 'hosting', domains: ['squarespace.com', 'squarespace-cdn.com'] },
  { name: 'Wix', company: 'Wix', category: 'hosting', domains: ['wixstatic.com', 'parastorage.com'] },
  { name: 'Webflow', company: 'Webflow', category: 'hosting', domains: ['website-files.com', 'webflow.com'] },

  // Generic Google (after the specific Google services above)
  { name: 'Google', company: 'Google', category: 'unknown', domains: ['google.com', 'googleapis.com'] },
];

type Match = { service: Service; pattern: string };

// Longest pattern first so the most specific rule wins.
const RULES: Match[] = SERVICES.flatMap((service) =>
  service.domains.map((pattern) => ({ service, pattern })),
).sort((a, b) => b.pattern.length - a.pattern.length);

export function identify(url: URL): Service | null {
  const host = url.hostname.toLowerCase();
  const hostPath = host + url.pathname;
  for (const { service, pattern } of RULES) {
    if (pattern.includes('/')) {
      if (hostPath.startsWith(pattern) || hostPath.includes('.' + pattern)) return service;
    } else if (host === pattern || host.endsWith('.' + pattern)) {
      return service;
    }
  }
  return null;
}

export type { Service };
