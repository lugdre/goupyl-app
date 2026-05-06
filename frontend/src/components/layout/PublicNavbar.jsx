import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logo from '../../assets/logo-goupyl-sport.png';

/**
 * Props:
 *  - transparent: bool (default true) — starts transparent, frosts on scroll.
 *                 Pass false to always show the frosted background.
 *  - dark: bool (default false) — dark frosted variant for dark-background pages.
 */
export default function PublicNavbar({ transparent = true, dark = false }) {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Load design system fonts.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700;800&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const frosted = !transparent || scrolled;

  const navBg = dark
    ? 'rgba(8,8,9,0.88)'
    : frosted ? 'color-mix(in oklch, #f4f4f2 82%, transparent)' : 'transparent';

  const navBorder = dark
    ? '1px solid rgba(255,255,255,0.06)'
    : frosted ? '1px solid rgba(0,0,0,0.10)' : '1px solid transparent';

  const wordmarkColor = dark ? '#f4f4f2' : '#0a0a0a';
  const linkColor = dark ? 'rgba(255,255,255,0.55)' : '#2a2a2a';
  const linkHoverColor = dark ? '#fff' : '#0a0a0a';
  const ctaBg = dark ? '#fff' : '#0a0a0a';
  const ctaColor = dark ? '#0a0a0a' : '#f4f4f2';

  return (
    <>
      <style>{`
        .pnav-wordmark{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:18px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;color:${wordmarkColor};transition:opacity .15s}
        .pnav-wordmark:hover{opacity:.78}
        .pnav-link{text-decoration:none;font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;font-size:13px;font-weight:500;letter-spacing:.01em;transition:color .15s;color:${linkColor}}
        .pnav-link:hover{color:${linkHoverColor}}
        .pnav-cta{display:inline-flex;align-items:center;justify-content:center;background:${ctaBg};color:${ctaColor};text-decoration:none;font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;font-weight:600;font-size:13px;letter-spacing:.02em;height:36px;padding:0 18px;border-radius:999px;border:1px solid transparent;transition:transform .15s ease,opacity .2s ease}
        .pnav-cta:hover{transform:translateY(-1px);opacity:.92}
        .pnav-ghost{display:inline-flex;align-items:center;justify-content:center;font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif;font-weight:500;font-size:13px;letter-spacing:.01em;height:36px;padding:0 14px;text-decoration:none;color:${linkColor};transition:color .15s}
        .pnav-ghost:hover{color:${linkHoverColor}}
        @media(max-width:768px){.pnav-links{display:none!important}}
      `}</style>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: navBg,
        backdropFilter: (frosted || dark) ? 'saturate(150%) blur(14px)' : 'none',
        WebkitBackdropFilter: (frosted || dark) ? 'saturate(150%) blur(14px)' : 'none',
        borderBottom: navBorder,
        transition: dark ? 'none' : 'background .25s ease, border-color .25s ease',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/">
            <img src={logo} alt="Goupyl" style={{ height: 100, width: 'auto' }} /></Link>
          <div className="pnav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link to="/search" className="pnav-link">Coachs</Link>
            <a href="/#particuliers" className="pnav-link">Particuliers</a>
            <a href="/#entreprises" className="pnav-link">Entreprises</a>
            <Link to="/register?role=INTERVENANT" className="pnav-link">Devenir coach</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {user ? (
              <Link to="/dashboard" className="pnav-cta">Mon espace</Link>
            ) : (
              <>
                <Link to="/login" className="pnav-ghost">Connexion</Link>
                <Link to="/register" className="pnav-cta">S'inscrire</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
