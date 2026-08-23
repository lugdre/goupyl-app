import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cn } from './cn';
import {
  CATEGORY_LABELS, STATUS_LABELS, PLAN_LABELS, BILLING_CYCLE_LABELS, LEVEL_LABELS,
  DAY_LABELS, ATTENDANCE_LABELS, DISPUTE_STATUS_LABELS, ORDER_STATUS_LABELS,
  COURSE_LOCATION_OPTIONS, CONTACT, CONTACT_MAP_URL,
} from './constants';

describe('cn — composition de classes CSS', () => {
  it('assemble les classes fournies', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('écarte les valeurs conditionnelles fausses', () => {
    expect(cn('base', false && 'off', null, undefined, '', 0, 'on')).toBe('base on');
  });

  it('renvoie une chaîne vide sans argument', () => {
    expect(cn()).toBe('');
  });
});

/**
 * Les dictionnaires de libellés sont la source unique de vérité de l'interface.
 * Ces tests verrouillent leur alignement sur les énumérations Prisma : une
 * valeur ajoutée côté serveur sans libellé afficherait « undefined » à
 * l'utilisateur, et un libellé orphelin signale du code mort.
 */
describe('constants — dictionnaires de libellés', () => {
  it.each([
    ['CATEGORY_LABELS',       CATEGORY_LABELS,       ['SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE']],
    ['STATUS_LABELS',         STATUS_LABELS,         ['PENDING', 'CONFIRMED', 'DONE', 'CANCELLED']],
    ['PLAN_LABELS',           PLAN_LABELS,           ['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE']],
    ['BILLING_CYCLE_LABELS',  BILLING_CYCLE_LABELS,  ['MONTHLY', 'YEARLY']],
    ['LEVEL_LABELS',          LEVEL_LABELS,          ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'PRO', 'ELITE']],
    ['ATTENDANCE_LABELS',     ATTENDANCE_LABELS,     ['PRESENT', 'ABSENT']],
    ['DISPUTE_STATUS_LABELS', DISPUTE_STATUS_LABELS, ['OPEN', 'REJECTED', 'RESOLVED_CLIENT']],
    ['ORDER_STATUS_LABELS',   ORDER_STATUS_LABELS,   ['PENDING', 'PAID', 'CANCELLED']],
  ])('%s couvre exactement les valeurs de l\'énumération serveur', (_name, dict, expectedKeys) => {
    expect(Object.keys(dict).sort()).toEqual([...expectedKeys].sort());
  });

  it.each([
    ['CATEGORY_LABELS', CATEGORY_LABELS],
    ['STATUS_LABELS', STATUS_LABELS],
    ['PLAN_LABELS', PLAN_LABELS],
    ['LEVEL_LABELS', LEVEL_LABELS],
    ['DISPUTE_STATUS_LABELS', DISPUTE_STATUS_LABELS],
  ])('%s n\'a aucun libellé vide', (_name, dict) => {
    for (const [key, label] of Object.entries(dict)) {
      expect(label, `libellé manquant pour ${key}`).toBeTruthy();
    }
  });

  // Convention du projet : l'index 0 vaut Lundi, pas Dimanche comme
  // Date.getDay(). Toute conversion doit passer par ce décalage.
  it('DAY_LABELS commence par Lundi (index 0) et compte 7 jours', () => {
    expect(DAY_LABELS).toHaveLength(7);
    expect(DAY_LABELS[0]).toBe('Lundi');
    expect(DAY_LABELS[6]).toBe('Dimanche');
  });

  // Le filtre serveur fait une correspondance exacte
  // (`profile.courseLocations has <valeur>`) : la moindre différence de
  // caractère — un accent ajouté, par exemple — vide silencieusement les
  // résultats de recherche.
  it('COURSE_LOCATION_OPTIONS conserve des valeurs identiques octet pour octet', () => {
    expect(COURSE_LOCATION_OPTIONS).toEqual([
      'A domicile', 'En salle', "A l'exterieur", 'En entreprise',
    ]);
  });

  it('COURSE_LOCATION_OPTIONS ne contient aucun doublon', () => {
    expect(new Set(COURSE_LOCATION_OPTIONS).size).toBe(COURSE_LOCATION_OPTIONS.length);
  });
});

