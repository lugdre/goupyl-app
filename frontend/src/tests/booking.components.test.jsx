import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockCancel = vi.fn();
const mockGetBusySlots = vi.fn();
const mockGetMyBusySlots = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../services/appointment.api', () => ({
  appointmentApi: {
    cancel: (...args) => mockCancel(...args),
    getBusySlots: (...args) => mockGetBusySlots(...args),
    getMyBusySlots: (...args) => mockGetMyBusySlots(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: (...a) => mockToastSuccess(...a), error: (...a) => mockToastError(...a) },
}));

const CancellationModal = (await import('../components/appointment/CancellationModal')).default;
const SlotPicker = (await import('../components/booking/SlotPicker')).default;

const HOUR = 3_600_000;

beforeEach(() => {
  mockCancel.mockReset().mockResolvedValue({ data: { success: true } });
  mockGetBusySlots.mockReset().mockResolvedValue({ data: [] });
  mockGetMyBusySlots.mockReset().mockResolvedValue({ data: [] });
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
});

const appointmentIn = (hours, over = {}) => ({
  id: 1,
  scheduledAt: new Date(Date.now() + hours * HOUR).toISOString(),
  coachService: { name: 'Coaching personnalisé', price: 50 },
  intervenant: { firstName: 'Marc', lastName: 'Leroy' },
  paymentStatus: 'paid',
  ...over,
});

/**
 * La politique d'annulation est dupliquée entre le service backend et cette
 * modale. Les deux doivent afficher/appliquer les mêmes paliers : ces tests
 * sont le miroir frontend de appointment.cancel.test.js côté serveur.
 */
