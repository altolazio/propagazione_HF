// Legge dal DX cluster gli spot recenti che riguardano stazioni italiane e salva SOLO quelli in fonia (SSB)
// in data/cluster.json, per il "Calcolatore QSO". Lanciato ogni 15 minuti dal workflow "Aggiorna dati INGV".
// Un solo collegamento di pochi secondi: login con il nominativo della sezione, due comandi di sola lettura, "bye".
// Non invia mai spot. Se il cluster non risponde lascia il file precedente e non blocca l'aggiornamento INGV.
import net from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = process.env.OUT_DIR || 'data';
const CALL = process.env.CLUSTER_CALL || 'IQ0HL';
const FINESTRA_MIN = 75;              // si salvano gli spot degli ultimi 75 min; la pagina mostra l'ultima ora
const NODI = process.env.CLUSTER_PROVA ? [['PROVA', 'prova', '127.0.0.1', +process.env.CLUSTER_PROVA]] : [   // il primo è quello scelto; il secondo è la riserva
  ['IQ1LA-6', 'ARI Loano', 'iq1la-6.dyndns-ip.com', 7300],
  ['IW1PSC-6', 'IW1PSC', 'iw1psc-6.ddns.net', 8000],
];
const CMDS = ['sh/dx by_dxcc i 100', 'sh/dx dxcc i 100'];   // spot FATTI da italiani + spot DI stazioni italiane

// Segmenti fonia IARU Regione 1 (kHz). Fuori da questi intervalli lo spot è scartato (CW, digitali, beacon).
const SSB = [
  ['160 m', 1840, 2000], ['80 m', 3600, 3800], ['60 m', 5354, 5366], ['40 m', 7060, 7200],
  ['20 m', 14125, 14350], ['17 m', 18111, 18168], ['15 m', 21151, 21450], ['12 m', 24931, 24990],
  ['10 m', 28300, 29000], ['6 m', 50100, 50500],
];
const NON_FONIA = /\b(FT8|FT-8|FT4|CW|RTTY|PSK\d*|JS8|JT65|JT9|Q65|MSK144|FST4|WSPR|SSTV|OLIVIA|DIGI|BEACON|BCN)\b/i;

// Call area italiana dal nominativo: cifra 0–9, "S" per la Sardegna (IS0/IM0). null se non italiano.
// Un suffisso portatile /cifra (es. IK0ABC/8) o un prefisso tipo IS0/ prevale sulla cifra del nominativo.
export function callArea(call) {
  const parti = String(call).toUpperCase().split('/');
  for (const p of parti) if (/^(IS|IM)0$/.test(p)) return 'S';
  for (const p of parti.slice(1)) if (/^\d$/.test(p)) return parti.some(x => /^I[A-Z]?\d/.test(x)) ? p : null;
  const base = parti.find(x => /^I[A-Z]?\d[A-Z]/.test(x));
  if (!base) return null;
  const m = base.match(/^(I[A-Z]?)(\d)/);
  if ((m[1] === 'IS' || m[1] === 'IM') && m[2] === '0') return 'S';
  return m[2];
}

const MESI = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
// Riga tipo:  "  14170.0 VK4MSA      11-Nov-2026 0630Z ssb HamStream.com/live/VK4MSA<IW1FRU>"
const RIGA = /^\s*(\d+\.\d+)\s+(\S+)\s+(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{2})(\d{2})Z\s?(.*?)\s*<([^>]+)>\s*$/;
export function leggiSpot(testo) {
  const out = [];
  for (const l of testo.split(/\r?\n/)) {
    const m = l.match(RIGA); if (!m) continue;
    const f = +m[1], mese = MESI[m[4].toUpperCase()]; if (mese === undefined) continue;
    const t = Date.UTC(+m[5], mese, +m[3], +m[6], +m[7]);
    const de = m[9].replace(/-\d+$/, '').replace(/-#$/, '');
    out.push({ t, f, dx: m[2].toUpperCase(), de: de.toUpperCase(), c: m[8] });
  }
  return out;
}
export function soloFonia(spot) {
  const b = SSB.find(([, a, z]) => spot.f >= a && spot.f <= z);
  if (!b || NON_FONIA.test(spot.c)) return null;
  return { t: spot.t, f: spot.f, b: b[0], dx: spot.dx, de: spot.de, adx: callArea(spot.dx), ade: callArea(spot.de) };
}

function interroga([nodo, nome, host, port]) {
  return new Promise(resolve => {
    let buf = '', tutto = '', finito = false;
    const t0 = Date.now();
    const sock = net.connect({ host, port }); sock.setEncoding('latin1'); sock.setTimeout(15000);
    const fine = err => { if (finito) return; finito = true; try { sock.destroy(); } catch {} resolve({ nodo, nome, err, testo: tutto, sec: (Date.now() - t0) / 1000 }); };
    const attendi = (re, ms) => new Promise(res => { const s = Date.now(); const iv = setInterval(() => { if (re.test(buf) || finito) { clearInterval(iv); res(true); } else if (Date.now() - s > ms) { clearInterval(iv); res(false); } }, 100); });
    sock.on('data', d => { buf += d; });
    sock.on('timeout', () => fine('timeout'));
    sock.on('error', e => fine(e.code || e.message));
    sock.on('close', () => fine(tutto ? null : 'chiuso'));
    sock.on('connect', async () => {
      await attendi(/login|call/i, 10000); buf = '';
      sock.write(CALL + '\r\n');
      await attendi(/>\s*$/, 10000);
      if (/password|registr/i.test(buf)) return fine('chiede password');
      buf = '';
      for (const c of CMDS) {
        sock.write(c + '\r\n');
        await attendi(/>\s*$/, 10000); await new Promise(r => setTimeout(r, 800));
        tutto += buf + '\n'; buf = '';
      }
      sock.write('bye\r\n'); setTimeout(() => fine(null), 600);
    });
    setTimeout(() => fine('tempo massimo'), 40000);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let ris = null;
  for (const n of NODI) {
    const r = await interroga(n);
    const spot = leggiSpot(r.testo);
    console.log(`${r.nodo}: ${r.err || 'ok'} – ${spot.length} spot letti in ${r.sec.toFixed(1)} s`);
    if (spot.length) { ris = { ...r, spot }; break; }
  }
  if (!ris) { console.log('Nessun cluster ha risposto: resta il file precedente.'); process.exit(0); }
  const ora = Date.now(), visti = new Set(), lista = [];
  for (const s of ris.spot) {
    if (s.t < ora - FINESTRA_MIN * 60e3 || s.t > ora + 5 * 60e3) continue;
    const v = soloFonia(s); if (!v || (!v.adx && !v.ade)) continue;
    const k = `${v.f}|${v.dx}|${v.de}|${v.t}`; if (visti.has(k)) continue;
    visti.add(k); lista.push(v);
  }
  lista.sort((a, b) => b.t - a.t);
  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/cluster.json`, JSON.stringify({ agg: ora, nodo: ris.nodo, nome: ris.nome, finestraMin: FINESTRA_MIN, spot: lista }));
  console.log(`cluster.json: ${lista.length} spot SSB italiani negli ultimi ${FINESTRA_MIN} min (nodo ${ris.nodo}).`);
}
