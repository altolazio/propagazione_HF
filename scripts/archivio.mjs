// Archivio storico per la verifica del modello a distanza di mesi o anni.
// Lanciato ad ogni giro del workflow "Aggiorna dati INGV" (ogni 15 min), ma lavora UNA volta all'ora:
// se l'ora corrente è già archiviata esce subito.
// Uso: node scripts/archivio.mjs <cartella del ramo "archivio">
//
// Ogni ora salva, in file CSV mensili (AAAA-MM/...):
//   previsioni.csv   previsione "congelata" a +1…+24 h per ogni ionosonda, con i parametri del modello in uso
//   bande.csv        stato delle bande mostrato dalla pagina in quel momento (banda × distanza)
//   misure.csv       tutte le misure INGV nuove (con l'ora in cui le abbiamo scaricate)
//   wspr_ore.csv     riassunto orario dei percorsi WSPR tra stazioni italiane (stessi criteri della pagina)
//   wspr_spot.csv    tutti gli spot WSPR tra stazioni italiane (grezzi)
//   cluster_spot.csv spot SSB del DX cluster
//   meteo_spazio.csv Kp, flusso solare, numero di Wolf, ultimo brillamento
//   registro.csv     buchi e problemi (ionosonda ferma, servizi non raggiungibili)
// Il calcolo della previsione usa il codice del modello preso da index.html, così è identico a quello della pagina.

import { readFile, writeFile, appendFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const DIR = process.argv[2] || 'archivio';
const DATA = process.env.OUT_DIR || 'data';
const H = 3600e3;
const ora = Date.now();
const oraPiena = Math.floor(ora / H) * H;
const iso = t => t == null || isNaN(t) ? '' : new Date(t).toISOString().slice(0, 19) + 'Z';
const mese = t => iso(t).slice(0, 7);
const r3 = v => v == null || isNaN(v) ? '' : Math.round(v * 1000) / 1000;
const csv = v => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const esiste = async f => { try { await access(f); return true; } catch { return false; } };

async function aggiungi(file, intestazione, righe) {
  if (!righe.length) return 0;
  const p = `${DIR}/${file}`;
  await mkdir(p.slice(0, p.lastIndexOf('/')), { recursive: true });
  const nuovo = !(await esiste(p));
  await appendFile(p, (nuovo ? intestazione.join(',') + '\n' : '') + righe.map(r => r.map(csv).join(',')).join('\n') + '\n');
  return righe.length;
}
// righe con l'ora nella colonna c: ciascuna nel file del suo mese
async function aggiungiPerMese(nome, intestazione, righe, c = 0) {
  const gruppi = {};
  for (const r of righe) (gruppi[String(r[c]).slice(0, 7)] ??= []).push(r);
  let n = 0;
  for (const [m, g] of Object.entries(gruppi)) n += await aggiungi(`${m}/${nome}`, intestazione, g);
  return n;
}
const registro = [];
const nota = (fonte, testo) => { registro.push([iso(ora), fonte, testo]); console.log(`[${fonte}] ${testo}`); };

async function leggiJSON(f) { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } }
async function prendi(url, ms = 20000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'propagazione.arialtolazio.it (IQ0HL) archivio' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r;
}

/* ---------- stato: cosa è già stato archiviato ---------- */
const statoF = `${DIR}/stato.json`;
const stato = (await leggiJSON(statoF)) || { versione: 1, ultimaOra: 0, misure: {}, wsprFinoA: 0, clusterFinoA: 0 };
if (stato.ultimaOra >= oraPiena && !process.env.ARCHIVIO_FORZA) { console.log('Archivio: ora già salvata, niente da fare.'); process.exit(0); }

/* ---------- modello: lo stesso codice della pagina ---------- */
const html = await readFile('index.html', 'utf8');
const a = html.indexOf('/* ================= CONFIGURAZIONE'), b = html.indexOf('/* ================= RENDER');
if (a < 0 || b < 0) throw new Error('index.html: blocco del modello non trovato');
const codice = html.slice(a, b);
const versioneModello = 'm-' + createHash('sha1').update(codice).digest('hex').slice(0, 8);
const M = vm.runInNewContext(codice + '\n;({CFG,STATIONS,BANDS,DISTS,parseRec,mufAt,bandState,backtest,forecast,slotOf});', { console });

