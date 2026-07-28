import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { isPasskeySupported } from '../../services/passkey.api';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import logo from '../../assets/logo-goupyl-white.png';
import loginPhoto from '../../assets/loginPhoto.jpg';

const ArrowUpRight = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);

// IMAGE — visuel du panneau gauche. Remplacez PLACEHOLDER_DARK dans le
// <img className="auth-panel-img"> par le chemin de votre photo,
// par exemple  src="/images/login.jpg"  (fichier dans frontend/public/images/).
const PLACEHOLDER_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000'%3E%3Crect width='800' height='1000' fill='%236d6b66'/%3E%3Cg stroke='%23d8d6d1' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='352' y='462' width='96' height='76' rx='10'/%3E%3Ccircle cx='380' cy='490' r='9'/%3E%3Cpath d='M448 522l-34-30-62 46'/%3E%3C/g%3E%3C/svg%3E";

const CSS = `
  .auth-wrap{--bg:#EBEAE6;--card:#FFFFFF;--ink:#171614;--ink-2:#4c4a46;--ink-3:#8a8781;--line:#E4E2DC;--orange:#F4530F;min-height:100vh;display:flex;gap:14px;background:var(--bg);padding:20px;font-family:"Inter",system-ui,-apple-system,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
  .auth-wrap *{box-sizing:border-box}
  .auth-panel{width:45%;flex-shrink:0;border-radius:22px;overflow:hidden;position:relative;display:flex;flex-direction:column;padding:30px 40px 40px;color:#fff;background:linear-gradient(150deg,#9a9892 0%,#6d6b66 55%,#55534f 100%)}
  @media(max-width:900px){.auth-panel{display:none!important}}
  .auth-panel-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  .auth-panel::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,.25) 0%,rgba(15,15,15,.55) 100%);pointer-events:none}
  .auth-wordmark{position:relative;z-index:1;display:inline-block;text-decoration:none}
  .auth-panel-body{margin:auto 0 0;position:relative;z-index:1}
  .auth-chip-dark{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.14);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;color:#fff}
  .auth-chip-dark i{width:5px;height:5px;border-radius:50%;background:var(--orange);font-style:normal}
  .auth-display{font-size:clamp(44px,4.4vw,72px);font-weight:700;letter-spacing:-.025em;line-height:.98;color:#fff;margin:18px 0 0}
  .auth-display em{font-style:italic;color:#FF9C6B;font-weight:500}
  .auth-panel-sub{margin-top:22px;color:rgba(255,255,255,.88);font-size:15px;line-height:1.55;max-width:320px}
  .auth-panel-stats{display:flex;gap:24px;flex-wrap:wrap;font-size:12.5px;font-weight:500;color:rgba(255,255,255,.75);border-top:1px solid rgba(255,255,255,.25);padding-top:22px;margin-top:34px;position:relative;z-index:1}
  .auth-right{flex:1;background:var(--card);border-radius:22px;display:flex;align-items:center;justify-content:center;padding:48px 32px;position:relative;overflow-y:auto}
  .auth-back{position:absolute;top:22px;left:26px;font-size:13.5px;font-weight:500;color:var(--ink-3);text-decoration:none;transition:color .15s}
  .auth-back:hover{color:var(--ink)}
  .auth-form-wrap{width:100%;max-width:400px}
  .auth-chip-lite{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--ink)}
  .auth-chip-lite i{width:5px;height:5px;border-radius:50%;background:var(--orange);font-style:normal}
  .auth-form-h1{font-size:clamp(36px,3.8vw,46px);font-weight:600;letter-spacing:-.03em;line-height:1.05;color:var(--ink);margin:16px 0 32px}
  .auth-form-h1 em{font-style:italic;color:var(--orange);font-weight:500}
  .auth-field-label{display:block;font-size:12.5px;font-weight:500;color:var(--ink-2);margin-bottom:7px}
  .auth-field-input{width:100%;height:50px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:0 16px;font-family:inherit;font-size:14.5px;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}
  .auth-field-input::placeholder{color:var(--ink-3)}
  .auth-field-input:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(244,83,15,.12)}
  .auth-field-input.has-error{border-color:#c53030}
  .auth-field-error{margin-top:6px;font-size:12px;color:#c53030}
  .auth-submit{width:100%;height:52px;background:var(--orange);color:#fff;border:none;border-radius:999px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:transform .15s ease,opacity .2s;margin-top:6px}
  .auth-submit:hover{transform:translateY(-1px)}
  .auth-submit:disabled{opacity:.55;cursor:not-allowed;transform:none}
  .auth-submit-circle{width:32px;height:32px;border-radius:50%;background:#fff;color:var(--orange);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .auth-ghost{width:100%;height:48px;background:#fff;color:var(--ink-2);border:1px solid var(--line);border-radius:999px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:border-color .2s,color .2s}
  .auth-ghost:hover{border-color:var(--ink);color:var(--ink)}
  .auth-divider{display:flex;align-items:center;gap:12px;margin:20px 0}
  .auth-divider-line{flex:1;height:1px;background:var(--line)}
  .auth-divider-label{font-size:11.5px;letter-spacing:.08em;color:var(--ink-3);text-transform:uppercase}
  .auth-footer-text{text-align:center;font-size:13.5px;color:var(--ink-2);margin-top:32px}
  .auth-footer-link{color:var(--orange);font-weight:600;text-decoration:none;transition:opacity .15s}
  .auth-footer-link:hover{opacity:.75}
`;

