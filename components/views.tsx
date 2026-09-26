'use client';

import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleDashed,
  Cookie,
  Copy,
  Globe,
  Info,
  Link as LinkIcon,
  LoaderCircle,
  MonitorSmartphone,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Type,
} from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import type { Stage } from '@/lib/browser-scan';
import { CATEGORIES, type Category } from '@/lib/categories';
import type { Kind } from '@/lib/extract';
import { badge } from '@/lib/badge';
import type { Party, Report } from '@/lib/scan';
import { CATEGORY_ICONS, type ClientErrorCode, ERRORS, STROKE } from './icons';
import { ThemeToggle } from './ThemeToggle';

export const EXAMPLES = ['bbc.co.uk', 'cnn.com', 'wikipedia.org', 'getbootstrap.com'];
const PUBLIC_ORIGIN = 'https://spillcheck.patrickob.tech';

const KIND_LABELS: Record<Kind, string> = {
  script: 'script',
  stylesheet: 'stylesheet',
  font: 'font',
  image: 'image',
  frame: 'iframe',
  media: 'media',
  fetch: 'data request',
  beacon: 'beacon',
  websocket: 'websocket',
  connection: 'preconnect',
  form: 'form target',
  'script-reference': 'inline script',
  other: 'other',
};

const GRADE_WORDS: Record<Report['grade'], string> = {
  'A+': 'clean',
  A: 'minimal tracking',
  B: 'light tracking',
  C: 'moderate tracking',
  D: 'heavy tracking',
  F: 'extensive tracking',
};

const REGIONS: Record<string, string> = {
  iad1: 'Washington, D.C.',
  cle1: 'Cleveland',
  pdx1: 'Portland',
  sfo1: 'San Francisco',
  dub1: 'Dublin',
  lhr1: 'London',
  cdg1: 'Paris',
  fra1: 'Frankfurt',
  arn1: 'Stockholm',
  hnd1: 'Tokyo',
  icn1: 'Seoul',
  sin1: 'Singapore',
  syd1: 'Sydney',
  bom1: 'Mumbai',
  gru1: 'São Paulo',
  cpt1: 'Cape Town',
  local: 'a local machine',
};

const STAGES: { id: Stage; label: string }[] = [
  { id: 'launch', label: 'Starting a browser' },
  { id: 'load', label: 'Loading the page' },
  { id: 'watch', label: 'Watching network requests' },
  { id: 'consent', label: 'Accepting the cookie banner' },
  { id: 'grade', label: 'Grading' },
];

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/* Shell ---------------------------------------------------------------------- */

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <a className="brand" href="/">
            <ScanSearch size={22} strokeWidth={STROKE} aria-hidden />
            Spillcheck
          </a>
          <div className="nav-actions">
            <ThemeToggle />
            <a className="quiet-link" href="https://github.com/obrienafc/spillcheck" target="_blank" rel="noreferrer">
              GitHub
              <ArrowUpRight size={14} strokeWidth={STROKE} aria-hidden />
            </a>
          </div>
        </div>
      </nav>
      {children}
      <footer className="footer">
        Spillcheck loads each page in a real browser and records every request it makes. Results are
        cached for six hours. Sister project:{' '}
        <a href="https://glyphyard.patrickob.tech" target="_blank" rel="noreferrer">
          Glyphyard
        </a>
        .
      </footer>
    </>
  );
}

/* Form ----------------------------------------------------------------------- */

export type ScanFrom = 'us' | 'eu';

type FormProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  invalid?: boolean;
  from?: ScanFrom;
  onFromChange?: (from: ScanFrom) => void;
};

