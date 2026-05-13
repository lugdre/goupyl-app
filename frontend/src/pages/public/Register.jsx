import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Building2, Briefcase, Users, Mail } from 'lucide-react';
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
  .auth-panel-pills{display:flex;flex-direction:column;gap:8px;margin-top:32px;position:relative;z-index:1}
  .auth-panel-pill{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#333;padding:8px 14px;border:1px solid rgba(255,255,255,.07);display:inline-block;width:fit-content}
  .auth-panel-stats{display:flex;gap:24px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.12em;color:#333;border-top:1px solid rgba(255,255,255,.08);padding-top:24px;position:relative;z-index:1;margin-top:auto}
  .auth-right{flex:1;background:var(--bg);display:flex;align-items:flex-start;justify-content:center;padding:48px 32px 64px;position:relative;overflow-y:auto}
  .auth-back{position:absolute;top:24px;left:28px;font-family:"JetBrains Mono",monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);text-decoration:none;transition:color .15s}
  .auth-back:hover{color:var(--ink)}
  .auth-form-wrap{width:100%;max-width:420px;padding-top:72px}
  .auth-form-eyebrow{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:16px}
  .auth-form-h1{font-family:"Archivo Narrow",sans-serif;font-weight:800;font-size:clamp(44px,4.5vw,58px);text-transform:uppercase;letter-spacing:-.015em;line-height:.92;color:var(--ink);margin:0 0 36px}
  .auth-section-label{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-bottom:10px}
  .auth-roles{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
  .auth-role{padding:10px 12px;border:1px solid var(--line);background:#fff;text-align:left;display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-family:"Inter Tight",sans-serif;transition:border-color .15s,background .15s;border-radius:2px}
  .auth-role:hover{border-color:rgba(0,0,0,.25)}
  .auth-role.selected{border:2px solid var(--ink);background:var(--bg)}
  .auth-role-name{font-size:13px;font-weight:600;color:var(--ink);display:block;margin:0}
  .auth-role-desc{font-size:11px;color:var(--ink-4);display:block;margin-top:2px}
  .auth-field-label{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px}
  .auth-field-input{width:100%;height:48px;background:#fff;border:1px solid var(--line);border-radius:3px;padding:0 14px;font-family:"Inter Tight",sans-serif;font-size:14.5px;color:var(--ink);outline:none;transition:border-color .15s}
  .auth-field-input::placeholder{color:var(--ink-4)}
  .auth-field-input:focus{border-color:var(--ink)}
  .auth-field-input.has-error{border-color:#c53030}
  .auth-field-error{margin-top:5px;font-family:"JetBrains Mono",monospace;font-size:10.5px;color:#c53030;letter-spacing:.04em}
  .auth-field-hint{margin-top:5px;font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--ink-4);letter-spacing:.04em}
  .auth-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .auth-submit{width:100%;height:50px;background:var(--ink);color:var(--bg);border:none;border-radius:999px;font-family:"Inter Tight",sans-serif;font-size:14px;font-weight:600;letter-spacing:.02em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s;margin-top:4px}
  .auth-submit:hover{background:#2a2a2a}
  .auth-submit:disabled{opacity:.45;cursor:not-allowed}
  .auth-cgu-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer}
  .auth-cgu-check{margin-top:3px;width:14px;height:14px;accent-color:var(--ink);flex-shrink:0}
  .auth-cgu-text{font-size:12.5px;color:var(--ink-3);line-height:1.5}
  .auth-cgu-link{color:var(--accent);text-decoration:none}
  .auth-cgu-link:hover{text-decoration:underline}
  .auth-footer-text{text-align:center;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;color:var(--ink-3);margin-top:28px}
  .auth-footer-link{color:var(--accent);font-weight:600;text-decoration:none}
  .auth-footer-link:hover{opacity:.75}
  .auth-divider-h{height:1px;background:var(--line);margin:8px 0}
`;

const ROLES = [
  { value: 'ENTREPRISE', label: 'Entreprise', desc: 'DRH / dirigeant / CSE', icon: Building2 },
  { value: 'SALARIE', label: 'Collaborateur', desc: 'Mon entreprise est partenaire', icon: Users },
  { value: 'INTERVENANT', label: 'Professionnel', desc: 'Coach / intervenant', icon: Briefcase },
];

export default function Register() {
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('ENTREPRISE');
  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
    companyName: '', siret: '', joinCode: '',
  });

  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    if (token) {
      setForm((f) => ({ ...f, joinCode: token }));
      setSelected('SALARIE');
    } else if (role && ROLES.some((r) => r.value === role)) {
      setSelected(role);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700;800&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const [errors, setErrors] = useState({});
  const [emailSent, setEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const role = selected === 'SALARIE' ? 'CLIENT' : selected;

    try {
      const payload = { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, role, acceptedTerms };
      if (selected === 'ENTREPRISE') {
        payload.companyName = form.companyName;
        if (form.siret) payload.siret = form.siret;
      }
      if (selected === 'SALARIE' && form.joinCode) {
        payload.joinCode = form.joinCode;
      }

      await register(payload);
      toast.success('Compte créé avec succès !');
      setEmailSent(true);
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur lors de la création du compte';
      const errorCode = err.response?.data?.error;
      toast.error(message);
      if (errorCode === 'EMAIL_ALREADY_EXISTS') setErrors({ email: 'Cet email est déjà utilisé' });
      if (errorCode === 'INVALID_JOIN_CODE') setErrors({ joinCode: 'Code invalide ou expiré' });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f2', padding: '32px 16px', fontFamily: '"Inter Tight", ui-sans-serif, system-ui, sans-serif' }}>
        <style>{CSS}</style>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: '"Archivo Narrow", sans-serif', fontWeight: 800, fontSize: 18, letterSpacing: '.06em', textTransform: 'uppercase', color: '#0a0a0a', display: 'block', marginBottom: 48 }}>GOUPYL</span>
          </Link>
          <div style={{ width: 64, height: 64, border: '1px solid rgba(0,0,0,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', color: 'oklch(0.62 0.16 240)' }}>
            <Mail size={26} />
          </div>
          <h1 style={{ fontFamily: '"Archivo Narrow", sans-serif', fontWeight: 800, fontSize: 40, textTransform: 'uppercase', letterSpacing: '-.015em', lineHeight: .92, color: '#0a0a0a', margin: '0 0 20px' }}>
            Vérifiez<br />votre email
          </h1>
          <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, marginBottom: 32 }}>
            Un lien de confirmation a été envoyé à{' '}
            <strong style={{ color: '#0a0a0a', fontWeight: 600 }}>{form.email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Link to="/login" style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'oklch(0.62 0.16 240)', textDecoration: 'none' }}>
            Déjà vérifié ? Se connecter →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <style>{CSS}</style>

      {/* Left — dark editorial */}
      <div className="auth-panel">
        <div className="auth-grid-bg" />
        <Link to="/" className="auth-wordmark">
          <img src={logo} alt="Goupyl" style={{ height: 100, width: 'auto' }} /></Link>

        <div className="auth-panel-body">
          <div className="auth-eyebrow">{'// Inscription'}</div>
          <h2 className="auth-display" style={{ fontSize: 'clamp(48px, 5vw, 76px)' }}>
            La santé<br />de vos<br />équipes
          </h2>
          <p className="auth-panel-sub">
            La plateforme B2B sport-santé qui améliore la performance et le bien-être de vos collaborateurs.
          </p>
        </div>

        <div className="auth-panel-pills" style={{ marginTop: 32 }}>
          {['Coaches certifiés', 'Suivi nutritionnel', 'Bien-être mental', 'Offres entreprise'].map((t) => (
            <span key={t} className="auth-panel-pill">{t}</span>
          ))}
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
          <div className="auth-form-eyebrow">Créer un compte</div>
          <h1 className="auth-form-h1">Inscription</h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Role */}
            <div>
              <div className="auth-section-label">Je suis</div>
              <div className="auth-roles">
                {ROLES.map(({ value, label, desc, icon: Icon }) => {
                  const active = selected === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={`auth-role${active ? ' selected' : ''}`}
                      onClick={() => setSelected(value)}
                    >
                      <Icon size={14} style={{ marginTop: 2, flexShrink: 0, color: active ? '#0a0a0a' : '#aaa' }} />
                      <div>
                        <span className="auth-role-name">{label}</span>
                        <span className="auth-role-desc">{desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="auth-divider-h" />

            {/* Entreprise fields */}
            {selected === 'ENTREPRISE' && (
              <>
                <div>
                  <label className="auth-field-label">Nom de l'entreprise</label>
                  <input name="companyName" placeholder="Acme Corp" value={form.companyName} onChange={handleChange} required className={`auth-field-input${errors.companyName ? ' has-error' : ''}`} />
                </div>
                <div>
                  <label className="auth-field-label">Numéro SIRET</label>
                  <input name="siret" placeholder="14 chiffres" value={form.siret} onChange={handleChange} maxLength={14} required className={`auth-field-input${errors.siret ? ' has-error' : ''}`} />
                </div>
              </>
            )}

            {/* Salarié join code */}
            {selected === 'SALARIE' && (
              <div>
                <label className="auth-field-label">Code entreprise</label>
                <input name="joinCode" placeholder="Ex : A1B2C3D4" value={form.joinCode} onChange={handleChange} className={`auth-field-input${errors.joinCode ? ' has-error' : ''}`} />
                {errors.joinCode && <p className="auth-field-error">{errors.joinCode}</p>}
                <p className="auth-field-hint">Fourni par votre RH ou reçu par email. Optionnel.</p>
              </div>
            )}

            <div className="auth-row">
              <div>
                <label className="auth-field-label">{selected === 'ENTREPRISE' ? 'Prénom contact' : 'Prénom'}</label>
                <input name="firstName" placeholder="Célestin" value={form.firstName} onChange={handleChange} required className="auth-field-input" />
              </div>
              <div>
                <label className="auth-field-label">{selected === 'ENTREPRISE' ? 'Nom contact' : 'Nom'}</label>
                <input name="lastName" placeholder="Dupont" value={form.lastName} onChange={handleChange} required className="auth-field-input" />
              </div>
            </div>

            <div>
              <label className="auth-field-label">Email</label>
              <input name="email" type="email" placeholder="votre@email.com" value={form.email} onChange={handleChange} required className={`auth-field-input${errors.email ? ' has-error' : ''}`} />
              {errors.email && <p className="auth-field-error">{errors.email}</p>}
            </div>

            <div>
              <label className="auth-field-label">Mot de passe</label>
              <input name="password" type="password" placeholder="Min 8 car., 1 majuscule, 1 chiffre" value={form.password} onChange={handleChange} required className="auth-field-input" />
            </div>

            <label className="auth-cgu-row">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="auth-cgu-check" required />
              <span className="auth-cgu-text">
                J'accepte les{' '}
                <Link to="/cgu" target="_blank" className="auth-cgu-link">CGU</Link>
                {' '}et la{' '}
                <Link to="/confidentialite" target="_blank" className="auth-cgu-link">politique de confidentialité</Link>
              </span>
            </label>

            <button type="submit" disabled={loading || !acceptedTerms} className="auth-submit">
              {loading ? 'Création du compte…' : <>Créer mon compte <span>→</span></>}
            </button>
          </form>

          <p className="auth-footer-text">
            Déjà un compte ?{' '}
            <Link to="/login" className="auth-footer-link">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
