'use client';

// Every UI state on one page, rendered from real scan results saved as fixtures.
// Useful for design review; not linked from the app.
import { ErrorView, IdleView, LoadingView, ResultView, ScanForm, Shell } from '@/components/views';
import { ERRORS, type ClientErrorCode } from '@/components/icons';
import type { Report } from '@/lib/scan';
import clean from '@/lib/fixtures/clean.json';
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
          {['empty', 'invalid', 'loading', 'clean', 'moderate', 'heavy', 'errors'].map((s) => (
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

        <Frame id="loading" title="Loading" note="Skeleton mirrors the result layout.">
          <ScanForm value="cnn.com" onChange={noop} onSubmit={noop} busy />
          <LoadingView url="cnn.com" />
        </Frame>

        <Frame id="clean" title="Result: clean" note="No third parties (A+).">
          <ResultView report={clean as Report} autoFocus={false} />
        </Frame>

        <Frame id="moderate" title="Result: moderate" note="Google Fonts and a tag manager.">
          <ResultView report={moderate as Report} autoFocus={false} />
        </Frame>

        <Frame id="heavy" title="Result: heavy" note="34 third parties, mostly referenced.">
          <ResultView report={heavy as Report} autoFocus={false} />
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
