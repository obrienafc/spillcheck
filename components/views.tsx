'use client';

import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  Info,
  Link as LinkIcon,
  LoaderCircle,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Type,
} from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { CATEGORIES, type Category } from '@/lib/categories';
import type { Kind } from '@/lib/extract';
import type { Party, Report } from '@/lib/scan';
import { CATEGORY_ICONS, type ClientErrorCode, ERRORS, STROKE } from './icons';

export const EXAMPLES = ['bbc.co.uk', 'cnn.com', 'wikipedia.org', 'getbootstrap.com'];

const KIND_LABELS: Record<Kind, string> = {
  script: 'script',
  stylesheet: 'stylesheet',
  font: 'font',
  image: 'image',
  frame: 'iframe',
  media: 'media',
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

/* Shell ---------------------------------------------------------------------- */

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="navbar">
        <div className="wrap navbar-inner">
          <a className="brand" href="/">
            <ScanSearch size={22} strokeWidth={STROKE} aria-hidden />
            Spillcheck
          </a>
          <a className="quiet-link" href="https://github.com/obrienafc/spillcheck" target="_blank" rel="noreferrer">
            GitHub
            <ArrowUpRight size={14} strokeWidth={STROKE} aria-hidden />
          </a>
        </div>
      </nav>
      {children}
      <footer className="footer wrap">
        Spillcheck reads a page’s HTML and stylesheets. It doesn’t run JavaScript, so scripts can
        load more than shown. Sister project:{' '}
        <a href="https://glyphyard.patrickob.tech" target="_blank" rel="noreferrer">
          Glyphyard
        </a>
        .
      </footer>
    </>
  );
}

/* Form ----------------------------------------------------------------------- */

type FormProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  invalid?: boolean;
};

export const ScanForm = forwardRef<HTMLInputElement, FormProps>(function ScanForm(
  { value, onChange, onSubmit, busy, invalid },
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
    <div className="state idle">
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
          <ScanSearch size={20} strokeWidth={STROKE} aria-hidden />
          <div>
            <h3>Reads the page</h3>
            <p>Fetches the HTML and its stylesheets from Spillcheck’s server, like a browser would.</p>
          </div>
        </li>
        <li>
          <Info size={20} strokeWidth={STROKE} aria-hidden />
          <div>
            <h3>Names every party</h3>
            <p>Matches each outside domain against 160+ known trackers, fonts, CDNs and embeds.</p>
          </div>
        </li>
        <li>
          <ShieldCheck size={20} strokeWidth={STROKE} aria-hidden />
          <div>
            <h3>Grades the page</h3>
            <p>Ad pixels and session replay cost the most. Privacy-friendly tools cost the least.</p>
          </div>
        </li>
      </ul>
    </div>
  );
}

/* Loading -------------------------------------------------------------------- */

