import { companyApi } from '../services/company.api';

// Export CSV de l'usage par collaborateur (BOM UTF-8 + séparateur ';' pour Excel FR)
export async function exportEmployeesUsageCsv() {
  const { data } = await companyApi.getEmployeesUsage();

  const escape = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = ['Nom', 'Prénom', 'Email', 'Séances couvertes (mois)', 'Quota mensuel', 'Total séances (mois)'];
  const lines = data.rows.map((r) =>
    [r.lastName, r.firstName, r.email, r.covered, data.quota ?? '', r.total].map(escape).join(';')
  );
  const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  a.href = url;
  a.download = `collaborateurs-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return data.rows.length;
}
