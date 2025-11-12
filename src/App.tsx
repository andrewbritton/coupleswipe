import { useEffect, useMemo, useState } from 'react';

// tiny unicode icon set
const I={H:()=> <span aria-hidden>{'\u2665'}</span>, X:()=> <span aria-hidden>{'\u00D7'}</span>, R:()=> <span aria-hidden>{'\u21BB'}</span>, F:()=> <span aria-hidden>{'\u25A0'}</span>, M:()=> <span aria-hidden>{'\u25A6'}</span>, P:()=> <span aria-hidden>{'\u25B6'}</span>};

type User = 'You' | 'Partner';

const IMG='https://image.tmdb.org/t/p/w780';
const okUrl=(u?:string|null)=>/^https?:\/\//i.test(u?.trim?.()||'');

// swipe helper
const swipeDir=(dx:number, th=64)=> Math.abs(dx)>th ? (dx>0?'right':'left') : null;

// --- quick runtime tests (console only) ---
function runTests(){
  const t=(name:string,fn:()=>any)=>{try{const r=fn();console.log('TEST ✓',name,r);}catch(e){console.error('TEST ✗',name,e)}};
  // existing tests (unchanged)
  t('okUrl true',()=>okUrl('http://a.b'));
  t('okUrl false empty',()=>!okUrl(''));
  t('safeMovie defaults',()=>{const m=safeMovie(null as any); if(m.id!==-1||m.title!=='Unknown title') throw new Error('defaults'); return m;});
  t('swipeDir none',()=>swipeDir(10,64)===null);
  t('swipeDir right',()=>swipeDir(80,64)==='right');
  t('swipeDir left',()=>swipeDir(-99,64)==='left');
  // extra tests
  t('swipeDir boundary equal threshold',()=>swipeDir(64,64)===null && swipeDir(-64,64)===null);
  t('swipeDir large values',()=>swipeDir(500,64)==='right' && swipeDir(-500,64)==='left');
}

