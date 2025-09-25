'use client';

import { useEffect } from 'react';
import { bootApp } from '../src/bootstrap/boot';

export default function Page() {
  useEffect(() => {
    bootApp();
  }, []);

  return (
    <div className="wrap">
      <div id="app" className="wrap" />
      <div id="help" style={{ display: 'none' }} />
      <div id="live" className="sr-only" aria-live="polite" />
    </div>
  );
}
