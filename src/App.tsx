import { useEffect, useState } from 'react';

const Icon = {
  Heart: () => '❤️',
  X: () => '❌',
  RefreshCw: () => '🔄',
  Film: () => '🎬',
};

type User = 'You' | 'Partner';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

const defaultPrefs = {
  region: 'GB',
  monetization: 'flatrate',
  providers: { netflix: true, prime: true },
  providerIds: { netflix: 8, prime: 9, primeAlt: 119 },
  minVoteCount: 50,
  minRating: 0,
  genres: [] as number[],
  language: 'en-GB',
  sortBy: 'popularity.desc',
  targetCount: 10,
};

export default function App() {
  const [token, setToken] = useState('');
  // prefs are read-only at build time in this minimal Netlify deploy; drop the unused setter to fix TS6133
  const [prefs] = useState(defaultPrefs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<{
    currentUser: User;
    phase: 'idle' | 'round1' | 'swap' | 'round2' | 'results';
    cohort: Array<{ id: number; title: string; overview?: string; year?: string; poster?: string | null; genre_ids: number[] }>;
    idx: Record<User, number>;
    likes: Record<User, Set<number>>;
    passes: Record<User, Set<number>>;
    agreed: number[];
  }>({
    currentUser: 'You',
    phase: 'idle',
    cohort: [],
    idx: { You: 0, Partner: 0 },
    likes: { You: new Set<number>(), Partner: new Set<number>() },
    passes: { You: new Set<number>(), Partner: new Set<number>() },
    agreed: [],
  });

  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`https://api.themoviedb.org/3/genre/movie/list?language=${prefs.language}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setGenres(data.genres || []))
      .catch(() => {});
  }, [token]);

  const buildDeck = async () => {
    if (!token) {
      setError('Please enter your TMDB token above before building the deck.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const target = prefs.targetCount || 10;
      const url = `https://api.themoviedb.org/3/discover/movie?watch_region=${prefs.region}&include_adult=false&sort_by=${prefs.sortBy}&page=1&with_watch_providers=${prefs.providerIds.netflix}|${prefs.providerIds.prime}&with_watch_monetization_types=${prefs.monetization}&vote_count.gte=${prefs.minVoteCount}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('TMDB fetch failed: ' + res.status);
      const data = await res.json();
      const cohort = (data.results || []).slice(0, target).map((m: any) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        year: (m.release_date || '').slice(0, 4),
        poster: m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null,
        genre_ids: m.genre_ids,
      }));
      setState({ ...state, phase: 'round1', cohort, idx: { You: 0, Partner: 0 } });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const act = (kind: 'like' | 'pass') => {
    const current = state.cohort[state.idx[state.currentUser]];
    if (!current) return;
    const user: User = state.currentUser;
    const likes = new Set(state.likes[user]);
    const passes = new Set(state.passes[user]);
    if (kind === 'like') likes.add(current.id); else passes.add(current.id);
    const nextIdx = state.idx[user] + 1;
    let phase = state.phase;
    let agreed = [...state.agreed];
    if (state.phase === 'round2' && kind === 'like' && state.likes[user === 'You' ? 'Partner' : 'You'].has(current.id)) {
      if (!agreed.includes(current.id)) agreed.push(current.id);
    }

    if (nextIdx >= state.cohort.length) {
      if (state.phase === 'round1') phase = 'swap';
      else if (state.phase === 'round2') phase = 'results';
    }

    setState({
      ...state,
      likes: { ...state.likes, [user]: likes },
      passes: { ...state.passes, [user]: passes },
      idx: { ...state.idx, [user]: nextIdx },
      phase,
      agreed,
    });
  };

  const handleSwap = () => {
    setState({ ...state, currentUser: 'Partner', phase: 'round2' });
  };

  const currentMovie = state.cohort[state.idx[state.currentUser]];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4">
      <header className="border-b border-neutral-800 pb-2 mb-4 flex items-center gap-2">
        <span>{Icon.Film()}</span>
        <h1 className="font-semibold">CoupleSwipe</h1>
        <span className="text-xs text-neutral-400">UK Netflix & Prime Picker</span>
        <button onClick={buildDeck} className="ml-auto px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
          {Icon.RefreshCw()} Build {prefs.targetCount}
        </button>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-neutral-300">TMDB Token:</label>
        <input
          type="password"
          placeholder="Paste your TMDB v4 token here"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="flex-1 px-2 py-1 rounded bg-neutral-800 text-neutral-100 border border-neutral-700"
        />
      </div>

      {error && <div className="text-red-400 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-neutral-400">Loading deck...</div>
      ) : state.phase === 'swap' ? (
        <div className="text-center py-20">
          <p className="text-lg mb-4">🎬 Your turn is done! Now pass to your partner.</p>
          <button
            onClick={handleSwap}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white"
          >
            I'm the Partner → Start My Turn
          </button>
        </div>
      ) : state.phase === 'results' ? (
        <Results agreedIds={state.agreed} token={token} />
      ) : !currentMovie ? (
        <div className="text-center py-20 text-neutral-400">Click Build Deck to begin</div>
      ) : (
        <div className="text-center">
          <Card movie={currentMovie} genres={genres} />
          <div className="mt-6 flex justify-center gap-4">
            <button onClick={() => act('pass')} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700">
              {Icon.X()} Pass
            </button>
            <button onClick={() => act('like')} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500">
              {Icon.Heart()} Like
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ movie, genres }: { movie: any; genres: { id: number; name: string }[] }) {
  return (
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto">
      {movie.poster && <img src={movie.poster} alt={movie.title} className="w-full rounded-lg mb-4" />}
      <h2 className="text-lg font-semibold mb-1">{movie.title} {movie.year && <span className="text-neutral-400">({movie.year})</span>}</h2>
      <p className="text-sm text-neutral-300 mb-2 line-clamp-4">{movie.overview}</p>
      <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
        {movie.genre_ids.map((id: number) => (
          <span key={id} className="px-2 py-1 rounded-lg bg-neutral-800">{genres.find((g) => g.id === id)?.name || id}</span>
        ))}
      </div>
    </div>
  );
}

