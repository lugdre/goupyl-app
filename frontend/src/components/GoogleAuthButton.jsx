import { useEffect, useRef, useState } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Charge le script Google Identity Services une seule fois (promesse partagée)
let gisPromise = null;
const loadGis = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gisPromise;
};

/**
 * Bouton officiel « Continuer avec Google ».
 * @param {(credential: string) => void|Promise<void>} onCredential - reçoit l'ID token Google
 * @param {string} [text] - 'signin_with' | 'signup_with' | 'continue_with'
 */
export default function GoogleAuthButton({ onCredential, text = 'continue_with' }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => callbackRef.current?.(response.credential),
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'center',
          width: Math.min(containerRef.current.offsetWidth || 360, 400),
        });
      })
      .catch(() => !cancelled && setFailed(true));

    return () => { cancelled = true; };
  }, [text]);

  // Pas de client ID configuré, ou script bloqué → on n'affiche rien plutôt qu'un bouton cassé
  if (!CLIENT_ID || failed) return null;

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />;
}
