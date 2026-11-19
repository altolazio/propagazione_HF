// Rete WSPR della Sezione: dagli spot WSPR grezzi ricava, ora per ora, banda per banda e coppia per coppia,
// se ogni stazione della rete è stata sentita dalle altre — e anche quando NON lo è stata.
// Usato da archivio.mjs; l'elenco delle stazioni è in rete/rete.csv (una riga per stazione, attiva = si).
//
// Il "no" è il dato nuovo: se A ha certamente trasmesso su una banda in quell'ora (qualcuno l'ha sentita)
// e B era certamente in ascolto sulla stessa banda (ha ricevuto qualcun altro), ma B non ha sentito A,
// allora su quel percorso la banda era chiusa (o sotto la soglia di decodifica).
import { readFile } from 'node:fs/promises';

const IONOSONDE = { rm041: [41.80, 12.51], sp044: [44.10, 9.82], gm037d: [37.98, 14.02] };   // Roma (AIS e Digisonde nello stesso sito), La Spezia, Gibilmanna
const H = 3600e3;

export function locatoreLatLon(loc) {
  const l = String(loc || '').toUpperCase();
  if (!/^[A-R]{2}\d{2}/.test(l)) return null;
  let lon = (l.charCodeAt(0) - 65) * 20 - 180 + (+l[2]) * 2;
  let lat = (l.charCodeAt(1) - 65) * 10 - 90 + (+l[3]);
  if (/^[A-X]{2}$/.test(l.slice(4, 6))) { lon += (l.charCodeAt(4) - 65) * 5 / 60 + 2.5 / 60; lat += (l.charCodeAt(5) - 65) * 2.5 / 60 + 1.25 / 60; }
  else { lon += 1; lat += 0.5; }
  return [lat, lon];
}
const rad = d => d * Math.PI / 180;
export function km([a, b], [c, d]) {
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}
function puntoMedio([a, b], [c, d]) {   // punto medio sul cerchio massimo
  const [f1, l1, f2, l2] = [rad(a), rad(b), rad(c), rad(d)];
  const bx = Math.cos(f2) * Math.cos(l2 - l1), by = Math.cos(f2) * Math.sin(l2 - l1);
  const f = Math.atan2(Math.sin(f1) + Math.sin(f2), Math.sqrt((Math.cos(f1) + bx) ** 2 + by ** 2));
  return [f * 180 / Math.PI, (l1 + Math.atan2(by, Math.cos(f1) + bx)) * 180 / Math.PI];
}

export async function leggiRete(file = 'rete/rete.csv') {
  let testo; try { testo = await readFile(file, 'utf8'); } catch { return []; }
  const [intest, ...righe] = testo.trim().split(/\r?\n/).map(r => r.split(','));
  return righe.map(r => Object.fromEntries(intest.map((k, i) => [k.trim(), (r[i] || '').trim()])))
    .filter(s => s.nominativo && /^s[iì]$/i.test(s.attiva));
}

// righe = spot grezzi [t(s), banda, freq, tx, tx_loc, rx, rx_loc, km, snr, potenza, deriva]; BANDE = codice -> nome
export function elaboraRete(rete, righe, da, fino, BANDE) {
  if (!rete.length) return [];
  const pos = Object.fromEntries(rete.map(s => [s.nominativo.toUpperCase(), locatoreLatLon(s.locatore)]));
  const base = c => String(c).toUpperCase().split('/').find(p => p in pos) || null;   // IK0ABC/P conta come IK0ABC
  const trasmesso = new Set(), ascolto = new Set(), sentito = new Map();
  for (const [t, b, , tx, tl, rx, rl, d, snr, p] of righe) {
    const h = Math.floor(+t * 1000 / H) * H;
    const T = base(tx), R = base(rx);
    if (T) trasmesso.add(`${h}|${b}|${T}`);
    if (R) ascolto.add(`${h}|${b}|${R}`);
    if (T && R && T !== R) {
      const k = `${h}|${b}|${T}|${R}`, s = +snr + 50 - +p;
      const g = sentito.get(k) || { n: 0, best: null, km: +d };
      g.n++; g.best = g.best == null ? s : Math.max(g.best, s); sentito.set(k, g);
      if (!pos[T] && tl) pos[T] = locatoreLatLon(tl);
      if (!pos[R] && rl) pos[R] = locatoreLatLon(rl);
    }
  }
  const out = [];
  const stazioni = Object.keys(pos);
  for (let h = da; h < fino; h += H) for (const b of Object.keys(BANDE)) for (const T of stazioni) {
    if (!trasmesso.has(`${h}|${b}|${T}`)) continue;            // non sappiamo se T ha trasmesso: nessun dato
    for (const R of stazioni) {
      if (R === T || !ascolto.has(`${h}|${b}|${R}`)) continue;  // R non era in ascolto su questa banda: nessun dato
      const g = sentito.get(`${h}|${b}|${T}|${R}`);
      const pt = pos[T], pr = pos[R];
      let dist = g ? g.km : '', mid = null, iono = '', dIono = '';
      if (pt && pr) {
        dist = dist || Math.round(km(pt, pr)); mid = puntoMedio(pt, pr);
        const [n, d] = Object.entries(IONOSONDE).map(([k, c]) => [k, km(mid, c)]).sort((x, y) => x[1] - y[1])[0];
        iono = n; dIono = Math.round(d);
      }
      out.push([new Date(h).toISOString().slice(0, 19) + 'Z', BANDE[b] || b, T, R, g ? 1 : 0, g ? g.n : 0, g ? g.best : '',
        dist, mid ? mid[0].toFixed(2) : '', mid ? mid[1].toFixed(2) : '', iono, dIono]);
    }
  }
  return out;
}
export const INTESTAZIONE_RETE = ['ora_utc', 'banda', 'tx', 'rx', 'sentito', 'spot', 'snr_max_100w_db', 'distanza_km',
  'punto_medio_lat', 'punto_medio_lon', 'ionosonda_vicina', 'km_da_ionosonda'];