describe('CancellationModal — paliers de remboursement', () => {
  it.each([
    ['à 10 jours',   240, 'Plus de 7 jours avant',  '50.00 €', '100%'],
    ['à 3 jours',     72, 'Entre 7 jours et 48h',   '25.00 €', '50%'],
    ['à 24 heures',   24, 'Moins de 48h',           '0.00 €',  '0%'],
  ])('annonce le bon palier %s', async (_label, hours, tierLabel, montant, pourcentage) => {
    render(<CancellationModal appointment={appointmentIn(hours)} onClose={vi.fn()} />);

    // Les trois paliers sont toujours listés ; seul le palier applicable est
    // chiffré. On vise la ligne « Remboursement » plutôt que le montant seul :
    // à 100 %, celui-ci est identique au total payé et apparaît deux fois.
    expect(screen.getByText(tierLabel)).toBeInTheDocument();
    const ligneRemboursement = screen.getByText(`Remboursement (${pourcentage})`).closest('.gm-row');
    expect(ligneRemboursement).toHaveTextContent(montant);
  });

  it.each([
    ['juste au-dessus de 7 jours', 168.5, '100%'],
    ['juste en dessous de 7 jours', 167.5, '50%'],
    ['juste au-dessus de 48 h',      48.5, '50%'],
    ['juste en dessous de 48 h',     47.5, '0%'],
  ])('bascule correctement à la borne %s', async (_label, hours, pourcentage) => {
    render(<CancellationModal appointment={appointmentIn(hours)} onClose={vi.fn()} />);

    expect(screen.getByText(`Remboursement (${pourcentage})`)).toBeInTheDocument();
  });

  it('affiche les trois paliers pour informer l\'utilisateur', () => {
    render(<CancellationModal appointment={appointmentIn(240)} onClose={vi.fn()} />);

    expect(screen.getByText('Plus de 7 jours avant')).toBeInTheDocument();
    expect(screen.getByText('Entre 7 jours et 48h')).toBeInTheDocument();
    expect(screen.getByText('Moins de 48h')).toBeInTheDocument();
  });

  it('indique une annulation sans frais quand la séance n\'a pas été payée', () => {
    render(<CancellationModal appointment={appointmentIn(24, { paymentStatus: 'unpaid' })} onClose={vi.fn()} />);

    expect(screen.getByText(/l'annulation est sans frais/i)).toBeInTheDocument();
    expect(screen.queryByText(/Remboursement \(/)).not.toBeInTheDocument();
  });

  // Règle du modèle de données : un rendez-vous porte soit un CoachService,
  // soit un Service plateforme. L'affichage doit gérer les deux.
  it('retombe sur le Service plateforme quand il n\'y a pas de CoachService', () => {
    const appt = appointmentIn(240, { coachService: null, service: { name: 'Atelier posture', price: 40 } });
    render(<CancellationModal appointment={appt} onClose={vi.fn()} />);

    expect(screen.getByText('Atelier posture')).toBeInTheDocument();
    expect(screen.getByText('Total payé').closest('.gm-row')).toHaveTextContent('40.00 €');
  });

  it('libelle « Séance » quand aucune prestation n\'est rattachée', () => {
    const appt = appointmentIn(240, { coachService: null, service: null });
    render(<CancellationModal appointment={appt} onClose={vi.fn()} />);

    expect(screen.getByText('Séance')).toBeInTheDocument();
  });
});

describe('CancellationModal — confirmation', () => {
  it('appelle l\'API puis notifie le parent du succès', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<CancellationModal appointment={appointmentIn(240)} onClose={onClose} onSuccess={onSuccess} />);

    await userEvent.click(screen.getByRole('button', { name: /confirmer l'annulation/i }));

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(1, undefined));
    expect(mockToastSuccess).toHaveBeenCalledWith('Rendez-vous annulé');
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('transmet le motif saisi', async () => {
    render(<CancellationModal appointment={appointmentIn(240)} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/motif d'annulation/i), 'Imprévu professionnel');
    await userEvent.click(screen.getByRole('button', { name: /confirmer l'annulation/i }));

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(1, 'Imprévu professionnel'));
  });

  it('affiche le message d\'erreur du serveur en cas d\'échec, sans fermer la modale', async () => {
    const onClose = vi.fn();
    mockCancel.mockRejectedValue({ response: { data: { message: 'Ce rendez-vous ne peut plus être annulé.' } } });
    render(<CancellationModal appointment={appointmentIn(240)} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /confirmer l'annulation/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Ce rendez-vous ne peut plus être annulé.'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ferme la modale sans rien annuler via le bouton Retour', async () => {
    const onClose = vi.fn();
    render(<CancellationModal appointment={appointmentIn(240)} onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: /retour/i }));

    expect(onClose).toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });
});

/**
 * La grille dépend entièrement de la date du jour : le nombre de créneaux
 * affichés change selon le jour de la semaine, et les heures passées
 * disparaissent. On fige donc l'horloge au lundi 14 septembre 2026 à 06h00 —
 * avant l'ouverture, semaine entièrement à venir : les 7 jours affichent alors
 * la grille complète, quel que soit le moment où la suite est exécutée.
 *
 * Seul `Date` est simulé : les minuteries restent réelles, sans quoi
 * `waitFor` et `userEvent` se bloqueraient.
 */
const LUNDI_REFERENCE = new Date(2026, 8, 14, 6, 0, 0);

describe('SlotPicker — grille hebdomadaire de créneaux', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(LUNDI_REFERENCE);
  });
  afterEach(() => vi.useRealTimers());

  it('interroge l\'agenda du coach sur la semaine affichée', async () => {
    render(<SlotPicker intervenantId={200} durationMinutes={60} />);

    await waitFor(() => expect(mockGetBusySlots).toHaveBeenCalled());
    const [id, from, to] = mockGetBusySlots.mock.calls[0];
    expect(id).toBe(200);
    expect(Math.round((new Date(to) - new Date(from)) / (24 * HOUR))).toBe(7);
  });

  it('affiche les 7 jours de la semaine', async () => {
    render(<SlotPicker intervenantId={200} />);

    await waitFor(() => expect(screen.getByText('Lun')).toBeInTheDocument());
    ['Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].forEach((jour) => {
      expect(screen.getByText(jour)).toBeInTheDocument();
    });
  });

  // La plage 07h00–21h00 doit être identique à celle contrôlée par le serveur
  // dans appointment.service.create.
  it('propose des créneaux de 07h00 à 20h00 inclus pour une séance d\'une heure', async () => {
    render(<SlotPicker intervenantId={200} durationMinutes={60} />);

    await waitFor(() => expect(screen.getAllByText('07:00').length).toBeGreaterThan(0));
    expect(screen.getAllByText('20:00').length).toBeGreaterThan(0);
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
    expect(screen.queryByText('21:00')).not.toBeInTheDocument();
  });

  it('adapte le pas de la grille à la durée de la prestation', async () => {
    render(<SlotPicker intervenantId={200} durationMinutes={30} />);

    await waitFor(() => expect(screen.getAllByText('07:00').length).toBeGreaterThan(0));
    expect(screen.getAllByText('07:30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('20:30').length).toBeGreaterThan(0);
  });

  it('affiche les 14 créneaux horaires sur chacun des 7 jours à venir', async () => {
    render(<SlotPicker intervenantId={200} durationMinutes={60} />);

    await waitFor(() => expect(screen.getAllByText('10:00')).toHaveLength(7));
  });

  it('masque le créneau chevauché par un rendez-vous du coach, ce jour-là seulement', async () => {
    const mercredi10h = new Date(2026, 8, 16, 10, 0, 0);
    mockGetBusySlots.mockResolvedValue({
      data: [{ start: mercredi10h.toISOString(), end: new Date(mercredi10h.getTime() + HOUR).toISOString() }],
    });

    render(<SlotPicker intervenantId={200} durationMinutes={60} />);

    // 10h disparaît du mercredi mais reste sur les 6 autres jours ; 09h intact.
    await waitFor(() => expect(screen.getAllByText('10:00')).toHaveLength(6));
    expect(screen.getAllByText('09:00')).toHaveLength(7);
  });

  it('masque tous les créneaux couverts par une indisponibilité longue', async () => {
    const jeudi9h = new Date(2026, 8, 17, 9, 0, 0);
    mockGetBusySlots.mockResolvedValue({
      data: [{ start: jeudi9h.toISOString(), end: new Date(jeudi9h.getTime() + 3 * HOUR).toISOString() }],
    });

    render(<SlotPicker intervenantId={200} durationMinutes={60} />);

    await waitFor(() => expect(screen.getAllByText('09:00')).toHaveLength(6));
    expect(screen.getAllByText('10:00')).toHaveLength(6);
    expect(screen.getAllByText('11:00')).toHaveLength(6);
    expect(screen.getAllByText('12:00')).toHaveLength(7); // hors plage occupée
  });

  it('fusionne les indisponibilités du coach et celles du client', async () => {
    const mardi14h = new Date(2026, 8, 15, 14, 0, 0);
    const mercredi14h = new Date(2026, 8, 16, 14, 0, 0);
    mockGetBusySlots.mockResolvedValue({
      data: [{ start: mardi14h.toISOString(), end: new Date(mardi14h.getTime() + HOUR).toISOString() }],
    });
    mockGetMyBusySlots.mockResolvedValue({
      data: [{ start: mercredi14h.toISOString(), end: new Date(mercredi14h.getTime() + HOUR).toISOString() }],
    });

    render(<SlotPicker intervenantId={200} durationMinutes={60} fetchClientBusy />);

    await waitFor(() => expect(screen.getAllByText('14:00')).toHaveLength(5));
  });

  // Option activée dans le parcours de réservation : le client ne doit pas
  // pouvoir se réserver deux séances au même moment.
  it('interroge aussi l\'agenda du client quand fetchClientBusy est actif', async () => {
    render(<SlotPicker intervenantId={200} fetchClientBusy />);

    await waitFor(() => expect(mockGetMyBusySlots).toHaveBeenCalled());
  });

  it('n\'interroge pas l\'agenda du client par défaut', async () => {
    render(<SlotPicker intervenantId={200} />);

    await waitFor(() => expect(mockGetBusySlots).toHaveBeenCalled());
    expect(mockGetMyBusySlots).not.toHaveBeenCalled();
  });

  it('remonte le créneau choisi au formulaire de réservation', async () => {
    const onSelect = vi.fn();
    render(<SlotPicker intervenantId={200} durationMinutes={60} onSelect={onSelect} />);

    await waitFor(() => expect(screen.getAllByText('09:00').length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByText('09:00')[0]);

    expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  it('n\'émet aucune sélection en mode lecture seule (aperçu de profil public)', async () => {
    const onSelect = vi.fn();
    render(<SlotPicker intervenantId={200} durationMinutes={60} onSelect={onSelect} readOnly />);

    await waitFor(() => expect(screen.getAllByText('09:00').length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByText('09:00')[0]);

    expect(onSelect).not.toHaveBeenCalled();
  });

  // On ne réserve pas dans le passé : la navigation arrière s'arrête à la
  // semaine courante.
  it('désactive le retour à la semaine précédente sur la semaine en cours', async () => {
    render(<SlotPicker intervenantId={200} />);

    await waitFor(() => expect(screen.getByLabelText('Semaine précédente')).toBeDisabled());
  });

  it('recharge l\'agenda au passage à la semaine suivante, et réactive le retour', async () => {
    render(<SlotPicker intervenantId={200} />);
    await waitFor(() => expect(mockGetBusySlots).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByLabelText('Semaine suivante'));

    await waitFor(() => expect(mockGetBusySlots).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Semaine précédente')).not.toBeDisabled();
  });

  // Le backend Render peut dormir : une erreur réseau ne doit pas laisser un
  // écran vide ni bloquer le parcours.
  it('reste utilisable si l\'agenda ne peut pas être chargé', async () => {
    mockGetBusySlots.mockRejectedValue(new Error('Network Error'));

    render(<SlotPicker intervenantId={200} durationMinutes={60} />);

    await waitFor(() => expect(screen.getAllByText('09:00').length).toBeGreaterThan(0));
  });

  it('n\'appelle pas l\'API sans identifiant d\'intervenant', () => {
    render(<SlotPicker intervenantId={undefined} />);

    expect(mockGetBusySlots).not.toHaveBeenCalled();
  });
});