export function LoadingView({ url }: { url: string }) {
  return (
    <div className="state" aria-busy="true">
      <p className="status" role="status">
        <LoaderCircle className="spin" size={16} strokeWidth={STROKE} aria-hidden />
        Scanning {url}…
      </p>
      <div className="result skeleton" aria-hidden>
        <span className="bone w-30" />
        <span className="bone hero-bone" />
        <span className="bone w-50" />
        <span className="bone w-70" />
      </div>
      <ul className="list skeleton" aria-hidden>
        {[60, 45, 70].map((w) => (
          <li key={w} className="skeleton-row">
            <span className="bone" style={{ width: `${w}%` }} />
            <span className="bone small w-30" />
          </li>
        ))}
      </ul>
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
    <div className="state error-state" role="alert">
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
  report,
  shareUrl,
  autoFocus = true,
}: {
  report: Report;
  shareUrl?: string;
  autoFocus?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the result so screen readers announce it.
  useEffect(() => {
    if (autoFocus) heading.current?.focus();
  }, [report, autoFocus]);

  const host = new URL(report.finalUrl).hostname;
  const total = report.parties.length;
  const loaded = report.parties.filter((p) => !p.referencedOnly).length;
  const groups = new Map<Category, Party[]>();
  for (const p of report.parties) groups.set(p.category, [...(groups.get(p.category) ?? []), p]);

  return (
    <div className="state">
      <section className="result" aria-labelledby="result-heading">
        <a className="result-host" href={report.finalUrl} target="_blank" rel="noreferrer">
          {host}
          <ArrowUpRight size={14} strokeWidth={STROKE} aria-hidden />
        </a>
        <h2 id="result-heading" ref={heading} tabIndex={-1}>
          <span className="hero-number">{total}</span>{" "}
          <span className="hero-label">
            {total === 1 ? 'third party contacted' : 'third parties contacted'}
          </span>
        </h2>
        <p className="result-meta">
          Grade {report.grade}, {GRADE_WORDS[report.grade]}
          <span aria-hidden> · </span>
          Score {report.score}/100
          {total > 0 && (
            <>
              <span aria-hidden> · </span>
              {loaded} loaded, {total - loaded} referenced
            </>
          )}
          <span aria-hidden> · </span>
          {report.cookies.length} {report.cookies.length === 1 ? 'cookie' : 'cookies'} set
        </p>
        {shareUrl && (
          <button
            className="button plain"
            onClick={() =>
              navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
            }
          >
            {copied ? (
              <Check size={16} strokeWidth={STROKE} aria-hidden />
            ) : (
              <LinkIcon size={16} strokeWidth={STROKE} aria-hidden />
            )}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        )}
      </section>

      {total === 0 && (
        <p className="notice">
          <ShieldCheck size={18} strokeWidth={STROKE} aria-hidden />
          <span>
            This page only talks to its own domain. Nothing Spillcheck can see is shared with
            anyone else.
          </span>
        </p>
      )}

      {report.googleFonts && (
        <p className="notice">
          <Type size={18} strokeWidth={STROKE} aria-hidden />
          <span>
            {report.googleFonts.families.length
              ? `${report.googleFonts.families.join(', ')} ${report.googleFonts.families.length === 1 ? 'is' : 'are'} loaded from Google Fonts, which sees every visitor’s IP address. `
              : 'This page connects to Google Fonts, which sees every visitor’s IP address. '}
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
          <section key={category} className="group" aria-labelledby={`g-${category}`}>
            <header className="group-head">
              <Icon size={20} strokeWidth={STROKE} aria-hidden />
              <h3 id={`g-${category}`}>{CATEGORIES[category].label}</h3>
              <span className="group-count">{parties.length}</span>
            </header>
            <p className="group-why">{CATEGORIES[category].why}</p>
            <ul className="list">
              {parties.map((p) => (
                <PartyRow key={p.id} party={p} />
              ))}
            </ul>
          </section>
        );
      })}

      {total > 0 && (
        <p className="legend">
          <strong>Loaded</strong> means the page’s HTML or CSS requests it directly.{' '}
          <strong>Referenced</strong> means the domain appears in an inline script, a preconnect
          hint or a form target. It’s likely contacted, but Spillcheck can’t confirm it without
          running the page, so it counts half.
        </p>
      )}
    </div>
  );
}

function PartyRow({ party }: { party: Party }) {
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
            <span className="row-sub">{party.kinds.map((k) => KIND_LABELS[k]).join(', ')}</span>
          </span>
          {party.referencedOnly && (
            <span className="row-flag">
              <CircleDashed size={14} strokeWidth={STROKE} aria-hidden />
              Referenced
            </span>
          )}
        </summary>
        <div className="row-detail">
          <p className="row-hosts">{party.hosts.join(', ')}</p>
          <ul>
            {party.samples.map((s) => (
              <li key={s}>
                <code>{s}</code>
              </li>
            ))}
            {party.requests > party.samples.length && (
              <li className="quiet">and {party.requests - party.samples.length} more</li>
            )}
          </ul>
        </div>
      </details>
    </li>
  );
}
