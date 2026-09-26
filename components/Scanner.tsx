'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Report } from '@/lib/scan';
import type { ClientErrorCode } from './icons';
import { ErrorView, IdleView, LoadingView, ResultView, ScanForm, Shell } from './views';

type State =
  | { status: 'idle' }
  | { status: 'loading'; url: string }
  | { status: 'error'; url: string; code: ClientErrorCode; message: string }
  | { status: 'done'; report: Report };

export function Scanner() {
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [state, setState] = useState<State>({ status: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (raw: string, push = true) => {
    const url = raw.trim();
    if (!url) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    setInvalid(false);
    setInput(url);
    setState({ status: 'loading', url });
    if (push) {
      const next = new URL(window.location.href);
      next.searchParams.set('url', url);
      window.history.pushState(null, '', next);
    }
    try {
      const res = await fetch(`/api/scan?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (res.ok) setState({ status: 'done', report: data });
      else setState({ status: 'error', url, code: data.code ?? 'failed', message: data.error ?? '' });
    } catch {
      setState({
        status: 'error',
        url,
        code: navigator.onLine ? 'failed' : 'offline',
        message: '',
      });
    }
  }, []);

  // Shareable links: /?url=example.com runs the scan on load; back/forward re-runs.
  useEffect(() => {
    const fromLocation = () => {
      const url = new URLSearchParams(window.location.search).get('url');
      if (url) run(url, false);
      else {
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
      <header className={`hero wrap${idle ? '' : ' compact'}`}>
        {idle ? (
          <>
            <h1>What does your website spill?</h1>
            <p className="hero-sub">
              Every font, analytics script and ad pixel receives your visitors’ IP addresses.
              Spillcheck lists each third party a page talks to and grades it.
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
          busy={state.status === 'loading'}
          invalid={invalid}
        />
      </header>

      <main className="wrap main" key={state.status}>
        {state.status === 'idle' && <IdleView onExample={(ex) => run(ex)} />}
        {state.status === 'loading' && <LoadingView url={state.url} />}
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
          <ResultView report={state.report} shareUrl={typeof window !== 'undefined' ? window.location.href : undefined} />
        )}
      </main>
    </Shell>
  );
}
