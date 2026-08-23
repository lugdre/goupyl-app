import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Badge from '../components/ui/Badge';
import AvatarFallback from '../components/ui/AvatarFallback';
import Spinner from '../components/ui/Spinner';

describe('Badge — pastille de statut', () => {
  it('affiche son contenu', () => {
    render(<Badge variant="CONFIRMED">Confirmé</Badge>);

    expect(screen.getByText('Confirmé')).toBeInTheDocument();
  });

  it.each(['CONFIRMED', 'PENDING', 'CANCELLED', 'DONE', 'SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE', 'ADMIN', 'ENTREPRISE'])(
    'applique une couleur propre à la variante %s', (variant) => {
      render(<Badge variant={variant}>x</Badge>);

      expect(screen.getByText('x')).toHaveStyle({ borderStyle: 'solid' });
    }
  );

  // Une variante inconnue ne doit jamais casser le rendu : le badge retombe
  // sur un style neutre plutôt que de planter la page.
  it('retombe sur un style neutre pour une variante inconnue', () => {
    render(<Badge variant="VARIANTE_INEXISTANTE">Inconnu</Badge>);

    expect(screen.getByText('Inconnu')).toHaveStyle({ color: '#555' });
  });

  it('distingue visuellement CONFIRMED de CANCELLED', () => {
    const { unmount } = render(<Badge variant="CONFIRMED">A</Badge>);
    const confirme = screen.getByText('A').style.color;
    unmount();

    render(<Badge variant="CANCELLED">B</Badge>);

    expect(screen.getByText('B').style.color).not.toBe(confirme);
  });

  it('conserve la classe transmise par l\'appelant', () => {
    render(<Badge className="ma-classe">x</Badge>);

    expect(screen.getByText('x')).toHaveClass('ma-classe');
  });
});

describe('AvatarFallback — photo de profil résiliente', () => {
  const client = { firstName: 'Sarah', lastName: 'Benali' };

  it('affiche l\'avatar personnalisé quand il existe', () => {
    render(<AvatarFallback user={{ ...client, avatarUrl: '/api/users/1/avatar?v=123' }} />);

    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/users/1/avatar?v=123');
  });

  it('retombe sur un visuel par défaut en l\'absence d\'avatar', () => {
    render(<AvatarFallback user={client} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('choisit un visuel par défaut différent selon le genre déclaré', () => {
    const { unmount } = render(<AvatarFallback user={{ ...client, gender: 'FEMME' }} />);
    const feminin = screen.getByRole('img').getAttribute('src');
    unmount();

    render(<AvatarFallback user={{ ...client, gender: 'HOMME' }} />);

    expect(screen.getByRole('img').getAttribute('src')).not.toBe(feminin);
  });

  // Cas réel : une URL d'avatar pointant vers un fichier supprimé. Le composant
  // doit basculer sur les initiales plutôt que d'afficher une image cassée.
  it('bascule sur les initiales quand le chargement de l\'image échoue', () => {
    render(<AvatarFallback user={{ ...client, avatarUrl: '/introuvable.png' }} />);

    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByText('SB')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each([
    ['prénom et nom',        { firstName: 'Sarah', lastName: 'Benali' },   'SB'],
    ['prénom seul',          { firstName: 'Sarah' },                       'S'],
    ['nom seul',             { lastName: 'Benali' },                       'B'],
    ['raison sociale',       { companyName: 'ACME Corporation' },          'AC'],
    ['raison sociale d\'un mot', { companyName: 'Globex' },                'G'],
    ['aucune donnée',        {},                                           '?'],
  ])('dérive les initiales depuis %s', (_label, user, expected) => {
    render(<AvatarFallback user={{ ...user, avatarUrl: '/ko.png' }} />);
    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('affiche « ? » lorsqu\'aucun utilisateur n\'est fourni', () => {
    render(<AvatarFallback user={null} avatarUrl={undefined} />);
    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it.each([['xs', 20], ['sm', 28], ['md', 40], ['lg', 64], ['xl', 96]])(
    'respecte la taille %s (%ipx)', (size, px) => {
      render(<AvatarFallback user={client} size={size} />);

      expect(screen.getByRole('img')).toHaveStyle({ width: `${px}px`, height: `${px}px` });
    }
  );

  it('retombe sur la taille md pour une taille inconnue', () => {
    render(<AvatarFallback user={client} size="gigantesque" />);

    expect(screen.getByRole('img')).toHaveStyle({ width: '40px' });
  });

  // Accessibilité : l'avatar doit rester annonçable par un lecteur d'écran.
  it('fournit un texte alternatif porteur de sens', () => {
    render(<AvatarFallback user={client} />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Avatar SB');
  });

  it('privilégie le titre fourni comme texte alternatif', () => {
    render(<AvatarFallback user={client} title="Sarah Benali" />);

    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Sarah Benali');
  });
});

describe('Spinner — indicateur de chargement', () => {
  it('se rend sans erreur', () => {
    const { container } = render(<Spinner />);

    expect(container.firstChild).toBeTruthy();
  });
});
