import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT, CONTACT_MAP_URL } from '../../utils/constants';

// IMAGES — importez ici chaque photo du dossier src/assets/
// puis utilisez la variable dans src={...} (sans guillemets).
import santeMentale from '../../assets/friendly-couple-posing-her-home.jpg';
import nutrition from '../../assets/nutritionist.jpg';
import coachingSportif from '../../assets/coachingSportif.jpg';
import coach from '../../assets/coach.jpg';
import coach1 from '../../assets/coach-1.jpg';
import coach2 from '../../assets/coach-2.jpg';
import coach3 from '../../assets/coach-3.jpg';
import coach4 from '../../assets/coach-4.jpg';
import coach5 from '../../assets/coach-5.jpg';
import coach6 from '../../assets/coach-6.jpg';
import bilanSportif from '../../assets/bilan-sportif.jpg';
import coachingBienEtre from '../../assets/coaching-bien-etre.jpg';
import sportive from '../../assets/sportive.jpg';
import cardGoupylW from '../../assets/card-goupyl-white.png';
import cardGoupylB from '../../assets/card-goupyl-black.png';
import heroRun from '../../assets/hero-run.jpg'

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23DFDDD7'/%3E%3Cg stroke='%237a7873' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='352' y='262' width='96' height='76' rx='10'/%3E%3Ccircle cx='380' cy='290' r='9'/%3E%3Cpath d='M448 322l-34-30-62 46'/%3E%3C/g%3E%3C/svg%3E";
const PLACEHOLDER_DARK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%236d6b66'/%3E%3Cg stroke='%23d8d6d1' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='352' y='262' width='96' height='76' rx='10'/%3E%3Ccircle cx='380' cy='290' r='9'/%3E%3Cpath d='M448 322l-34-30-62 46'/%3E%3C/g%3E%3C/svg%3E";

// ─── Icônes ────────────────────────────────────────────────────────
const ArrowUpRight = ({ size = 16, color = 'currentColor', stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" /><path d="M8 7h9v9" />
  </svg>
);
const ArrowLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
  </svg>
);
const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
  </svg>
);
const ImageGlyph = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".45">
    <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
  </svg>
);
const SocialIcon = ({ path }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">{path}</svg>
);

// ─── Pile d'avatars ────────────────────────────────────────────────
// Un jeu de photos distinct par section, pour ne pas répéter les mêmes
// visages dans le même ordre d'un bloc à l'autre.
const AVATARS_HERO = [coach6, coach3, coach1];        // hero « 500+ coachs »
const AVATARS_DOMAINES = [coach5, coach2, coach4];    // bloc « 100 % vérifiés »
const AVATAR_PHOTOS = [coach1, coach2, coach3, coach4, coach5, coach6]; // repli

function AvatarStack({ count = 3, badge, size = 40, light, photos = AVATAR_PHOTOS }) {
  return (
    <div className="avstack" style={{ '--av-size': `${size}px` }}>
      {Array.from({ length: count }).map((_, i) => {
        const photo = photos[i % photos.length];
        return (
          <span key={i} className={`av ${light ? 'av--light' : ''}`} style={{ zIndex: i + 1 }}>
            {photo
              ? <img src={photo} alt="" className="av-img" loading="lazy" />
              : <ImageGlyph size={size * 0.4} />}
          </span>
        );
      })}
      {badge && <span className="av av--badge" style={{ zIndex: count + 1 }}>{badge}</span>}
    </div>
  );
}

// ─── Chip de section ───────────────────────────────────────────────
const Chip = ({ children }) => (
  <span className="chip"><span className="chip-dot" />{children}</span>
);

// ─── Données ───────────────────────────────────────────────────────
// `category` doit correspondre aux valeurs acceptées par /search (?category=…) :
// SPORT, NUTRITION, MENTAL, BIENETRE.
const FOCUS_CARDS = [
  // IMAGE — petite carte gauche (changez la valeur de `img`)
  { title: 'Coaching sportif', caption: 'Musculation, running, remise en forme — en solo, duo ou petit groupe.', img: coachingSportif, category: 'SPORT' },
  // IMAGE — petite carte droite
  { title: 'Nutrition', caption: 'Équilibre alimentaire et suivi nutritionnel au quotidien.', img: nutrition, category: 'NUTRITION' },
];

// Chaque onglet renvoie vers /search avec son filtre pré-activé.
const COACH_TABS = [
  { label: 'Coaching sportif', category: 'SPORT' },
  { label: 'Nutrition', category: 'NUTRITION' },
  { label: 'Santé mentale', category: 'MENTAL' },
  { label: 'Bien-être', category: 'BIENETRE' },
];

