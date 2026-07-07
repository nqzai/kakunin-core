'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  saved: boolean;
}

const STORAGE_KEY = 'kakunin_consent';

function readConsent(): ConsentState {
  if (typeof window === 'undefined') return { analytics: false, marketing: false, saved: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ConsentState;
  } catch {
    // ignore malformed storage
  }
  return { analytics: false, marketing: false, saved: false };
}

function applyConsent(consent: ConsentState) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;

  window.gtag('consent', 'update', {
    analytics_storage: consent.analytics ? 'granted' : 'denied',
    ad_storage: consent.marketing ? 'granted' : 'denied',
    ad_user_data: consent.marketing ? 'granted' : 'denied',
    ad_personalization: consent.marketing ? 'granted' : 'denied',
  });
}

export function GoogleTagManagerConsentSync() {
  useEffect(() => {
    const syncConsent = () => applyConsent(readConsent());
    const handleConsentChanged = () => syncConsent();
    const handleStorage = () => syncConsent();

    syncConsent();

    window.addEventListener('kakunin-consent-changed', handleConsentChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('kakunin-consent-changed', handleConsentChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return null;
}
