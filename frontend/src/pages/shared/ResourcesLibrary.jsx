import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { resourcesApi } from '../../services/resources.api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { BookOpen, Play, Lock, ChevronRight, X, Filter, Sparkles } from 'lucide-react';

const CATEGORY_LABELS = { SPORT: 'Sport', NUTRITION: 'Nutrition', MENTAL: 'Mental', BIENETRE: 'Bien-être' };
const CATEGORY_COLORS = {
  SPORT: 'bg-blue-100 text-blue-700',
  NUTRITION: 'bg-green-100 text-green-700',
  MENTAL: 'bg-purple-100 text-purple-700',
  BIENETRE: 'bg-orange-100 text-orange-700',
};
const ACCESS_LABELS = { ESSENTIEL: 'Essentiel', BOOST: 'Boost', ULTRA: 'Ultra' };
const ACCESS_COLORS = {
  ESSENTIEL: 'bg-violet-100 text-violet-700',
  BOOST: 'bg-indigo-100 text-indigo-700',
  ULTRA: 'bg-yellow-100 text-yellow-700',
};

function renderContent(content) {
  if (!content) return null;
  return content.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-gray-800 my-1">{line.slice(2, -2)}</p>;
    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-700 list-disc">{line.slice(2)}</li>;
    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
      return <li key={i} className="ml-4 text-gray-700 list-decimal">{line.replace(/^\d+\. /, '')}</li>;
    }
    if (line === '') return <div key={i} className="h-2" />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-gray-700 leading-relaxed my-1">
        {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
      </p>
    );
  });
}

function NoPlanBanner({ isClient }) {
  return (
    <div className="rounded-2xl border border-primary-300/30 bg-primary-50 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary-400/10 flex items-center justify-center shrink-0">
        <Lock className="w-6 h-6 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">Contenu verrouillé</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {isClient
            ? "Votre entreprise n'a pas d'abonnement actif. Contactez votre responsable RH pour débloquer les ressources."
            : 'Souscrivez un abonnement pour accéder aux ressources santé et bien-être.'}
        </p>
      </div>
      {!isClient && (
        <Link
          to="/dashboard/entreprise/subscription"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-400 text-white text-sm font-medium hover:bg-primary-500 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Voir les offres
        </Link>
      )}
    </div>
  );
}