// IMAGE — une photo par coach (champ `img`)
const COACHES = [
  { name: 'Marc Leroy', role: 'Coaching sportif', offset: 60, tone: 'a', img: coach1 },
  { name: 'Sophie Martin', role: 'Basket-ball', offset: 120, tone: 'b', img: coach2 },
  { name: 'Julien Blanc', role: 'Nutrition sportive', offset: 0, tone: 'c', img: coach5 },
  { name: 'Bastien Laurent', role: 'Basketball', offset: 90, tone: 'd', img: coach4 },
];

// Tarifs par collaborateur : `monthly` = mensuel, `yearly` = mensuel remisé −20 %
// facturé en une fois (yearly × 12). Doit rester aligné sur PLAN_PRICES
// (backend/src/services/payment.service.js).
const PLANS = [
  {
    name: 'Formule Essentiel',
    monthly: 54, yearly: 43,
    desc: 'Remise en activité, contenus santé & bien-être et suivi d’engagement. Jusqu’à 10 collaborateurs, 4 séances par collaborateur chaque mois.',
    cta: 'Commencer', to: '/register',
    image: cardGoupylB,
    avatars: [coach2, coach6],
  },
  {
    name: 'Formule Boost',
    monthly: 122, yearly: 98,
    desc: 'Coaching sportif structuré, plans personnalisés et suivi nutritionnel. Jusqu’à 50 collaborateurs, 8 séances par collaborateur chaque mois.',
    cta: 'Commencer', to: '/register',
    image: cardGoupylW, // IMAGE — fond de la carte « Formule Boost »
    avatars: [coach3, coach5],
  },
  {
    name: 'Formule Ultra',
    monthly: null, yearly: null,
    desc: 'Nutrition individualisée, préparation mentale, tests à l’effort et biomarqueurs. Jusqu’à 200 collaborateurs, 16 séances par collaborateur chaque mois.',
    cta: 'Parler à un expert', to: null,
    image: cardGoupylB,
    avatars: [coach1, coach4],
  },
];