export const ScanForm = forwardRef<HTMLInputElement, FormProps>(function ScanForm(
  { value, onChange, onSubmit, busy, invalid, from = 'us', onFromChange },
  ref,
) {
  return (
    <form
      className="scan-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="field" data-invalid={invalid || undefined}>
        <label className="visually-hidden" htmlFor="url">
          Website address
        </label>
        <input
          ref={ref}
          id="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="example.com"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'url-error' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? 'Scanning' : 'Scan'}
        </button>
      </div>
      {onFromChange && (
        <div className="scan-from">
          <span id="scan-from-label">Scan from</span>
          <div className="segmented small" role="radiogroup" aria-labelledby="scan-from-label">
            {(
              [
                ['us', 'United States'],
                ['eu', 'EU (Dublin)'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={from === id} onClick={() => onFromChange(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {invalid && (
        <p className="field-error" id="url-error" role="alert">
          <CircleAlert size={16} strokeWidth={STROKE} aria-hidden />
          Enter a website address, like example.com.
        </p>
      )}
    </form>
  );
});

/* Idle ----------------------------------------------------------------------- */

export function IdleView({ onExample }: { onExample: (url: string) => void }) {
  return (
    <div className="idle">
      <p className="examples">
        Try{' '}
        {EXAMPLES.map((ex, i) => (
          <span key={ex}>
            <button type="button" className="text-button" onClick={() => onExample(ex)}>
              {ex}
            </button>
            {i < EXAMPLES.length - 1 && <span aria-hidden> · </span>}
          </span>
        ))}
      </p>
      <ul className="how">
        <li>
          <MonitorSmartphone size={22} strokeWidth={STROKE} aria-hidden />
          <h3>Loads it for real</h3>
          <p>Opens the page in a headless browser, scrolls it, and records every request it makes.</p>
        </li>
        <li>
          <Info size={22} strokeWidth={STROKE} aria-hidden />
          <h3>Names every party</h3>
          <p>Matches each outside domain against 170+ known trackers, fonts, CDNs and embeds.</p>
        </li>
        <li>
          <ShieldCheck size={22} strokeWidth={STROKE} aria-hidden />
          <h3>Grades the page</h3>
          <p>Ad pixels, session replay and third-party cookies cost the most. Privacy-friendly tools cost the least.</p>
        </li>
      </ul>
    </div>
  );
}

/* Scanning ------------------------------------------------------------------- */

export function ScanningView({
  url,
  stage,
  requests,
  thirdPartyHosts,
}: {
  url: string;
  stage: Stage;
  requests: number;
  thirdPartyHosts: number;
}) {
  const current = STAGES.findIndex((s) => s.id === stage);
  return (
    <div className="single" aria-busy="true">
      <section className="summary">
        <p className="summary-host">{url}</p>
        <p className="hero-number neutral" aria-hidden>
          {requests}
        </p>
        <p className="hero-label">requests observed</p>
        <p className="summary-meta">
          {thirdPartyHosts > 0 ? `${plural(thirdPartyHosts, 'outside host')} so far` : 'Waiting for the page'}
        </p>
        <ol className="stages">
          {STAGES.map((s, i) => {
            const state = i < current ? 'done' : i === current ? 'active' : 'todo';
            return (
              <li key={s.id} data-state={state}>
                {state === 'done' ? (
                  <Check size={16} strokeWidth={STROKE} aria-hidden />
                ) : state === 'active' ? (
                  <LoaderCircle className="spin" size={16} strokeWidth={STROKE} aria-hidden />
                ) : (
                  <Circle size={16} strokeWidth={STROKE} aria-hidden />
                )}
                <span>{s.label}</span>
                {state === 'done' && <span className="visually-hidden">, done</span>}
              </li>
            );
          })}
        </ol>
      </section>
      <p className="visually-hidden" role="status">
        {STAGES[current]?.label ?? 'Scanning'}. {requests} requests observed.
      </p>
      <p className="scan-hint">Real-browser scans take 5 to 20 seconds.</p>
    </div>
  );
}

/* Error ---------------------------------------------------------------------- */

export function ErrorView({
  code,
  message,
  onRetry,
  onEdit,
  autoFocus = true,
}: {
  code: ClientErrorCode;
  message: string;
  onRetry: () => void;
  onEdit: () => void;
  autoFocus?: boolean;
}) {
  const info = ERRORS[code] ?? ERRORS.failed;
  const Icon = info.icon;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, [autoFocus]);

  return (
    <div className="single error-state" role="alert">
      <Icon className="state-icon" size={32} strokeWidth={STROKE} aria-hidden />
      <h2 ref={heading} tabIndex={-1}>
        {info.title}
      </h2>
      <p className="quiet">{info.hint}</p>
      {/* The raw message only adds something when it carries an HTTP status. */}
      {message && /HTTP \d{3}/.test(message) && <p className="detail">{message}</p>}
      <div className="actions">
        {info.retry ? (
          <button className="button primary" onClick={onRetry}>
            <RotateCcw size={16} strokeWidth={STROKE} aria-hidden />
            Try again
          </button>
        ) : (
          <button className="button primary" onClick={onEdit}>
            Edit address
          </button>
        )}
      </div>
    </div>
  );
}

/* Result --------------------------------------------------------------------- */

export function ResultView({
  report: full,
  shareUrl,
  autoFocus = true,
}: {
  report: Report;
  shareUrl?: string;
  autoFocus?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the result so screen readers announce it.
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, [full, autoFocus]);

  // Before consent is the headline (what every visitor gets); after accepting
  // shows everything the site loads once it's allowed to.
  const [phase, setPhase] = useState<'before' | 'after'>('before');
  useEffect(() => setPhase('before'), [full]);
  const consent = full.consent;
  const report: Report =
    phase === 'after' && consent.status === 'accepted' ? { ...full, ...consent.after } : full;

  const host = new URL(report.finalUrl).hostname;
  const total = report.parties.length;
  const groups = new Map<Category, Party[]>();
  for (const p of report.parties) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);
  const hasReferenced = report.parties.some((p) => p.referencedOnly);
  const region = REGIONS[report.region] ?? report.region;

  return (
    <div className="result-layout">
      <aside className="summary-column">
        <section className="summary" aria-labelledby="result-heading">
          <a className="summary-host" href={report.finalUrl} target="_blank" rel="noreferrer">
            {host}
            <ArrowUpRight size={14} strokeWidth={STROKE} aria-hidden />
          </a>
          <h2 id="result-heading" ref={heading} tabIndex={-1}>
            <span className="hero-number">{total}</span>{' '}
            <span className="hero-label">{total === 1 ? 'third party' : 'third parties'}</span>
          </h2>
          {consent.status === 'accepted' && (
            <ConsentSwitch
              phase={phase}
              onChange={setPhase}
              before={full.parties.length}
              after={consent.after.parties.length}
              tool={consent.tool}
            />
          )}
          <div className="summary-grade">
            <GradeBadge grade={report.grade} size="large" />
            <p className="summary-meta">
              {GRADE_WORDS[report.grade]} · {report.score}/100
            </p>
          </div>
          <dl className="facts">
            <div>
              <dt>Third-party requests</dt>
              <dd>{report.requests.thirdParty.toLocaleString()}</dd>
            </div>
            {report.mode === 'browser' && (
              <div>
                <dt>Data from third parties</dt>
                <dd>{formatBytes(report.thirdPartyBytes)}</dd>
              </div>
            )}
            <div>
              <dt>Third-party cookies</dt>
              <dd>{report.cookies.thirdParty.length}</dd>
            </div>
            <div>
              <dt>First-party cookies</dt>
              <dd>{report.cookies.firstParty.length}</dd>
            </div>
          </dl>
          {consent.status === 'not-found' && (
            <p className="consent-note">
              <Cookie size={14} strokeWidth={STROKE} aria-hidden />
              No cookie banner was found to accept, or Spillcheck didn’t recognise it.
            </p>
          )}
          <p className="scan-source">
            {report.mode === 'browser' ? 'Real-browser scan' : 'Static scan'} from {region},{' '}
            {/* Formatted in the reader’s locale, which can differ from the server’s. */}
            <time dateTime={report.scannedAt} suppressHydrationWarning>
              {new Date(report.scannedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </time>
          </p>
          {shareUrl && <CopyButton label="Copy link" icon="link" text={shareUrl} />}
        </section>

        {/* Badges always show the before-consent grade, whichever view is open. */}
        <BadgeSection report={full} />

        {total > 0 && (
          <nav className="index" aria-label="Categories">
            <ul>
              {[...groups.entries()].map(([category, parties]) => {
                const Icon = CATEGORY_ICONS[category];
                return (
                  <li key={category}>
                    <a href={`#g-${category}`}>
                      <Icon size={18} strokeWidth={STROKE} aria-hidden />
                      <span>{CATEGORIES[category].label}</span>
                      <span className="index-count">{parties.length}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </aside>

      <div className="detail-column">
        {total === 0 && (
          <p className="notice">
            <ShieldCheck size={18} strokeWidth={STROKE} aria-hidden />
            <span>This page only talks to its own domain. Nothing it loads is shared with anyone else.</span>
          </p>
        )}

        {report.googleFonts && (
          <p className="notice">
            <Type size={18} strokeWidth={STROKE} aria-hidden />
            <span>
              {report.googleFonts.families.length
                ? `${report.googleFonts.families.join(', ')} ${report.googleFonts.families.length === 1 ? 'is' : 'are'} loaded from Google Fonts, which sees every visitor’s IP address. `
                : 'This page loads Google Fonts, which sees every visitor’s IP address. '}
              <a href="https://glyphyard.patrickob.tech" target="_blank" rel="noreferrer">
                Self-host them with Glyphyard
              </a>
              .
            </span>
          </p>
        )}

        {report.notes.map((n) => (
          <p key={n} className="notice">
            <Info size={18} strokeWidth={STROKE} aria-hidden />
            <span>{n}</span>
          </p>
        ))}

        {[...groups.entries()].map(([category, parties]) => {
          const Icon = CATEGORY_ICONS[category];
          return (
            <section key={category} className="group" id={`g-${category}`} aria-labelledby={`g-${category}-h`}>
              <header className="group-head">
                <Icon size={20} strokeWidth={STROKE} aria-hidden />
                <h3 id={`g-${category}-h`}>{CATEGORIES[category].label}</h3>
                <span className="group-count">{parties.length}</span>
              </header>
              <p className="group-why">{CATEGORIES[category].why}</p>
              <ul className="list">
                {parties.map((p) => (
                  <PartyRow key={p.id} party={p} showBytes={report.mode === 'browser'} />
                ))}
              </ul>
            </section>
          );
        })}

        {hasReferenced && (
          <p className="legend">
            <strong>Referenced</strong> means the domain appears in the page’s code but wasn’t seen
            loading. It counts half.
          </p>
        )}
      </div>
    </div>
  );
}

function PartyRow({ party, showBytes }: { party: Party; showBytes: boolean }) {
  const facts = [
    plural(party.requests, 'request'),
    showBytes && party.bytes > 0 ? formatBytes(party.bytes) : null,
    party.kinds.map((k) => KIND_LABELS[k]).join(', '),
  ].filter(Boolean);

  return (
    <li>
      <details className="row">
        <summary>
          <ChevronRight className="chevron" size={16} strokeWidth={STROKE} aria-hidden />
          <span className="row-main">
            <span className="row-title">
              {party.name}
              {party.company && party.company !== party.name && (
                <span className="row-company"> · {party.company}</span>
              )}
            </span>
            <span className="row-sub">{facts.join(' · ')}</span>
          </span>
          {party.cookies.length > 0 && (
            <span className="row-flag">
              <Cookie size={14} strokeWidth={STROKE} aria-hidden />
              {plural(party.cookies.length, 'cookie')}
            </span>
          )}
          {party.referencedOnly && (
            <span className="row-flag">
              <CircleDashed size={14} strokeWidth={STROKE} aria-hidden />
              Referenced
            </span>
          )}
        </summary>
        <div className="row-detail">
          <p className="row-hosts">
            <Globe size={14} strokeWidth={STROKE} aria-hidden />
            {party.hosts.join(', ')}
          </p>
          {party.cookies.length > 0 && (
            <p className="row-hosts">
              <Cookie size={14} strokeWidth={STROKE} aria-hidden />
              {party.cookies.join(', ')}
            </p>
          )}
          <ul>
            {party.samples.map((s) => (
              <li key={s}>
                <code>{s}</code>
              </li>
            ))}
            {party.requests > party.samples.length && (
              <li className="quiet">and {plural(party.requests - party.samples.length, 'more request')}</li>
            )}
          </ul>
        </div>
      </details>
    </li>
  );
}

function BadgeSection({ report }: { report: Report }) {
  const [origin, setOrigin] = useState(PUBLIC_ORIGIN);
  useEffect(() => setOrigin(window.location.origin), []);

  const final = new URL(report.finalUrl);
  const target = final.host + (final.pathname === '/' ? '' : final.pathname);
  const q = encodeURIComponent(target);
  const img = `${origin}/badge?url=${q}`;
  const page = `${origin}/?url=${q}`;

  return (
    <section className="badge-section" aria-labelledby="badge-heading">
      <h3 id="badge-heading">
        <BadgeCheck size={18} strokeWidth={STROKE} aria-hidden />
        Add a badge
      </h3>
      <p className="badge-intro">
        Show this grade in a README or site footer. It links back to this report.
        {report.consent.status === 'accepted' && ' Badges use the grade before consent.'}
      </p>
      <GradeBadge grade={report.grade} size="medium" />
      <div className="badge-actions">
        <CopyButton label="Markdown" text={`[![Spillcheck privacy grade](${img})](${page})`} />
        <CopyButton label="HTML" text={`<a href="${page}"><img src="${img}" alt="Spillcheck privacy grade"></a>`} />
      </div>
    </section>
  );
}

function ConsentSwitch({
  phase,
  onChange,
  before,
  after,
  tool,
}: {
  phase: 'before' | 'after';
  onChange: (p: 'before' | 'after') => void;
  before: number;
  after: number;
  tool: string;
}) {
  const added = after - before;
  return (
    <div className="consent">
      <div className="segmented small" role="radiogroup" aria-label="Cookie consent">
        <button role="radio" aria-checked={phase === 'before'} onClick={() => onChange('before')}>
          Before consent
        </button>
        <button role="radio" aria-checked={phase === 'after'} onClick={() => onChange('after')}>
          After accepting
        </button>
      </div>
      <p className="consent-note">
        <Cookie size={14} strokeWidth={STROKE} aria-hidden />
        {added > 0
          ? `Accepting ${tool === 'a cookie banner' ? 'the cookie banner' : tool} adds ${plural(added, 'third party', 'third parties')}.`
          : `Accepting ${tool === 'a cookie banner' ? 'the cookie banner' : tool} adds no third parties.`}
      </p>
    </div>
  );
}

/** The same SVG the /badge endpoint serves, rendered inline and scaled up. */
function GradeBadge({ grade, size }: { grade: Report['grade']; size: 'large' | 'medium' }) {
  return (
    <span
      className={`grade-badge ${size}`}
      role="img"
      aria-label={`Privacy grade ${grade}`}
      dangerouslySetInnerHTML={{ __html: badge('privacy', grade, { grade }).replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"') }}
    />
  );
}

function CopyButton({ label, text, icon = 'copy' }: { label: string; text: string; icon?: 'copy' | 'link' }) {
  const [copied, setCopied] = useState(false);
  const Icon = copied ? Check : icon === 'link' ? LinkIcon : Copy;
  return (
    <button
      className="button plain"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
    >
      <Icon size={16} strokeWidth={STROKE} aria-hidden />
      {copied ? 'Copied' : label}
      <span className="visually-hidden" aria-live="polite">
        {copied ? `${label} copied to clipboard` : ''}
      </span>
    </button>
  );
}