/* ---------- 1. previsioni, bande e misure per ogni ionosonda ---------- */
const prev = [], bande = [], misure = [];
const ANTICIPI = Array.from({ length: 24 }, (_, i) => i + 1);
for (const st of Object.keys(M.STATIONS)) {
  const j = await leggiJSON(`${DATA}/${st}.json`);
  if (!j || !j.records) { nota(st, 'file dati assente: nessuna previsione'); continue; }
  const scaricato = j.updated ? Date.parse(j.updated) : ora;
  // misure nuove: prima quelle grezze a piena risoluzione (se fetch-ingv le ha salvate), poi quelle del file a 15 min
  const grezzi = (await leggiJSON(`${DATA}/grezzi-${st}.json`)) || [];
  const tutte = new Map();
  for (const x of [...j.records, ...grezzi]) tutte.set(x.dt, x);
  const ultimaArch = stato.misure[st] || 0;
  let nuove = 0;
  for (const x of [...tutte.values()].sort((p, q) => p.dt < q.dt ? -1 : 1)) {
    const r = M.parseRec(x);
    if (r.t <= ultimaArch) continue;
    misure.push([iso(r.t), st, r3(r.fof2), r3(r.muf), r3(r.m), r3(r.foe), r3(r.ftes), r3(r.hes), r3(r.hmf2), r3(r.med), iso(scaricato)]);
    stato.misure[st] = Math.max(stato.misure[st] || 0, r.t); nuove++;
  }
  const recs = j.records.map(M.parseRec).sort((p, q) => p.t - q.t);
  const last = [...recs].reverse().find(r => r.fof2);
  if (!last || ora - last.t > H) nota(st, `nessuna foF2 nell'ultima ora (ultima: ${last ? iso(last.t) : 'nessuna'})`);
  if (!nuove) nota(st, 'nessuna misura nuova dall\'INGV');
  if (!recs.length) continue;
  // previsione come la vede la pagina in questo momento
  const bt = M.backtest(recs);
  const fc = M.forecast(recs, bt);
  const lastEs = [...recs].reverse().find(r => r.t > ora - 1.5 * H && r.ftes);
  for (const h of ANTICIPI) {
    const tv = oraPiena + h * H;
    const p = fc.pts.find(x => x.t === tv);
    if (!p) continue;
    prev.push([iso(ora), st, versioneModello, iso(fc.last && fc.last.t), r3(fc.lr), fc.tau, bt ? (bt.useBias ? 1 : 0) : '', bt ? r3(bt.score) : '',
               h, iso(tv), r3(p.fof2), r3(p.muf), r3(p.lo), r3(p.hi), r3(p.med), r3(p.m)]);
  }
  if (last) {
    const s = Object.assign({}, last, { ftes: lastEs ? lastEs.ftes : null });
    for (const d of M.DISTS) bande.push([iso(ora), st, versioneModello, iso(last.t), d.d, r3(M.mufAt(d.d, last)), ...M.BANDS.map(([, f]) => M.bandState(f, d.d, s))]);
  }
}
await aggiungi(`${mese(ora)}/previsioni.csv`, ['emissione_utc', 'stazione', 'versione_modello', 'ultima_misura_utc', 'scarto_log', 'tau_h', 'tendenza_24h', 'errore_backtest_mhz',
  'anticipo_h', 'valida_utc', 'fof2_mhz', 'muf3000_mhz', 'muf3000_basso_mhz', 'muf3000_alto_mhz', 'mediana27_fof2_mhz', 'm3000'], prev);
await aggiungi(`${mese(ora)}/bande.csv`, ['emissione_utc', 'stazione', 'versione_modello', 'misura_utc', 'distanza_km', 'muf_mhz', ...M.BANDS.map(([n]) => n.replace(' ', ''))], bande);
await aggiungiPerMese('misure.csv', ['misura_utc', 'stazione', 'fof2_mhz', 'muf3000_mhz', 'm3000', 'foe_mhz', 'ftes_mhz', 'hes_km', 'hmf2_km', 'mediana27_fof2_mhz', 'scaricato_utc'], misure);

