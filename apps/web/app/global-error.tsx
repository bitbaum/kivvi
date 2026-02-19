'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Ein unerwarteter Fehler ist aufgetreten
          </h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Der Fehler wurde automatisch gemeldet. Bitte versuchen Sie es erneut.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #ddd',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      </body>
    </html>
  );
}
