'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stage } from '@/lib/browser-scan';
import type { Report } from '@/lib/scan';
import type { ClientErrorCode } from './icons';
import { ErrorView, IdleView, ResultView, ScanForm, ScanningView, Shell } from './views';

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
  const [state, setState] = useState<State>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (raw: string, push = true) => {
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
      const res = await fetch(`/api/scan?url=${encodeURIComponent(url)}`, {
        headers: { Accept: 'application/x-ndjson' },
        signal: controller.signal,
      });
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
      const url = new URLSearchParams(window.location.search).get('url');
      if (url) run(url, false);
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
          onSubmit={() => run(input)}
          busy={state.status === 'scanning'}
          invalid={invalid}
        />
      </header>

      <main className="main" key={state.status}>
        {state.status === 'idle' && <IdleView onExample={(ex) => run(ex)} />}
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
            onRetry={() => run(state.url, false)}
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