/* ---------- 2. WSPR: ore complete con almeno 2 h di ritardo (gli spot arrivano anche in ritardo) ---------- */
const ITA = "'^I[A-Z]?[0-9]'";
const BANDE_W = { 1: '160 m', 3: '80 m', 5: '60 m', 7: '40 m', 10: '30 m', 14: '20 m', 18: '17 m', 21: '15 m', 24: '12 m', 28: '10 m', 50: '6 m' };
const SSB_W = [1, 3, 7, 14, 18, 21, 24, 28];          // stesse bande della pagina (riassunto)
const fino = oraPiena - 2 * H;
const da = Math.max(stato.wsprFinoA || 0, fino - 24 * H);
if (fino > da) {
  try {
    const q = `SELECT toUnixTimestamp(time) AS t, band, frequency, tx_sign, tx_loc, rx_sign, rx_loc, distance, snr, power, drift FROM wspr.rx
      WHERE time >= toDateTime(${da / 1000}) AND time < toDateTime(${fino / 1000}) AND match(tx_sign, ${ITA}) AND match(rx_sign, ${ITA})
      ORDER BY t LIMIT 100000 FORMAT JSONCompact`;
    const righe = (await (await prendi('https://db1.wspr.live/?query=' + encodeURIComponent(q.replace(/\s+/g, ' ')), 60000)).json()).data;
    const spot = righe.map(([t, b, f, ts, tl, rs, rl, km, snr, p, dr]) => [iso(+t * 1000), BANDE_W[b] || b, +f, ts, tl, rs, rl, +km, +snr, +p, +dr]);
    await aggiungiPerMese('wspr_spot.csv', ['utc', 'banda', 'frequenza_hz', 'tx', 'tx_locatore', 'rx', 'rx_locatore', 'distanza_km', 'snr_db', 'potenza_dbm', 'deriva'], spot);
    // riassunto orario con i criteri della pagina: 100–1500 km, bande con fonia, SNR riportato a 100 W
    const agg = new Map();
    for (let h = da; h < fino; h += H) for (const b of SSB_W) agg.set(h + '|' + b, { h, b, n: 0, ok: 0, km: 0, best: null });
    for (const [t, b, , , , , , km, snr, p] of righe) {
      if (!SSB_W.includes(+b) || km < 100 || km > 1500) continue;
      const g = agg.get(Math.floor(+t * 1000 / H) * H + '|' + b); if (!g) continue;
      const s = +snr + 50 - +p; g.n++; if (s >= 10) g.ok++; g.km = Math.max(g.km, +km); g.best = g.best == null ? s : Math.max(g.best, s);
    }
    await aggiungiPerMese('wspr_ore.csv', ['ora_utc', 'banda', 'percorsi', 'percorsi_da_ssb', 'km_max', 'snr_max_100w_db'],
      [...agg.values()].map(g => [iso(g.h), BANDE_W[g.b], g.n, g.ok, g.km || '', g.best ?? '']));
    if (righe.length >= 100000) nota('wspr', 'raggiunto il limite di 100000 spot: alcune ore potrebbero essere incomplete');
    stato.wsprFinoA = fino;
  } catch (e) { nota('wspr', 'wspr.live non disponibile: ' + e.message + ' (si riprova al giro successivo)'); }
}

/* ---------- 3. DX cluster: spot SSB nuovi ---------- */
const cl = await leggiJSON(`${DATA}/cluster.json`);
if (cl && Array.isArray(cl.spot)) {
  const nuovi = cl.spot.filter(s => s.t > (stato.clusterFinoA || 0)).sort((p, q) => p.t - q.t);
  await aggiungiPerMese('cluster_spot.csv', ['utc', 'frequenza_khz', 'banda', 'dx', 'spotter', 'area_dx', 'area_spotter', 'nodo'],
    nuovi.map(s => [iso(s.t), s.f, s.b, s.dx, s.de, s.adx ?? '', s.ade ?? '', cl.nodo || '']));
  if (nuovi.length) stato.clusterFinoA = nuovi.at(-1).t;
  if (cl.agg && ora - cl.agg > 2 * H) nota('cluster', 'dati del cluster fermi dalle ' + iso(cl.agg));
} else nota('cluster', 'file cluster.json assente');

/* ---------- 4. meteo spaziale (NOAA SWPC) ---------- */
const sw = [iso(ora), '', '', '', '', '', ''];
try {
  const j = await (await prendi('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')).json();
  let rows = Array.isArray(j[0]) ? j.slice(1).map(r => Object.fromEntries(j[0].map((k, i) => [k, r[i]]))) : j;
  const u = rows.at(-1);
  sw[1] = u.Kp ?? u.kp ?? u.kp_index ?? ''; sw[2] = iso(Date.parse(String(u.time_tag).replace(' ', 'T') + (String(u.time_tag).endsWith('Z') ? '' : 'Z')));
} catch (e) { nota('noaa', 'Kp non disponibile: ' + e.message); }
try {
  const t = await (await prendi('https://services.swpc.noaa.gov/text/daily-solar-indices.txt')).text();
  const c = t.trim().split('\n').filter(l => /^\d{4}\s+\d/.test(l)).at(-1).trim().split(/\s+/);
  sw[3] = c[3]; sw[4] = c[4]; sw[5] = `${c[0]}-${c[1]}-${c[2]}`;      // flusso solare 10,7 cm, numero di macchie (SWPC), giorno
} catch (e) { nota('noaa', 'indici solari non disponibili: ' + e.message); }
try {
  const f = await (await prendi('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-latest.json')).json();
  const u = Array.isArray(f) ? f.at(-1) : null;
  if (u) sw[6] = `${u.max_class || ''} ${u.max_time || ''}`.trim();
} catch (e) { nota('noaa', 'brillamenti non disponibili: ' + e.message); }
await aggiungi(`${mese(ora)}/meteo_spazio.csv`, ['utc', 'kp', 'kp_utc', 'flusso_solare_sfu', 'macchie_ssn', 'indici_del_giorno', 'ultimo_brillamento'], [sw]);

/* ---------- 5. registro e stato ---------- */
await aggiungi(`${mese(ora)}/registro.csv`, ['utc', 'fonte', 'evento'], registro);
stato.ultimaOra = oraPiena; stato.ultimoGiro = iso(ora); stato.versioneModello = versioneModello;
await writeFile(statoF, JSON.stringify(stato, null, 1));
console.log(`Archivio ${iso(oraPiena)}: ${prev.length} righe di previsione, ${misure.length} misure, modello ${versioneModello}, ${registro.length} note.`);
