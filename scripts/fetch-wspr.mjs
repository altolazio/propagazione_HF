// Percorsi WSPR tra stazioni italiane nelle ultime 25 ore, riassunti per ora e per banda.
// Fonte: archivio pubblico wspr.live (dati della rete WSPRnet). Una sola interrogazione ogni 15 minuti.
// Viene richiamato da fetch-cluster.mjs, così il workflow non va modificato. Scrive data/wspr.json.
import { mkdir, writeFile } from 'node:fs/promises';

const OUT = process.env.OUT_DIR || 'data';
// bande WSPR di wspr.live: 1=160 m, 3=80 m, 7=40 m, 14=20 m, 18=17 m, 21=15 m, 24=12 m, 28=10 m (solo bande con fonia; esclusi 30 m e 60 m)
const BANDE = { 1: '160 m', 3: '80 m', 7: '40 m', 14: '20 m', 18: '17 m', 21: '15 m', 24: '12 m', 28: '10 m' };
const ITA = "'^I[A-Z]?[0-9]'";   // nominativi italiani (prefissi I, IA…IZ)
// 100–1500 km: esclude l'onda di terra a corto raggio e le stazioni italiane all'estero o in mare
// snr + 50 - power: SNR (su 2500 Hz, come un canale SSB) riportato a 100 W (50 dBm)
const SQL = `SELECT toUnixTimestamp(toStartOfHour(time)) AS h, band AS b, count() AS n,
  countIf(snr + 50 - power >= 10) AS ok, max(distance) AS km, max(snr + 50 - power) AS best
  FROM wspr.rx WHERE time > now() - INTERVAL 25 HOUR
  AND match(tx_sign, ${ITA}) AND match(rx_sign, ${ITA}) AND distance BETWEEN 100 AND 1500 AND band IN (${Object.keys(BANDE).join(',')})
  GROUP BY h, b ORDER BY h, b FORMAT JSON`;

// singoli percorsi degli ultimi 75 minuti (per il Calcolatore QSO): [ora, banda, locatore tx, locatore rx, km, dB a 100 W]
const SQL_ULT = `SELECT toUnixTimestamp(time) AS t, band AS b, substring(tx_loc, 1, 4) AS tl, substring(rx_loc, 1, 4) AS rl,
  distance AS km, snr + 50 - power AS s FROM wspr.rx WHERE time > now() - INTERVAL 75 MINUTE
  AND match(tx_sign, ${ITA}) AND match(rx_sign, ${ITA}) AND distance BETWEEN 100 AND 1500 AND band IN (${Object.keys(BANDE).join(',')})
  ORDER BY t DESC LIMIT 500 FORMAT JSONCompact`;

async function chiedi(sql) {
  const r = await fetch('https://db1.wspr.live/?query=' + encodeURIComponent(sql.replace(/\s+/g, ' ')),
    { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'propagazione.arialtolazio.it (IQ0HL)' } });
  if (!r.ok) throw new Error('wspr.live HTTP ' + r.status);
  return (await r.json()).data;
}

export async function aggiornaWspr() {
  const ore = (await chiedi(SQL)).map(x => ({ t: +x.h * 1000, b: BANDE[x.b], n: +x.n, ok: +x.ok, km: +x.km, best: +x.best }));
  const ult = (await chiedi(SQL_ULT)).map(([t, b, tl, rl, km, s]) => [+t * 1000, BANDE[b], tl, rl, +km, +s]);
  await mkdir(OUT, { recursive: true });
  await writeFile(`${OUT}/wspr.json`, JSON.stringify({ agg: Date.now(), fonte: 'wspr.live (WSPRnet)', ore, ult }));
  return ore.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(`wspr.json: ${await aggiornaWspr()} caselle ora/banda.`); }
  catch (e) { console.log('WSPR non disponibile: ' + e.message); }
}
