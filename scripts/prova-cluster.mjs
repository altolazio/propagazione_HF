// PROVA di più nodi DX cluster italiani: risoluzione del nome, collegamento, login, comandi, tempi.
// Lanciato a mano da GitHub Actions (workflow "Prova cluster"). Non pubblica nulla.
// Il risultato compare nel riepilogo dell'esecuzione (Summary).
import net from 'node:net';
import dns from 'node:dns/promises';
import { appendFileSync } from 'node:fs';

const CALL = process.env.CLUSTER_CALL || 'IQ0HL';
const NODI = [
  ['IQ1LA-6 ARI Loano', 'iq1la-6.dyndns-ip.com', 7300],
  ['ARI rete nazionale', 'dxc.ari.it', 8000],
  ['IZ3MEZ', 'cluster.iz3mez.it', 8000],
  ['IW1PSC-6', 'iw1psc-6.ddns.net', 8000],
  ['IZ7AUH-6 Taranto', 'dx.iz7auh.net', 8000],
  ['I8ZSE-1', 'dxcluster.i8zse.eu', 7300],
  ['IK2ANF', 'ik2anf.dyndns.org', 7300],
];
const CMDS = ['sh/dx 30', 'sh/dx by_dxcc i 30'];
const summary = md => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); console.log(md); };

async function prova([nome, host, port]) {
  const t0 = Date.now(), log = [], out = {};
  const note = s => log.push(`[${((Date.now() - t0) / 1000).toFixed(1)} s] ${s}`);
  try { const a = await dns.lookup(host); note(`nome risolto: ${a.address}`); }
  catch (e) { note(`NOME NON TROVATO (${e.code})`); return { nome, host, port, esito: 'nome inesistente', log, out, sec: 0 }; }
  return await new Promise(resolve => {
    let buf = '', esito = 'nessuna risposta', fatto = false;
    const sock = net.connect({ host, port }); sock.setEncoding('latin1'); sock.setTimeout(20000);
    const fine = () => { if (fatto) return; fatto = true; try { sock.destroy(); } catch {} resolve({ nome, host, port, esito, log, out, sec: (Date.now() - t0) / 1000 }); };
    const waitFor = (re, ms) => new Promise(res => { const s = Date.now(); const iv = setInterval(() => { if (re.test(buf)) { clearInterval(iv); res(true); } else if (Date.now() - s > ms) { clearInterval(iv); res(false); } }, 100); });
    sock.on('data', d => { buf += d; });
    sock.on('timeout', () => { note('TIMEOUT di rete'); fine(); });
    sock.on('error', e => { note('ERRORE: ' + e.message); esito = 'errore: ' + e.code; fine(); });
    sock.on('close', () => fine());
    sock.on('connect', async () => {
      note('collegato'); esito = 'collegato';
      const got = await waitFor(/login|call|indicativo|nominativo/i, 12000);
      note(got ? 'richiesta di login ricevuta' : 'nessuna richiesta di login entro 12 s');
      out.benvenuto = buf.slice(-500); buf = '';
      sock.write(CALL + '\r\n');
      await waitFor(/>\s*$|password|registr/i, 12000);
      out.dopoLogin = buf.slice(-800); note('nominativo inviato');
      if (/password|registr/i.test(buf)) esito = 'chiede password/registrazione';
      buf = '';
      for (const c of CMDS) {
        const tc = Date.now(); sock.write(c + '\r\n');
        await waitFor(/>\s*$/m, 12000); await new Promise(r => setTimeout(r, 1200));
        const righe = buf.split(/\r?\n/).filter(l => /\d+\.\d\s+\S+\s+\d{1,2}-\w{3}-\d{4}\s+\d{4}Z/.test(l));
        out[c] = buf; note(`"${c}": ${righe.length} spot in ${((Date.now() - tc) / 1000).toFixed(1)} s`);
        if (righe.length && esito === 'collegato') esito = 'FUNZIONA';
        buf = '';
      }
      sock.write('bye\r\n'); setTimeout(fine, 800);
    });
    setTimeout(() => { note('tempo massimo (60 s)'); fine(); }, 60000);
  });
}

const ris = [];
for (const n of NODI) ris.push(await prova(n));
let md = `## Prova nodi DX cluster (login ${CALL})\n\n| Nodo | Indirizzo | Esito | Tempo |\n|---|---|---|---|\n`;
for (const r of ris) md += `| ${r.nome} | ${r.host}:${r.port} | **${r.esito}** | ${r.sec.toFixed(1)} s |\n`;
for (const r of ris) {
  md += `\n### ${r.nome} – ${r.host}:${r.port}\n\`\`\`\n${r.log.join('\n')}\n\`\`\`\n`;
  for (const [k, v] of Object.entries(r.out)) md += `<details><summary>${k}</summary>\n\n\`\`\`\n${String(v).replace(/\r/g, '').slice(0, 2500)}\n\`\`\`\n</details>\n`;
}
summary(md);
process.exit(0);
