import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { companyApi } from '../../services/company.api';
import Spinner from '../../components/ui/Spinner';
import { Search, Clock, ChevronRight, Layers } from 'lucide-react';
import { cn } from '../../utils/cn';

const CATEGORY_LABELS = { SPORT: 'Sport', NUTRITION: 'Nutrition', MENTAL: 'Mental', BIENETRE: 'Bien-être', Tous: 'Tous' };
const CATEGORIES = ['Tous', 'SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'];

const CATEGORY_STYLES = {
  SPORT:     { badge: 'bg-blue-50 text-blue-700 border border-blue-100',     dot: 'bg-blue-500' },
  NUTRITION: { badge: 'bg-green-50 text-green-700 border border-green-100',   dot: 'bg-green-500' },
  MENTAL:    { badge: 'bg-purple-50 text-purple-700 border border-purple-100', dot: 'bg-purple-500' },
  BIENETRE:  { badge: 'bg-orange-50 text-orange-700 border border-orange-100', dot: 'bg-orange-500' },
};

export default function B2BServiceCatalog() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  useEffect(() => {
    companyApi.getEmployeeStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('Impossible de charger les services.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error) return <p className="text-red-600 p-6">{error}</p>;
  if (!stats?.plan) {
    return (
      <div className="max-w-3xl p-6 text-center">
        <Layers className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500 font-medium">Aucun forfait entreprise actif</p>
        <p className="text-gray-400 text-sm mt-1">Contactez votre responsable RH.</p>
      </div>
    );
  }

  const services = stats.services || [];
  const filtered = services.filter((s) => {
    const q = query.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q);
    const matchCat = activeCategory === 'Tous' || s.category === activeCategory;
    return matchQ && matchCat;
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catalogue de services</h1>
        <p className="text-gray-500 mt-1">Services inclus dans votre forfait entreprise · Réservez une séance avec un professionnel</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Rechercher un service..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all border',
              activeCategory === cat
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
            )}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 font-medium">Aucun service trouvé</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{filtered.length} service{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((s) => {
              const style = CATEGORY_STYLES[s.category] || { badge: 'bg-gray-50 text-gray-700 border-gray-100', dot: 'bg-gray-400' };
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">{s.durationMinutes} min</span>
                      </div>
                    </div>
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium border shrink-0', style.badge)}>
                      {CATEGORY_LABELS[s.category] || s.category}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Link
                      to={`/dashboard/client/search?category=${s.category}`}
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Trouver un professionnel <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
