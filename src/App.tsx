import { useEffect, useMemo, useRef, useState } from 'react';

/********************
 * Basic icons (BMP-safe)
 ********************/
const Icon = {
  Heart: () => <span aria-hidden>{'\u2665'}</span>, // ♥
  X: () => <span aria-hidden>{'\u00D7'}</span>, // ×
  Refresh: () => <span aria-hidden>{'\u21BB'}</span>, // ↻
  Film: () => <span aria-hidden>{'\u25A0'}</span>, // ■
  Frame: () => <span aria-hidden>{'\u25A6'}</span>, // ▦
  Play: () => <span aria-hidden>{'\u25B6'}</span>, // ▶
  Cog: () => <span aria-hidden>{'\u2699'}</span>, // ⚙
  Back: () => <span aria-hidden>{'\u21A9'}</span>, // ↩
  Save: () => <span aria-hidden>{'\u1F4BE'}</span>, // 💾 (may fallback)
  Download: () => <span aria-hidden>{'\u2B07'}</span>, // ⬇
  Copy: () => <span aria-hidden>{'\u2398'}</span>, // ⎘
};

/********************
 * Types
 ********************/
type User = 'You' | 'Partner';

type MovieLite = {
  id: number;
  title: string;
  overview?: string;
  year?: string;
  poster?: string | null;
  genre_ids?: number[];
};

type Prefs = {
  region: string;
  monetization: string; // "flatrate" | "rent" | "buy" | comma-sep
  providerIds: number[]; // TMDB provider ids (e.g. 8, 9, 337)
  minVoteCount: number;
  language: string; // e.g. en-GB
  sortBy: string; // e.g. popularity.desc
  targetCount: number;
};

type HistoryEntry = { user: User; kind: 'like' | 'pass'; id: number; prevIndex: number };

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