// ─── Page ──────────────────────────────────────────────────────────
export default function Landing() {
  // Affichage des tarifs : mensuel par défaut, bascule vers l'annuel (−20 %)
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div className="lp">
      <style>{CSS}</style>

      {/* ═══ HERO ═══════════════════════════════════════════════════ */}
      <section className="lp-block hero-block" id="hero">
        <div className="hero">
          {/* IMAGE — grande photo plein écran du haut de page */}
          <img className="hero-bg" src={heroRun} alt="Sportifà l'entraînement" />
          <div className="hero-inner">

            <header className="hero-nav">
              <nav className="hero-nav-links">
                <a href="#hero">Accueil</a>
                <a href="#domaines">Domaines</a>
                <a href="#coaches">Coachs</a>
                <a href="#pricing">Tarifs</a>
              </nav>
              <div className="hero-logo"><img src="/logo-goupyl-sport-white.png" alt="Logo Goupyl Sport" /></div>
              <Link to="/login" className="btn-pill btn-pill--white">
                Commencer
                <span className="btn-circle btn-circle--orange"><ArrowUpRight size={15} color="#fff" /></span>
              </Link>
            </header>

            <div className="hero-social">
              <AvatarStack count={3} badge="500+" size={40} light photos={AVATARS_HERO} />
              <p>Particuliers, entreprises et coachs<br />certifiés, réunis sur une plateforme</p>
            </div>

            <p className="hero-desc">
              La plateforme qui connecte particuliers et entreprises à des coachs sport & bien-être certifiés, près de chez vous.
            </p>

            <h1 className="hero-title">Repoussez<br />vos limites.</h1>
          </div>
        </div>
      </section>

      {/* ═══ FOCUS / ÉVÉNEMENT ═════════════════════════════════════ */}
      <section className="lp-block" id="domaines">
        <div className="wrap section-pad">
          <div className="focus-head">
            <div className="focus-head-left">
              <Chip>Nos domaines</Chip>
              <p className="focus-tagline">Un accompagnement complet.<br />Des coachs vérifiés.</p>
            </div>
            <h2 className="h2">
              Un Accompagnement<br />Sport & <em>Bien-être</em>
            </h2>
          </div>

          <div className="focus-grid">
            {FOCUS_CARDS.map((c) => (
              <article key={c.title} className="focus-card focus-card--small">
                <img className="focus-card-bg" src={c.img} alt={c.title} />
                <Link
                  to={`/search?category=${c.category}`}
                  className="card-arrow"
                  aria-label={`Voir les coachs — ${c.title}`}
                >
                  <ArrowUpRight size={14} />
                </Link>
                <div className="focus-card-caption">
                  <h3>{c.title}</h3>
                  <p>{c.caption}</p>
                </div>
              </article>
            ))}

            <article className="focus-card focus-card--big">
              {/* IMAGE — grande carte de droite */}
              <img className="focus-card-bg" src={santeMentale} alt="Santé mentale & bien-être" />
              <Link
                to="/search?category=MENTAL"
                className="card-arrow"
                aria-label="Voir les coachs — Santé mentale & Bien-être"
              >
                <ArrowUpRight size={14} />
              </Link>
              <div className="focus-card-caption focus-card-caption--big">
                <h3>Santé mentale & Bien-être</h3>
                <p>Gestion du stress, préparation mentale, sophrologie.</p>
              </div>
            </article>

            <div className="focus-proof">
              <AvatarStack count={3} badge="100%" size={36} photos={AVATARS_DOMAINES} />
              <p>Des coachs 100 % vérifiés —<br />diplômes et identité contrôlés</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMENT ÇA MARCHE ═════════════════════════════════════ */}
      <section className="lp-block">
        <div className="wrap section-pad">
          <div className="how-top">
            {/* IMAGE — grande photo de gauche */}
            <img className="how-img-main" src={coach} alt="Séance de coaching" />
            <div className="how-content">
              <Chip>Comment ça marche</Chip>
              <h2 className="h2">
                Réservez Votre Séance<br />en Quelques <em>Clics</em>
              </h2>
              <p className="how-desc">
                Choisissez un coach, réservez un créneau directement dans son agenda et payez en ligne ou laissez votre entreprise couvrir la séance.
              </p>
              <Link to="/search" className="btn-pill btn-pill--outline">
                Trouver mon coach
                <span className="btn-circle btn-circle--orange"><ArrowUpRight size={15} color="#fff" /></span>
              </Link>
            </div>
          </div>

          <div className="how-bottom">
            <div className="how-thumbs">
              {/* IMAGE — vignette 1 */}
              <img className="how-thumb" src={bilanSportif} alt="Sport collectif" />
              {/* IMAGE — vignette 2 */}
              <img className="how-thumb" src={coachingBienEtre} alt="Sport individuel" />
            </div>
            <div className="how-step">
              <div className="how-step-num">01<span>/04</span><i /></div>
              <div className="how-step-text">
                <h3>Trouvez Votre<br />Coach Idéal</h3>
                <p>Filtrez par spécialité, ville et lieu de pratique, puis comparez les profils et les avis.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COACHS ════════════════════════════════════════════════ */}
      <section className="lp-block lp-block--tint" id="coaches">
        <div className="wrap section-pad">
          <Chip>Nos coachs</Chip>
          <div className="coaches-head">
            <div>
              <h2 className="h2 h2--xl">
                L’Équipe Derrière<br />Vos <em>Progrès</em>
              </h2>
              <p className="coaches-sub">
                Coachs sportifs, nutritionnistes et préparateurs mentaux : chaque diplôme est vérifié par notre équipe avant l’activation du profil.
              </p>
            </div>
            <div className="coaches-tabs">
              {COACH_TABS.map((t) => (
                <Link key={t.category} to={`/search?category=${t.category}`} className="tab">
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="coaches-grid">
            {COACHES.map((c, i) => (
              <article key={i} className={`coach-card coach-card--${c.tone}`} style={{ marginTop: `${c.offset}px` }}>
                <img className="coach-card-img" src={c.img} alt={c.name} />
                <div className="coach-label">
                  <strong>{c.name}</strong>
                  <span>{c.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TARIFS ════════════════════════════════════════════════ */}
      <section className="lp-block" id="pricing">
        <div className="wrap section-pad section-pad--center">
          <Chip>Tarifs entreprise</Chip>
          <h2 className="h2 h2--center">Choisissez Votre <em>Formule</em></h2>
          <p className="section-sub">
            Par collaborateur et par mois, jusqu’à −20 % en facturation annuelle. Formule Ultra sur devis.<br />
            Vous êtes un particulier ? Vous payez simplement à la séance, au tarif du coach.
          </p>

          <div className="cycle-switch" role="group" aria-label="Périodicité de facturation">
            <button
              type="button"
              className={`cycle-opt${!yearly ? ' is-active' : ''}`}
              aria-pressed={!yearly}
              onClick={() => setYearly(false)}
            >
              Mensuel
            </button>
            <button
              type="button"
              className={`cycle-opt${yearly ? ' is-active' : ''}`}
              aria-pressed={yearly}
              onClick={() => setYearly(true)}
            >
              Annuel <span className="cycle-save">−20 %</span>
            </button>
          </div>

          <div className="plans">
            {PLANS.map((p) => (
              <article key={p.name} className={`plan ${p.image ? 'plan--image' : ''}`}>
                {p.image && <img className="plan-bg" src={p.image} alt="" />}
                <div className="plan-avatars"><AvatarStack count={2} size={34} light photos={p.avatars} /></div>
                <div className="plan-body">
                  {p.monthly
                    ? (
                      <div className="plan-price">
                        {yearly ? p.yearly : p.monthly} €
                        {yearly && <> / <s>{p.monthly}</s></>}
                      </div>
                    )
                    : <div className="plan-price">Sur devis</div>}
                  <div className="plan-cycle">
                    Par collaborateur / mois
                    {p.monthly && yearly && (
                      <span className="plan-billed">facturé {p.yearly * 12} € / collaborateur / an</span>
                    )}
                  </div>
                  <h3 className="plan-name">{p.name}</h3>
                  {p.to ? (
                    <Link to={p.to} className="btn-pill btn-pill--orange">
                      {p.cta}
                      <span className="btn-circle btn-circle--white"><ArrowUpRight size={15} color="#F4530F" /></span>
                    </Link>
                  ) : (
                    <a href={`mailto:${CONTACT.emailSupport}`} className="btn-pill btn-pill--orange">
                      {p.cta}
                      <span className="btn-circle btn-circle--white"><ArrowUpRight size={15} color="#F4530F" /></span>
                    </a>
                  )}
                  <p className="plan-desc">{p.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TÉMOIGNAGE ════════════════════════════════════════════ */}
      <section className="lp-block">
        <div className="wrap section-pad section-pad--center">
          <Chip>Témoignage</Chip>
          <h2 className="h2 h2--center">Ce Que Disent Nos <em>Sportifs</em></h2>
          <p className="section-sub">Approuvé par les entreprises, adoré des sportifs.</p>

          <div className="testimonial">
            <div className="testimonial-left">
              <div className="quote-mark">““</div>
              <div className="testimonial-arrows">
                <button type="button" className="arrow-btn" aria-label="Précédent"><ArrowLeft size={15} /></button>
                <button type="button" className="arrow-btn arrow-btn--orange" aria-label="Suivant"><ArrowRight size={15} /></button>
              </div>
              <blockquote>
                Mon entreprise couvre mes séances : je réserve un créneau chez ma coach en deux clics, je valide la séance par QR code et je suis mes progrès. Reprendre le sport n’a jamais été aussi simple — en trois mois, je ne rate plus une séance.
              </blockquote>
              <div className="testimonial-author">
                <span className="testimonial-avatar"><img src={sportive} alt="" loading="lazy" /></span>
                <div>
                  <strong>Sarah Benali</strong>
                  <span>Collaboratrice — Acme Corp</span>
                </div>
              </div>
            </div>
            <img className="testimonial-img" src={sportive} alt="Sarah Benali" />
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════ */}
      <footer className="lp-block footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-left">
              <h2 className="footer-title">Transformer l’effort<br />en excellence.</h2>
              <form className="footer-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Votre email" aria-label="Votre email" />
                <button type="submit" className="btn-circle btn-circle--orange" aria-label="S’inscrire">
                  <ArrowUpRight size={15} color="#fff" />
                </button>
              </form>
            </div>

            <div className="footer-right">
              <nav className="footer-nav">
                <a href="#hero">Accueil</a>
                <a href="#domaines">Domaines</a>
                <a href="#coaches">Coachs</a>
                <a href="#pricing">Tarifs</a>
                <a href={`mailto:${CONTACT.email}`}>Contact</a>
              </nav>
              <div className="footer-cols">
                <div>
                  <h4>Contactez-nous</h4>
                  <p className="footer-contact">
                    <a href={`tel:${CONTACT.phoneHref}`}>{CONTACT.phone}</a>
                    <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                  </p>
                </div>
                <div>
                  <h4>Localisation</h4>
                  <p className="footer-contact">
                    <a
                      href={CONTACT_MAP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {CONTACT.addressLines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </a>
                  </p>
                </div>
                <div className="footer-socials">
                  <a href="#" aria-label="Facebook"><SocialIcon path={<path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.95 2 14.66 2 11.97 2 10 3.66 10 6.7v2.8H7v4h3V22h4v-8.5z" />} /></a>
                  <a href="#" aria-label="Instagram"><SocialIcon path={<path d="M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85C2.42 3.92 3.94 2.38 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.74.07-2.4.11-3.48 1.2-3.59 3.59C3.61 8.9 3.6 9.25 3.6 12s.01 3.1.07 4.34c.11 2.39 1.19 3.48 3.59 3.59 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c2.4-.11 3.48-1.2 3.59-3.59.06-1.24.07-1.59.07-4.34s-.01-3.1-.07-4.34c-.11-2.39-1.19-3.48-3.59-3.59C15.5 4.01 15.15 4 12 4zm0 3.06A4.94 4.94 0 1 1 7.06 12 4.94 4.94 0 0 1 12 7.06zm0 1.8A3.14 3.14 0 1 0 15.14 12 3.14 3.14 0 0 0 12 8.86zm5.15-3.04a1.15 1.15 0 1 1-1.15 1.15 1.15 1.15 0 0 1 1.15-1.15z" />} /></a>
                  <a href="#" aria-label="LinkedIn"><SocialIcon path={<path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.31h4.52V22.7H.24zM8.34 8.31h4.33v1.97h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.92v7.84h-4.51v-6.95c0-1.66-.03-3.79-2.31-3.79-2.31 0-2.66 1.8-2.66 3.67v7.07H8.34z" />} /></a>
                  <a href="#" aria-label="YouTube"><SocialIcon path={<path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.51 3.55 12 3.55 12 3.55s-7.51 0-9.38.5A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.87.5 9.38.5 9.38.5s7.51 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.6 15.6V8.4l6.27 3.6z" />} /></a>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-brand-row">
            <span className="footer-brand">Goupyl Sport</span>
          </div>
        </div>

        <div className="footer-giant" aria-hidden="true">Goupyl Sport</div>
      </footer>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const CSS = `
.lp{
  --bg:#EBEAE6;
  --card:#FFFFFF;
  --tint:#F5F4F1;
  --ink:#171614;
  --ink-2:#4c4a46;
  --ink-3:#8a8781;
  --line:#E4E2DC;
  --orange:#F4530F;
  --dark:#191917;
  font-family:"Inter",system-ui,-apple-system,sans-serif;
  background:var(--bg);
  color:var(--ink);
  display:flex;flex-direction:column;
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
}
.lp *{box-sizing:border-box;margin:0;padding:0}
.lp a{color:inherit;text-decoration:none}
.lp button{font-family:inherit;background:none;border:none;cursor:pointer;color:inherit}
.lp img{max-width:100%}
.lp s{text-decoration-thickness:1.5px}


/* ── Défilement fluide vers les ancres de la nav ─────────────────── */
html{scroll-behavior:smooth}
/* La cible s'arrête un peu avant le haut de l'écran, pas collée au bord */
.lp-block[id]{scroll-margin-top:24px}
/* Respecte les préférences système « réduire les animations » */
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .lp *,.lp *::before,.lp *::after{transition-duration:.01ms !important;animation-duration:.01ms !important}
}

.lp-block{background:var(--card)}
.lp-block--tint{background:var(--tint)}
.wrap{max-width:1240px;margin:0 auto;padding:0 40px}
.section-pad{padding-top:88px;padding-bottom:88px}
.section-pad--center{display:flex;flex-direction:column;align-items:center;text-align:center}

/* ── Typo ─────────────────────────────────── */
.h2{font-size:46px;font-weight:600;letter-spacing:-.03em;line-height:1.08}
.h2--xl{font-size:54px}
.h2--center{margin-top:26px}
.h2 em{font-style:italic;color:var(--orange);font-weight:500}
.section-sub{margin-top:16px;font-size:14.5px;color:var(--ink-2);line-height:1.55}

/* ── Chip ─────────────────────────────────── */
.chip{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--ink)}
.chip-dot{width:5px;height:5px;border-radius:50%;background:var(--orange)}

/* ── Boutons ──────────────────────────────── */
.btn-pill{display:inline-flex;align-items:center;gap:12px;border-radius:999px;padding:6px 6px 6px 22px;font-size:15px;font-weight:500;white-space:nowrap;transition:transform .15s ease,background-color .2s ease,color .2s ease}
.btn-pill:hover{transform:translateY(-1px)}
.btn-pill:active{transform:translateY(0) scale(.98)}
.lp .btn-pill--white{background:#fff;color:var(--ink)}
.lp .btn-pill--outline{background:#fff;color:var(--ink);border:1px solid var(--orange)}
.lp .btn-pill--orange{background:var(--orange);color:#fff}
.btn-circle{width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.btn-circle--orange{background:linear-gradient(145deg,#FF7A33,#F4530F)}
.btn-circle--white{background:#fff}

/* ── Photos ───────────────────────────────────
   Toutes les photos sont recadrées en "cover" : quel que soit le
   format du fichier fourni, il remplit son cadre sans déformation. */
.hero-bg,.focus-card-bg,.how-img-main,.how-thumb,
.plan-bg,.testimonial-img,.coach-card-img{
  display:block;width:100%;height:100%;object-fit:cover;background:#DFDDD7
}

/* ── Avatars ──────────────────────────────── */
.avstack{display:flex;align-items:center;background:#fff;border-radius:999px;padding:4px;width:max-content}
.av{width:var(--av-size,40px);height:var(--av-size,40px);border-radius:50%;background:linear-gradient(145deg,#E0DED8,#C9C7C1);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#5f5d58;overflow:hidden}
.av-img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}
.av + .av{margin-left:calc(var(--av-size,40px) * -0.32)}
.av--badge{background:#171614;color:#fff;font-size:11px;font-weight:600;letter-spacing:.01em}

/* ═══ HERO ═════════════════════════════════ */
.hero-block{padding:20px}
.hero{position:relative;border-radius:22px;overflow:hidden;min-height:640px;height:calc(100vh - 40px);max-height:820px}
.hero-bg{position:absolute;inset:0;border-radius:0}
/* Voile sombre : garde le titre blanc lisible sur une photo claire */
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,.30) 0%,rgba(15,15,15,.10) 40%,rgba(15,15,15,.55) 100%);pointer-events:none;z-index:1}
.hero-inner{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;padding:26px 40px 44px;color:#fff}
.hero-nav{display:flex;align-items:center;justify-content:space-between;position:relative}
.hero-nav-links{display:flex;gap:30px;font-size:15px;font-weight:500}
.hero-nav-links a{opacity:.95;transition:opacity .2s ease}
.hero-nav-links a:hover{opacity:.7; color: #F8601B}
.hero-logo{width:20%;position:absolute;left:50%;transform:translateX(-50%);font-size:21px;font-weight:800;letter-spacing:-.02em;white-space:nowrap}
.hero-social{margin-top:44px;display:flex;flex-direction:column;gap:14px}
.hero-social p{font-size:15.5px;font-weight:500;line-height:1.4}
.hero-desc{margin-top:auto;max-width:360px;font-size:17px;line-height:1.5;font-weight:400;margin-bottom:34px}
.hero-title{font-size:clamp(64px,8.6vw,124px);font-weight:700;letter-spacing:-.025em;line-height:.96}

/* ═══ FOCUS ════════════════════════════════ */
.focus-head{display:flex;justify-content:space-between;align-items:flex-start;gap:40px}
.focus-head-left{display:flex;flex-direction:column;gap:26px}
.focus-tagline{font-size:14px;font-weight:500;line-height:1.5;color:var(--ink)}
.focus-head .h2{text-align:left}
.focus-grid{margin-top:54px;display:grid;grid-template-columns:1fr 1fr 1.45fr;grid-template-rows:auto auto;gap:18px}
.focus-card{position:relative;border-radius:14px;overflow:hidden}
.focus-card--small{height:170px}
.focus-card--big{grid-column:3;grid-row:1 / span 2;height:100%;min-height:330px}
.focus-card-bg{position:absolute;inset:0;border-radius:0}
/* Voile sombre : garde les légendes blanches lisibles, y compris quand elles
   passent sur plusieurs lignes (mobile) — le dégradé démarre donc très haut. */
.focus-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,0) 0%,rgba(15,15,15,.22) 28%,rgba(15,15,15,.55) 55%,rgba(15,15,15,.82) 100%);pointer-events:none;z-index:1}
.lp .card-arrow{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:#fff;color:var(--ink);display:flex;align-items:center;justify-content:center;z-index:2;text-decoration:none;transition:transform .15s ease,background-color .2s ease,color .2s ease}
.lp .card-arrow:hover{background:var(--orange);color:#fff;transform:scale(1.08)}
.lp .card-arrow:active{transform:scale(.94)}
.focus-card-caption{position:absolute;left:16px;right:52px;bottom:14px;color:#fff;z-index:2;text-shadow:0 1px 3px rgba(0,0,0,.5)}
.focus-card-caption h3{font-size:15.5px;font-weight:600;letter-spacing:-.01em}
.focus-card-caption p{font-size:11px;margin-top:4px;opacity:.92;line-height:1.4}
.focus-card-caption--big h3{font-size:26px}
.focus-card-caption--big p{font-size:12.5px;margin-top:6px}
.focus-proof{grid-column:1 / span 2;display:flex;align-items:center;gap:16px;padding-top:8px}
.focus-proof .avstack{background:var(--tint)}
.focus-proof p{font-size:15px;font-weight:500;line-height:1.4}

/* ═══ COMMENT ÇA MARCHE ════════════════════ */
.how-top{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:start}
.how-img-main{height:400px;border-radius:16px}
.how-content{display:flex;flex-direction:column;align-items:flex-start;gap:22px;padding-top:8px}
.how-desc{font-size:15px;color:var(--ink-2);line-height:1.55;max-width:400px}
.how-bottom{margin-top:22px;display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}
.how-thumbs{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.how-thumb{height:160px;border-radius:14px}
.how-step{display:flex;gap:28px;align-items:flex-start}
.how-step-num{font-size:34px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:baseline;flex-shrink:0}
.how-step-num span{font-size:14px;color:var(--ink-3);font-weight:500;margin-left:2px}
.how-step-num i{display:block;width:74px;height:1px;background:var(--ink);align-self:center;margin-left:18px}
.how-step-text h3{font-size:22px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.how-step-text p{margin-top:10px;font-size:12.5px;color:var(--ink-2);line-height:1.5;max-width:300px}

/* ═══ COACHS ═══════════════════════════════ */
.coaches-head{margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end;gap:40px}
.coaches-sub{margin-top:18px;font-size:14.5px;color:var(--ink-2);line-height:1.55;max-width:420px}
.coaches-tabs{display:flex;gap:6px;flex-wrap:wrap}
/* Préfixé .lp pour passer devant la règle générique « .lp a{color:inherit} » */
.lp .tab{padding:9px 18px;border-radius:999px;font-size:13.5px;font-weight:500;color:var(--ink-2);background:transparent;text-decoration:none;transition:background-color .25s ease,color .25s ease,transform .15s ease}
.lp .tab:hover{background:var(--orange);color:#fff}
.lp .tab:active{transform:scale(.97)}
.coaches-grid{margin-top:44px;display:grid;grid-template-columns:repeat(4,1fr);gap:22px;align-items:start}
.coach-card{position:relative;border-radius:16px;height:340px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.coach-card--a{background:linear-gradient(150deg,#C4553B,#8E3323);color:#f3d9d0}
.coach-card--b{background:linear-gradient(150deg,#D8D6D1,#B4B2AC);color:#6a6863}
.coach-card--c{background:linear-gradient(150deg,#EFEDE8,#D5D3CD);color:#8a8781}
.coach-card--d{background:linear-gradient(150deg,#3E4657,#232936);color:#aab2c2}
.coach-card-img{position:absolute;inset:0}
/* Voile sombre : garde le nom du coach lisible */
.coach-card::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,0) 45%,rgba(15,15,15,.5) 100%);pointer-events:none;z-index:1}
.coach-label{position:absolute;z-index:2;left:12px;right:12px;bottom:12px;background:rgba(255,255,255,.16);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:12px 16px;text-align:center;color:#fff;display:flex;flex-direction:column;gap:2px}
.coach-label strong{font-size:16px;font-weight:600}
.coach-label span{font-size:11.5px;opacity:.85}

/* ═══ TARIFS ═══════════════════════════════ */
.cycle-switch{margin-top:34px;display:inline-flex;align-items:center;gap:4px;padding:4px;border:1px solid var(--line);border-radius:999px;background:var(--tint)}
.cycle-opt{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:9px 20px;font-size:13.5px;font-weight:600;color:var(--ink-3);white-space:nowrap;transition:background-color .2s ease,color .2s ease}
.cycle-opt:hover{color:var(--ink)}
.cycle-opt.is-active{background:var(--dark);color:#fff}
.cycle-save{font-size:11px;font-weight:700;letter-spacing:.02em;color:#fff;background:var(--orange);border-radius:999px;padding:2px 7px}
.cycle-opt:not(.is-active) .cycle-save{background:rgba(244,83,15,.12);color:var(--orange)}
.plans{margin-top:52px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;width:100%}
.plan{position:relative;border-radius:20px;overflow:hidden;background:var(--dark);color:#fff;padding:26px 26px 34px;min-height:430px;display:flex;flex-direction:column}
.plan-bg{position:absolute;inset:0;border-radius:0}
.plan-bg + .plan-avatars,.plan--image .plan-body{position:relative}
.plan--image::before{content:"";position:absolute;inset:0;background:rgba(15,15,20,.38);z-index:1}
.plan > :not(.plan-bg){position:relative;z-index:2}
.plan-avatars{display:flex;justify-content:flex-end}
.plan-avatars .avstack{background:transparent;padding:0}
.plan-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;text-align:center}
.plan-price{font-size:30px;font-weight:600;letter-spacing:-.02em}
.plan-price s{font-size:18px;color:rgba(255,255,255,.5);font-weight:500;margin-left:2px}
.plan-cycle{margin-top:24px;font-size:12.5px;font-weight:500;color:#FF9C6B}
.plan-billed{display:block;margin-top:5px;font-size:11.5px;color:rgba(255,255,255,.7)}
.plan-name{margin-top:8px;font-size:27px;font-weight:600;letter-spacing:-.02em}
.plan .btn-pill{margin-top:22px;padding:5px 5px 5px 20px;font-size:14px}
.plan .btn-circle{width:34px;height:34px}
.plan-desc{margin-top:34px;font-size:13px;line-height:1.6;color:rgba(255,255,255,.85);max-width:420px}

/* ═══ TÉMOIGNAGE ═══════════════════════════ */
.testimonial{margin-top:56px;display:grid;grid-template-columns:1fr 1.1fr;gap:56px;width:100%;text-align:left;align-items:stretch}
.testimonial-left{display:flex;flex-direction:column;position:relative;padding-top:6px}
.quote-mark{font-size:150px;line-height:.7;font-weight:800;color:#DCDAD4;letter-spacing:-.12em;user-select:none;height:90px}
.testimonial-arrows{position:absolute;top:6px;right:0;display:flex;gap:10px}
.arrow-btn{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink);transition:transform .15s ease,background-color .2s ease,border-color .2s ease}
.arrow-btn:hover{background:var(--tint)}
.arrow-btn:active{transform:scale(.93)}
.arrow-btn--orange{background:var(--orange);border-color:var(--orange);color:#fff}
.testimonial blockquote{margin-top:34px;font-size:17px;line-height:1.65;color:var(--ink);max-width:480px}
.testimonial-author{margin-top:auto;padding-top:38px;display:flex;align-items:center;gap:12px}
.testimonial-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(145deg,#E0DED8,#C9C7C1);display:flex;align-items:center;justify-content:center;color:#5f5d58;flex-shrink:0;overflow:hidden}
.testimonial-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.testimonial-author div{display:flex;flex-direction:column}
.testimonial-author strong{font-size:14.5px;font-weight:600}
.testimonial-author span{font-size:12px;color:var(--ink-3)}
.testimonial-img{height:440px;border-radius:16px}

/* ═══ FOOTER ═══════════════════════════════ */
.footer{padding-top:88px;overflow:hidden}
.footer-top{display:grid;grid-template-columns:1fr 1.1fr;gap:64px;align-items:start}
.footer-title{font-size:36px;font-weight:600;letter-spacing:-.025em;line-height:1.15}
.footer-form{margin-top:30px;display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;padding:5px 5px 5px 22px;max-width:340px;background:#fff}
.footer-form input{flex:1;border:none;outline:none;font-family:inherit;font-size:14px;color:var(--ink);background:transparent;min-width:0}
.footer-form input::placeholder{color:var(--ink-3)}
.footer-form .btn-circle{width:36px;height:36px;cursor:pointer}
.footer-nav{display:flex;gap:28px;font-size:14px;font-weight:500;justify-content:flex-end;flex-wrap:wrap}
.footer-nav a:hover{color:var(--orange)}
.footer-cols{margin-top:54px;display:flex;justify-content:flex-end;gap:56px;flex-wrap:wrap;align-items:flex-start}
.footer-cols h4{font-size:13.5px;font-weight:600;margin-bottom:10px}
.footer-cols p{font-size:13px;color:var(--ink-2);line-height:1.6}
/* Coordonnées cliquables : une ligne par lien, cible tactile confortable */
.footer-contact{display:flex;flex-direction:column;align-items:flex-start}
.lp .footer-contact a{color:var(--ink-2);display:flex;flex-direction:column;padding:2px 0;transition:color .2s ease}
.lp .footer-contact a:hover,.lp .footer-contact a:focus-visible{color:var(--orange);text-decoration:underline}
.footer-socials{display:flex;gap:8px}
.footer-socials a{width:32px;height:32px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--ink)}
.footer-socials a:hover{background:var(--ink);color:#fff;border-color:var(--ink)}
.footer-brand-row{margin-top:70px;padding:26px 0;border-top:1px solid var(--line)}
.footer-brand{font-size:22px;font-weight:800;letter-spacing:-.02em}
.footer-giant{font-size:clamp(60px,12.6vw,210px);font-weight:900;letter-spacing:-.05em;line-height:.82;text-align:center;white-space:nowrap;color:var(--ink);padding:10px 0 0;transform:translateY(6%)}

/* ═══ RESPONSIVE ═══════════════════════════ */
@media (max-width:1024px){
  .h2{font-size:38px}
  .h2--xl{font-size:42px}
  .focus-grid{grid-template-columns:1fr 1fr}
  .focus-card--big{grid-column:1 / span 2;grid-row:auto;min-height:280px}
  .focus-proof{grid-column:1 / span 2}
  .how-top,.how-bottom,.testimonial,.footer-top{grid-template-columns:1fr;gap:36px}
  .coaches-grid{grid-template-columns:repeat(2,1fr)}
  .coach-card{margin-top:0!important}
  .plans{grid-template-columns:1fr}
  .footer-nav,.footer-cols{justify-content:flex-start}
}
@media (max-width:640px){
  .wrap{padding:0 20px}
  .section-pad{padding-top:60px;padding-bottom:60px}
  .hero-block{padding:10px}
  .hero{height:auto;min-height:560px}
  .hero-inner{padding:20px 20px 30px}
  .hero-nav-links{display:none}
  .hero-logo{position:static;transform:none}
  .hero-title{font-size:52px}
  .h2,.h2--xl{font-size:31px}
  .coaches-head{flex-direction:column;align-items:flex-start;gap:24px}
  .coaches-grid{grid-template-columns:1fr}
  .focus-head{flex-direction:column}
  /* Légendes plus hautes sur petit écran : on agrandit la carte et on assombrit
     davantage le voile pour que le titre reste lisible sur les photos claires. */
  .focus-card--small{height:215px}
  .focus-card::after{background:linear-gradient(180deg,rgba(15,15,15,.12) 0%,rgba(15,15,15,.42) 32%,rgba(15,15,15,.72) 66%,rgba(15,15,15,.88) 100%)}
  .how-step{flex-direction:column;gap:16px}
  .footer-giant{white-space:normal;line-height:.9}
}
`;