function LockedArticleCard({ article }) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 overflow-hidden select-none">
      <div className="space-y-3 opacity-40 grayscale pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[article.category]}`}>
              {CATEGORY_LABELS[article.category]}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_COLORS[article.access]}`}>
              Plan {ACCESS_LABELS[article.access]}+
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 leading-snug">{article.title}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-violet-600 font-medium">
          <BookOpen className="w-3.5 h-3.5" />
          Lire l'article
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-gray-900/10 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-4 h-4 text-gray-700" />
          </div>
          <span className="text-xs font-semibold text-gray-600 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
            Plan {ACCESS_LABELS[article.access]}
          </span>
        </div>
      </div>
    </div>
  );
}

function LockedVideoCard({ video }) {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white overflow-hidden select-none">
      <div className="opacity-40 grayscale pointer-events-none">
        {video.videoUrl && (
          <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
            <img
              src={`https://img.youtube.com/vi/${video.videoUrl.split('/embed/')[1]}/mqdefault.jpg`}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}
        <div className="p-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[video.category]}`}>
              {CATEGORY_LABELS[video.category]}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_COLORS[video.access]}`}>
              Plan {ACCESS_LABELS[video.access]}+
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{video.title}</h3>
          <p className="text-xs text-gray-500 line-clamp-2">{video.description}</p>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-gray-900/15 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-700" />
          </div>
          <span className="text-xs font-semibold text-gray-700 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
            Plan {ACCESS_LABELS[video.access]}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ResourcesLibrary() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('ALL');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    resourcesApi.getAll()
      .then(({ data }) => setResources(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = resources.filter((r) => {
    if (activeType !== 'ALL' && r.type !== activeType) return false;
    if (activeCategory !== 'ALL' && r.category !== activeCategory) return false;
    return true;
  });

  const articles = filtered.filter((r) => r.type === 'ARTICLE');
  const videos = filtered.filter((r) => r.type === 'VIDEO');
  const allLocked = resources.length > 0 && resources.every((r) => r.isLocked);
  const isClient = user?.role === 'CLIENT';

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centre de ressources</h1>
        <p className="text-gray-500 mt-1">Articles, guides et vidéos pour prendre soin de votre santé au quotidien</p>
      </div>

      {/* Banner aucun abonnement */}
      {allLocked && <NoPlanBanner isClient={isClient} />}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'ARTICLE', 'VIDEO'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeType === t
                  ? 'bg-primary-400 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'ALL' ? 'Tout' : t === 'ARTICLE' ? 'Articles' : 'Vidéos'}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === c
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c === 'ALL' ? 'Toutes catégories' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Compteur */}
      <p className="text-sm text-gray-500">
        {filtered.filter((r) => !r.isLocked).length} ressource{filtered.filter((r) => !r.isLocked).length !== 1 ? 's' : ''} disponible{filtered.filter((r) => !r.isLocked).length !== 1 ? 's' : ''}
        {filtered.some((r) => r.isLocked) && (
          <span className="ml-1 text-gray-400">
            · {filtered.filter((r) => r.isLocked).length} verrouillée{filtered.filter((r) => r.isLocked).length !== 1 ? 's' : ''}
          </span>
        )}
      </p>

      {/* Articles */}
      {articles.length > 0 && (activeType === 'ALL' || activeType === 'ARTICLE') && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-400" />
            Articles & Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article) =>
              article.isLocked ? (
                <LockedArticleCard key={article.id} article={article} />
              ) : (
                <Card
                  key={article.id}
                  className="hover:border-primary-300/50 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => setSelectedArticle(article)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[article.category]}`}>
                          {CATEGORY_LABELS[article.category]}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_COLORS[article.access]}`}>
                          Plan {ACCESS_LABELS[article.access]}+
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 leading-snug">{article.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-primary-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5" />
                      Lire l'article
                    </div>
                  </div>
                </Card>
              )
            )}
          </div>
        </section>
      )}

      {/* Vidéos */}
      {videos.length > 0 && (activeType === 'ALL' || activeType === 'VIDEO') && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary-400" />
            Vidéos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) =>
              video.isLocked ? (
                <LockedVideoCard key={video.id} video={video} />
              ) : (
                <Card
                  key={video.id}
                  className="hover:border-primary-300/50 cursor-pointer transition-all hover:shadow-md overflow-hidden p-0"
                  onClick={() => setSelectedVideo(video)}
                >
                  {video.videoUrl && (
                    <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
                      <img
                        src={`https://img.youtube.com/vi/${video.videoUrl.split('/embed/')[1]}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-primary-400 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[video.category]}`}>
                        {CATEGORY_LABELS[video.category]}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_COLORS[video.access]}`}>
                        Plan {ACCESS_LABELS[video.access]}+
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{video.description}</p>
                  </div>
                </Card>
              )
            )}
          </div>
        </section>
      )}

      {/* Modal Article */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedArticle.category]}`}>
                    {CATEGORY_LABELS[selectedArticle.category]}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_COLORS[selectedArticle.access]}`}>
                    Plan {ACCESS_LABELS[selectedArticle.access]}+
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{selectedArticle.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedArticle.description}</p>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="prose-sm max-w-none">
                {renderContent(selectedArticle.content)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vidéo */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex gap-2 mb-1 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedVideo.category]}`}>
                    {CATEGORY_LABELS[selectedVideo.category]}
                  </span>
                </div>
                <h2 className="font-bold text-gray-900 leading-snug">{selectedVideo.title}</h2>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`${selectedVideo.videoUrl}?autoplay=1`}
                title={selectedVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">{selectedVideo.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
