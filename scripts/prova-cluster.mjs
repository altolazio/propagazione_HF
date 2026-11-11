// PROVA del nodo DX cluster: collegamento, login, alcuni comandi, tempi.
// Lanciato a mano da GitHub Actions (workflow "Prova cluster"). Non pubblica nulla.
// Il risultato compare nel riepilogo dell'esecuzione (Summary).
import net from 'node:net';
import { appendFileSync } from 'node:fs';

const HOST = process.env.CLUSTER_HOST || 'ik2anf.dyndns.org';
const PORT = +(process.env.CLUSTER_PORT || 7300);
const CALL = process.env.CLUSTER_CALL || 'IQ0HL';
const CMDS = ['sh/dx 30', 'sh/dx by_dxcc i 30', 'sh/dx dxcc i 30', 'sh/dx on 40m 20'];

const t0 = Date.now();
const log = [];
const note = s => { const l = `[${((Date.now() - t0) / 1000).toFixed(1)} s] ${s}`; log.push(l); console.log(l); };
const summary = md => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); };

let buf = '';
const sock = net.connect({ host: HOST, port: PORT });
sock.setEncoding('latin1');
sock.setTimeout(30000);
const waitFor = (re, ms) => new Promise(res => {
  const start = Date.now();
  const iv = setInterval(() => {
    if (re.test(buf)) { clearInterval(iv); res(true); }
    else if (Date.now() - start > ms) { clearInterval(iv); res(false); }
  }, 100);
});
sock.on('data', d => { buf += d; });
sock.on('timeout', () => { note('TIMEOUT di rete'); sock.destroy(); });
sock.on('error', e => { note('ERRORE: ' + e.message); });

const out = {};
sock.on('connect', async () => {
  note(`connesso a ${HOST}:${PORT}`);
  const got = await waitFor(/login|call|indicativo|nominativo/i, 15000);
  note(got ? 'richiesta di login ricevuta' : 'nessuna richiesta di login riconosciuta entro 15 s (invio comunque il nominativo)');
  out.benvenuto = buf.slice(-600); buf = '';
  sock.write(CALL + '\r\n');
  await waitFor(/>\s*$|dxspider|de\s+\w+.*>|welcome|benvenuto/i, 15000);
  note('login inviato'); out.dopoLogin = buf.slice(-1200); buf = '';
  for (const c of CMDS) {
    const tc = Date.now();
    sock.write(c + '\r\n');
    await waitFor(/>\s*$/m, 15000);
    await new Promise(r => setTimeout(r, 1500));
    out[c] = buf; note(`comando "${c}": ${buf.split(/\r?\n/).filter(Boolean).length} righe in ${((Date.now() - tc) / 1000).toFixed(1)} s`);
    buf = '';
  }
  sock.write('bye\r\n'); await new Promise(r => setTimeout(r, 1000)); sock.end();
});
sock.on('close', () => {
  note('collegamento chiuso');
  let md = `## Prova cluster ${HOST}:${PORT} (login ${CALL})\n\n**Tempo totale:** ${((Date.now() - t0) / 1000).toFixed(1)} s\n\n### Cronologia\n\`\`\`\n${log.join('\n')}\n\`\`\`\n`;
  for (const [k, v] of Object.entries(out)) md += `\n### ${k}\n\`\`\`\n${String(v).replace(/\r/g, '').slice(0, 4000)}\n\`\`\`\n`;
  summary(md);
  console.log('\n===== USCITA COMPLETA =====\n', JSON.stringify(out, null, 1).slice(0, 20000));
  process.exit(0);
});
setTimeout(() => { note('tempo massimo superato (120 s)'); sock.destroy(); }, 120000);
