import { useState, useEffect } from 'react';
import { coachServiceApi } from '../../services/coachService.api';
import Spinner from '../../components/ui/Spinner';
import { Plus, Pencil, X, Clock, Zap, Leaf, Heart, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORY_LABELS } from '../../utils/constants';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const CATEGORY_ICONS = {
  SPORT: Zap,
  NUTRITION: Leaf,
  MENTAL: Heart,
  BIENETRE: Heart,
};

const SESSION_TYPE_OPTIONS = [
  { value: 'SOLO', label: 'Individuel' },
  { value: 'DUO', label: 'Duo (2 pers.)' },
  { value: 'GROUP', label: 'Collectif' },
];

const EMPTY_SERVICE_FORM = {
  name: '',
  description: '',
  durationMinutes: 60,
  price: '',
  category: 'SPORT',
  sessionType: 'SOLO',
  maxParticipants: '',
};

const SV_CSS = `
  .sv-form{background:#FAF9F7;border:1px solid var(--line);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:16px;margin-bottom:20px}
  .sv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
  @media(max-width:900px){.sv-grid{grid-template-columns:1fr}}
  .sv-card{position:relative;border:1px solid var(--line);border-radius:16px;padding:18px 20px;background:#fff;transition:border-color .2s,box-shadow .2s}
  .sv-card:hover{border-color:#c9c7c1;box-shadow:0 6px 18px rgba(23,22,20,.06)}
  .sv-card.is-off{opacity:.6;background:#FAF9F7}
  .sv-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
  .sv-cat{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:5px 12px;border-radius:999px;background:var(--orange-soft);color:var(--orange)}
  .sv-actions{display:flex;gap:6px;flex-shrink:0}
  .sv-icon-btn{width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:#fff;color:var(--ink-3);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:border-color .15s,color .15s}
  .sv-icon-btn:hover{border-color:#c9c7c1;color:var(--ink)}
  .sv-icon-btn.is-danger:hover{border-color:#EFC7BE;color:#C0392B;background:#FBEAE7}
  .sv-name{font-size:15px;font-weight:600;letter-spacing:-.01em;color:var(--ink);margin:0}
  .sv-desc{font-size:12.5px;color:var(--ink-3);line-height:1.5;margin:6px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .sv-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}
  .sv-dur{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:500;color:var(--ink-3)}
  .sv-price{font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--ink);margin-left:auto}
`;