const WinnerCard=({movie,tmdbUrl}:{movie:any;tmdbUrl:string})=>{
  const poster=movie?.poster_path?IMG+movie.poster_path:null;
  return(
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto h-[680px] flex flex-col overflow-hidden text-center">
      {poster? <img src={poster} alt={movie.title} className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 object-cover"/> :
        <div className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 grid place-items-center text-neutral-300 text-sm"><I.M/> No poster available</div>}
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-1">{movie.title} {movie.release_date&&<span className="text-neutral-400">({String(movie.release_date).slice(0,4)})</span>}</h2>
          <p className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap break-words flex-1 basis-0 min-h-16 overflow-y-auto pr-1">{movie.tagline||movie.overview||'No synopsis available.'}</p>
        </div>
        <div className="mt-auto"><a href={tmdbUrl} target="_blank" rel="noreferrer" className="text-xs underline text-blue-400 hover:text-blue-300">View on TMDB</a></div>
      </div>
    </div>
  );
};

const safeMovie=(m:any)=>({id:m?.id??-1,title:m?.title??'Unknown title',overview:m?.overview??'',year:m?.year??'',poster:m?.poster??null,genre_ids:Array.isArray(m?.genre_ids)?m.genre_ids:[]});

const Card=({movie,genres,onSwipe}:{movie?:any;genres?:{id:number;name:string}[];onSwipe?:(dir:'left'|'right')=>void;})=>{
  const [imgOk,setImgOk]=useState(true);
  const [dx,setDx]=useState(0); const [drag,setDrag]=useState(false); const [start,setStart]=useState<number|null>(null);
  const m=useMemo(()=>safeMovie(movie),[movie]);
  const g=Array.isArray(genres)?genres:[];
  const poster=okUrl(m.poster)?m.poster:null; const s=(m.overview||'').trim();
  const TH=64; // swipe threshold px
  const end=()=>{ const d=swipeDir(dx,TH); if(d){ onSwipe?.(d); } setDx(0); setDrag(false); setStart(null); };
  const move=(x:number)=>{ if(start==null) return; setDx(x-start); };
  return(
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto h-[720px] min-h-0 overflow-hidden flex flex-col select-none"
      onTouchStart={(e)=>{setStart(e.touches[0].clientX); setDrag(true);}}
      onTouchMove={(e)=>move(e.touches[0].clientX)}
      onTouchEnd={end}
      onMouseDown={(e)=>{if(e.button!==0)return; setStart(e.clientX); setDrag(true);}}
      onMouseMove={(e)=>{if(start!=null) move(e.clientX);}}
      onMouseUp={end}
      style={{transform:`translateX(${dx}px) rotate(${dx/20}deg)`,transition:drag?'none':'transform 200ms'}}>
      <div className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 relative">
        {poster&&imgOk? <img src={poster} alt={m.title} className="w-full h-full object-cover" onError={()=>setImgOk(false)}/> :
          <div className="w-full h-full grid place-items-center text-neutral-300 text-sm"><I.M/> No poster available</div>}
        {/* subtle swipe hint badges */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-3">
          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${dx<-TH/2?'bg-red-600/80':'bg-transparent'}`}>← No</div>
          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${dx>TH/2?'bg-green-600/80':'bg-transparent'}`}>Yes →</div>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-1">{m.title} {m.year&&<span className="text-neutral-400">({m.year})</span>}</h2>
        <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap break-words flex-1 basis-0 min-h-16 overflow-y-auto pr-1">{s||'No synopsis available.'}</div>
        {!!m.genre_ids.length&&(
          <div className="flex flex-wrap gap-2 text-xs text-neutral-400 mt-auto pt-2">
            {m.genre_ids.map((id:number)=>(<span key={id} className="px-2 py-1 rounded-lg bg-neutral-800">{g.find(x=>x.id===id)?.name||id}</span>))}
          </div>
        )}
      </div>
    </div>
  );
};

const TrailerReview=({user,token,ids:onIds,onDone}:{user:User;token:string;ids:number[]|undefined;onDone:(ids:number[])=>void;})=>{
  const ids=Array.isArray(onIds)?onIds:[];
  const [i,setI]=useState(0),[meta,setMeta]=useState<any|null>(null),[tr,setTr]=useState<string|'none'|null>(null),[yes,setYes]=useState<number[]>([]);
  const [dx,setDx]=useState(0); const [drag,setDrag]=useState(false); const [start,setStart]=useState<number|null>(null);
  const [playing,setPlaying]=useState(false);
  const id=ids[i] as number|undefined;
  useEffect(()=>{let live=true;setMeta(null);setTr(null);setPlaying(false);if(!id)return;(async()=>{
    try{
      const m=await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
      if(!live)return;setMeta(m||null);
      const v=await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-GB`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():{results:[]});
      const yt=(v.results||[]).find((x:any)=>x.site==='YouTube'&&(x.type==='Trailer'||x.type==='Teaser'));
      setTr(yt?yt.key:'none');
    }catch{live&&setTr('none');}
  })();return()=>{live=false};},[id,token]);
  if(!ids.length) return <div className="text-center py-20 text-neutral-400">No titles to review.</div>;
  const poster=meta?.poster_path?IMG+meta.poster_path:null, title=(meta?.title||'').trim(), rel=meta?.release_date?`(${String(meta.release_date).slice(0,4)})`:'';
  const desc=(meta?.tagline||meta?.overview||'').trim();
  const ytWatch=tr&&tr!=='none'?`https://www.youtube.com/watch?v=${tr}`:`https://www.youtube.com/results?search_query=${encodeURIComponent(title+' trailer')}`;
  const ytEmbed=tr&&tr!=='none'?`https://www.youtube.com/embed/${tr}?autoplay=1&rel=0`:'about:blank';
  const next=(ok:boolean)=>{const picks=ok&&id?[...yes,id]:yes; if(i+1>=ids.length) onDone(picks); else {setYes(picks); setI(i+1);} };
  const end=()=>{ if(playing) return; const d=swipeDir(dx,64); if(d){ next(d==='right'); } setDx(0); setDrag(false); setStart(null); };
  const move=(x:number)=>{ if(playing||start==null) return; setDx(x-start); };
  return(
    <div className="max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-3 text-center">{user}: Trailer review {i+1} / {ids.length}</h2>
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 max-w-md mx-auto h-[720px] flex flex-col overflow-hidden select-none"
           onTouchStart={(e)=>{ if(playing) return; setStart(e.touches[0].clientX); setDrag(true);}}
           onTouchMove={(e)=>move(e.touches[0].clientX)}
           onTouchEnd={end}
           onMouseDown={(e)=>{if(playing||e.button!==0)return; setStart(e.clientX); setDrag(true);}}
           onMouseMove={(e)=>{if(start!=null) move(e.clientX);}}
           onMouseUp={end}
           style={{transform:`translateX(${dx}px) rotate(${dx/20}deg)`,transition:drag&&!playing?'none':'transform 200ms'}}>
        <div className="w-2/3 mx-auto aspect-[2/3] rounded-lg mb-4 overflow-hidden border border-neutral-800 bg-neutral-800/50 relative">
          {poster? <img src={poster} alt={title||'Poster'} className="w-full h-full object-cover"/> : <div className="w-full h-full grid place-items-center text-neutral-300 text-sm"><I.M/> No poster available</div>}
          {/* play button (opens inline if we have a YouTube key) */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"><div className="h-28 w-28 rounded-full bg-white/20 animate-ping"/></div>
          {tr&&tr!=='none'? (
            <button onClick={()=>setPlaying(true)} aria-label="Play trailer inline" className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-24 w-24 rounded-full bg-black/60 border border-white/60 ring-8 ring-white/20 shadow-2xl hover:bg-black/70 focus:outline-none"><span className="text-5xl leading-none"><I.P/></span></button>
          ) : (
            <a href={ytWatch} target="_blank" rel="noopener noreferrer" aria-label="Search trailer on YouTube" className="absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-24 w-24 rounded-full bg-black/60 border border-white/60 ring-8 ring-white/20 shadow-2xl hover:bg-black/70 focus:outline-none"><span className="text-5xl leading-none"><I.P/></span></a>
          )}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 border border-white/30 text-white text-xs">Play trailer</div>
          <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-3">
            <div className={`px-2 py-1 rounded-lg text-xs font-medium self-start ${dx<-32?'bg-red-600/80':'bg-transparent'}`}>← No</div>
            <div className={`px-2 py-1 rounded-lg text-xs font-medium self-start ${dx>32?'bg-green-600/80':'bg-transparent'}`}>Yes →</div>
          </div>
          {/* inline YT player overlay */}
          {playing&&tr&&tr!=='none' && (
            <div className="absolute inset-0 z-20 bg-black/90">
              <button aria-label="Close trailer" onClick={()=>setPlaying(false)} className="absolute top-2 right-2 z-30 px-3 py-1 rounded-lg bg-neutral-900/80 border border-neutral-700 text-sm"><I.X/> Close</button>
              <iframe className="absolute inset-0 w-full h-full" src={ytEmbed} title={title||'Trailer'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 flex flex-col text-center">
          <h3 className="text-base font-medium mb-1">{title||'Untitled'} {rel&&<span className="text-neutral-400">{rel}</span>}</h3>
          <div className="text-sm text-neutral-300 mb-2 whitespace-pre-wrap break-words flex-1 basis-0 min-h-16 overflow-y-auto pr-1">{desc||'No synopsis available.'}</div>
          <div className="mt-auto pt-2 flex justify-center gap-4">
            <button onClick={()=>next(false)} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700"><I.X/> No</button>
            <button onClick={()=>next(true)} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500"><I.H/> Yes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Results=({agreedIds,token,heading='Agreed Picks'}:{agreedIds:number[];token:string;heading?:string;})=>{
  const [items,setItems]=useState<any[]>([]),[trailers,setT]=useState<Record<number,string>>({}),[open,setOpen]=useState<number|null>(null);
  useEffect(()=>{(async()=>{
    const out=await Promise.all(agreedIds.map(async id=>{try{const r=await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`,{headers:{Authorization:`Bearer ${token}`}});return r.ok?await r.json():null;}catch{return null;}}));
    setItems(out.filter(Boolean) as any[]);
  })()},[agreedIds,token]);
  const load=async(id:number)=>{if(trailers[id]){setOpen(open===id?null:id);return;} try{const r=await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-GB`,{headers:{Authorization:`Bearer ${token}`}}); const d=r.ok?await r.json():{results:[]}; const yt=(d.results||[]).find((v:any)=>v.site==='YouTube'&&(v.type==='Trailer'||v.type==='Teaser')); setT({...trailers,[id]:yt?yt.key:'none'}); setOpen(id);}catch{setT({...trailers,[id]:'none'}); setOpen(id);}};
  if(!agreedIds.length) return <div className="text-center text-neutral-400">No agreed picks yet.</div>;
  return(
    <div>
      <h2 className="text-lg font-semibold mb-4">{heading} ({agreedIds.length})</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((m:any)=>{const poster=m.poster_path?IMG+m.poster_path:null, tmdb=`https://www.themoviedb.org/movie/${m.id}`; const k=trailers[m.id]; const yt=k&&k!=='none'?`https://www.youtube.com/watch?v=${k}`:`https://www.youtube.com/results?search_query=${encodeURIComponent((m.title||'')+' trailer')}`; return(
          <li key={m.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/40">
            <div className="flex gap-3">
              {poster? <img src={poster} alt={m.title} className="w-12 h-18 object-cover rounded-md border border-neutral-800"/> : <div className="w-12 h-18 rounded-md bg-neutral-800 grid place-items-center"><I.M/></div>}
              <div className="flex-1">
                <div className="text-sm font-medium">{m.title}</div>
                <div className="text-xs text-neutral-400 line-clamp-2">{m.tagline||m.overview}</div>
                <div className="mt-1 flex gap-2">
                  <button onClick={()=>load(m.id)} className="text-xs text-blue-400 underline hover:text-blue-300">{open===m.id?'Hide trailer':'Play trailer'}</button>
                  <a href={tmdb} target="_blank" rel="noreferrer" className="text-xs underline text-blue-400 hover:text-blue-300">View on TMDB</a>
                </div>
                {open===m.id&&<div className="mt-2 text-xs text-neutral-300"><a href={yt} target="_blank" rel="noreferrer noopener" className="underline text-blue-400 hover:text-blue-300">Open trailer on YouTube</a></div>}
              </div>
            </div>
          </li>
        );})}
      </ul>
    </div>
  );
};

const Winner=({id,token,onBack,onRestart}:{id:number;token:string;onBack:()=>void;onRestart:()=>void;})=>{
  const [m,setM]=useState<any|null>(null);
  useEffect(()=>{let live=true;(async()=>{try{const r=await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-GB`,{headers:{Authorization:`Bearer ${token}`}}); const j=await r.json(); live&&setM(j);}catch{}})();return()=>{live=false}},[id,token]);
  if(!m) return <div className="text-center py-20 text-neutral-400">Choosing a winner…</div>;
  return(
    <div className="max-w-md mx-auto text-center">
      <h2 className="text-xl font-semibold mb-3">Tonight's pick</h2>
      <WinnerCard movie={m} tmdbUrl={`https://www.themoviedb.org/movie/${m.id}`}/>
      <div className="mt-3 flex justify-center gap-3">
        <button onClick={onBack} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">Back to list</button>
        <button onClick={onRestart} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white">Finished, start again!</button>
      </div>
    </div>
  );
};

export default function App(){
  const prefs={region:'GB',monetization:'flatrate',providerIds:{netflix:8,prime:9},minVoteCount:50,language:'en-GB',sortBy:'popularity.desc',targetCount:10} as const;
  const [token,setToken]=useState(()=> (import.meta as any)?.env?.VITE_TMDB_TOKEN || localStorage.getItem('tmdb_v4_token') || ''),
        [loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[deck,setDeck]=useState<number>(prefs.targetCount),
        [ban,setBan]=useState<Set<number>>(new Set()),[genres,setGenres]=useState<{id:number;name:string}[]>([]),
        [names,setNames]=useState<Record<User,string>>(()=>{try{const r=localStorage.getItem('cs_names'); if(r) return JSON.parse(r);}catch{} return {You:'',Partner:''};}),
        [s,setS]=useState({user:'You' as User,phase:'welcome' as any,cohort:[] as any[],idx:{You:0,Partner:0},likes:{You:new Set<number>(),Partner:new Set<number>()},passes:{You:new Set<number>(),Partner:new Set<number>()},agreed:[] as number[]}),
        [reviewYes,setReviewYes]=useState<{You:Set<number>;Partner:Set<number>}>({You:new Set(),Partner:new Set()}),
        [win,setWin]=useState<number|null>(null);

  useEffect(()=>{runTests();},[]);

  useEffect(()=>{ if(!token) return; fetch(`https://api.themoviedb.org/3/genre/movie/list?language=${prefs.language}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(j=>setGenres(j.genres||[])).catch(()=>{}); },[token]);

  async function buildDeck(size?:number){ if(!token){setError('Please enter your TMDB token above.'); return;} setLoading(true); setError(''); setNotice(''); try{
    const target=(typeof size==='number'?size:deck)||10; const out:any[]=[]; const seen=new Set<number>(); let page=1;
    while(out.length<target){ const url=`https://api.themoviedb.org/3/discover/movie?watch_region=${prefs.region}&include_adult=false&sort_by=${prefs.sortBy}&page=${page}&with_watch_providers=${prefs.providerIds.netflix}|${prefs.providerIds.prime}&with_watch_monetization_types=${prefs.monetization}&vote_count.gte=${prefs.minVoteCount}`;
      const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}}); if(!r.ok) throw new Error('TMDB fetch failed: '+r.status); const d=await r.json() as any; const rs: any[] = Array.isArray(d.results)? d.results : [];
      for(const m of rs){ if(ban.has(m.id)) continue; if(!seen.has(m.id)){ seen.add(m.id); out.push(m);} if(out.length>=target) break; }
      if(out.length>=target) break; const tp=Number(d.total_pages||1); if(page>=tp||rs.length===0) break; page++; }
    const cohort=out.slice(0,target).map((m:any)=>({id:m.id,title:m.title,overview:m.overview,year:(m.release_date||'').slice(0,4),poster:m.poster_path?IMG+m.poster_path:null,genre_ids:m.genre_ids}));
    setReviewYes({You:new Set(),Partner:new Set()}); setWin(null);
    setS(v=>({...v,phase:'round1',cohort,idx:{You:0,Partner:0},likes:{You:new Set(),Partner:new Set()},passes:{You:new Set(),Partner:new Set()},agreed:[]}));
  }catch(e:any){setError(e.message||String(e));} finally{setLoading(false);} }

  function act(kind:'like'|'pass'){
    const cur=s.cohort[s.idx[s.user]]; if(!cur) return; const u=s.user; const likes=new Set(s.likes[u]), passes=new Set(s.passes[u]); (kind==='like'?likes:passes).add(cur.id);
    let phase=s.phase, agreed=[...s.agreed]; let reviewStarter:null|User=null; const nextIdx=s.idx[u]+1;
    if(s.phase==='round2'&&kind==='like'){ const other=u==='You'?'Partner':'You'; if(s.likes[other].has(cur.id)&&!agreed.includes(cur.id)) agreed.push(cur.id); }
    if(nextIdx>=s.cohort.length){ if(s.phase==='round1') phase='swap'; else if(s.phase==='round2'){ if(agreed.length){ reviewStarter=Math.random()<0.5?'You':'Partner'; phase='reviewIntro'; } else { const idsThis=s.cohort.map(m=>m.id); const bothNo=idsThis.filter(id=>!s.likes.You.has(id)&&!s.likes.Partner.has(id)); if(bothNo.length) setBan(p=>new Set([...p,...bothNo])); const nx=Math.min(deck+10,200); setNotice(`No agreed picks this round. We'll add ${nx-deck} more ( ${deck} → ${nx} ) and deal again.`); setS(v=>({...v,likes:{...v.likes,[u]:likes},passes:{...v.passes,[u]:passes},idx:{...v.idx,[u]:nextIdx},phase:'noAgreed',agreed})); return; } } }
    setS(v=>({...v,user:reviewStarter??v.user,likes:{...v.likes,[u]:likes},passes:{...v.passes,[u]:passes},idx:{...v.idx,[u]:nextIdx},phase,agreed}));
  }

  const swap=()=>setS(v=>{const n=v.user==='You'?'Partner':'You'; return {...v,user:n,phase:'round2',idx:{...v.idx,[n]:0}}});
  const reviewDone=(u:User,ids:number[])=>{ const next=new Set(reviewYes[u]); ids.forEach(id=>next.add(id)); const upd={...reviewYes,[u]:next}; setReviewYes(upd); if(s.phase==='review1'){ setS(v=>({...v,phase:'reviewSwap'})); return;} const finals=s.agreed.filter(id=>upd.You.has(id)&&upd.Partner.has(id)); setS(v=>({...v,phase:finals.length?'final':'startOver',agreed:finals})); };

  const cur=s.cohort[s.idx[s.user]];
  const pick=()=>{ if(!s.agreed.length) return; const id=s.agreed[Math.floor(Math.random()*s.agreed.length)]; setWin(id); setS(v=>({...v,phase:'winner'})); };
  const expand=()=>{ const nx=Math.min(deck+10,200); setDeck(nx); setNotice(`No matches this round — expanding deck to ${nx} and dealing again…`); setTimeout(()=>buildDeck(nx),0); };
  const fresh=()=>{ const seen=new Set<number>(); s.cohort.forEach(m=>seen.add(m.id)); s.likes.You.forEach(seen.add,seen); s.likes.Partner.forEach(seen.add,seen); s.passes.You.forEach(seen.add,seen); s.passes.Partner.forEach(seen.add,seen); s.agreed.forEach(seen.add,seen); setBan(p=>new Set([...p,...seen])); setS({user:'You',phase:'idle',cohort:[],idx:{You:0,Partner:0},likes:{You:new Set(),Partner:new Set()},passes:{You:new Set(),Partner:new Set()},agreed:[]}); setNotice('Starting over with a fresh set of movies…'); setTimeout(()=>buildDeck(prefs.targetCount),0); };
  const restart=()=>{ setWin(null); setNotice(''); setDeck(prefs.targetCount); setBan(new Set()); setS({user:'You',phase:'welcome',cohort:[],idx:{You:0,Partner:0},likes:{You:new Set(),Partner:new Set()},passes:{You:new Set(),Partner:new Set()},agreed:[]}); };

  return(
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4">
      <header className="border-b border-neutral-800 pb-2 mb-4 flex items-center gap-2">
        <span><I.F/></span><h1 className="font-semibold">CoupleSwipe</h1><span className="text-xs text-neutral-400">UK Netflix & Prime Picker</span>
        <div className="ml-auto flex items-center gap-2">
          {(names.You||names.Partner)&&<span className="text-xs text-neutral-400 hidden sm:inline">{names.You||'—'} · {names.Partner||'—'}</span>}
          <button onClick={()=>buildDeck(deck)} className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg"><I.R/> Build {deck}</button>
        </div>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-neutral-300">TMDB Token:</label>
        <input type="password" placeholder="Paste your TMDB v4 token here" value={token} onChange={e=>{const v=e.target.value; setToken(v); try{localStorage.setItem('tmdb_v4_token',v);}catch{}}} className="flex-1 px-2 py-1 rounded bg-neutral-800 text-neutral-100 border border-neutral-700"/>
      </div>

      {error&&<div className="text-red-400 mb-2">{error}</div>}
      {notice&&<div className="text-blue-300 mb-4">{notice}</div>}

      {loading? <div className="text-center py-20 text-neutral-400">Loading deck...</div> :
        s.phase==='welcome'? (
          <div className="max-w-md mx-auto text-center py-10">
            <h2 className="text-xl font-semibold mb-3">Need help choosing a movie that you both want to watch?</h2>
            <p className="text-sm text-neutral-300 mb-6">Start by entering your names:</p>
            <div className="space-y-3 text-left">
              <label className="block text-sm mb-1">FIRST PERSON NAME</label>
              <input value={names.You} onChange={e=>{const next={...names,You:e.target.value}; setNames(next); try{localStorage.setItem('cs_names',JSON.stringify(next))}catch{}}} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" placeholder="e.g. Alex"/>
              <label className="block text-sm mb-1 mt-4">SECOND PERSON NAME</label>
              <input value={names.Partner} onChange={e=>{const next={...names,Partner:e.target.value}; setNames(next); try{localStorage.setItem('cs_names',JSON.stringify(next))}catch{}}} className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800" placeholder="e.g. Sam"/>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={()=>{if(!names.You.trim()||!names.Partner.trim())return; setS(v=>({...v,user:Math.random()<0.5?'You':'Partner',phase:'preDeal'}))}} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Continue</button>
              {(names.You||names.Partner)&&<button onClick={()=>{setNames({You:'',Partner:''}); try{localStorage.removeItem('cs_names')}catch{}}} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm">Clear names</button>}
            </div>
          </div>
        ) : s.phase==='preDeal'? (
          <div className="max-w-xl mx-auto text-center py-10">
            <h2 className="text-xl font-semibold mb-3">{(s.user==='You'?names.You:names.Partner)||'Someone'} has been randomly chosen to pick first</h2>
            <p className="text-sm text-neutral-300">When they have made their choices, the other person can make theirs!</p>
            <p className="text-sm text-neutral-300 mt-3">On the next screen: <strong>swipe right</strong> for <span className="text-green-400 inline-flex items-center gap-1">Yes <I.H/></span>, <strong>swipe left</strong> for <span className="text-red-400 inline-flex items-center gap-1">No <I.X/></span>. You can also use the buttons.</p>
            <button onClick={()=>buildDeck(deck)} className="mt-6 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start picking</button>
          </div>
        ) : s.phase==='swap'? (
          <div className="text-center py-20">
            <p className="text-lg mb-4"><I.F/> {(s.user==='You'?names.You:names.Partner)||'First person'}'s turn is done — now pass to {(s.user==='You'?names.Partner:names.You)||'Second person'}.</p>
            <button onClick={swap} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start {(s.user==='You'?names.Partner:names.You)||'partner'}'s turn</button>
          </div>
        ) : s.phase==='reviewIntro'? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Great news!</h2>
            <p className="text-sm text-neutral-300">You both like the look of <strong>{s.agreed.length}</strong> movie{s.agreed.length===1?'':'s'}.</p>
            <p className="text-sm text-neutral-300 mt-2 mb-6">Now you can each watch trailers to make sure you're happy with your pick.</p>
            <button onClick={()=>setS(v=>({...v,phase:'review1'}))} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start {(s.user==='You'?names.You:names.Partner)||'first reviewer'}'s trailer review</button>
          </div>
        ) : s.phase==='review1'? (
          <TrailerReview user={s.user} token={token} ids={s.agreed} onDone={ids=>reviewDone(s.user,ids)}/>
        ) : s.phase==='reviewSwap'? (
          <div className="text-center py-20">
            <p className="text-lg mb-2">{(s.user==='You'?names.You:names.Partner)||'First reviewer'} is done.</p>
            <p className="text-sm text-neutral-300 mb-4">Now hand the device to {(s.user==='You'?names.Partner:names.You)||'the other person'} so they can review the same shortlist.</p>
            <button onClick={()=>setS(v=>({...v,user:v.user==='You'?'Partner':'You',phase:'review2'}))} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start {(s.user==='You'?names.Partner:names.You)||'next'}'s trailer review</button>
          </div>
        ) : s.phase==='review2'? (
          <TrailerReview user={s.user} token={token} ids={s.agreed} onDone={ids=>reviewDone(s.user,ids)}/>
        ) : s.phase==='noAgreed'? (
          <div className="text-center">
            <p className="mb-3">No agreed picks this round</p>
            <p className="text-sm text-neutral-300 mb-4">You didn't both swipe thumbs-up on the same title. We'll add more movies to widen the pool and deal again.</p>
            <div className="flex justify-center gap-3">
              <button onClick={expand} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white">Add more & re-deal</button>
              <button onClick={()=>buildDeck(deck)} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700">Re-deal now</button>
            </div>
          </div>
        ) : s.phase==='final'? (
          <div>
            <Results agreedIds={s.agreed} token={token} heading="Final agreed picks"/>
            <div className="mt-6 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 text-center">
              <p className="mb-3 text-sm text-neutral-300">You both liked all these! I'll pick the winner for you</p>
              <button onClick={pick} disabled={!s.agreed.length} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">Random pick</button>
            </div>
          </div>
        ) : s.phase==='winner'&&win? (
          <Winner id={win} token={token} onBack={()=>setS(v=>({...v,phase:'final'}))} onRestart={restart}/>
        ) : s.phase==='startOver'? (
          <div className="text-center py-16">
            <h2 className="text-lg font-semibold mb-2">You haven't found the perfect movie yet, try again</h2>
            <p className="text-sm text-neutral-300 mb-6">We'll start over with a completely fresh set and hide everything you've already seen.</p>
            <button onClick={fresh} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white">Start over</button>
          </div>
        ) : !cur? (
          <div className="text-center py-20 text-neutral-400">Click Build Deck to begin</div>
        ) : (
          <div className="text-center">
            <Card movie={cur} genres={genres} onSwipe={(d)=>act(d==='right'?'like':'pass')}/>
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={()=>act('pass')} className="w-28 h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700"><I.X/> Pass</button>
              <button onClick={()=>act('like')} className="w-28 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500"><I.H/> Like</button>
            </div>
          </div>
        )}
    </div>
  );
}
// sanity check 2