// ---------- Copertura: i ricevitori pubblici WSPRnet come "controllo" dei beacon della rete ----------
// I beacon commerciali trasmettono e basta: i ricevitori della Sezione sono pochi. Usiamo allora tutti i
// ricevitori WSPRnet europei: se in quell'ora un ricevitore era attivo su quella banda (ha decodificato qualcuno)
// e il nostro beacon ha certamente trasmesso (qualcuno l'ha sentito), sappiamo anche chi NON l'ha sentito.
// Per non gonfiare l'archivio si scrivono solo i conteggi per fascia di distanza (una riga per beacon, banda e ora).
export const QUADRATI_EUROPA = ['IM', 'IN', 'IO', 'JM', 'JN', 'JO', 'JP', 'KM', 'KN', 'KO', 'KP'];
export const FASCE_KM = [[0, 500], [500, 1000], [1000, 2000], [2000, 3000]];
export const INTESTAZIONE_COPERTURA = ['ora_utc', 'banda', 'tx',
  ...FASCE_KM.flatMap(([a, b]) => [`rx_attivi_${a}_${b}km`, `sentito_${a}_${b}km`]), 'km_max_sentito', 'snr_max_100w_db'];

// attivi = [ora(s), banda, rx, rx_loc] (ricevitori con almeno uno spot in quell'ora e banda)
// sentiti = [t(s), banda, tx, rx, rx_loc, km, snr, potenza] (spot dei beacon della rete, ricevuti da chiunque)
export function elaboraCopertura(rete, attivi, sentiti, BANDE) {
  const pos = Object.fromEntries(rete.map(s => [s.nominativo.toUpperCase(), locatoreLatLon(s.locatore)]));
  const base = c => String(c).toUpperCase().split('/').find(p => p in pos) || null;
  // Bande dichiarate (es. "40m;20m"): gli spot su altre bande sono quasi sempre ricevitori con la banda impostata male.
  const norm = t => String(t).toLowerCase().replace(/\s+/g, '').replace(/mt$/, 'm');
  const bandeDi = Object.fromEntries(rete.map(s => [s.nominativo.toUpperCase(),
    (s.bande || '').split(';').map(norm).filter(Boolean)]).map(([k, v]) => [k, v.length ? new Set(v) : null]));
  const chi = new Map();                                   // ora|banda|tx -> { rx: Set, km, best }
  for (const [t, b, tx, rx, , d, snr, p] of sentiti) {
    const T = base(tx); if (!T) continue;
    const ok = bandeDi[T]; if (ok && !ok.has(norm(BANDE[b] || b))) continue;   // solo le bande dichiarate in rete.csv
    const k = `${Math.floor(+t / 3600) * 3600}|${b}|${T}`;
    const g = chi.get(k) || { rx: new Set(), km: 0, best: null };
    g.rx.add(String(rx).toUpperCase()); g.km = Math.max(g.km, +d);
    const s = +snr + 50 - +p; g.best = g.best == null ? s : Math.max(g.best, s); chi.set(k, g);
  }
  const perOra = new Map();                                // ora|banda -> [[rx, [lat,lon]]]
  for (const [h, b, rx, rl] of attivi) {
    const ll = locatoreLatLon(rl); if (!ll) continue;
    const k = `${h}|${b}`; (perOra.get(k) || perOra.set(k, []).get(k)).push([String(rx).toUpperCase(), ll]);
  }
  const out = [];
  for (const [k, g] of [...chi].sort()) {
    const [h, b, T] = k.split('|'); const pt = pos[T]; if (!pt) continue;
    const n = FASCE_KM.map(() => [0, 0]);
    for (const [rx, ll] of perOra.get(`${h}|${b}`) || []) {
      if (base(rx) === T) continue;
      const d = km(pt, ll), i = FASCE_KM.findIndex(([a, z]) => d >= a && d < z);
      if (i < 0) continue;
      n[i][0]++; if (g.rx.has(rx)) n[i][1]++;
    }
    out.push([new Date(+h * 1000).toISOString().slice(0, 19) + 'Z', BANDE[b] || b, T, ...n.flat(), g.km || '', g.best ?? '']);
  }
  return out;
}