export default function Login() {
  const { login, loginWithPasskey, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const passkeySupported = isPasskeySupported();

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap';
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

  const handleGoogle = async (credential) => {
    setGoogleLoading(true);
    try {
      await googleAuth(credential);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Échec de la connexion Google.');
    } finally {
      setGoogleLoading(false);
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

      {/* Left — panneau visuel (style hero de la landing) */}
      <div className="auth-panel">
        {/* IMAGE — visuel du panneau gauche */}
        <img className="auth-panel-img" src={loginPhoto} alt="" />
        <Link to="/" className="auth-wordmark">
          <img src={logo} alt="Goupyl Sport" style={{ height: 72, width: 'auto' }} />
        </Link>

        <div className="auth-panel-body">
          <span className="auth-chip-dark"><i />Espace membre</span>
          <h2 className="auth-display">
            Bon Retour<br />Parmi <em>Nous.</em>
          </h2>
          <p className="auth-panel-sub">
            Retrouvez vos professionnels et gérez vos séances en toute simplicité.
          </p>
        </div>

        <div className="auth-panel-stats">
          <span><strong style={{ color: '#fff' }}>Sport</strong> · Nutrition · Mental</span>
          <span><strong style={{ color: '#FF9C6B' }}>✓</strong> Pros certifiés</span>
        </div>
      </div>

      {/* Right — form */}
      <div className="auth-right">
        <Link to="/" className="auth-back">← Accueil</Link>

        <div className="auth-form-wrap">
          <span className="auth-chip-lite"><i />Accès membre</span>
          <h1 className="auth-form-h1">Connexion</h1>

          {/* Google — accès rapide */}
          <GoogleAuthButton onCredential={handleGoogle} text="continue_with" />
          {googleLoading && (
            <p className="auth-divider-label" style={{ textAlign: 'center', marginTop: 8 }}>Connexion Google…</p>
          )}

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-label">ou par email</span>
            <div className="auth-divider-line" />
          </div>

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
              {loading ? 'Connexion…' : (
                <>
                  Se connecter
                  <span className="auth-submit-circle"><ArrowUpRight /></span>
                </>
              )}
            </button>
          </form>

          {passkeySupported && (
            <button type="button" onClick={handlePasskeyLogin} disabled={passkeyLoading} className="auth-ghost" style={{ marginTop: 12 }}>
              <KeyRound size={14} />
              {passkeyLoading ? 'Vérification…' : 'Se connecter avec une passkey'}
            </button>
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