function hasValidUrl(u?: string | null): u is string {
  if (typeof u !== 'string') return false;
  const s = u.trim();
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

/********************
 * WinnerCard (matches other card style)
 ********************/
function WinnerCard({ movie, tmdbUrl }: { movie: any; tmdbUrl: string }) {
  const poster = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null;
  return (
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto h-[680px] flex flex-col overflow-hidden text-center">
      {poster ? (
        <img loading="lazy" src={poster} alt={movie.title} className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 object-cover" />
      ) : (
        <div className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 grid place-items-center text-neutral-300 text-sm"><Icon.Frame /> No poster available</div>
      )}
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">
            {movie.title} {movie.release_date && <span className="text-neutral-400">({String(movie.release_date).slice(0, 4)})</span>}
          </h2>
          <p className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap break-words flex-1 basis-0 min-h-16 overflow-y-auto pr-1">{movie.tagline || movie.overview || 'No synopsis available.'}</p>
        </div>
        <div className="mt-auto"><a href={tmdbUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-400 hover:text-blue-300">View on TMDB</a></div>
      </div>
    </div>
  );
}

/********************
 * Small helpers
 ********************/
function makeSafeMovie(movie?: MovieLite | null): Required<Omit<MovieLite, 'genre_ids'>> & { genre_ids: number[] } {
  return {
    id: movie?.id ?? -1,
    title: movie?.title ?? 'Unknown title',
    overview: movie?.overview ?? '',
    year: movie?.year ?? '',
    poster: movie?.poster ?? null,
    genre_ids: Array.isArray(movie?.genre_ids) ? ((movie!.genre_ids as unknown) as number[]) : [],
  };
}

/********************
 * Settings Drawer
 ********************/
function SettingsDrawer({ open, onClose, prefs, setPrefs, onSave }: { open: boolean; onClose: () => void; prefs: Prefs; setPrefs: (p: Prefs) => void; onSave: () => void; }) {
  const providerOptions: { id: number; label: string }[] = [
    { id: 8, label: 'Netflix' },
    { id: 9, label: 'Prime Video' },
    { id: 337, label: 'Disney+' },
    { id: 350, label: 'Apple TV+' },
  ];
  if (!open) return null;
  const toggleProvider = (id: number) => {
    setPrefs({ ...prefs, providerIds: prefs.providerIds.includes(id) ? prefs.providerIds.filter((x) => x !== id) : [...prefs.providerIds, id] });
  };
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-neutral-950 border-l border-neutral-800 p-4 overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <Icon.Cog />
          <h3 className="font-semibold">Settings</h3>
          <button className="ml-auto px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700" onClick={onClose}><Icon.X /> Close</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Region (watch_region)</label>
            <input className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" value={prefs.region} onChange={(e) => setPrefs({ ...prefs, region: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Language (e.g. en-GB)</label>
            <input className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Sort by</label>
            <select className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" value={prefs.sortBy} onChange={(e) => setPrefs({ ...prefs, sortBy: e.target.value })}>
              <option value="popularity.desc">Popularity (desc)</option>
              <option value="vote_average.desc">Rating (desc)</option>
              <option value="primary_release_date.desc">Newest releases</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Monetization types</label>
            <select className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" value={prefs.monetization} onChange={(e) => setPrefs({ ...prefs, monetization: e.target.value })}>
              <option value="flatrate">Streaming only</option>
              <option value="flatrate|rent|buy">Streaming + Rent/Buy</option>
              <option value="rent|buy">Rent/Buy only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Providers</label>
            <div className="flex flex-wrap gap-2">
              {providerOptions.map((p) => (
                <button key={p.id} onClick={() => toggleProvider(p.id)} className={`px-3 py-1.5 rounded-lg border ${prefs.providerIds.includes(p.id) ? 'bg-blue-600 border-blue-500' : 'bg-neutral-900 border-neutral-800'}`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Target deck size</label>
              <input type="number" min={4} max={200} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" value={prefs.targetCount} onChange={(e) => setPrefs({ ...prefs, targetCount: Math.max(4, Math.min(200, Number(e.target.value)||10)) })} />
            </div>
            <div>
              <label className="block text-sm text-neutral-300 mb-1">Min votes</label>
              <input type="number" min={0} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" value={prefs.minVoteCount} onChange={(e) => setPrefs({ ...prefs, minVoteCount: Math.max(0, Number(e.target.value)||0) })} />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button onClick={onSave} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white"><Icon.Refresh /> Rebuild with settings</button>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"><Icon.X /> Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/********************
 * Screens (Welcome / PreDeal / Swap / ReviewIntro / ReviewSwap / StartOver)
 ********************/
function Welcome({ names, setNames, onContinue }: { names: Record<User, string>; setNames: (v: Record<User, string>) => void; onContinue: (who: User) => void; }) {
  return (
    <div className="max-w-md mx-auto text-center py-10">
      <h2 className="text-xl font-semibold mb-3">Need help choosing a movie that you both want to watch?</h2>
      <p className="text-sm text-neutral-300 mb-6">Start by entering your names:</p>
      <div className="space-y-3 text-left">
        <label className="block text-sm mb-1">FIRST PERSON NAME</label>
        <input value={names.You} onChange={(e) => { const next = { ...names, You: e.target.value }; setNames(next); try { localStorage.setItem('cs_names', JSON.stringify(next)); } catch {} }} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" placeholder="e.g. Alex" />
        <label className="block text-sm mb-1 mt-4">SECOND PERSON NAME</label>
        <input value={names.Partner} onChange={(e) => { const next = { ...names, Partner: e.target.value }; setNames(next); try { localStorage.setItem('cs_names', JSON.stringify(next)); } catch {} }} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" placeholder="e.g. Sam" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => { if (!names.You.trim() || !names.Partner.trim()) return; const who: User = Math.random() < 0.5 ? 'You' : 'Partner'; onContinue(who); }} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Continue</button>
        {(names.You || names.Partner) && (
          <button onClick={() => { setNames({ You: '', Partner: '' }); try { localStorage.removeItem('cs_names'); } catch {} }} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Clear names</button>
        )}
      </div>
    </div>
  );
}

function PreDeal({ user, names, onStart }: { user: User; names: Record<User, string>; onStart: () => void; }) {
  const who = user === 'You' ? names.You : names.Partner;
  return (
    <div className="max-w-xl mx-auto text-center py-10">
      <h2 className="text-xl font-semibold mb-3">{(who || 'Someone')} has been randomly chosen to pick first</h2>
      <p className="text-sm text-neutral-300 mb-6">When they have made their choices, the other person can make theirs!</p>
      <button onClick={onStart} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start picking</button>
    </div>
  );
}

function Swap({ user, names, onSwap }: { user: User; names: Record<User, string>; onSwap: () => void; }) {
  const done = user === 'You' ? names.You : names.Partner;
  const next = user === 'You' ? names.Partner : names.You;
  return (
    <div className="text-center py-20">
      <p className="text-lg mb-4"><Icon.Film /> {done || 'First person'}'s turn is done — now pass to {next || 'Second person'}.</p>
      <button onClick={onSwap} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start {next || 'partner'}'s turn</button>
    </div>
  );
}

function ReviewIntro({ user, names, count, onStart }: { user: User; names: Record<User, string>; count: number; onStart: () => void; }) {
  const who = user === 'You' ? names.You : names.Partner;
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold mb-2">Great news!</h2>
      <p className="text-sm text-neutral-300">You both like the look of <strong>{count}</strong> movie{count === 1 ? '' : 's'}.</p>
      <p className="text-sm text-neutral-300 mt-2 mb-6">Now you can each watch trailers to make sure you're happy with your pick.</p>
      <button onClick={onStart} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start {who || 'first reviewer'}'s trailer review</button>
    </div>
  );
}

function ReviewSwap({ user, names, onStart }: { user: User; names: Record<User, string>; onStart: () => void; }) {
  const next = user === 'You' ? names.Partner : names.You;
  const done = user === 'You' ? names.You : names.Partner;
  return (
    <div className="text-center py-20">
      <p className="text-lg mb-2">{done || 'First reviewer'} is done.</p>
      <p className="text-sm text-neutral-300 mb-4">Now hand the device to {next || 'the other person'} so they can review the same shortlist.</p>
      <button onClick={onStart} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start {next || 'next'}'s trailer review</button>
    </div>
  );
}

function StartOver({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-16">
      <h2 className="text-lg font-semibold mb-2">You haven't found the perfect movie yet, try again</h2>
      <p className="text-sm text-neutral-300 mb-6">We'll start over with a completely fresh set and hide everything you've already seen.</p>
      <button onClick={onStart} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start over</button>
    </div>
  );
}

/********************
 * Movie Card (picks phase)
 ********************/
function Card({ movie, genres }: { movie?: MovieLite | null; genres?: { id: number; name: string }[]; }) {
  const [imgOk, setImgOk] = useState(true);
  const safeMovie = useMemo(() => makeSafeMovie(movie), [movie]);
  const genreList = Array.isArray(genres) ? genres : [];
  const posterUrl = hasValidUrl(safeMovie.poster) ? safeMovie.poster! : null;
  const synopsis = (safeMovie.overview || '').trim();

  return (
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto h-[720px] min-h-0 overflow-hidden flex flex-col">
      <div className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50">
        {posterUrl && imgOk ? (
          <img loading="lazy" src={posterUrl} alt={safeMovie.title} className="w-full h-full object-cover" onError={() => setImgOk(false)} />
        ) : (
          <div className="w-full h-full grid place-items-center text-neutral-300 text-sm"><Icon.Frame /> No poster available</div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-1">{safeMovie.title} {safeMovie.year && <span className="text-neutral-400">({safeMovie.year})</span>}</h2>
        <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap break-words flex-1 basis-0 min-h-16 overflow-y-auto pr-1" aria-live="polite">{synopsis ? synopsis : 'No synopsis available.'}</div>
        {!!safeMovie.genre_ids.length && (
          <div className="flex flex-wrap gap-2 text-xs text-neutral-400 mt-auto pt-2">
            {safeMovie.genre_ids.map((id: number) => (
              <span key={id} className="px-2 py-1 rounded-lg bg-neutral-800">{genreList.find((g) => g.id === id)?.name || id}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/********************
 * Trailer Review (matches card style)
 ********************/
function TrailerReview({ user, token, ids: idsProp, onDone }: { user: User; token: string; ids: number[] | undefined; onDone: (yesIds: number[]) => void; }) {
  const ids = Array.isArray(idsProp) ? idsProp : [];
  const [i, setI] = useState(0);
  const [meta, setMeta] = useState<any | null>(null);
  const [trailer, setTrailer] = useState<string | 'none' | null>(null);
  const [yes, setYes] = useState<number[]>([]);
  const safeIndex = i < ids.length ? i : 0;
  const id = ids.length ? ids[safeIndex] : undefined;

  useEffect(() => {
    let alive = true;
    setMeta(null);
    setTrailer(null);
    if (!id) return;
    (async () => {
      try {
        const m = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
        if (!alive) return;
        setMeta(m || null);
        const vres = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } });
        if (!vres.ok) throw new Error('no videos');
        const vv = await vres.json();
        const list = Array.isArray(vv?.results) ? vv.results : [];
        const yt = list.find((v: any) => v && v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
        setTrailer(yt ? yt.key : 'none');
      } catch {
        if (alive) setTrailer('none');
      }
    })();
    return () => { alive = false; };
  }, [id, token]);

  const next = (approve: boolean) => {
    if (!ids.length) return;
    const picks = approve && id ? [...yes, id] : yes;
    if (safeIndex + 1 >= ids.length) {
      try { onDone(picks); } catch {}
    } else {
      setYes(picks);
      setI(safeIndex + 1);
    }
  };

  if (!ids.length) return <div className="text-center py-20 text-neutral-400">No titles to review.</div>;

  const poster = meta?.poster_path ? TMDB_IMAGE_BASE + meta.poster_path : null;
  const safeTitle = String(meta?.title ?? '').trim();
  const release = meta?.release_date ? `(${String(meta.release_date).slice(0, 4)})` : '';
  const description = String((meta?.tagline || meta?.overview || '').trim());
  const youtubeUrl = trailer && trailer !== 'none' ? `https://www.youtube.com/watch?v=${trailer}` : `https://www.youtube.com/results?search_query=${encodeURIComponent((safeTitle || '') + ' trailer')}`;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-3 text-center">{user}: Trailer review {safeIndex + 1} / {ids.length}</h2>
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto h-[720px] flex flex-col overflow-hidden">
        <div className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 relative">
          {poster ? (
            <img loading="lazy" src={poster} alt={safeTitle || 'Poster'} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-neutral-300 text-sm"><Icon.Frame /> No poster available</div>
          )}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"><div className="h-28 w-28 rounded-full bg-white/20 animate-ping"></div></div>
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="Play trailer on YouTube" className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-24 w-24 rounded-full bg-black/60 border border-white/60 ring-8 ring-white/20 shadow-2xl hover:bg-black/70 focus:outline-none"><span className="text-5xl leading-none"><Icon.Play /></span></a>
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/30 text-white text-xs">Play trailer (opens YouTube)</div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col text-center">
          <h3 className="text-base font-medium mb-1">{safeTitle || 'Untitled'} {release && <span className="text-neutral-400">{release}</span>}</h3>
          <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap break-words flex-1 basis-0 min-h-16 overflow-y-auto pr-1">{description || 'No synopsis available.'}</div>
          <div className="mt-auto pt-2 flex justify-center gap-4">
            <button onClick={() => next(false)} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700"><Icon.X /> No</button>
            <button onClick={() => next(true)} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500"><Icon.Heart /> Yes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/********************
 * Results grid
 ********************/
function Results({ agreedIds, token, heading = 'Agreed Picks' }: { agreedIds: number[]; token: string; heading?: string; }) {
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

  async function loadTrailer(id: number) {
    if (trailers[id]) { setOpenTrailer(openTrailer === id ? null : id); return; }
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-GB`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No trailer');
      const data = await res.json();
      const yt = (data.results || []).find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      setTrailers({ ...trailers, [id]: yt ? yt.key : 'none' });
      setOpenTrailer(id);
    } catch {
      setTrailers({ ...trailers, [id]: 'none' });
      setOpenTrailer(id);
    }
  }

  if (!agreedIds.length) return <div className="text-center text-neutral-400">No agreed picks yet.</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{heading} ({agreedIds.length})</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m) => {
          const poster = m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null;
          const tmdbUrl = `https://www.themoviedb.org/movie/${m.id}`;
          const trailerKey = trailers[m.id];
          const youtubeUrl = trailerKey && trailerKey !== 'none' ? `https://www.youtube.com/watch?v=${trailerKey}` : `https://www.youtube.com/results?search_query=${encodeURIComponent((m.title || '') + ' trailer')}`;
          return (
            <li key={m.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/40">
              <div className="flex gap-3">
                {poster ? (
                  <img loading="lazy" src={poster} alt={m.title} className="w-12 h-18 object-cover rounded-md border border-neutral-800" />
                ) : (
                  <div className="w-12 h-18 rounded-md bg-neutral-800 grid place-items-center"><Icon.Frame /></div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.title}</div>
                  <div className="text-xs text-neutral-400 line-clamp-2">{m.tagline || m.overview}</div>
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => loadTrailer(m.id)} className="text-xs text-blue-400 underline hover:text-blue-300">{openTrailer === m.id ? 'Hide trailer' : 'Play trailer'}</button>
                    <a href={tmdbUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-400 hover:text-blue-300">View on TMDB</a>
                  </div>
                  {openTrailer === m.id && (
                    <div className="mt-2 text-xs text-neutral-300">
                      <a href={youtubeUrl} target="_blank" rel="noreferrer noopener" className="underline text-blue-400 hover:text-blue-300">Open trailer on YouTube</a>
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

/********************
 * Winner screen (uses WinnerCard)
 ********************/
function Winner({ id, token, onBack, onRestart }: { id: number; token: string; onBack: () => void; onRestart: () => void; }) {
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
  const tmdbUrl = `https://www.themoviedb.org/movie/${m.id}`;
  return (
    <div className="max-w-md mx-auto text-center">
      <h2 className="text-xl font-semibold mb-3">Tonight's pick</h2>
      <WinnerCard movie={m} tmdbUrl={tmdbUrl} />
      <div className="mt-3 flex justify-center gap-3">
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"><Icon.Back /> Back to list</button>
        <button onClick={onRestart} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white">Finished, start again!</button>
      </div>
    </div>
  );
}

/********************
 * Root App
 ********************/
export default function App() {
  const defaultPrefs: Prefs = {
    region: 'GB',
    monetization: 'flatrate',
    providerIds: [8, 9], // Netflix + Prime by default
    minVoteCount: 50,
    language: 'en-GB',
    sortBy: 'popularity.desc',
    targetCount: 10,
  } as const as Prefs;

  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { const raw = localStorage.getItem('cs_prefs_v2'); if (raw) return JSON.parse(raw) as Prefs; } catch {}
    return defaultPrefs;
  });

  const [token, setToken] = useState(() => (import.meta as any)?.env?.VITE_TMDB_TOKEN || localStorage.getItem('tmdb_v4_token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deckSize, setDeckSize] = useState<number>(prefs.targetCount);
  const [bannedIds, setBannedIds] = useState<Set<number>>(new Set());
  const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  // Persist prefs
  useEffect(() => { try { localStorage.setItem('cs_prefs_v2', JSON.stringify({ ...prefs, targetCount: deckSize })); } catch {} }, [prefs, deckSize]);

  const [names, setNames] = useState<Record<User, string>>(() => {
    try { const raw = localStorage.getItem('cs_names'); if (raw) return JSON.parse(raw); } catch {}
    return { You: '', Partner: '' };
  });

  const [state, setState] = useState<{
    currentUser: User;
    phase: 'welcome' | 'preDeal' | 'idle' | 'round1' | 'swap' | 'round2' | 'reviewIntro' | 'review1' | 'reviewSwap' | 'review2' | 'noAgreed' | 'final' | 'winner' | 'startOver';
    cohort: MovieLite[];
    idx: Record<User, number>;
    likes: Record<User, Set<number>>;
    passes: Record<User, Set<number>>;
    agreed: number[];
  }>({
    currentUser: 'You',
    phase: 'welcome',
    cohort: [],
    idx: { You: 0, Partner: 0 },
    likes: { You: new Set(), Partner: new Set() },
    passes: { You: new Set(), Partner: new Set() },
    agreed: [],
  });

  const [reviewYes, setReviewYes] = useState<Record<User, Set<number>>>({ You: new Set(), Partner: new Set() });
  const [winnerId, setWinnerId] = useState<number | null>(null);

  // Fetch genres when token or language changes
  useEffect(() => {
    if (!token) return;
    fetch(`https://api.themoviedb.org/3/genre/movie/list?language=${prefs.language}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setGenres(j.genres || []))
      .catch(() => {});
  }, [token, prefs.language]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (loading) return;
      if (state.phase !== 'round1' && state.phase !== 'round2') return;
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l' || e.key === ' ') { e.preventDefault(); act('like'); }
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'x') { e.preventDefault(); act('pass'); }
      else if (e.key.toLowerCase() === 'u') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, loading]);

  async function buildDeck(size?: number) {
    if (!token) { setError('Please enter your TMDB token above.'); return; }
    setLoading(true); setError(''); setNotice('');
    try {
      const target = (typeof size === 'number' ? size : deckSize) || 10;
      const collected: any[] = []; const seen = new Set<number>(); let page = 1; let attempts = 0;
      const providerStr = prefs.providerIds.join('|');
      while (collected.length < target) {
        const url = `https://api.themoviedb.org/3/discover/movie?watch_region=${prefs.region}&include_adult=false&sort_by=${prefs.sortBy}&page=${page}&with_watch_providers=${providerStr}&with_watch_monetization_types=${prefs.monetization}&vote_count.gte=${prefs.minVoteCount}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 429) {
          // very simple backoff
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
          attempts++; if (attempts > 4) throw new Error('TMDB is rate limiting. Try again shortly.');
          continue;
        }
        if (!res.ok) throw new Error('TMDB fetch failed: ' + res.status);
        const data = await res.json(); const results: any[] = data.results || [];
        for (const m of results) {
          if (bannedIds.has(m.id)) continue;
          if (!seen.has(m.id)) { seen.add(m.id); collected.push(m); }
          if (collected.length >= target) break;
        }
        if (collected.length >= target) break;
        const totalPages = Number(data.total_pages || 1); if (page >= totalPages || results.length === 0) break; page += 1;
      }
      const cohort: MovieLite[] = collected.slice(0, target).map((m: any) => ({ id: m.id, title: m.title, overview: m.overview, year: (m.release_date || '').slice(0, 4), poster: m.poster_path ? TMDB_IMAGE_BASE + m.poster_path : null, genre_ids: m.genre_ids }));
      setReviewYes({ You: new Set(), Partner: new Set() }); setWinnerId(null); setHistory([]);
      setState({ currentUser: state.currentUser, phase: 'round1', cohort, idx: { You: 0, Partner: 0 }, likes: { You: new Set(), Partner: new Set() }, passes: { You: new Set(), Partner: new Set() }, agreed: [] });
    } catch (e: any) { setError(e.message || String(e)); } finally { setLoading(false); }
  }

  function act(kind: 'like' | 'pass') {
    const current = state.cohort[state.idx[state.currentUser]]; if (!current) return; const user = state.currentUser;
    const likes = new Set(state.likes[user]); const passes = new Set(state.passes[user]); if (kind === 'like') likes.add(current.id); else passes.add(current.id);
    const nextIdx = state.idx[user] + 1; let phase = state.phase; let agreed = [...state.agreed]; let reviewStarter: User | null = null;
    // history for undo
    setHistory((h) => [{ user, kind, id: current.id, prevIndex: state.idx[user] }, ...h].slice(0, 200));

    if (state.phase === 'round2' && kind === 'like') { const other: User = user === 'You' ? 'Partner' : 'You'; if (state.likes[other].has(current.id) && !agreed.includes(current.id)) { agreed.push(current.id); } }
    if (nextIdx >= state.cohort.length) {
      if (state.phase === 'round1') { phase = 'swap'; }
      else if (state.phase === 'round2') {
        if (agreed.length) { reviewStarter = Math.random() < 0.5 ? 'You' : 'Partner'; phase = 'reviewIntro'; }
        else {
          const idsThisCohort = state.cohort.map((m) => m.id);
          const dislikedByBoth = idsThisCohort.filter((id) => !state.likes.You.has(id) && !state.likes.Partner.has(id));
          if (dislikedByBoth.length) setBannedIds((prev) => new Set([...Array.from(prev), ...Array.from(dislikedByBoth)]));
          const next = Math.min(deckSize + 10, 200); setNotice(`No agreed picks this round. We'll add ${next - deckSize} more ( ${deckSize} → ${next} ) and deal again.`);
          setState({ ...state, likes: { ...state.likes, [user]: likes }, passes: { ...state.passes, [user]: passes }, idx: { ...state.idx, [user]: nextIdx }, phase: 'noAgreed', agreed });
          return;
        }
      }
    }
    setState({ ...state, currentUser: reviewStarter ?? state.currentUser, likes: { ...state.likes, [user]: likes }, passes: { ...state.passes, [user]: passes }, idx: { ...state.idx, [user]: nextIdx }, phase, agreed });
  }

  // Undo last swipe for current user
  function undo() {
    const last = history.find((h) => h.user === state.currentUser);
    if (!last) return;
    const rest = history.filter((h, i) => i !== history.indexOf(last));
    const likes = new Set(state.likes[state.currentUser]);
    const passes = new Set(state.passes[state.currentUser]);
    if (last.kind === 'like') likes.delete(last.id); else passes.delete(last.id);
    // also remove from agreed if it was added in round2 and both liked
    let agreed = [...state.agreed];
    if (state.phase === 'round2' && last.kind === 'like') {
      const other: User = state.currentUser === 'You' ? 'Partner' : 'You';
      if (state.likes[other].has(last.id)) agreed = agreed.filter((x) => x !== last.id);
    }
    setHistory(rest);
    setState({ ...state, likes: { ...state.likes, [state.currentUser]: likes }, passes: { ...state.passes, [state.currentUser]: passes }, idx: { ...state.idx, [state.currentUser]: last.prevIndex }, agreed });
  }

  const handleSwap = () => setState((prev) => { const nextUser: User = prev.currentUser === 'You' ? 'Partner' : 'You'; return { ...prev, currentUser: nextUser, phase: 'round2', idx: { ...prev.idx, [nextUser]: 0 } }; });

  function handleReviewDone(user: User, yesIds: number[]) {
    const nextReview = new Set(reviewYes[user]); yesIds.forEach((id) => nextReview.add(id)); const updated = { ...reviewYes, [user]: nextReview }; setReviewYes(updated);
    if (state.phase === 'review1') { setState((s) => ({ ...s, phase: 'reviewSwap' })); return; }
    const finalIds = state.agreed.filter((id) => updated.You.has(id) && updated.Partner.has(id)); if (finalIds.length === 0) { setState((s) => ({ ...s, phase: 'startOver', agreed: [] })); } else { setState((s) => ({ ...s, phase: 'final', agreed: finalIds })); }
  }

  const currentMovie = state.cohort[state.idx[state.currentUser]];

  const randomPick = () => { const pool = state.agreed; if (!pool.length) return; const id = pool[Math.floor(Math.random() * pool.length)]; setWinnerId(id); setState((s) => ({ ...s, phase: 'winner' })); };

  const autoExpandAndRedeal = () => { const next = Math.min(deckSize + 10, 200); setDeckSize(next); setNotice(`No matches this round — expanding deck to ${next} and dealing again…`); setTimeout(() => buildDeck(next), 0); };

  const startOverFresh = () => {
    const seen = new Set<number>(); state.cohort.forEach((m) => seen.add(m.id)); state.likes.You.forEach((id) => seen.add(id)); state.likes.Partner.forEach((id) => seen.add(id)); state.passes.You.forEach((id) => seen.add(id)); state.passes.Partner.forEach((id) => seen.add(id)); state.agreed.forEach((id) => seen.add(id));
    setBannedIds((prev) => new Set([...Array.from(prev), ...Array.from(seen)]));
    setState({ currentUser: 'You', phase: 'idle', cohort: [], idx: { You: 0, Partner: 0 }, likes: { You: new Set(), Partner: new Set() }, passes: { You: new Set(), Partner: new Set() }, agreed: [] });
    setNotice('Starting over with a fresh set of movies…'); setTimeout(() => buildDeck(prefs.targetCount), 0);
  };

  const restartAll = () => { setWinnerId(null); setNotice(''); setDeckSize(defaultPrefs.targetCount); setBannedIds(new Set()); setHistory([]); setState({ currentUser: 'You', phase: 'welcome', cohort: [], idx: { You: 0, Partner: 0 }, likes: { You: new Set(), Partner: new Set() }, passes: { You: new Set(), Partner: new Set() }, agreed: [] }); };

  // Export helpers
  function exportJSON() {
    const payload = {
      agreedIds: state.agreed,
      cohort: state.cohort,
      names,
      when: new Date().toISOString(),
      prefs: { ...prefs, targetCount: deckSize },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'coupleswipe-shortlist.json'; a.click();
    URL.revokeObjectURL(url);
  }
  function exportCSV() {
    const rows = [['id','title','year']].concat(
      state.cohort.filter((m) => state.agreed.includes(m.id)).map((m) => [m.id, m.title.replaceAll('"','""'), m.year || ''])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c)}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'coupleswipe-shortlist.csv'; a.click(); URL.revokeObjectURL(url);
  }
  async function copyShareText() {
    const lines = state.cohort.filter((m) => state.agreed.includes(m.id)).map((m, i) => `${i+1}. ${m.title} (${m.year||'n/a'})`);
    const text = `Our agreed movie shortlist (CoupleSwipe):\n\n${lines.join('\n')}`;
    try { await navigator.clipboard.writeText(text); setNotice('Copied shortlist to clipboard'); } catch { setError('Copy failed. Your browser may block clipboard access.'); }
  }

  // Progress percentage for current user
  const progressPct = (() => {
    const i = state.idx[state.currentUser];
    const total = Math.max(1, state.cohort.length);
    return Math.min(100, Math.round((i / total) * 100));
  })();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4">
      <header className="border-b border-neutral-800 pb-2 mb-4 flex items-center gap-2">
        <span><Icon.Film /></span>
        <h1 className="font-semibold">CoupleSwipe</h1>
        <span className="text-xs text-neutral-400">UK Streaming Picker</span>
        <div className="ml-auto flex items-center gap-2">
          {(names.You || names.Partner) && <span className="text-xs text-neutral-400 hidden sm:inline">{names.You || '—'} · {names.Partner || '—'}</span>}
          <button ref={settingsButtonRef} onClick={() => setSettingsOpen(true)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg"><Icon.Cog /> Settings</button>
          <button onClick={() => buildDeck(deckSize)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg"><Icon.Refresh /> Build {deckSize}</button>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-neutral-300">TMDB Token:</label>
        <input type="password" placeholder="Paste your TMDB v4 token here" value={token} onChange={(e) => { const v = e.target.value; setToken(v); try { localStorage.setItem('tmdb_v4_token', v); } catch {} }} className="flex-1 px-2 py-1 rounded bg-neutral-800 text-neutral-100 border border-neutral-700" />
      </div>

      {error && <div role="alert" className="text-red-400 mb-2">{error}</div>}
      {notice && <div className="text-blue-300 mb-4">{notice}</div>}

      {/* Progress bar during swiping */}
      {(state.phase === 'round1' || state.phase === 'round2') && state.cohort.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-neutral-400 mb-1"><span>{state.currentUser}'s picks</span><span>{state.idx[state.currentUser]} / {state.cohort.length}</span></div>
          <div className="h-2 rounded bg-neutral-800 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${progressPct}%` }} /></div>
          <div className="mt-1 text-[11px] text-neutral-500">Shortcuts: ← pass · → like · U undo</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-neutral-400">Loading deck...</div>
      ) : state.phase === 'welcome' ? (
        <Welcome names={names} setNames={setNames} onContinue={(who) => setState((s) => ({ ...s, currentUser: who, phase: 'preDeal' }))} />
      ) : state.phase === 'preDeal' ? (
        <PreDeal user={state.currentUser} names={names} onStart={() => buildDeck(deckSize)} />
      ) : state.phase === 'swap' ? (
        <Swap user={state.currentUser} names={names} onSwap={handleSwap} />
      ) : state.phase === 'reviewIntro' ? (
        <ReviewIntro user={state.currentUser} names={names} count={state.agreed.length} onStart={() => setState((s) => ({ ...s, phase: 'review1' }))} />
      ) : state.phase === 'review1' ? (
        <TrailerReview user={state.currentUser} token={token} ids={state.agreed} onDone={(yes) => handleReviewDone(state.currentUser, yes)} />
      ) : state.phase === 'reviewSwap' ? (
        <ReviewSwap user={state.currentUser} names={names} onStart={() => setState({ ...state, currentUser: state.currentUser === 'You' ? 'Partner' : 'You', phase: 'review2' })} />
      ) : state.phase === 'review2' ? (
        <TrailerReview user={state.currentUser} token={token} ids={state.agreed} onDone={(yes) => handleReviewDone(state.currentUser, yes)} />
      ) : state.phase === 'noAgreed' ? (
        <div className="text-center">
          <p className="mb-3">No agreed picks this round</p>
          <p className="text-sm text-neutral-300 mb-4">You didn't both swipe thumbs-up on the same title. We'll add more movies to widen the pool and deal again.</p>
          <div className="flex justify-center gap-3">
            <button onClick={autoExpandAndRedeal} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white">Add more & re-deal</button>
            <button onClick={() => buildDeck(deckSize)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">Re-deal now</button>
          </div>
        </div>
      ) : state.phase === 'final' ? (
        <div>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <button onClick={exportJSON} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700"><Icon.Download /> Export JSON</button>
            <button onClick={exportCSV} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700"><Icon.Download /> Export CSV</button>
            <button onClick={copyShareText} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700"><Icon.Copy /> Copy shortlist</button>
          </div>
          <Results agreedIds={state.agreed} token={token} heading="Final agreed picks" />
          <div className="mt-6 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 text-center">
            <p className="mb-3 text-sm text-neutral-300">You both liked all these! I'll pick the winner for you</p>
            <button onClick={randomPick} disabled={!state.agreed.length} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">Random pick</button>
          </div>
        </div>
      ) : state.phase === 'winner' && winnerId ? (
        <Winner id={winnerId} token={token} onBack={() => setState({ ...state, phase: 'final' })} onRestart={restartAll} />
      ) : state.phase === 'startOver' ? (
        <StartOver onStart={startOverFresh} />
      ) : !currentMovie ? (
        <div className="text-center py-20 text-neutral-400">Click Build Deck to begin</div>
      ) : (
        <div className="text-center">
          <Card movie={currentMovie} genres={genres} />
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button onClick={undo} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700" title="Undo (U)"><Icon.Back /> Undo</button>
            <button onClick={() => act('pass')} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700" title="Pass (←)"><Icon.X /> Pass</button>
            <button onClick={() => act('like')} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500" title="Like (→)"><Icon.Heart /> Like</button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          prefs={{ ...prefs, targetCount: deckSize }}
          setPrefs={(p) => { setPrefs(p); setDeckSize(p.targetCount); }}
          onSave={() => { setSettingsOpen(false); buildDeck(deckSize); settingsButtonRef.current?.focus(); }}
        />
      )}
    </div>
  );
}