describe('constants — coordonnées publiques', () => {
  it('expose un numéro cliquable au format E.164', () => {
    expect(CONTACT.phoneHref).toMatch(/^\+\d{10,15}$/);
  });

  it.each(['email', 'emailSupport', 'emailEntreprises', 'emailDpo'])(
    'expose une adresse %s valide', (key) => {
      expect(CONTACT[key]).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
    }
  );

  it('construit un lien de carte correctement encodé', () => {
    expect(CONTACT_MAP_URL).toContain('https://www.google.com/maps/search/');
    expect(CONTACT_MAP_URL).not.toContain(' ');
  });
});

describe('exportEmployeesUsageCsv — export Excel FR', () => {
  let capturedBlob;

  beforeEach(() => {
    capturedBlob = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlob = blob;
      return 'blob:mock';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  const runExport = async (payload) => {
    vi.resetModules();
    vi.doMock('../services/company.api', () => ({
      companyApi: { getEmployeesUsage: vi.fn().mockResolvedValue({ data: payload }) },
    }));
    const { exportEmployeesUsageCsv } = await import('./exportCsv.js');
    const count = await exportEmployeesUsageCsv();
    return {
      count,
      // Blob.text() décode en UTF-8 et retire le BOM au passage : pour le
      // vérifier il faut lire les octets bruts.
      csv: await capturedBlob.text(),
      bytes: new Uint8Array(await capturedBlob.arrayBuffer()),
    };
  };

  const ROWS = [
    { lastName: 'Benali', firstName: 'Sarah', email: 's@acme.fr', covered: 3, total: 5 },
    { lastName: 'Dupont', firstName: 'Marvin', email: 'm@acme.fr', covered: 0, total: 2 },
  ];

  // Sans BOM, Excel en configuration française lit le fichier en latin-1 et
  // affiche « SÃ©ances » au lieu de « Séances ».
  it('préfixe le fichier d\'un BOM UTF-8 pour Excel', async () => {
    const { bytes } = await runExport({ quota: 4, rows: ROWS });

    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it('sépare les colonnes par un point-virgule (convention française)', async () => {
    const { csv } = await runExport({ quota: 4, rows: ROWS });
    const [header] = csv.replace('﻿', '').split('\n');

    expect(header.split(';')).toEqual([
      'Nom', 'Prénom', 'Email', 'Séances couvertes (mois)', 'Quota mensuel', 'Total séances (mois)',
    ]);
  });

  it('produit une ligne par collaborateur, quota reporté sur chacune', async () => {
    const { csv, count } = await runExport({ quota: 4, rows: ROWS });
    const lines = csv.replace('﻿', '').split('\n');

    expect(count).toBe(2);
    expect(lines).toHaveLength(3); // en-tête + 2 lignes
    expect(lines[1]).toBe('Benali;Sarah;s@acme.fr;3;4;5');
    expect(lines[2]).toBe('Dupont;Marvin;m@acme.fr;0;4;2');
  });

  it('laisse la colonne quota vide quand l\'entreprise n\'a pas d\'abonnement', async () => {
    const { csv } = await runExport({ quota: null, rows: [ROWS[0]] });

    expect(csv.replace('﻿', '').split('\n')[1]).toBe('Benali;Sarah;s@acme.fr;3;;5');
  });

  // Sans échappement, un nom contenant un point-virgule décalerait toutes les
  // colonnes suivantes.
  it('échappe les valeurs contenant un séparateur, un guillemet ou un saut de ligne', async () => {
    const { csv } = await runExport({
      quota: 4,
      rows: [{ lastName: 'Martin; Dubois', firstName: 'Jean "JJ"', email: 'a@b.fr\nsuite', covered: 1, total: 1 }],
    });
    const body = csv.replace('﻿', '').split('\n').slice(1).join('\n');

    expect(body).toContain('"Martin; Dubois"');
    expect(body).toContain('"Jean ""JJ"""');
    expect(body).toContain('"a@b.fr\nsuite"');
  });

  it('n\'exporte que l\'en-tête quand l\'entreprise n\'a aucun collaborateur', async () => {
    const { csv, count } = await runExport({ quota: 4, rows: [] });

    expect(count).toBe(0);
    expect(csv.replace('﻿', '').split('\n')).toHaveLength(1);
  });

  it('nomme le fichier avec l\'année et le mois courants', async () => {
    const anchors = [];
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      anchors.push(node);
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await runExport({ quota: 4, rows: ROWS });

    const now = new Date();
    const attendu = `collaborateurs-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
    expect(anchors[0].download).toBe(attendu);
  });
});
