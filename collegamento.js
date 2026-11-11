/* =====================================================================
   Banda consigliata tra due province – Progetto di previsione della propagazione HF
   Sezione A.R.I. Alto Lazio
   File separato: aggiunge nella barra in alto il pulsante "Banda tra due province"
   e una finestra che, dai DATI REALI PIÙ RECENTI delle ionosonde INGV (nessuna previsione),
   suggerisce la banda HF più adatta per un collegamento in SSB tra due capoluoghi di provincia,
   e mostra gli spot in fonia dell'ultima ora letti dal DX cluster (file data/cluster.json).
   Per toglierlo basta eliminare la riga <script src="collegamento.js"> da index.html.
   ===================================================================== */
(() => {
'use strict';

/* ---------- capoluoghi di provincia: sigla → [nome, lat, lon] (coordinate indicative del centro città) ---------- */
const PROV = {
  AG:['Agrigento',37.31,13.58], AL:['Alessandria',44.91,8.61], AN:['Ancona',43.62,13.52], AO:['Aosta',45.74,7.32],
  AP:['Ascoli Piceno',42.85,13.58], AQ:['L’Aquila',42.35,13.40], AR:['Arezzo',43.46,11.88], AT:['Asti',44.90,8.21],
  AV:['Avellino',40.91,14.79], BA:['Bari',41.12,16.87], BG:['Bergamo',45.70,9.67], BI:['Biella',45.57,8.05],
  BL:['Belluno',46.14,12.22], BN:['Benevento',41.13,14.78], BO:['Bologna',44.49,11.34], BR:['Brindisi',40.63,17.94],
  BS:['Brescia',45.54,10.22], BT:['Barletta-Andria-Trani',41.32,16.28], BZ:['Bolzano',46.50,11.35], CA:['Cagliari',39.22,9.12],
  CB:['Campobasso',41.56,14.66], CE:['Caserta',41.07,14.33], CH:['Chieti',42.35,14.17], CI:['Carbonia-Iglesias',39.17,8.52],
  CL:['Caltanissetta',37.49,14.06], CN:['Cuneo',44.38,7.54], CO:['Como',45.81,9.09], CR:['Cremona',45.13,10.03],
  CS:['Cosenza',39.30,16.25], CT:['Catania',37.50,15.09], CZ:['Catanzaro',38.91,16.59], EN:['Enna',37.57,14.28],
  FC:['Forlì-Cesena',44.22,12.04], FE:['Ferrara',44.84,11.62], FG:['Foggia',41.46,15.55], FI:['Firenze',43.77,11.26],
  FM:['Fermo',43.16,13.72], FR:['Frosinone',41.64,13.35], GE:['Genova',44.41,8.93], GO:['Gorizia',45.94,13.62],
  GR:['Grosseto',42.76,11.11], IM:['Imperia',43.89,8.03], IS:['Isernia',41.59,14.23], KR:['Crotone',39.08,17.13],
  LC:['Lecco',45.86,9.40], LE:['Lecce',40.35,18.17], LI:['Livorno',43.55,10.31], LO:['Lodi',45.31,9.50],
  LT:['Latina',41.47,12.90], LU:['Lucca',43.84,10.50], MB:['Monza e Brianza',45.58,9.27], MC:['Macerata',43.30,13.45],
  ME:['Messina',38.19,15.55], MI:['Milano',45.46,9.19], MN:['Mantova',45.16,10.79], MO:['Modena',44.65,10.93],
  MS:['Massa-Carrara',44.04,10.14], MT:['Matera',40.67,16.60], NA:['Napoli',40.85,14.27], NO:['Novara',45.45,8.62],
  NU:['Nuoro',40.32,9.33], OG:['Ogliastra',39.93,9.66], OR:['Oristano',39.90,8.59], OT:['Olbia-Tempio',40.92,9.50],
  PA:['Palermo',38.12,13.36], PC:['Piacenza',45.05,9.69], PD:['Padova',45.41,11.88], PE:['Pescara',42.46,14.21],
  PG:['Perugia',43.11,12.39], PI:['Pisa',43.72,10.40], PN:['Pordenone',45.96,12.66], PO:['Prato',43.88,11.10],
  PR:['Parma',44.80,10.33], PT:['Pistoia',43.93,10.92], PU:['Pesaro e Urbino',43.91,12.91], PV:['Pavia',45.19,9.16],
  PZ:['Potenza',40.64,15.80], RA:['Ravenna',44.42,12.20], RC:['Reggio Calabria',38.11,15.65], RE:['Reggio Emilia',44.70,10.63],
  RG:['Ragusa',36.93,14.73], RI:['Rieti',42.40,12.86], RM:['Roma',41.90,12.50], RN:['Rimini',44.06,12.57],
  RO:['Rovigo',45.07,11.79], SA:['Salerno',40.68,14.77], SI:['Siena',43.32,11.33], SO:['Sondrio',46.17,9.87],
  SP:['La Spezia',44.10,9.82], SR:['Siracusa',37.08,15.29], SS:['Sassari',40.73,8.56], SU:['Sud Sardegna',39.17,8.52],
  SV:['Savona',44.31,8.48], TA:['Taranto',40.47,17.24], TE:['Teramo',42.66,13.70], TN:['Trento',46.07,11.12],
  TO:['Torino',45.07,7.69], TP:['Trapani',38.02,12.51], TR:['Terni',42.56,12.65], TS:['Trieste',45.65,13.78],
  TV:['Treviso',45.67,12.24], UD:['Udine',46.06,13.24], VA:['Varese',45.82,8.83], VB:['Verbano-Cusio-Ossola',45.92,8.55],
  VC:['Vercelli',45.32,8.42], VE:['Venezia',45.44,12.33], VI:['Vicenza',45.55,11.55], VR:['Verona',45.44,10.99],
  VS:['Medio Campidano',39.56,8.90], VT:['Viterbo',42.42,12.11], VV:['Vibo Valentia',38.68,16.10],
};
const STAZ = {
  rm041:  { nome:'Roma (AIS)',       lat:41.80, lon:12.50, f:'dt,fof2,muf3000f2,m3000f2,aip_foe,ftes,aip_hmf2' },
  ro041:  { nome:'Roma (Digisonde)', lat:41.80, lon:12.50, f:'dt,fof2,muf3000f2,m3000f2,foe,foes' },
  sp044:  { nome:'La Spezia',        lat:44.10, lon:9.79,  f:'dt,fof2,muf3000f2,m3000f2,aip_foe,ftes,aip_hmf2' },
  gm037d: { nome:'Gibilmanna',       lat:37.90, lon:14.00, f:'dt,fof2,muf3000f2,m3000f2,foe,foes' },
};
const BANDE = [['160 m',1.85],['80 m',3.65],['60 m',5.35],['40 m',7.1],['30 m',10.12],['20 m',14.15],['17 m',18.1],['15 m',21.2],['12 m',24.94],['10 m',28.5],['6 m',50.2]];
const FOT = 0.85, H = 3600e3, RE = 6371;

/* ---------- geometria e MUF (stesse formule della pagina) ---------- */
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
function distanza(a, b) {
  const dφ = rad(b[1] - a[1]), dλ = rad(b[2] - a[2]);
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dλ / 2) ** 2;
  return 2 * RE * Math.asin(Math.min(1, Math.sqrt(h)));
}
function puntoMedio(a, b) {
  const φ1 = rad(a[1]), λ1 = rad(a[2]), φ2 = rad(b[1]), dλ = rad(b[2] - a[2]);
  const Bx = Math.cos(φ2) * Math.cos(dλ), By = Math.cos(φ2) * Math.sin(dλ);
  const φm = Math.atan2(Math.sin(φ1) + Math.sin(φ2), Math.sqrt((Math.cos(φ1) + Bx) ** 2 + By ** 2));
  return [deg(φm), deg(λ1 + Math.atan2(By, Math.cos(φ1) + Bx))];
}
function secPhi(D, h) {
  const th = D / (2 * RE), beta = Math.atan2(Math.cos(th) - RE / (RE + h), Math.sin(th));
  const s = RE * Math.cos(beta) / (RE + h); return 1 / Math.sqrt(Math.max(1e-6, 1 - s * s));
}
const hopMax = h => 2 * RE * Math.acos(RE / (RE + h)) * 0.97;
const secMulti = (D, h) => secPhi(D / Math.max(1, Math.ceil(D / hopMax(h))), h);
const hmFromM = m => m ? 1490 / m - 176 : 300;
function mufAt(D, s) {
  if (!s || !s.fof2) return null;
  const muf3 = s.muf || (s.m ? s.fof2 * s.m : null); if (!muf3) return null;
  const hv = Math.max((s.hmf2 || hmFromM(s.m)) + 40, 240);
  const s3 = secMulti(3000, hv), sD = secMulti(D, hv), c = muf3 / (s.fof2 * s3);
  const w = Math.min(1, Math.max(0, (sD - 1) / (s3 - 1)));
  return s.fof2 * sD * (1 + (c - 1) * w);
}
const mufEs = (D, ftes) => ftes ? ftes * secMulti(D, 110) : null;

/* ---------- dati reali più recenti ---------- */
const num = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : (+v > 0 ? +v : null);
const parse = r => {
  const o = { t: Date.parse(String(r.dt).replace(' ', 'T') + 'Z'), fof2: num(r.fof2), muf: num(r.muf ?? r.muf3000f2), m: num(r.m ?? r.m3000f2),
    foe: num(r.foe ?? r.aip_foe), ftes: num(r.ftes ?? r.foes), hmf2: num(r.hmf2 ?? r.aip_hmf2) };
  if (!o.muf && o.fof2 && o.m) o.muf = o.fof2 * o.m;
  return o;
};
const pad = n => String(n).padStart(2, '0');
const fmtUT = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
async function getJSON(u, ms = 30000) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(u, { cache: 'no-store', signal: ac.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(tm); }
}
async function ultimoValore(st) {
  let recs = null;
  try { recs = (await getJSON('data/' + st + '.json?v=' + Math.floor(Date.now() / 60e3))).records; } catch (e) {}
  if (!recs) { // anteprima locale: direttamente dal servizio INGV
    const now = Date.now();
    const u = `http://ws-eswua.rm.ingv.it/swit/ais/records/ws${st}_auto?include=${STAZ[st].f}&filter=dt,ge,${encodeURIComponent(fmtUT(new Date(now - 4 * H)))}`;
    try { recs = (await getJSON(u)).records; } catch (e) { recs = []; }
  }
  const p = (recs || []).map(parse).filter(r => r.fof2 && r.t > Date.now() - 3 * H).sort((a, b) => b.t - a.t);
  return p[0] || null;
}
let cache = null, cacheT = 0;
async function datiAttuali() {
  // prima scelta: gli stessi valori che la pagina ha già caricato (tabella "Confronto delle ionosonde")
  const u = window.IONO_ULTIMI;
  if (u && Object.values(u).some(v => v && v.fof2)) {
    const out = {};
    for (const st of Object.keys(STAZ)) { const v = u[st]; out[st] = v && v.fof2 && v.t > Date.now() - 3 * H ? v : null; }
    if (Object.values(out).some(Boolean)) return out;
  }
  // in alternativa (es. pagina non ancora caricata): lettura diretta dei dati
  if (cache && Date.now() - cacheT < 5 * 60e3) return cache;
  const out = {};
  await Promise.all(Object.keys(STAZ).map(async st => { out[st] = await ultimoValore(st); }));
  cache = out; cacheT = Date.now(); return out;
}

/* ---------- ionosfera stimata nel punto medio: media pesata con l'inverso del quadrato della distanza ---------- */
function stimaNelPunto(mid, dati) {
  const usate = [];
  let wsum = 0; const acc = { fof2: 0, muf: 0, m: 0, hmf2: 0, foe: 0, ftes: 0 }, wk = { ...acc };
  for (const [st, v] of Object.entries(dati)) {
    if (!v) continue;
    const S = STAZ[st], d = Math.max(50, distanza([null, mid[0], mid[1]], [null, S.lat, S.lon]));
    const w = 1 / (d * d); wsum += w; usate.push({ st, d, w, t: v.t });
    for (const k of Object.keys(acc)) if (v[k]) { acc[k] += w * v[k]; wk[k] += w; }
  }
  if (!wsum) return null;
  const s = {}; for (const k of Object.keys(acc)) s[k] = wk[k] ? acc[k] / wk[k] : null;
  // peso percentuale di ogni ionosonda (Roma AIS + Roma Digisonde accorpate)
  const pesi = {};
  usate.forEach(u => { const n = u.st.startsWith('r') ? 'Roma' : STAZ[u.st].nome; pesi[n] = (pesi[n] || 0) + u.w / wsum; });
  s.pesi = Object.entries(pesi).sort((a, b) => b[1] - a[1]);
  s.t = Math.min(...usate.map(u => u.t));
  return s;
}

/* ---------- suggerimento ---------- */
function stato(f, D, s, muf, es) {
  const day = s.foe != null && s.foe >= 1.8;
  if (day && ((f <= 4 && D >= 500) || f <= 2.0)) return 'abs';
  if (f <= FOT * muf) return 'open';
  if (f <= muf) return 'marg';
  if (es && D >= 400 && f <= es) return 'es';
  return 'closed';
}
const TXT = { open: 'aperta', marg: 'marginale', closed: 'chiusa', abs: 'assorbita', es: 'via E sporadico' };
function suggerisci(pa, pb, dati) {
  // pa, pb = [sigla, nome, lat, lon] → coordinate nel formato [_, lat, lon]
  const a = [null, pa[2], pa[3]], b = [null, pb[2], pb[3]];
  const D0 = distanza(a, b), D = Math.max(D0, 30), mid = puntoMedio(a, b);
  const s = stimaNelPunto(mid, dati); if (!s || !s.fof2) return { err: 'Nessun dato recente disponibile dalle ionosonde INGV (ultime 3 ore). Attendere il caricamento della pagina o riprovare più tardi.' };
  const muf = mufAt(D, s), es = mufEs(D, s.ftes);
  const righe = BANDE.map(([n, f]) => ({ n, f, st: stato(f, D, s, muf, es) }));
  const hf = righe.filter(r => r.f < 30);
  const noSSB = r => r.n === '30 m';   // 30 m: banda WARC solo CW e digitali, niente fonia → mai consigliata per SSB
  const aperte = hf.filter(r => r.st === 'open' && !noSSB(r));
  const best = aperte[aperte.length - 1] || null;
  const alt = best ? aperte[aperte.length - 2] || null : null;
  const marg = hf.filter(r => r.st === 'marg' && !noSSB(r));
  const esBands = righe.filter(r => r.st === 'es');
  return { D0, D, mid, s, muf, fot: FOT * muf, es, righe, best, alt, marg, esBands, day: s.foe != null && s.foe >= 1.8 };
}

/* ---------- call area italiana di ogni provincia (per gli spot del DX cluster) ---------- */
const AREE = {
  '0': ['Lazio, Umbria', 'RM LT FR VT RI PG TR'],
  'S': ['Sardegna', 'CA SS NU OR SU CI VS OG OT'],
  '1': ['Piemonte, Valle d’Aosta, Liguria', 'TO VC NO CN AT AL BI VB AO GE IM SP SV'],
  '2': ['Lombardia', 'MI BG BS CO CR LC LO MN PV SO VA MB'],
  '3': ['Veneto, Trentino-A.A., Friuli-V.G.', 'VE VR VI PD TV BL RO TN BZ TS UD PN GO'],
  '4': ['Emilia-Romagna', 'BO FE FC MO PR PC RA RE RN'],
  '5': ['Toscana', 'FI AR GR LI LU MS PI PT PO SI'],
  '6': ['Marche, Abruzzo', 'AN AP FM MC PU AQ CH PE TE'],
  '7': ['Puglia, Basilicata', 'BA BT BR FG LE TA MT PZ'],
  '8': ['Campania, Calabria, Molise', 'NA AV BN CE SA CZ CS KR RC VV CB IS'],
  '9': ['Sicilia', 'PA AG CL CT EN ME RG SR TP'],
};
const AREA_DI = {}; for (const [a, [, l]] of Object.entries(AREE)) for (const s of l.split(' ')) AREA_DI[s] = a;
const nomeArea = a => a === 'S' ? 'IS0/IM0 (Sardegna)' : `call area ${a} (${AREE[a][0]})`;

/* ---------- attività SSB dal DX cluster (file data/cluster.json, preparato ogni 15 min dal workflow) ---------- */
const UN_ORA = 60 * 60e3;
let clusterCache = null, clusterT = 0;
async function leggiCluster() {
  if (clusterCache && Date.now() - clusterT < 5 * 60e3) return clusterCache;
  try {
    const r = await fetch('data/cluster.json?v=' + Math.floor(Date.now() / 300e3), { cache: 'no-store' });
    if (!r.ok) return null;
    clusterCache = await r.json(); clusterT = Date.now(); return clusterCache;
  } catch { return null; }
}
function boxCluster(c, banda, A, B) {
  const fonte = c && c.nodo ? `${esc(c.nodo)}${c.nome ? ' (' + esc(c.nome) + ')' : ''}` : 'IQ1LA-6 (ARI Loano)';
  const nota = `<p class="cg-small" style="margin:6px 0 0">Spot in <b>fonia (SSB)</b> dell’ultima ora dal DX cluster ${fonte}: esclusi CW e modi digitali (FT8, FT4, RTTY…). La call area è dedotta dal nominativo; uno spot non è un QSO, il dato è solo indicativo.</p>`;
  const tit = '<b>Attività SSB dal DX cluster – ultima ora</b>';
  if (!c || !Array.isArray(c.spot)) return `<div class="cg-cl">${tit}<p class="cg-small" style="margin:4px 0">Dati del cluster non disponibili in questo momento.</p>${nota}</div>`;
  const ora = Date.now(), sp = c.spot.filter(s => s.t >= ora - UN_ORA && s.t <= ora + 5 * 60e3);
  const righe = [];
  if (banda) {
    const tra = sp.filter(s => s.b === banda && ((s.ade === A && s.adx === B) || (s.ade === B && s.adx === A)));
    const zone = A === B ? `dentro la ${nomeArea(A)}` : `tra ${nomeArea(A)} e ${nomeArea(B)}`;
    const es = tra.slice(0, 3).map(s => `${esc(s.de)} ha spottato ${esc(s.dx)} su ${f1(s.f)} kHz alle ${hhmm(s.t)}`).join('; ');
    righe.push(`<li>Spot SSB ${zone} su <b>${banda}</b>: <b>${tra.length}</b>${es ? ' – ' + es : ''}.</li>`);
    const suB = sp.filter(s => s.b === banda);
    const cnt = {}; for (const s of suB) for (const a of new Set([s.ade, s.adx].filter(Boolean))) cnt[a] = (cnt[a] || 0) + 1;
    const det = Object.entries(cnt).sort((x, y) => y[1] - x[1]).map(([a, n]) => `${a === 'S' ? 'IS0' : a} ×${n}`).join(', ');
    righe.push(`<li>Spot SSB con stazioni italiane su <b>${banda}</b>: <b>${suB.length}</b>${det ? ` (per call area: ${det})` : ''}.</li>`);
  }
  const perB = {}; for (const s of sp) if (s.b !== banda) perB[s.b] = (perB[s.b] || 0) + 1;
  const altre = BANDE.map(b => b[0]).filter(n => perB[n]).map(n => `${n} (${perB[n]})`).join(', ');
  righe.push(`<li>${banda ? 'Altre bande' : 'Bande'} con spot SSB italiani: ${altre || 'nessuna'}.</li>`);
  const vecchio = ora - c.agg > 45 * 60e3 ? `<p class="cg-small cg-err" style="margin:4px 0">Ultimo aggiornamento del cluster alle ${hhmm(c.agg)}: dati non recenti.</p>` : '';
  return `<div class="cg-cl">${tit}<ul>${righe.join('')}</ul>${vecchio}${nota}</div>`;
}

/* ---------- interfaccia ---------- */
const CSS = `
.cg-btn{font:inherit;padding:5px 11px;border-radius:7px;border:1px solid var(--foF2,#2f6fdc);background:var(--foF2,#2f6fdc);color:#fff;cursor:pointer;font-weight:600}
.cg-btn:hover{filter:brightness(1.1)}
.cg-back{position:fixed;inset:0;background:rgba(0,10,30,.45);z-index:900;display:none}
.cg-back.on{display:block}
.cg-pop{position:absolute;z-index:901;left:50%;transform:translateX(-50%);width:min(620px,calc(100% - 24px));max-height:none;background:var(--card,#fff);color:var(--ink,#1b1f24);border:1px solid var(--line,#dde2e8);border-radius:14px;box-shadow:0 18px 50px rgba(0,20,60,.35);padding:16px 18px 14px;display:none;box-sizing:border-box}
.cg-pop.on{display:block}
.cg-pop h2{margin:0 36px 4px 0;font-size:18px}
.cg-pop .cg-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border-radius:17px;border:1px solid var(--line,#dde2e8);background:var(--card,#fff);color:var(--ink,#1b1f24);font-size:18px;cursor:pointer}
.cg-row{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;margin:10px 0}
.cg-row label{display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--mute,#5f6b78)}
.cg-row select{font:inherit;font-size:15px;width:220px;max-width:100%;padding:7px 9px;border-radius:8px;border:1px solid var(--line,#dde2e8);background:var(--bg,#f6f7f9);color:var(--ink,#1b1f24)}
.cg-res{margin-top:6px;font-size:14px}
.cg-big{display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--bg,#f6f7f9);border:1px solid var(--line,#dde2e8);border-radius:12px;padding:10px 14px;margin:8px 0}
.cg-big .cg-band{font-size:34px;font-weight:800;color:var(--open,#1f9d55);line-height:1}
.cg-big .cg-band.none{color:var(--muf,#d23d5b);font-size:22px}
.cg-chips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
.cg-chip{font-size:12px;font-weight:600;padding:3px 7px;border-radius:6px;color:#fff}
.cg-chip.open{background:var(--open,#1f9d55)}.cg-chip.marg{background:var(--marg,#d9a400);color:#222}.cg-chip.closed{background:var(--closed,#c9ced6);color:var(--mute,#5f6b78)}
.cg-chip.abs{background:var(--abs,#e07b39)}.cg-chip.es{background:var(--es,#8a4fd8)}
.cg-close{font:inherit;font-weight:600;padding:8px 18px;border-radius:8px;border:1px solid var(--line,#dde2e8);background:var(--bg,#f6f7f9);color:var(--ink,#1b1f24);cursor:pointer}
.cg-close:hover{border-color:var(--mute,#5f6b78)}
.cg-err{color:var(--muf,#d23d5b);font-weight:600}
.cg-small{font-size:12px;color:var(--mute,#5f6b78)}
.cg-cl{background:var(--bg,#f6f7f9);border:1px dashed var(--line,#dde2e8);border-radius:12px;padding:8px 12px;margin:8px 0;font-size:13px}
.cg-cl ul{margin:4px 0;padding-left:18px}.cg-cl li{margin:2px 0}
.cg-ssb{display:inline-block;font-size:12px;font-weight:700;padding:2px 7px;border-radius:6px;background:var(--foF2,#2f6fdc);color:#fff;margin-left:6px;vertical-align:middle}
`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const f1 = v => v == null ? '–' : v.toFixed(1).replace('.', ',');
const hhmm = t => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
function trova(txt) {
  const q = String(txt || '').trim().toUpperCase(); if (!q) return null;
  const sig = q.slice(0, 2);
  if (PROV[sig] && (q.length === 2 || q[2] === ' ' || q[2] === '–' || q[2] === '-')) return [sig, ...PROV[sig]];
  const norm = s => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');
  const nq = norm(q);
  for (const [k, v] of Object.entries(PROV)) if (norm(v[0]) === nq || norm(v[0]).startsWith(nq) && nq.length >= 4) return [k, ...v];
  return null;
}

function mount() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const bar = document.querySelector('.bar'); if (!bar) return;
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cg-btn';
  btn.textContent = 'Calcolatore QSO'; btn.title = 'Calcolatore per QSO in tempo reale: banda consigliata tra due province'; btn.setAttribute('aria-haspopup', 'dialog');
  const reload = document.getElementById('reload');
  reload && reload.nextSibling ? bar.insertBefore(btn, reload.nextSibling) : bar.appendChild(btn);

  const opts = '<option value="">Scegli…</option>' + Object.entries(PROV).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `<option value="${k}">${k} – ${esc(v[0])}</option>`).join('');
  const back = document.createElement('div'); back.className = 'cg-back';
  const pop = document.createElement('div'); pop.className = 'cg-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-labelledby', 'cg-tit');
  pop.innerHTML = `
    <button type="button" class="cg-x" aria-label="Chiudi">✕</button>
    <h2 id="cg-tit">Calcolatore per QSO in tempo reale <span class="cg-ssb">SSB</span></h2>
    <p class="cg-small" style="margin:0">Banda consigliata per un collegamento tra due province, in base agli <b>ultimi dati reali</b> delle ionosonde INGV (nessuna previsione). <b>Il risultato è rivolto al collegamento in SSB (fonia).</b> Scegliere le due province dai menu (con il menu aperto si può digitare la sigla per trovarla subito).</p>
    <form class="cg-row">
      <label>La tua provincia<select id="cg-a" required>${opts}</select></label>
      <label>Provincia del corrispondente<select id="cg-b" required>${opts}</select></label>
      <button type="submit" class="cg-btn" style="padding:8px 14px">Calcola</button>
    </form>
    <div class="cg-res" aria-live="polite"></div>
    <div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="cg-close">Chiudi</button></div>`;
  document.body.appendChild(back); document.body.appendChild(pop);
  const res = pop.querySelector('.cg-res'), ia = pop.querySelector('#cg-a'), ib = pop.querySelector('#cg-b');

  const open = () => {
    // posizione vicino al pulsante: funziona anche quando la pagina è dentro un riquadro alto e fisso (sito della sezione)
    const r = btn.getBoundingClientRect();
    pop.style.top = (r.bottom + window.scrollY + 10) + 'px';
    back.classList.add('on'); pop.classList.add('on'); ia.focus();
  };
  const close = () => { back.classList.remove('on'); pop.classList.remove('on'); btn.focus(); };
  btn.addEventListener('click', open);
  back.addEventListener('click', close);
  pop.querySelector('.cg-x').addEventListener('click', close);
  pop.querySelector('.cg-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop.classList.contains('on')) close(); });

  pop.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const a = trova(ia.value), b = trova(ib.value);
    if (!a || !b) { res.innerHTML = `<p class="cg-err">Provincia non riconosciuta: ${esc(!a ? ia.value : ib.value) || '(vuota)'}. Usare la sigla di due lettere, es. RM, MI, NA.</p>`; return; }
    res.innerHTML = '<p class="cg-small">Lettura degli ultimi dati INGV…</p>';
    const dati = await datiAttuali();
    const r = suggerisci(a, b, dati);
    if (r.err) { res.innerHTML = `<p class="cg-err">${esc(r.err)}</p>`; return; }
    const pesi = r.s.pesi.filter(p => p[1] >= 0.05).map(p => `${esc(p[0])} ${Math.round(p[1] * 100)}%`).join(', ');
    const tipo = r.D0 < 30 ? 'stessa zona: in HF si lavora in NVIS (antenne basse, onda quasi verticale); a questa distanza vanno bene anche le VHF/UHF'
      : r.D0 <= 300 ? 'collegamento NVIS (antenne basse che irradiano verso l’alto)' : 'collegamento a un salto sullo strato F2';
    let big;
    if (r.best) {
      big = `<div><div class="cg-small">Banda consigliata per SSB</div><div class="cg-band">${r.best.n}</div></div>
             <div class="cg-small" style="flex:1;min-width:200px">${r.alt ? `Alternativa più sicura: <b>${r.alt.n}</b>. ` : ''}${r.marg.length ? `Al limite (tra FOT e MUF): ${r.marg.map(x => x.n).join(', ')}. ` : ''}${r.esBands.length ? `Possibile via E sporadico: ${r.esBands.map(x => x.n).join(', ')}.` : ''}</div>`;
    } else if (r.marg.length) {
      big = `<div><div class="cg-small">Nessuna banda pienamente aperta</div><div class="cg-band none">Prova ${r.marg[r.marg.length - 1].n} (al limite)</div></div>`;
    } else {
      big = `<div><div class="cg-small">Risultato</div><div class="cg-band none">Nessuna banda HF utile adesso</div></div>`;
    }
    res.innerHTML = `
      <p style="margin:6px 0"><b>${esc(a[1])} (${a[0]}) ↔ ${esc(b[1])} (${b[0]})</b>: circa <b>${Math.round(r.D0)} km</b> – ${tipo}.</p>
      <div class="cg-big">${big}</div>
      <div class="cg-chips">${r.righe.map(x => `<span class="cg-chip ${x.st}" title="${x.f} MHz">${x.n} ${TXT[x.st]}${x.n === '30 m' ? ' (no SSB)' : ''}</span>`).join('')}</div>
      <p class="cg-small" style="margin:6px 0">MUF stimata per ${Math.round(r.D)} km: <b>${f1(r.muf)} MHz</b> · FOT (85%): <b>${f1(r.fot)} MHz</b> · foF2 al punto medio: ${f1(r.s.fof2)} MHz${r.s.ftes ? ` · ftEs: ${f1(r.s.ftes)} MHz` : ''}${r.day ? ' · di giorno: 160 m e, oltre 500 km, 80 m penalizzati dallo strato D' : ''}.</p>
      <p class="cg-small" style="margin:6px 0">Ionosfera stimata nel punto a metà strada pesando le ionosonde: ${pesi}. Dati delle ${hhmm(r.s.t)} (ora italiana). Calcolo tra i capoluoghi di provincia: è un’indicazione, la verifica vera resta l’ascolto in banda.</p>`;
    const bandaCl = r.best ? r.best.n : r.marg.length ? r.marg[r.marg.length - 1].n : null;
    const box = document.createElement('div'); box.innerHTML = '<p class="cg-small">Lettura degli spot del DX cluster…</p>';
    res.insertBefore(box, res.querySelector('.cg-chips').nextSibling);
    box.innerHTML = boxCluster(await leggiCluster(), bandaCl, AREA_DI[a[0]], AREA_DI[b[0]]);
  });
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();