export default function MyServices() {
  const [loading, setLoading] = useState(true);
  const [coachServices, setCoachServices] = useState([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [savingService, setSavingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ ...EMPTY_SERVICE_FORM });

  const loadCoachServices = () => {
    coachServiceApi
      .getMine()
      .then(({ data }) => setCoachServices(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCoachServices();
  }, []);

  const openAddServiceForm = () => {
    setEditingServiceId(null);
    setServiceForm({ ...EMPTY_SERVICE_FORM });
    setShowServiceForm(true);
  };

  const openEditServiceForm = (svc) => {
    setEditingServiceId(svc.id);
    setServiceForm({
      name: svc.name,
      description: svc.description || '',
      durationMinutes: svc.durationMinutes,
      price: Number(svc.price),
      category: svc.category,
      sessionType: svc.sessionType || 'SOLO',
      maxParticipants: svc.maxParticipants ?? '',
    });
    setShowServiceForm(true);
  };

  const cancelServiceForm = () => {
    setShowServiceForm(false);
    setEditingServiceId(null);
    setServiceForm({ ...EMPTY_SERVICE_FORM });
  };

  const handleSaveService = async () => {
    if (!serviceForm.name.trim() || !serviceForm.price) {
      toast.error('Nom et prix sont requis');
      return;
    }
    setSavingService(true);
    try {
      const payload = {
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || undefined,
        durationMinutes: serviceForm.durationMinutes,
        price: parseFloat(serviceForm.price),
        category: serviceForm.category,
        sessionType: serviceForm.sessionType,
        maxParticipants: serviceForm.sessionType !== 'SOLO' && serviceForm.maxParticipants !== ''
          ? parseInt(serviceForm.maxParticipants, 10)
          : null,
      };
      if (editingServiceId) {
        await coachServiceApi.update(editingServiceId, payload);
        toast.success('Service mis a jour');
      } else {
        await coachServiceApi.create(payload);
        toast.success('Service cree');
      }
      cancelServiceForm();
      loadCoachServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id) => {
    try {
      await coachServiceApi.remove(id);
      toast.success('Service desactive');
      loadCoachServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="dsh-page" style={{ maxWidth: 920 }}>
      <style>{SV_CSS}</style>

      <div className="dsh-page-head">
        <div>
          <h1 className="dsh-h1">Mes services</h1>
          <p className="dsh-sub">Créez et gérez les prestations que vos clients peuvent réserver</p>
        </div>
        {!showServiceForm && (
          <button type="button" onClick={openAddServiceForm} className="dsh-btn dsh-btn--orange">
            <Plus size={15} /> Ajouter un service
          </button>
        )}
      </div>

      {/* Formulaire d'ajout / édition */}
      {showServiceForm && (
        <div className="sv-form">
          <h2 className="dsh-card-title">
            {editingServiceId ? 'Modifier le service' : 'Nouveau service'}
          </h2>

          <div className="sv-grid">
            <div>
              <label className="dsh-label" htmlFor="svcName">Nom du service</label>
              <input
                id="svcName"
                className="dsh-input"
                value={serviceForm.name}
                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                placeholder="Coaching sportif"
              />
            </div>
            <div>
              <label className="dsh-label" htmlFor="svcCat">Catégorie</label>
              <select
                id="svcCat"
                className="dsh-select"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="dsh-label" htmlFor="svcDesc">Description</label>
            <textarea
              id="svcDesc"
              className="dsh-textarea"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              placeholder="Décrivez votre service..."
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="sv-grid">
            <div>
              <label className="dsh-label" htmlFor="svcDur">Durée</label>
              <select
                id="svcDur"
                className="dsh-select"
                value={serviceForm.durationMinutes}
                onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: parseInt(e.target.value) })}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className="dsh-label" htmlFor="svcPrice">Prix (€)</label>
              <input
                id="svcPrice"
                className="dsh-input"
                type="number"
                min={0}
                step={0.01}
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                placeholder="50"
              />
            </div>
          </div>

          <div>
            <span className="dsh-label">Type de session</span>
            <div className="dsh-chips">
              {SESSION_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setServiceForm({ ...serviceForm, sessionType: opt.value, ...(opt.value === 'SOLO' ? { maxParticipants: '' } : {}) })}
                  className={`dsh-chip${serviceForm.sessionType === opt.value ? ' is-active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {serviceForm.sessionType !== 'SOLO' && (
            <div>
              <label className="dsh-label" htmlFor="svcMax">Nombre max de participants</label>
              <input
                id="svcMax"
                className="dsh-input"
                type="number"
                min={2}
                max={50}
                value={serviceForm.maxParticipants}
                onChange={(e) => setServiceForm({ ...serviceForm, maxParticipants: e.target.value })}
                placeholder="10"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSaveService} disabled={savingService} className="dsh-btn dsh-btn--orange">
              {savingService ? 'Enregistrement…' : editingServiceId ? 'Mettre à jour' : 'Créer le service'}
            </button>
            <button type="button" onClick={cancelServiceForm} className="dsh-btn dsh-btn--ghost">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Grille des services */}
      {coachServices.length === 0 && !showServiceForm ? (
        <div className="dsh-empty">
          <Package size={26} />
          Aucun service configuré pour le moment.
        </div>
      ) : (
        <div className="sv-grid">
          {coachServices.map((svc) => {
            const Icon = CATEGORY_ICONS[svc.category] || Zap;
            return (
              <div key={svc.id} className={`sv-card${svc.active ? '' : ' is-off'}`}>
                <div className="sv-card-top">
                  <span className="sv-cat">
                    <Icon size={12} />
                    {CATEGORY_LABELS[svc.category] || svc.category}
                  </span>
                  <div className="sv-actions">
                    <button
                      type="button"
                      onClick={() => openEditServiceForm(svc)}
                      className="sv-icon-btn"
                      title="Modifier"
                    >
                      <Pencil size={13} />
                    </button>
                    {svc.active && (
                      <button
                        type="button"
                        onClick={() => handleDeleteService(svc.id)}
                        className="sv-icon-btn is-danger"
                        title="Désactiver"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="sv-name">{svc.name}</p>
                {svc.description && <p className="sv-desc">{svc.description}</p>}

                <div className="sv-meta">
                  <span className="sv-dur"><Clock size={13} /> {svc.durationMinutes} min</span>
                  {svc.sessionType && svc.sessionType !== 'SOLO' && (
                    <span className="dsh-badge dsh-badge--neutral">
                      {svc.sessionType === 'DUO' ? 'Duo' : `Collectif${svc.maxParticipants ? ` (${svc.maxParticipants} max)` : ''}`}
                    </span>
                  )}
                  {!svc.active && <span className="dsh-badge dsh-badge--err"><i />Désactivé</span>}
                  <span className="sv-price">{Number(svc.price).toFixed(2)} €</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