function Results({ agreedIds, token }: { agreedIds: number[]; token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<Record<number, string>>({});
  const [openTrailer, setOpenTrailer] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const out: any[] = [];
      for (const id of agreedIds) {
        try {
          const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) continue;
          const j = await res.json();
          out.push(j);
        } catch {}
      }
      setItems(out);
    })();
  }, [agreedIds, token]);

  const loadTrailer = async (id: number) => {
    if (trailers[id]) {
      setOpenTrailer(openTrailer === id ? null : id);
      return;
    }
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No trailer');
      const data = await res.json();
      const yt = data.results.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
      if (yt) setTrailers({ ...trailers, [id]: yt.key });
      setOpenTrailer(id);
    } catch {
      setTrailers({ ...trailers, [id]: 'none' });
      setOpenTrailer(id);
    }
  };

  if (!agreedIds.length) return <div className="text-center text-neutral-400">No agreed picks yet.</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Agreed Picks</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => {
          const poster = m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null;
          const tmdbUrl = `https://www.themoviedb.org/movie/${m.id}`;
          const trailerKey = trailers[m.id];
          const youtubeUrl = trailerKey && trailerKey !== 'none'
            ? `https://www.youtube.com/watch?v=${trailerKey}`
            : `https://www.youtube.com/results?search_query=${encodeURIComponent((m.title || '') + ' trailer')}`;
          return (
            <li key={m.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/40">
              <div className="flex gap-3">
                {poster ? <img src={poster} alt={m.title} className="w-12 h-18 object-cover rounded-md border border-neutral-800" /> : <div className="w-12 h-18 rounded-md bg-neutral-800 grid place-items-center">🎞️</div>}
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-neutral-400 line-clamp-2">{m.tagline || m.overview}</div>
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => loadTrailer(m.id)} className="text-xs text-blue-400 underline hover:text-blue-300">{openTrailer === m.id ? 'Hide trailer' : 'Play trailer'}</button>
                    <a href={tmdbUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-400 hover:text-blue-300">View on TMDB</a>
                  </div>
                  {openTrailer === m.id && (
                    trailerKey && trailerKey !== 'none' ? (
                      <div className="mt-2">
                        <div className="aspect-video w-full overflow-hidden rounded-lg border border-neutral-800">
                          <iframe
                            src={`https://www.youtube.com/embed/${trailerKey}`}
                            title={m.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                        {/* Always show a direct link in case iframes are blocked (e.g., StackBlitz sandbox) */}
                        <div className="mt-2">
                          <a
                            href={youtubeUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs underline text-blue-400 hover:text-blue-300"
                          >
                            Open trailer on YouTube
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-neutral-300">
                        No trailer available via TMDB.{' '}
                        <a
                          href={youtubeUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="underline text-blue-400 hover:text-blue-300"
                        >
                          Try YouTube search
                        </a>
                      </div>
                    )
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
