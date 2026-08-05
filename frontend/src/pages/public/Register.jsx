import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { Building2, Briefcase, Users, User, Mail } from 'lucide-react';
import GoogleAuthButton from '../../components/GoogleAuthButton';
import logo from '../../assets/logo-goupyl-sport-white.png';
import registerPhoto from '../../assets/registerPhoto.jpg';

const ArrowUpRight = ({ size = 15, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);

// IMAGE — visuel du panneau gauche. Remplacez PLACEHOLDER_DARK dans le
// <img className="auth-panel-img"> par le chemin de votre photo,
// par exemple  src="/images/register.jpg"  (fichier dans frontend/public/images/).
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
  .auth-display{font-size:clamp(40px,4vw,64px);font-weight:700;letter-spacing:-.025em;line-height:.98;color:#fff;margin:18px 0 0}
  .auth-display em{font-style:italic;color:#FF9C6B;font-weight:500}
  .auth-panel-sub{margin-top:22px;color:rgba(255,255,255,.88);font-size:15px;line-height:1.55;max-width:330px}
  .auth-panel-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:26px;position:relative;z-index:1}
  .auth-panel-pill{font-size:12.5px;font-weight:500;color:#fff;padding:8px 14px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-radius:999px}
  .auth-panel-stats{display:flex;gap:24px;flex-wrap:wrap;font-size:12.5px;font-weight:500;color:rgba(255,255,255,.75);border-top:1px solid rgba(255,255,255,.25);padding-top:22px;margin-top:30px;position:relative;z-index:1}
  .auth-right{flex:1;background:var(--card);border-radius:22px;display:flex;align-items:flex-start;justify-content:center;padding:48px 32px 64px;position:relative;overflow-y:auto}
  .auth-back{position:absolute;top:22px;left:26px;font-size:13.5px;font-weight:500;color:var(--ink-3);text-decoration:none;transition:color .15s}
  .auth-back:hover{color:var(--ink)}
  .auth-form-wrap{width:100%;max-width:440px;padding-top:56px}
  .auth-chip-lite{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--ink)}
  .auth-chip-lite i{width:5px;height:5px;border-radius:50%;background:var(--orange);font-style:normal}
  .auth-form-h1{font-size:clamp(34px,3.6vw,44px);font-weight:600;letter-spacing:-.03em;line-height:1.05;color:var(--ink);margin:16px 0 28px}
  .auth-form-h1 em{font-style:italic;color:var(--orange);font-weight:500}
  .auth-section-label{font-size:12.5px;font-weight:500;color:var(--ink-2);margin-bottom:10px}
  .auth-roles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .auth-role{padding:12px 14px;border:1px solid var(--line);background:#fff;text-align:left;display:flex;align-items:flex-start;gap:9px;cursor:pointer;font-family:inherit;transition:border-color .15s,background .15s,box-shadow .15s;border-radius:14px}
  .auth-role:hover{border-color:#c9c7c1}
  .auth-role.selected{border-color:var(--orange);box-shadow:0 0 0 1px var(--orange);background:#FEF1EA}
  .auth-role-name{font-size:13.5px;font-weight:600;color:var(--ink);display:block;margin:0}
  .auth-role-desc{font-size:11.5px;color:var(--ink-3);display:block;margin-top:2px}
  .auth-field-label{display:block;font-size:12.5px;font-weight:500;color:var(--ink-2);margin-bottom:7px}
  .auth-field-input{width:100%;height:50px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:0 16px;font-family:inherit;font-size:14.5px;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}
  .auth-field-input::placeholder{color:var(--ink-3)}
  .auth-field-input:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(244,83,15,.12)}
  .auth-field-input.has-error{border-color:#c53030}
  .auth-field-error{margin-top:6px;font-size:12px;color:#c53030}
  .auth-field-hint{margin-top:6px;font-size:12px;color:var(--ink-3)}
  .auth-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .auth-submit{width:100%;height:52px;background:var(--orange);color:#fff;border:none;border-radius:999px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px;transition:transform .15s ease,opacity .2s;margin-top:4px}
  .auth-submit:hover{transform:translateY(-1px)}
  .auth-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .auth-submit-circle{width:32px;height:32px;border-radius:50%;background:#fff;color:var(--orange);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .auth-cgu-row{display:flex;align-items:flex-start;gap:8px;cursor:pointer}
  .auth-cgu-check{margin-top:3px;width:14px;height:14px;accent-color:var(--orange);flex-shrink:0}
  .auth-cgu-text{font-size:12.5px;color:var(--ink-2);line-height:1.5}
  .auth-cgu-link{color:var(--orange);text-decoration:none}
  .auth-cgu-link:hover{text-decoration:underline}
  .auth-footer-text{text-align:center;font-size:13.5px;color:var(--ink-2);margin-top:28px}
  .auth-footer-link{color:var(--orange);font-weight:600;text-decoration:none}
  .auth-footer-link:hover{opacity:.75}
  .auth-divider-h{height:1px;background:var(--line);margin:8px 0}
  .auth-divider-label{font-size:11.5px;letter-spacing:.08em;color:var(--ink-3);text-transform:uppercase}
  .auth-chips{display:flex;flex-wrap:wrap;gap:6px}
  .auth-chip{padding:8px 15px;border:1px solid var(--line);background:#fff;border-radius:999px;font-family:inherit;font-size:12.5px;font-weight:500;color:var(--ink-2);cursor:pointer;transition:border-color .15s,background .15s,color .15s}
  .auth-chip:hover{border-color:#c9c7c1}
  .auth-chip.selected{background:var(--orange);border-color:var(--orange);color:#fff}
  .auth-skip{background:none;border:none;font-family:inherit;font-size:12.5px;font-weight:500;color:var(--ink-3);cursor:pointer;text-decoration:underline;text-underline-offset:3px;margin:6px auto 0;display:block}
  .auth-skip:hover{color:var(--ink)}
`;

const OBJECTIVE_OPTIONS = [
  'Perte de poids', 'Remise en forme', 'Prise de masse',
  'Préparation compétition', 'Bien-être', 'Gestion du stress',
];

const LEVEL_OPTIONS = [
  ['DEBUTANT', 'Débutant'],
  ['INTERMEDIAIRE', 'Intermédiaire'],
  ['AVANCE', 'Avancé'],
  ['PRO', 'Pro'],
  ['ELITE', 'Élite'],
];

// Niveaux qui déclenchent un accompagnement sur-mesure (besoin spécifique au lieu d'objectifs)
const SPECIFIC_NEED_LEVELS = ['PRO', 'ELITE'];

// Règles de mot de passe (miroir du validateur backend) pour le retour visuel immédiat
const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: '8 caractères minimum' },
  { test: (v) => /[A-Z]/.test(v), label: 'une majuscule' },
  { test: (v) => /[0-9]/.test(v), label: 'un chiffre' },
];

const ROLES = [
  { value: 'PARTICULIER', label: 'Particulier', desc: 'Je réserve pour moi', icon: User },
  { value: 'SALARIE', label: 'Collaborateur', desc: 'Mon entreprise est partenaire', icon: Users },
  { value: 'ENTREPRISE', label: 'Entreprise', desc: 'DRH / dirigeant / CSE', icon: Building2 },
  { value: 'INTERVENANT', label: 'Professionnel', desc: 'Coach / intervenant', icon: Briefcase },
];

export default function Register() {
  const { register, googleAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);
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
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap';
    document.head.appendChild(link);
    return () => { if (document.head.contains(link)) document.head.removeChild(link); };
  }, []);

  const [errors, setErrors] = useState({});
  const [emailSent, setEmailSent] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Étape 2 (questionnaire sportif) pour PARTICULIER / SALARIE
  const [step, setStep] = useState(1);
  const [profileForm, setProfileForm] = useState({ level: '', sportType: '', objectives: [], specificNeed: '' });
  const isClientRole = selected === 'PARTICULIER' || selected === 'SALARIE';
  const needsSpecific = SPECIFIC_NEED_LEVELS.includes(profileForm.level);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const selectRole = (value) => {
    setSelected(value);
    setStep(1);
  };

  const toggleObjective = (obj) => {
    setProfileForm((p) => ({
      ...p,
      objectives: p.objectives.includes(obj)
        ? p.objectives.filter((o) => o !== obj)
        : [...p.objectives, obj],
    }));
  };

  const handleGoogle = async (credential) => {
    setGoogleLoading(true);
    try {
      // Un compte Google est créé en tant que CLIENT ; on transmet le code entreprise si salarié
      await googleAuth(credential, form.joinCode ? { joinCode: form.joinCode } : {});
      toast.success('Compte créé avec succès !');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Échec de l\'inscription Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const doRegister = async (includeProfile) => {
    setLoading(true);
    setErrors({});

    const role = (selected === 'SALARIE' || selected === 'PARTICULIER') ? 'CLIENT' : selected;

    try {
      const payload = { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, role, acceptedTerms };
      if (selected === 'ENTREPRISE') {
        payload.companyName = form.companyName;
        if (form.siret) payload.siret = form.siret;
      }
      if (selected === 'SALARIE' && form.joinCode) {
        payload.joinCode = form.joinCode;
      }
      if (includeProfile) {
        if (profileForm.level) payload.level = profileForm.level;
        if (profileForm.sportType.trim()) payload.sportType = profileForm.sportType.trim();
        // PRO / ELITE : besoin spécifique (texte libre) ; sinon objectifs prédéfinis
        if (SPECIFIC_NEED_LEVELS.includes(profileForm.level)) {
          if (profileForm.specificNeed.trim()) payload.specificNeed = profileForm.specificNeed.trim();
        } else if (profileForm.objectives.length) {
          payload.objectives = profileForm.objectives;
        }
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
      if (errorCode === 'EMAIL_ALREADY_EXISTS' || errorCode === 'INVALID_JOIN_CODE') setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(form.password) }));
  const passwordValid = passwordChecks.every((c) => c.ok);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation immédiate du mot de passe avant toute suite
    if (!passwordValid) {
      const missing = passwordChecks.filter((c) => !c.ok).map((c) => c.label).join(', ');
      setErrors((prev) => ({ ...prev, password: `Mot de passe invalide — il manque : ${missing}` }));
      return;
    }
    // Particulier / collaborateur : le questionnaire sportif s'affiche en étape 2
    if (isClientRole && step === 1) {
      setStep(2);
      return;
    }
    await doRegister(isClientRole);
  };

  if (emailSent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EBEAE6', padding: '32px 16px', fontFamily: '"Inter", system-ui, sans-serif' }}>
        <style>{CSS}</style>
        <div style={{ width: '100%', maxWidth: 460, textAlign: 'center', background: '#fff', borderRadius: 22, padding: '56px 40px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#171614', display: 'block', marginBottom: 40 }}>Goupyl Sport</span>
          </Link>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF1EA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 26px', color: '#F4530F' }}>
            <Mail size={26} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1.05, color: '#171614', margin: '0 0 18px' }}>
            Vérifiez<br />votre email
          </h1>
          <p style={{ fontSize: 14.5, color: '#4c4a46', lineHeight: 1.6, marginBottom: 30 }}>
            Un lien de confirmation a été envoyé à{' '}
            <strong style={{ color: '#171614', fontWeight: 600 }}>{form.email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Link to="/login" style={{ fontSize: 13.5, fontWeight: 600, color: '#F4530F', textDecoration: 'none' }}>
            Déjà vérifié ? Se connecter →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <style>{CSS}</style>

      {/* Left — panneau visuel (style hero de la landing) */}
      <div className="auth-panel">
        {/* IMAGE — visuel du panneau gauche */}
        <img className="auth-panel-img" src={registerPhoto} alt="" />
        <Link to="/" className="auth-wordmark">
          <img src={logo} alt="Goupyl Sport" style={{ height: 72, width: 'auto' }} />
        </Link>

        <div className="auth-panel-body">
          <span className="auth-chip-dark"><i />Inscription</span>
          <h2 className="auth-display">
            Rejoignez<br />Goupyl <em>Sport.</em>
          </h2>
          <p className="auth-panel-sub">
            Particuliers, entreprises et coachs certifiés : créez votre compte en quelques minutes.
          </p>
        </div>

        <div className="auth-panel-pills">
          {['Coachs certifiés', 'Suivi nutritionnel', 'Bien-être mental', 'Offres entreprise'].map((t) => (
            <span key={t} className="auth-panel-pill">{t}</span>
          ))}
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
          <span className="auth-chip-lite"><i />Créer un compte</span>
          <h1 className="auth-form-h1">Inscription</h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Étape 2 — questionnaire sportif (particulier / collaborateur) */}
            {isClientRole && step === 2 ? (
              <>
                <div className="auth-section-label">Votre profil sportif — étape 2/2</div>

                <div>
                  <label className="auth-field-label">Niveau physique</label>
                  <div className="auth-chips">
                    {LEVEL_OPTIONS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`auth-chip${profileForm.level === value ? ' selected' : ''}`}
                        onClick={() => setProfileForm((p) => ({ ...p, level: p.level === value ? '' : value }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="auth-field-label">Sport pratiqué / souhaité</label>
                  <input
                    value={profileForm.sportType}
                    onChange={(e) => setProfileForm((p) => ({ ...p, sportType: e.target.value }))}
                    placeholder="Ex : fitness, running, yoga…"
                    maxLength={100}
                    className="auth-field-input"
                  />
                </div>

                {needsSpecific ? (
                  <div>
                    <label className="auth-field-label">Votre besoin spécifique</label>
                    <textarea
                      value={profileForm.specificNeed}
                      onChange={(e) => setProfileForm((p) => ({ ...p, specificNeed: e.target.value }))}
                      placeholder="Décrivez précisément votre objectif de performance, votre discipline, vos échéances de compétition, vos contraintes…"
                      maxLength={1000}
                      rows={5}
                      className="auth-field-input"
                      style={{ height: 'auto', padding: '12px 16px', resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <p className="auth-field-hint">
                      Un conseiller dédié vous recontactera pour construire un accompagnement sur-mesure.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="auth-field-label">Vos objectifs</label>
                    <div className="auth-chips">
                      {OBJECTIVE_OPTIONS.map((obj) => (
                        <button
                          key={obj}
                          type="button"
                          className={`auth-chip${profileForm.objectives.includes(obj) ? ' selected' : ''}`}
                          onClick={() => toggleObjective(obj)}
                        >
                          {obj}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className="auth-submit">
                  {loading ? 'Création du compte…' : (
                    <>
                      Créer mon compte
                      <span className="auth-submit-circle"><ArrowUpRight /></span>
                    </>
                  )}
                </button>
                <button type="button" className="auth-skip" onClick={() => doRegister(false)} disabled={loading}>
                  Passer cette étape
                </button>
                <button
                  type="button"
                  className="auth-skip"
                  style={{ marginTop: 0 }}
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  ← Retour
                </button>
              </>
            ) : (
              <>
                {/* Google — inscription rapide (crée un compte particulier / collaborateur) */}
                <div>
                  <GoogleAuthButton onCredential={handleGoogle} text="signup_with" />
                  {googleLoading && (
                    <p className="auth-field-hint" style={{ textAlign: 'center', marginTop: 8 }}>Inscription Google…</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 4px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                    <span className="auth-divider-label">ou par email</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  </div>
                </div>

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
                          onClick={() => selectRole(value)}
                        >
                          <Icon size={14} style={{ marginTop: 2, flexShrink: 0, color: active ? '#F4530F' : '#b3b1ab' }} />
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
                  <input name="password" type="password" placeholder="Min 8 car., 1 majuscule, 1 chiffre" value={form.password} onChange={handleChange} required className={`auth-field-input${errors.password ? ' has-error' : ''}`} />
                  {errors.password && <p className="auth-field-error">{errors.password}</p>}
                  {form.password && !passwordValid && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
                      {passwordChecks.map((c) => (
                        <span
                          key={c.label}
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: c.ok ? '#4A7C59' : '#8a8781',
                          }}
                        >
                          {c.ok ? '✓' : '○'} {c.label}
                        </span>
                      ))}
                    </div>
                  )}
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
                  {loading
                    ? 'Création du compte…'
                    : (
                      <>
                        {isClientRole ? 'Continuer' : 'Créer mon compte'}
                        <span className="auth-submit-circle"><ArrowUpRight /></span>
                      </>
                    )}
                </button>
              </>
            )}
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
