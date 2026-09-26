'use client';

// Every UI state on one page, rendered from real scan results saved as fixtures.
// Useful for design review; not linked from the app.
import { ErrorView, IdleView, ResultView, ScanForm, ScanningView, Shell } from '@/components/views';
import { ERRORS, type ClientErrorCode } from '@/components/icons';
import type { Report } from '@/lib/scan';
import clean from '@/lib/fixtures/clean.json';
import consent from '@/lib/fixtures/consent.json';
import heavy from '@/lib/fixtures/heavy.json';
import moderate from '@/lib/fixtures/moderate.json';

const noop = () => {};

function Frame({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="frame" id={id} aria-labelledby={`${id}-t`}>
      <header className="frame-head">
        <h2 id={`${id}-t`}>{title}</h2>
        {note && <p>{note}</p>}
      </header>
      <div className="frame-body">{children}</div>
    </section>
  );
}

export default function States() {
  return (
    <Shell>
      <main className="wrap states">
        <h1>States</h1>
        <nav className="states-nav" aria-label="States">
          {['empty', 'invalid', 'scanning', 'clean', 'tag-manager', 'consent', 'heavy', 'errors'].map((s) => (
            <a key={s} href={`#${s}`}>
              {s}
            </a>
          ))}
        </nav>

        <Frame id="empty" title="Empty" note="First visit, nothing scanned yet.">
          <div className="hero">
            <h1>What does your website spill?</h1>
            <p className="hero-sub">
              Every font, analytics script and ad pixel receives your visitors’ IP addresses.
              Spillcheck lists each third party a page talks to and grades it.
            </p>
            <ScanForm value="" onChange={noop} onSubmit={noop} />
          </div>
          <IdleView onExample={noop} />
        </Frame>

        <Frame id="invalid" title="Invalid input" note="Submitted with an empty field.">
          <ScanForm value="" onChange={noop} onSubmit={noop} invalid />
        </Frame>

        <Frame id="scanning" title="Scanning" note="Streams live stages and a running request count, here at the consent step.">
          <ScanForm value="cnn.com" onChange={noop} onSubmit={noop} busy />
          <div className="main">
            <ScanningView url="cnn.com" stage="consent" requests={148} thirdPartyHosts={34} />
          </div>
        </Frame>

        <Frame id="clean" title="Result: clean" note="No third parties (A+).">
          <ResultView report={clean as unknown as Report} autoFocus={false} />
        </Frame>

        <Frame id="tag-manager" title="Result: loaded by a tag manager" note="html5up.net: the static scan saw 2 parties; the browser sees 5, including a Meta Pixel.">
          <ResultView report={moderate as unknown as Report} autoFocus={false} />
        </Frame>

        <Frame id="consent" title="Result: before and after consent" note="theguardian.com from Dublin: 1 third party before consent, 100 after accepting.">
          <ResultView report={consent as unknown as Report} autoFocus={false} />
        </Frame>

        <Frame id="heavy" title="Result: heavy" note="cnn.com from Dublin: 16 parties before consent, 103 after.">
          <ResultView report={heavy as unknown as Report} autoFocus={false} />
        </Frame>

        <Frame id="errors" title="Errors" note="One per error code.">
          <div className="error-grid">
            {(Object.keys(ERRORS) as ClientErrorCode[]).map((code) => (
              <div key={code} className="error-cell">
                <p className="cell-label">{code}</p>
                <ErrorView code={code} message="" onRetry={noop} onEdit={noop} autoFocus={false} />
              </div>
            ))}
          </div>
        </Frame>
      </main>
    </Shell>
  );
}
