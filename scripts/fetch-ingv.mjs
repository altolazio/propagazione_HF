// Scarica i dati delle ionosonde INGV italiane e gli ionogrammi, e li salva in ./data
// Eseguito da GitHub Actions ogni 10 minuti (vedi .github/workflows/aggiorna.yml).
// Node 18+ (fetch integrato), nessuna dipendenza.
//
// Dati: INGV eSWua, licenza CC BY 4.0 – doi:10.13127/ESWUA/HF
// Per rispetto dei server INGV si scaricano solo le ultime ore; lo storico (4 giorni)
// viene riletto dalla versione già pubblicata del sito.
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const OUT = process.env.OUT_DIR || 'data';
const WS = 'http://ws-eswua.rm.ingv.it/swit/ais/records/';
const AIS = 'dt,fof2,muf3000f2,m3000f2,aip_foe,ftes,h_es,aip_hmf2,fof2_med_27_days';
const DPS = 'dt,fof2,muf3000f2,m3000f2,foe,foes,h_es,fof2_med_27_days';
const STATIONS = {
  rm041:  { fields: AIS, vert: 'http://ionos.ingv.it/Roma/LATEST.GIF' },
  sp044:  { fields: AIS, vert: 'http://ionos.ingv.it/Spezia/LATEST.GIF' },
  ro041:  { fields: DPS },
  gm037d: { fields: DPS },
};
const OBLIQUE = ['Rocca', 'Aquila', 'Duronia', 'CTesino', 'Lampedusa'];
const DAYS = 4, H = 3600e3;
const UA = { 'User-Agent': 'PropagazioneHF-Italia/1.0 (pagina per radioamatori, GitHub Actions)' };
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;

async function get(url, ms = 45000, tries = 3) {
  for (let i = 1; ; i++) {
    try { return await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) }); }
    catch (e) { if (i >= tries) throw e; await new Promise(r => setTimeout(r, 3000 * i)); }
  }
}

// formato comune, indipendente dal tipo di ionosonda (AIS-INGV/Autoscala o Digisonde/ARTIST)
const n = v => (v === null || v === undefined || v === '' || isNaN(+v)) ? null : +v;
const norm = r => ({
  dt: r.dt, fof2: n(r.fof2), muf: n(r.muf3000f2), m: n(r.m3000f2),
  foe: n(r.aip_foe ?? r.foe), ftes: n(r.ftes ?? r.foes), hes: n(r.h_es),
  hmf2: n(r.aip_hmf2), // le Digisonde danno solo h'F2 (altezza virtuale): la pagina stima hmF2 da M(3000)
  med: n(r.fof2_med_27_days),
});

async function range(st, fields, from, to) {
  const url = `${WS}ws${st}_auto?include=${fields}&filter=dt,ge,${encodeURIComponent(fmt(from))}&filter=dt,lt,${encodeURIComponent(fmt(to))}`;
  const r = await get(url);
  if (!r.ok) throw new Error(`${st}: HTTP ${r.status}`);
  return ((await r.json()).records || []).map(norm);
}

async function station(st, cfg) {
  const now = Date.now();
  let old = [];
  try { old = JSON.parse(await readFile(`${OUT}/${st}.json`, 'utf8')).records || []; } catch {}
  const lastOld = old.length ? Date.parse(old.at(-1).dt.replace(' ', 'T') + 'Z') : 0;
  const fresh = [];
  if (now - lastOld < 12 * H) {
    fresh.push(...await range(st, cfg.fields, new Date(lastOld - 2 * H), new Date(now + H)));   // solo le ultime ore
  } else {
    for (let k = 0; k < DAYS * 2; k++)                                                            // primo avvio: 4 giorni a blocchi di 12 h
      fresh.push(...await range(st, cfg.fields, new Date(now - (k + 1) * 12 * H), new Date(now - k * 12 * H + (k ? 0 : H))));
  }
  const byDt = new Map(old.map(x => [x.dt, x]));
  for (const x of fresh) byDt.set(x.dt, x);
  const cut = fmt(new Date(now - DAYS * 86400e3));
  let recs = [...byDt.values()].filter(x => x.dt >= cut).sort((a, b) => a.dt < b.dt ? -1 : 1);
  // stazioni a 5 minuti: si tiene un valore ogni 15 minuti (più l'ultimo), per file leggeri e confronti omogenei
  const last = recs.at(-1);
  recs = recs.filter(x => +x.dt.slice(14, 16) % 15 === 0 || x === last);
  return { station: st, updated: new Date().toISOString(), newRecords: fresh.length,
           source: 'INGV eSWua – doi:10.13127/ESWUA/HF – CC BY 4.0', records: recs };
}

async function saveImage(url, file) {
  const r = await get(url, 30000, 2);
  if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return false;
  await writeFile(`${OUT}/img/${file}`, Buffer.from(await r.arrayBuffer()));
  return true;
}

await mkdir(`${OUT}/img`, { recursive: true });
let ok = 0;
for (const [st, cfg] of Object.entries(STATIONS)) {
  try {
    const d = await station(st, cfg);
    await writeFile(`${OUT}/${st}.json`, JSON.stringify(d));
    console.log(st, d.records.length, 'record (nuovi:', d.newRecords + '), ultimo', d.records.at(-1)?.dt);
    ok++;
  } catch (e) { console.error('ERRORE', st, e.message); }
}

let meta = {};
try { meta = JSON.parse(await readFile(`${OUT}/img/meta.json`, 'utf8')); } catch {}
for (const [st, cfg] of Object.entries(STATIONS)) if (cfg.vert) {
  try { if (await saveImage(cfg.vert, `vert-${st}.gif`)) meta[`vert-${st}`] = new Date().toISOString(); } catch (e) { console.error('img', st, e.message); }
}
const base = Math.floor((Date.now() - 5 * 60e3) / 300e3) * 300e3;
for (const rx of OBLIQUE) {
  let saved = false;
  for (let k = 0; k < 12 && !saved; k++) {
    const t = base - k * 300e3, d = new Date(t);
    const p = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${pad(d.getUTCHours())}`;
    const f = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())}.00Z.png`;
    try { if (await saveImage(`http://iononet.ingv.it/images/ionodati/Ionogrammi/${rx}/Montelibretti/${p}/${f}`, `obl-${rx}.png`)) { meta[`obl-${rx}`] = new Date(t).toISOString(); saved = true; } } catch {}
  }
  console.log('obliquo', rx, saved ? meta[`obl-${rx}`] : 'non disponibile');
}
await writeFile(`${OUT}/img/meta.json`, JSON.stringify(meta));
if (!ok) { console.error('Nessuna stazione aggiornata'); process.exit(1); }
