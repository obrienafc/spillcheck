'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stage } from '@/lib/browser-scan';
import type { Report } from '@/lib/scan';
import type { ClientErrorCode } from './icons';
import { ErrorView, IdleView, ResultView, ScanForm, type ScanFrom, ScanningView, Shell } from './views';

type State =
  | { status: 'idle' }
  | { status: 'scanning'; url: string; stage: Stage; requests: number; thirdPartyHosts: number }
  | { status: 'error'; url: string; code: ClientErrorCode; message: string }
  | { status: 'done'; report: Report };

type Line =
  | { type: 'progress'; stage: Stage; requests?: number; thirdPartyHosts?: number }
  | { type: 'report'; report: Report }
  | { type: 'error'; code: ClientErrorCode; error: string };

export function Scanner() {
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [from, setFrom] = useState<ScanFrom>('us');
  const [state, setState] = useState<State>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (raw: string, push = true, region: ScanFrom = 'us') => {
    const url = raw.trim();
    if (!url) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    setInput(url);
    if (push) {
      const next = new URL(window.location.href);
      next.searchParams.set('url', url);
      if (region === 'eu') next.searchParams.set('from', 'eu');
      else next.searchParams.delete('from');
      window.history.pushState(null, '', next);
    }

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ status: 'scanning', url, stage: 'launch', requests: 0, thirdPartyHosts: 0 });

    const handle = (line: Line) => {
      if (line.type === 'progress') {
        setState((s) =>
          s.status === 'scanning'
            ? {
                ...s,
                stage: line.stage,
                requests: line.requests ?? s.requests,
                thirdPartyHosts: line.thirdPartyHosts ?? s.thirdPartyHosts,
              }
            : s,
        );
      } else if (line.type === 'report') {
        setState({ status: 'done', report: line.report });
      } else {
        setState({ status: 'error', url, code: line.code ?? 'failed', message: line.error ?? '' });
      }
    };

    try {
      const endpoint = region === 'eu' ? '/api/scan-eu' : '/api/scan';
      const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`, {
        headers: { Accept: 'application/x-ndjson' },
        signal: controller.signal,
      });
      // The Firewall (if enabled) answers over-limit requests with a plain 429.
      if (res.status === 429 && !res.headers.get('content-type')?.includes('ndjson')) {
        setState({ status: 'error', url, code: 'rate-limited', message: '' });
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = JSON.parse(buffer.slice(0, nl)) as Line;
          buffer = buffer.slice(nl + 1);
          if (line.type !== 'progress') finished = true;
          handle(line);
        }
      }
      if (!finished) throw new Error('stream ended early');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState({ status: 'error', url, code: navigator.onLine ? 'failed' : 'offline', message: '' });
    }
  }, []);

  // Shareable links: /?url=example.com runs the scan on load; back/forward re-runs.
  useEffect(() => {
    const fromLocation = () => {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url');
      const region: ScanFrom = params.get('from') === 'eu' ? 'eu' : 'us';
      setFrom(region);
      if (url) run(url, false, region);
      else {
        abort.current?.abort();
        setInput('');
        setState({ status: 'idle' });
      }
    };
    fromLocation();
    window.addEventListener('popstate', fromLocation);
    return () => window.removeEventListener('popstate', fromLocation);
  }, [run]);

  const idle = state.status === 'idle';

  return (
    <Shell>
      <header className={`hero${idle ? '' : ' compact'}`}>
        {idle ? (
          <>
            <h1>What does your website spill?</h1>
            <p className="hero-sub">
              Every font, analytics script and ad pixel receives your visitors’ IP addresses.
              Spillcheck loads a page in a real browser and names every third party it talks to.
            </p>
          </>
        ) : (
          <h1 className="visually-hidden">Spillcheck</h1>
        )}
        <ScanForm
          ref={inputRef}
          value={input}
          onChange={(v) => {
            setInput(v);
            if (invalid) setInvalid(false);
          }}
          onSubmit={() => run(input, true, from)}
          from={from}
          onFromChange={setFrom}
          busy={state.status === 'scanning'}
          invalid={invalid}
        />
      </header>

      <main className="main" key={state.status}>
        {state.status === 'idle' && <IdleView onExample={(ex) => run(ex, true, from)} />}
        {state.status === 'scanning' && (
          <ScanningView
            url={state.url}
            stage={state.stage}
            requests={state.requests}
            thirdPartyHosts={state.thirdPartyHosts}
          />
        )}
        {state.status === 'error' && (
          <ErrorView
            code={state.code}
            message={state.message}
            onRetry={() => run(state.url, false, from)}
            onEdit={() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }}
          />
        )}
        {state.status === 'done' && (
          <ResultView
            report={state.report}
            shareUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          />
        )}
      </main>
    </Shell>
  );
}
