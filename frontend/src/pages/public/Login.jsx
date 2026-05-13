import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { isPasskeySupported } from '../../services/passkey.api';
import logo from '../../assets/logo-goupyl-white.png';

const CSS = `
  :root{--bg:#f4f4f2;--ink:#0a0a0a;--ink-2:#2a2a2a;--ink-3:#555;--ink-4:#888;--line:rgba(0,0,0,.10);--accent:oklch(0.62 0.16 240);--accent-soft:oklch(0.62 0.16 240 / 0.12)}
  *{box-sizing:border-box}
  .auth-wrap{min-height:100vh;display:flex;background:var(--bg);font-family:"Inter Tight",ui-sans-serif,system-ui,sans-serif}
  .auth-panel{width:45%;flex-shrink:0;background:#0a0a0a;position:relative;display:flex;flex-direction:column;padding:48px 56px;border-right:1px solid rgba(255,255,255,.06)}
  @media(max-width:768px){.auth-panel{display:none!important}}
  .auth-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}
  .auth-wordmark{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:18px;letter-spacing:.06em;text-transform:uppercase;color:#f4f4f2;text-decoration:none;position:relative;z-index:1}
  .auth-panel-body{margin:auto 0;position:relative;z-index:1}
  .auth-eyebrow{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#444;margin-bottom:24px}
  .auth-display{font-family:"Archivo Narrow",sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.015em;line-height:.92;color:#f4f4f2;margin:0}
  .auth-panel-sub{margin-top:28px;color:#555;font-size:14.5px;line-height:1.65;max-width:280px}
  .auth-panel-stats{display:flex;gap:24px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;color:#333;border-top:1px solid rgba(255,255,255,.08);padding-top:24px;position:relative;z-index:1}
  .auth-right{flex:1;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:48px 32px;position:relative;overflow-y:auto}
  .auth-back{position:absolute;top:24px;left:28px;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);text-decoration:none;transition:color .15s}
  .auth-back:hover{color:var(--ink)}
  .auth-form-wrap{width:100%;max-width:400px}
  .auth-form-eyebrow{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:16px}
  .auth-form-h1{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:clamp(44px,4.5vw,60px);text-transform:uppercase;letter-spacing:-.015em;line-height:.92;color:var(--ink);margin:0 0 40px}
  .auth-field-label{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px}
  .auth-field-input{width:100%;height:48px;background:#fff;border:1px solid var(--line);border-radius:3px;padding:0 14px;font-family:"Inter Tight",sans-serif;font-size:14.5px;color:var(--ink);outline:none;transition:border-color .15s}
  .auth-field-input::placeholder{color:var(--ink-4)}
  .auth-field-input:focus{border-color:var(--ink)}
  .auth-field-input.has-error{border-color:#c53030}
  .auth-field-error{margin-top:5px;font-family:"JetBrains Mono",monospace;font-size:10.5px;color:#c53030;letter-spacing:.04em}
  .auth-submit{width:100%;height:50px;background:var(--ink);color:var(--bg);border:none;border-radius:999px;font-family:"Inter Tight",sans-serif;font-size:14px;font-weight:600;letter-spacing:.02em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s;margin-top:6px}
  .auth-submit:hover{background:#2a2a2a}
  .auth-submit:disabled{opacity:.55;cursor:not-allowed}
  .auth-ghost{width:100%;height:44px;background:transparent;color:var(--ink-2);border:1px solid var(--line);border-radius:999px;font-family:"Inter Tight",sans-serif;font-size:13.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:border-color .2s,color .2s}
  .auth-ghost:hover{border-color:var(--ink);color:var(--ink)}
  .auth-divider{display:flex;align-items:center;gap:12px;margin:20px 0}
  .auth-divider-line{flex:1;height:1px;background:var(--line)}
  .auth-divider-label{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;color:var(--ink-4);text-transform:uppercase}
  .auth-footer-text{text-align:center;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;color:var(--ink-3);margin-top:32px}
  .auth-footer-link{color:var(--accent);font-weight:600;text-decoration:none;transition:opacity .15s}
  .auth-footer-link:hover{opacity:.75}
`;

export default function Login() {
  const { login, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const passkeySupported = isPasskeySupported();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700;800&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    try {
      await loginWithPasskey(form.email || undefined);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message ||
        (err.name === 'NotAllowedError' ? 'Authentification annulée.' : 'Échec de la connexion par passkey.');
      toast.error(message);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await login(form);
      toast.success('Connexion reussie !');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur de connexion';
      toast.error(message);
      if (err.response?.status === 401) setErrors({ email: 'Email ou mot de passe incorrect' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <style>{CSS}</style>

      {/* Left — dark editorial */}
      <div className="auth-panel">
        <div className="auth-grid-bg" />
        <Link to="/">
          <img src={logo} alt="Goupyl" style={{ height: 100, width: 'auto' }} /></Link>

        <div className="auth-panel-body">
          <div className="auth-eyebrow">{'// Session'}</div>
          <h2 className="auth-display" style={{ fontSize: 'clamp(52px, 5.5vw, 82px)' }}>
            Bon<br />retour<br />parmi nous !
          </h2>
          <p className="auth-panel-sub">
            Retrouvez vos professionnels et gérez vos séances en toute simplicité.
          </p>
        </div>

        <div className="auth-panel-stats">
          <span><strong style={{ color: '#f4f4f2' }}>Sport</strong>&nbsp;·&nbsp;Nutrition&nbsp;·&nbsp;Mental</span>
          <span><strong style={{ color: 'oklch(0.62 0.16 240)' }}>✓</strong>&nbsp;PROS CERTIFIÉS</span>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-right">
        <Link to="/" className="auth-back">← Accueil</Link>

        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Accès membre</div>
          <h1 className="auth-form-h1">Connexion</h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="auth-field-label" htmlFor="email">Email</label>
              <input
                id="email" name="email" type="email"
                placeholder="votre@email.com"
                value={form.email} onChange={handleChange} required
                className={`auth-field-input${errors.email ? ' has-error' : ''}`}
              />
              {errors.email && <p className="auth-field-error">{errors.email}</p>}
            </div>
            <div>
              <label className="auth-field-label" htmlFor="password">Mot de passe</label>
              <input
                id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password} onChange={handleChange} required
                className="auth-field-input"
              />
            </div>
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Connexion…' : <>Se connecter <span>→</span></>}
            </button>
          </form>

          {passkeySupported && (
            <>
              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-label">ou</span>
                <div className="auth-divider-line" />
              </div>
              <button type="button" onClick={handlePasskeyLogin} disabled={passkeyLoading} className="auth-ghost">
                <KeyRound size={14} />
                {passkeyLoading ? 'Vérification…' : 'Se connecter avec une passkey'}
              </button>
            </>
          )}

          <p className="auth-footer-text">
            Pas encore de compte ?{' '}
            <Link to="/register" className="auth-footer-link">S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
