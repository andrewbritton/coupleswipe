import { useEffect, useState } from 'react';

// Simple emoji icons (no external deps)
const Icon = {
  Heart: () => '❤️',
  X: () => '❌',
  RefreshCw: () => '🔄',
  Film: () => '🎬',
};

type User = 'You' | 'Partner';

type MovieLite = {
  id: number;
  title: string;
  overview?: string;
  year?: string;
  poster?: string | null;
  genre_ids: number[];
};

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
  const [token, setToken] = useState(() => (import.meta as any)?.env?.VITE_TMDB_TOKEN || localStorage.getItem('tmdb_v4_token') || '');
  const [prefs] = useState(defaultPrefs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [state, setState] = useState<{
    currentUser: User;
    phase: 'idle' | 'round1' | 'swap' | 'round2' | 'review1' | 'reviewSwap' | 'review2' | 'final' | 'winner';
    cohort: MovieLite[];
    idx: Record<User, number>;
    likes: Record<User, Set<number>>;
    passes: Record<User, Set<number>>;
    agreed: number[]; // after round2 (both liked)
  }>({
    currentUser: 'You',
    phase: 'idle',
    cohort: [],
    idx: { You: 0, Partner: 0 },
    likes: { You: new Set<number>(), Partner: new Set<number>() },
    passes: { You: new Set<number>(), Partner: new Set<number>() },
    agreed: [],
  });

  // Trailer review approvals (second pass)
  const [reviewYes, setReviewYes] = useState<Record<User, Set<number>>>({ You: new Set(), Partner: new Set() });
  // Final random winner id
  const [winnerId, setWinnerId] = useState<number | null>(null);

  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);

  // Load genres once token is present
  useEffect(() => {
    if (!token) return;
    fetch(`https://api.themoviedb.org/3/genre/movie/list?language=${prefs.language}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setGenres(data.genres || []))
      .catch(() => {});
  }, [token, prefs.language]);

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
      const cohort: MovieLite[] = (data.results || []).slice(0, target).map((m: any) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        year: (m.release_date || '').slice(0, 4),
        poster: m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null,
        genre_ids: m.genre_ids,
      }));
      setReviewYes({ You: new Set(), Partner: new Set() });
      setWinnerId(null);
      setState({
        currentUser: 'You',
        phase: 'round1',
        cohort,
        idx: { You: 0, Partner: 0 },
        likes: { You: new Set(), Partner: new Set() },
        passes: { You: new Set(), Partner: new Set() },
        agreed: [],
      });
    } catch (e: any) {
      setError(e.message || String(e));
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

    if (state.phase === 'round2' && kind === 'like') {
      const other: User = user === 'You' ? 'Partner' : 'You';
      if (state.likes[other].has(current.id) && !agreed.includes(current.id)) {
        agreed.push(current.id);
      }
    }

    if (nextIdx >= state.cohort.length) {
      if (state.phase === 'round1') phase = 'swap';
      else if (state.phase === 'round2') phase = agreed.length ? 'review1' : 'final';
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

  function handleReviewDone(user: User, yesIds: number[]) {
    const nextReview = new Set(reviewYes[user]);
    yesIds.forEach((id) => nextReview.add(id));
    const updated = { ...reviewYes, [user]: nextReview };
    setReviewYes(updated);

    if (user === 'You') {
      // Show a clear handoff page before Partner starts their trailer review
      setState((s) => ({ ...s, phase: 'reviewSwap' }));
    } else {
      // compute final intersection
      const finalIds = state.agreed.filter((id) => updated.You.has(id) && updated.Partner.has(id));
      setState((s) => ({ ...s, phase: 'final', agreed: finalIds }));
    }
  }

  const currentMovie = state.cohort[state.idx[state.currentUser]];

  const randomPick = () => {
    const pool = state.agreed;
    if (!pool.length) return;
    const id = pool[Math.floor(Math.random() * pool.length)];
    setWinnerId(id);
    setState((s) => ({ ...s, phase: 'winner' }));
  };

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
          onChange={(e) => { const v = e.target.value; setToken(v); try { localStorage.setItem('tmdb_v4_token', v); } catch {} }}
          className="flex-1 px-2 py-1 rounded bg-neutral-800 text-neutral-100 border border-neutral-700"
        />
      </div>

      {error && <div className="text-red-400 mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-20 text-neutral-400">Loading deck...</div>
      ) : state.phase === 'swap' ? (
        <div className="text-center py-20">
          <p className="text-lg mb-4">🎬 Your turn is done! Now pass to your partner.</p>
          <button onClick={handleSwap} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">
            I'm the Partner → Start My Turn
          </button>
        </div>
      ) : state.phase === 'review1' ? (
        <TrailerReview user="You" token={token} ids={state.agreed} onDone={(yes) => handleReviewDone('You', yes)} />
      ) : state.phase === 'reviewSwap' ? (
        <div className="text-center py-20">
          <p className="text-lg mb-2">✅ Your trailer review is complete.</p>
          <p className="text-sm text-neutral-300 mb-4">Now hand the device to your partner so they can review the same shortlist.</p>
          <button
            onClick={() => setState({ ...state, currentUser: 'Partner', phase: 'review2' })}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white"
          >
            I'm the Partner → Start Trailer Review
          </button>
        </div>
      ) : state.phase === 'review2' ? (
        <TrailerReview user="Partner" token={token} ids={state.agreed} onDone={(yes) => handleReviewDone('Partner', yes)} />
      ) : state.phase === 'final' ? (
        <div>
          <Results agreedIds={state.agreed} token={token} heading="Final agreed picks" />
          <div className="mt-6 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 text-center">
            <p className="mb-3 text-sm text-neutral-300">You both liked all these! I’ll pick the winner for you</p>
            <button
              onClick={() => randomPick()}
              disabled={!state.agreed.length}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Random pick
            </button>
          </div>
        </div>
      ) : state.phase === 'winner' ? (
        <Winner id={winnerId!} token={token} onBack={() => setState({ ...state, phase: 'final' })} />
      ) : !currentMovie ? (
        <div className="text-center py-20 text-neutral-400">Click Build Deck to begin</div>
      ) : (
        <div className="text-center">
          <Card movie={currentMovie} genres={genres} />
          <div className="mt-6 flex justify-center gap-4">
            <button onClick={() => act('pass')} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700">{Icon.X()} Pass</button>
            <button onClick={() => act('like')} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500">{Icon.Heart()} Like</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ movie, genres }: { movie: MovieLite; genres: { id: number; name: string }[] }) {
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

function Results({ agreedIds, token, heading = 'Agreed Picks' }: { agreedIds: number[]; token: string; heading?: string }) {
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
        } catch {
          // ignore single fetch errors
        }
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
      const yt = data.results.find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      setTrailers({ ...trailers, [id]: yt ? yt.key : 'none' });
      setOpenTrailer(id);
    } catch {
      setTrailers({ ...trailers, [id]: 'none' });
      setOpenTrailer(id);
    }
  };

  if (!agreedIds.length) return <div className="text-center text-neutral-400">No agreed picks yet.</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{heading} ({agreedIds.length})</h2>
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
                    <div className="mt-2 text-xs text-neutral-300">
                      {/* Embedded player temporarily disabled — show link(s) only */}
                      <a href={youtubeUrl} target="_blank" rel="noreferrer noopener" className="underline text-blue-400 hover:text-blue-300">
                        Open trailer on YouTube
                      </a>
                    </div>
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

/** Trailer review phase (one user at a time, sequential; links only) */
function Winner({ id, token, onBack }: { id: number; token: string; onBack: () => void }) {
  const [m, setM] = useState<any | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (alive) setM(j);
      } catch {}
    })();
    return () => { alive = false; };
  }, [id, token]);

  if (!m) return <div className="text-center py-20 text-neutral-400">Choosing a winner…</div>;

  const poster = m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null;
  const tmdbUrl = `https://www.themoviedb.org/movie/${m.id}`;

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-xl font-semibold mb-2">Tonight’s pick</h2>
      <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40">
        {poster && <img src={poster} alt={m.title} className="w-52 mx-auto rounded-lg mb-3 border border-neutral-800" />}
        <div className="text-lg font-medium">{m.title} {m.release_date ? <span className="text-neutral-400">({String(m.release_date).slice(0,4)})</span> : null}</div>
        <p className="text-sm text-neutral-300 mt-2">{m.tagline || m.overview}</p>
        <div className="mt-3">
          <a href={tmdbUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-400 hover:text-blue-300">View on TMDB</a>
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">Back to list</button>
      </div>
    </div>
  );
}

function TrailerReview({ user, token, ids, onDone }: { user: User; token: string; ids: number[]; onDone: (yesIds: number[]) => void }) {
  const [i, setI] = useState(0);
  const [meta, setMeta] = useState<any | null>(null);
  const [trailer, setTrailer] = useState<string | 'none' | null>(null);
  const [yes, setYes] = useState<number[]>([]);
  const id = ids[i];

  useEffect(() => {
    let alive = true;
    setMeta(null);
    setTrailer(null);
    if (!id) return;

    (async () => {
      try {
        const m = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
        if (!alive) return;
        setMeta(m);

        const vres = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } });
        if (!vres.ok) throw new Error('no videos');
        const vv = await vres.json();
        const yt = (vv.results || []).find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        setTrailer(yt ? yt.key : 'none');
      } catch {
        if (alive) setTrailer('none');
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, token]);

  const next = (approve: boolean) => {
    const picks = approve ? [...yes, id] : yes;
    if (i + 1 >= ids.length) {
      onDone(picks);
    } else {
      setYes(picks);
      setI(i + 1);
    }
  };

  if (!ids.length) return <div className="text-center py-20 text-neutral-400">No titles to review.</div>;

  const poster = meta?.poster_path ? TMDB_IMAGE_BASE + meta.poster_path : null;
  const youtubeUrl = trailer && trailer !== 'none'
    ? `https://www.youtube.com/watch?v=${trailer}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent((meta?.title || '') + ' trailer')}`;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold mb-3">{user}: Trailer review {i + 1} / {ids.length}</h2>
      <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/40">
        <div className="flex gap-4">
          {poster ? (
            <img src={poster} alt={meta?.title} className="w-28 h-40 object-cover rounded-md border border-neutral-800" />
          ) : (
            <div className="w-28 h-40 rounded-md bg-neutral-800 grid place-items-center">🎞️</div>
          )}
          <div className="flex-1">
            <div className="text-base font-medium mb-1">{meta?.title} {meta?.release_date ? <span className="text-neutral-400">({String(meta.release_date).slice(0,4)})</span> : null}</div>
            <div className="text-xs text-neutral-400 mb-2">{meta?.tagline || meta?.overview}</div>
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900">
              {/* Embedded player temporarily disabled — show link(s) only */}
              <a href={youtubeUrl} target="_blank" rel="noreferrer noopener" className="text-sm underline text-blue-400 hover:text-blue-300">
                Open trailer on YouTube
              </a>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button onClick={() => next(false)} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700">{Icon.X()} No</button>
              <button onClick={() => next(true)} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500">{Icon.Heart()} Yes</button>
            </div>
            {user === 'You' && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => onDone(yes)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm"
                  title="Skip the remaining trailers and hand off to your partner now"
                >
                  ▶️ Hand to Partner now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
