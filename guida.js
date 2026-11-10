/* =====================================================================
   Guida alla lettura – Progetto di previsione della propagazione HF
   Sezione A.R.I. Alto Lazio
   File separato dall'elaborazione: aggiunge in fondo alla pagina
   una sezione didattica (ionogrammi, parametri, mediana, MUF, Es).
   Per toglierla basta eliminare la riga <script src="guida.js"> da index.html.
   ===================================================================== */
(() => {
'use strict';

/* ---------- ionogramma schematico (SVG disegnato qui, valori di esempio) ---------- */
function ionogrammaSVG() {
  // valori di esempio: tipico giorno di novembre a Roma, mezzogiorno
  const foE = 3.0, foF2 = 8.4, fxF2 = 9.05, ftEs = 4.4, hEs = 105;
  const W = 680, H = 400, ml = 56, mr = 150, mt = 16, mb = 44;
  const fx0 = 1, fx1 = 12, hy0 = 0, hy1 = 700;
  const X = f => ml + (f - fx0) / (fx1 - fx0) * (W - ml - mr);
  const Y = h => mt + (1 - (h - hy0) / (hy1 - hy0)) * (H - mt - mb);
  // traccia che sale verso l'infinito avvicinandosi alla frequenza critica
  const trace = (f0, f1, base, k, fc, step = 0.04) => {
    let d = '';
    for (let f = f0; f <= f1 + 1e-9; f += step) {
      const r = Math.min(f / fc, 0.995);
      const h = Math.min(base + k * (1 / Math.sqrt(1 - r * r) - 1), hy1);
      d += (d ? 'L' : 'M') + X(f).toFixed(1) + ',' + Y(h).toFixed(1);
    }
    return d;
  };
  // F2: parte da sopra foE (ritardo dovuto allo strato E), scende, poi sale verso foF2
  const f2 = (fc, shift = 0) => {
    let d = '';
    for (let f = foE + 0.25 + shift; f <= fc - 0.02; f += 0.04) {
      const nearE = 70 * Math.exp(-(f - shift - foE) * 2.2);           // ritardo vicino a foE
      const r = Math.min(f / fc, 0.995);
      const h = Math.min(225 + nearE + 38 * (1 / Math.sqrt(1 - r * r) - 1), hy1);
      d += (d ? 'L' : 'M') + X(f).toFixed(1) + ',' + Y(h).toFixed(1);
    }
    return d;
  };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Ionogramma schematico con le tracce degli strati E, Es e F2">`;
  // griglia
  for (let f = 1; f <= fx1; f++) s += `<line x1="${X(f)}" x2="${X(f)}" y1="${Y(hy0)}" y2="${Y(hy1)}" class="g-grid"/><text x="${X(f)}" y="${H - mb + 16}" text-anchor="middle">${f}</text>`;
  for (let h = 0; h <= hy1; h += 100) s += `<line x1="${ml}" x2="${X(fx1)}" y1="${Y(h)}" y2="${Y(h)}" class="g-grid"/><text x="${ml - 6}" y="${Y(h) + 4}" text-anchor="end">${h}</text>`;
  s += `<text x="${(ml + X(fx1)) / 2}" y="${H - 6}" text-anchor="middle" class="g-ax">frequenza (MHz) →</text>`;
  s += `<text transform="translate(14 ${(mt + Y(0)) / 2}) rotate(-90)" text-anchor="middle" class="g-ax">altezza virtuale h' (km) →</text>`;
  // assorbimento a bassa frequenza (fmin)
  s += `<rect x="${X(1)}" y="${Y(hy1)}" width="${X(1.6) - X(1)}" height="${Y(0) - Y(hy1)}" class="g-abs"/><text x="${X(1.3)}" y="${Y(640)}" text-anchor="middle" class="g-small">fmin</text>`;
  // tracce
  s += `<path d="${trace(1.6, foE - 0.02, 100, 18, foE)}" class="g-tr g-e"/>`;
  s += `<path d="M${X(1.6)},${Y(hEs)} L${X(ftEs)},${Y(hEs)}" class="g-tr g-es"/>`;
  s += `<path d="${f2(foF2)}" class="g-tr g-f"/>`;
  s += `<path d="${f2(fxF2, fxF2 - foF2)}" class="g-tr g-fx"/>`;
  // 2° eco (riflessione doppia), tenue
  s += `<path d="M${X(1.6)},${Y(2 * hEs)} L${X(ftEs - 0.6)},${Y(2 * hEs)}" class="g-tr g-es" opacity=".35"/>`;
  // annotazioni
  const mark = (f, lab, y, cls) => `<line x1="${X(f)}" x2="${X(f)}" y1="${Y(hy1)}" y2="${Y(0)}" class="g-mark ${cls}"/><text x="${X(f) + 3}" y="${y}" class="g-lab ${cls}">${lab}</text>`;
  s += mark(foE, 'foE', Y(560), 'g-e');
  s += mark(ftEs, 'ftEs', Y(470), 'g-es');
  s += mark(foF2, 'foF2', Y(660), 'g-f');
  s += mark(fxF2, 'fxF2', Y(610), 'g-fx');
  s += `<text x="${X(4.6)}" y="${Y(195)}" class="g-lab g-f">h'F ≈ 230 km</text>`;
  s += `<text x="${X(3.4)}" y="${Y(hEs) + 18}" class="g-lab g-es">Es (h'Es ≈ ${hEs} km)</text>`;
  s += `<text x="${X(1.7)}" y="${Y(2 * hEs) - 6}" class="g-small">eco doppio Es</text>`;
  // legenda / riquadro valori, come quello degli ionogrammi INGV
  const bx = W - mr + 14;
  s += `<rect x="${bx - 6}" y="${mt}" width="${mr - 14}" height="200" rx="6" class="g-box"/>`;
  const rows = [['foF2', '8,4 MHz'], ['fxF2', '9,1 MHz'], ['foE', '3,0 MHz'], ['ftEs', '4,4 MHz'], ['M(3000)F2', '3,33'], ['MUF(3000)', '28,0 MHz'], ['hmF2', '234 km']];
  rows.forEach(([k, v], i) => { s += `<text x="${bx}" y="${mt + 24 + i * 25}" class="g-k">${k}</text><text x="${W - 12}" y="${mt + 24 + i * 25}" text-anchor="end" class="g-v">${v}</text>`; });
  s += `<text x="${bx}" y="${mt + 222}" class="g-small">Valori di esempio</text><text x="${bx}" y="${mt + 236}" class="g-small">(Roma, mezzogiorno</text><text x="${bx}" y="${mt + 250}" class="g-small">di novembre)</text>`;
  s += '</svg>';
  return s;
}

/* ---------- testi ---------- */
const HTML = `
<section class="card g-guida" id="guida" style="margin-top:12px">
  <h2>Guida alla lettura <span class="g-hint">(cliccare sui titoli per aprire le spiegazioni)</span></h2>
  <p class="note">Consigli pratici e spiegazioni di base per capire gli ionogrammi e i valori mostrati in questa pagina.</p>

  <details open>
    <summary>Consigli per i radioamatori</summary>
    <div class="g-body">
      <ol class="g-tips">
        <li><b>Trova la finestra utile.</b> Le frequenze utilizzabili stanno tra la <b>LUF</b> (frequenza minima utile, limitata di giorno dall'assorbimento dello strato D) e la <b>MUF</b>. Per i collegamenti a lunga distanza conviene lavorare <b>appena sotto la MUF</b>, circa il 15% più in basso (la FOT): lì l'attenuazione è minima e il collegamento è stabile. Nella tabella delle bande sono le caselle verdi "aperta".</li>
        <li><b>Segui l'andamento del giorno.</b> Di giorno la ionizzazione cresce, lo strato F si divide in F1 e F2 e la MUF sale: si aprono 20, 17, 15 e, con buona attività solare, 12 e 10 m. Di notte lo strato D svanisce, F1 e F2 tornano a fondersi in un unico strato F e la MUF cala molto: la propagazione si sposta su 40, 80 e 160 m. Il grafico e la previsione oraria mostrano quando la MUF sale e scende.</li>
        <li><b>Sfrutta alba e tramonto.</b> Nelle ore di passaggio tra giorno e notte (la "grey line") lo strato D è debole ma lo strato F è ancora ionizzato: sono momenti favorevoli per il DX su 40, 80 e 160 m. Attenzione: all'alba la MUF sale in fretta e nella previsione oraria si vede bene.</li>
        <li><b>Per il NVIS guarda foF2.</b> Per collegamenti entro 300–500 km usa una frequenza circa il 10% sotto foF2, con antenne basse che irradiano verso l'alto. In genere: 40 m di giorno, 60–80 m la sera, 80–160 m di notte. La colonna "NVIS" della tabella delle bande lo dice in tempo reale.</li>
        <li><b>Controlla lo scarto dalla mediana.</b> Se foF2 è del 20% o più sotto la mediana la ionosfera è depressa: scendi di una banda rispetto al solito. Se è sopra, prova le bande più alte.</li>
        <li><b>Occhio a tempeste e brillamenti.</b> Con Kp 5 o più la MUF può calare per uno o due giorni e i percorsi verso nord (Scandinavia, Nord America) peggiorano. Un brillamento solare può invece "spegnere" le HF sul lato illuminato della Terra per 10 minuti fino a un paio d'ore, a partire dalle bande basse.</li>
        <li><b>D'estate controlla ftEs/foEs.</b> Da maggio ad agosto, con ftEs intorno a 5–6 MHz si possono aprire i 10 m via E sporadico verso l'Europa; sopra 9–10 MHz anche i 6 m. Le aperture sono brevi: conviene restare in ascolto.</li>
        <li><b>Scegli la ionosonda giusta.</b> Conta la ionosfera a metà strada: per collegamenti verso nord guarda La Spezia, verso sud Gibilmanna, per l'Italia centrale Roma.</li>
        <li><b>Verifica sempre in ascolto.</b> La pagina dà una stima: la prova vera sono i segnali. I radiofari internazionali NCDXF/IARU trasmettono a turno su 14,100 · 18,110 · 21,150 · 24,930 · 28,200 MHz; anche reti come WSPR e Reverse Beacon Network mostrano in tempo reale chi si sente e dove.</li>
      </ol>
      <p class="note">Consigli in parte tratti da: Vittorio IK4CIE, <a href="https://www.ariparma.it/risorse/articoli/Propagazione%20HF.pdf" target="_blank" rel="noopener">"Propagazione HF – Conoscenze e trucchi per collegamenti DX"</a>, A.R.I. Parma.</p>
    </div>
  </details>

  <details>
    <summary>Come si legge uno ionogramma</summary>
    <div class="g-body">
      <p>Lo <b>ionogramma</b> è il risultato di un "radar verso il cielo": la ionosonda trasmette impulsi in verticale, con la frequenza che sale da circa 1 a 16–20 MHz, e misura dopo quanto tempo torna l'eco. Dal ritardo si ricava l'<b>altezza virtuale</b> h', cioè l'altezza a cui sarebbe lo strato se l'onda viaggiasse sempre alla velocità della luce.</p>
      <figure class="g-fig">${ionogrammaSVG()}
        <figcaption>Ionogramma schematico (disegno didattico, non una misura). In orizzontale la frequenza, in verticale l'altezza virtuale.</figcaption>
      </figure>
      <ol>
        <li><b>Ogni traccia è un'eco da uno strato.</b> Il tratto quasi orizzontale indica l'altezza dello strato: lo strato E intorno a 100–120 km, lo strato F2 oltre i 200 km.</li>
        <li><b>Dove la traccia "impenna" verso l'alto si legge la frequenza critica.</b> Avvicinandosi alla frequenza critica l'onda penetra sempre più a fondo nello strato e il ritardo cresce; oltre quella frequenza lo strato non riflette più in verticale e l'eco sparisce. Così si leggono <b>foE</b> (strato E) e <b>foF2</b> (strato F2).</li>
        <li><b>Le tracce dello strato F sono due, quasi parallele.</b> Il campo magnetico terrestre divide l'onda in due componenti: <b>ordinaria (o)</b> e <b>straordinaria (x)</b>. In Italia la traccia x sta circa 0,6–0,7 MHz più a destra (fxF2 ≈ foF2 + 0,7). Per la propagazione si usa la componente ordinaria, foF2.</li>
        <li><b>Una riga piatta e bassa, a circa 100–110 km, è l'E sporadico (Es).</b> Non impenna come uno strato normale: finisce di colpo a una frequenza, <b>ftEs</b>. Spesso compare anche un'eco doppia a quota doppia, dovuta a due riflessioni tra Es e suolo.</li>
        <li><b>A sinistra, sotto 1–2 MHz, di giorno manca la traccia (fmin).</b> È l'effetto dell'assorbimento nello strato D: più fmin è alta, più le bande basse sono attenuate.</li>
        <li><b>Di notte le tracce possono apparire sfrangiate</b> ("spread-F"): lo strato F è irregolare e la scalatura automatica può mancare. È normale trovare qualche valore assente.</li>
      </ol>
      <p><b>Negli ionogrammi INGV</b> della sezione qui sopra il riquadro a destra riporta i valori ricavati automaticamente (Autoscala), e la traccia ricostruita è sovrapposta in colore. Gli <b>ionogrammi obliqui IONONET</b> si leggono in modo simile, ma descrivono un collegamento reale tra trasmettitore (Montelibretti) e ricevitore: la traccia ha la forma di una "punta" rivolta a destra, e <b>la punta più a destra è la MUF di quel collegamento</b> in quel momento.</p>
    </div>
  </details>

  <details>
    <summary>I parametri mostrati nelle tabelle</summary>
    <div class="g-body g-scroll">
      <table class="g-tab">
        <tr><th class="l">Parametro</th><th class="l">Cosa significa</th><th class="l">In pratica, per il radioamatore</th></tr>
        <tr><td class="l"><b>foF2</b></td><td class="l">Frequenza critica dello strato F2: la frequenza più alta che lo strato riflette quando l'onda sale in verticale.</td><td class="l">È il limite per il <b>NVIS</b> (collegamenti fino a 200–300 km con antenne che irradiano verso l'alto). Con foF2 = 7,5 MHz i 40 m in NVIS funzionano, i 30 m no.</td></tr>
        <tr><td class="l"><b>vs mediana</b></td><td class="l">Di quanto foF2 è sopra (+) o sotto (−) il suo valore tipico a quell'ora negli ultimi 27 giorni.</td><td class="l">+10% o più: ionosfera "carica", bande alte migliori del solito. −20% o meno: ionosfera depressa, spesso dopo una tempesta geomagnetica; meglio scendere di banda.</td></tr>
        <tr><td class="l"><b>MUF 3000 km</b><br><span class="note">MUF(3000)F2</span></td><td class="l">Massima frequenza utilizzabile per un collegamento di 3000 km con un solo salto sullo strato F2. È misurata dall'INGV: MUF(3000) = foF2 × M(3000).</td><td class="l">Indica fin dove salire per i collegamenti lunghi: con MUF(3000) = 28 MHz, a 3000 km i 15 m sono aperti, i 12 m al limite e i 10 m chiusi.</td></tr>
        <tr><td class="l"><b>MUF 1000 km</b></td><td class="l">Massima frequenza utilizzabile a 1000 km, calcolata da questa pagina con la legge della secante a partire dai valori INGV.</td><td class="l">Utile per l'Europa vicina (es. Roma–Parigi, Roma–Berlino). È sempre più bassa della MUF a 3000 km, perché l'onda incide sullo strato in modo più ripido.</td></tr>
        <tr><td class="l"><b>ftEs / foEs</b></td><td class="l">Frequenza massima riflessa dallo strato <b>E sporadico</b>. Le ionosonde AIS-INGV forniscono ftEs (frequenza più alta della traccia Es), le Digisonde foEs (frequenza critica di Es): valori molto simili.</td><td class="l">Su un collegamento obliquo la MUF via Es è circa 5 volte ftEs a 1500–2000 km: con ftEs ≈ 10 MHz possono aprirsi i <b>6 m</b>, con 6 MHz i <b>10 m</b>.</td></tr>
        <tr><td class="l"><b>foE</b></td><td class="l">Frequenza critica dello strato E: di giorno 2–3,5 MHz, di notte sotto 1 MHz.</td><td class="l">Se foE ≥ 1,8 MHz è giorno pieno: lo strato D è presente e assorbe le bande basse.</td></tr>
        <tr><td class="l"><b>M(3000)F2</b></td><td class="l">Fattore di trasmissione: rapporto MUF(3000)/foF2, di solito 2,8–3,8.</td><td class="l">Più è basso, più lo strato F2 è alto. Serve a calcolare la MUF per le altre distanze.</td></tr>
        <tr><td class="l"><b>hmF2</b></td><td class="l">Altezza del massimo di ionizzazione dello strato F2, di solito 220–350 km.</td><td class="l">Uno strato più alto permette salti più lunghi; di notte e d'inverno di solito sale.</td></tr>
        <tr><td class="l"><b>Kp</b></td><td class="l">Indice NOAA dell'attività geomagnetica da 0 (quiete) a 9, calcolato ogni 3 ore.</td><td class="l">Kp ≥ 5 è una tempesta geomagnetica: nelle 24–48 ore successive foF2 e MUF possono calare molto.</td></tr>
      </table>
    </div>
  </details>

  <details>
    <summary>Che cos'è la mediana (e perché 27 giorni)</summary>
    <div class="g-body">
      <p>La <b>mediana</b> è il valore che sta "nel mezzo" di una serie ordinata: metà dei valori sono più bassi, metà più alti. Per ogni quarto d'ora del giorno l'INGV prende i valori di foF2 misurati a quell'ora negli ultimi 27 giorni, li mette in ordine e prende quello centrale.</p>
      <p><b>Esempio semplice</b> con 7 giorni invece di 27, foF2 alle 13:00 (MHz):</p>
      <p class="g-ex">8,1 · 8,4 · 7,9 · 8,6 · <span class="down">5,2</span> · 8,3 · 8,5 &nbsp;→&nbsp; in ordine: 5,2 · 7,9 · 8,1 · <b>8,3</b> · 8,4 · 8,5 · 8,6 &nbsp;→&nbsp; mediana = <b>8,3 MHz</b></p>
      <p>La media aritmetica degli stessi valori sarebbe 7,9 MHz, abbassata dal solo giorno di tempesta (5,2). La mediana invece <b>non si lascia influenzare dai giorni anomali</b>: per questo è il riferimento classico in ionosfera.</p>
      <p><b>Perché 27 giorni:</b> è circa il tempo che il Sole impiega a fare un giro su sé stesso visto dalla Terra. In 27 giorni le zone attive del Sole ci passano davanti una volta, e la mediana rappresenta bene "il periodo".</p>
      <p>Nella pagina, la colonna <b>vs mediana</b> confronta il valore di adesso con questa mediana: è il modo più rapido per capire se oggi la propagazione è migliore o peggiore del solito.</p>
    </div>
  </details>

  <details>
    <summary>MUF, FOT e zona di silenzio</summary>
    <div class="g-body">
      <p><b>MUF</b> (Maximum Usable Frequency) è la frequenza più alta che la ionosfera riflette verso un punto a una certa distanza. Dipende dalla distanza: più il collegamento è lungo, più l'onda colpisce lo strato "di striscio" e più alta è la frequenza che torna giù. Per questo la MUF a 3000 km è circa 3–4 volte foF2, mentre in verticale coincide con foF2.</p>
      <p><b>FOT</b> (frequenza ottimale di lavoro) è circa l'85% della MUF: lavorando un po' sotto la MUF il collegamento è più stabile, perché la MUF varia di minuto in minuto. Nella pagina una banda è "aperta" se sta sotto la FOT, "marginale" tra FOT e MUF.</p>
      <p><b>Zona di silenzio</b> (skip): se si trasmette sopra foF2, l'onda che sale ripida passa nello spazio e torna a terra solo lontano. Tra la zona raggiunta dall'onda di terra e il primo punto di ritorno c'è una fascia dove non si sente nulla. Esempio: con foF2 = 6 MHz, sui 20 m una stazione a 300 km non si sente, mentre una a 2000 km si può sentire bene.</p>
      <p><b>LUF</b> (frequenza minima utilizzabile) è il limite in basso, dovuto all'assorbimento dello strato D e al rumore: questa pagina non la calcola, ma segnala di giorno le bande basse "assorbite".</p>
      <p class="g-ex"><b>Esempio:</b> foF2 = 8,4 MHz e M(3000) = 3,33 → MUF(3000) = 8,4 × 3,33 ≈ 28 MHz; FOT a 3000 km ≈ 24 MHz → 15 m aperti, 12 m marginali (tra FOT e MUF), 10 m chiusi (sopra la MUF).</p>
    </div>
  </details>

  <details>
    <summary>E sporadico (Es)</summary>
    <div class="g-body">
      <p>L'<b>E sporadico</b> è formato da nubi sottili e molto ionizzate che compaiono all'improvviso a circa 100–120 km di quota, nella regione dello strato E. Alle nostre latitudini è frequente soprattutto <b>da maggio ad agosto</b>, nelle ore centrali del giorno e in prima serata, con un piccolo picco anche verso fine dicembre.</p>
      <p>Poiché la nube è bassa, il salto è corto (circa 500–2300 km) e le frequenze riflesse possono essere molto alte: è il meccanismo delle aperture improvvise su <b>10 m, 6 m e talvolta 2 m</b> in Europa, anche con il ciclo solare al minimo.</p>
      <p>Nella pagina la MUF via Es si calcola da ftEs/foEs con la stessa legge della secante usata per lo strato F2, con lo strato a 110 km. Le aperture via Es sono spesso brevi e localizzate: la nube vista dalla ionosonda di Roma può non essere quella sul vostro percorso.</p>
    </div>
  </details>
</section>`;


/* ---------- La ionosfera in breve: disegni ---------- */
function stratiSVG() {
  // due colonne: giorno e notte; quota 0–500 km
  const W = 680, H = 360, mt = 20, mb = 30, ml = 64;
  // scala spezzata: 0–150 km occupa il 45% dell'altezza, così D ed E restano leggibili
  const PH = H - mt - mb, LOW = 0.45;
  const Y = h => h <= 150 ? mt + PH - (h / 150) * PH * LOW : mt + PH * (1 - LOW) * (1 - (h - 150) / 350);
  const colW = 220, gx = [ml + 30, ml + 30 + colW + 60];
  const band = (x, h0, h1, cls, lab, sub) => `<rect x="${x}" y="${Y(h1)}" width="${colW}" height="${Y(h0) - Y(h1)}" rx="6" class="${cls}"/>` +
    `<text x="${x + 10}" y="${(Y(h0) + Y(h1)) / 2 + 4}" class="s-lab">${lab}</text>` + (sub ? `<text x="${x + colW - 8}" y="${(Y(h0) + Y(h1)) / 2 + 4}" text-anchor="end" class="s-sub">${sub}</text>` : '');
  let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Strati della ionosfera di giorno e di notte">`;
  for (const h of [0, 50, 100, 150, 300, 500]) s += `<line x1="${ml}" x2="${W - 10}" y1="${Y(h)}" y2="${Y(h)}" class="g-grid"/><text x="${ml - 6}" y="${Y(h) + 4}" text-anchor="end">${h} km</text>`;
  s += `<text x="${gx[0] + colW / 2}" y="${mt - 4}" text-anchor="middle" class="s-head">☀ Giorno</text><text x="${gx[1] + colW / 2}" y="${mt - 4}" text-anchor="middle" class="s-head">☾ Notte</text>`;
  // giorno
  s += band(gx[0], 60, 90, 's-d', 'D', 'assorbe le bande basse');
  s += `<rect x="${gx[0]}" y="${Y(130)}" width="${colW}" height="${Y(90) - Y(130)}" rx="6" class="s-e"/><text x="${gx[0] + 10}" y="${Y(118) + 4}" class="s-lab">E</text><text x="${gx[0] + colW - 8}" y="${Y(118) + 4}" text-anchor="end" class="s-sub">riflette fino a ~3 MHz</text>`;
  s += `<rect x="${gx[0] + 34}" y="${Y(100)}" width="${60}" height="${Y(96) - Y(100)}" rx="2" class="s-es"/><text x="${gx[0] + 100}" y="${Y(98) + 4}" class="s-sub">Es (sporadico)</text>`;
  s += band(gx[0], 150, 220, 's-f1', 'F1', '');
  s += band(gx[0], 240, 420, 's-f2', 'F2', 'il più ionizzato');
  // notte
  s += `<rect x="${gx[1]}" y="${Y(90)}" width="${colW}" height="${Y(60) - Y(90)}" rx="6" class="s-gone"/><text x="${gx[1] + 10}" y="${Y(75) + 4}" class="s-sub">D scomparso</text>`;
  s += `<rect x="${gx[1]}" y="${Y(125)}" width="${colW}" height="${Y(95) - Y(125)}" rx="6" class="s-e s-weak"/><text x="${gx[1] + 10}" y="${Y(110) + 4}" class="s-sub">E debolissimo</text>`;
  s += band(gx[1], 250, 450, 's-f2', 'F', 'F1 e F2 fusi, più in alto');
  s += `<rect x="0" y="${Y(0)}" width="${W}" height="${mb}" class="s-ground"/><text x="${W / 2}" y="${Y(0) + 19}" text-anchor="middle" class="s-sub">superficie terrestre</text>`;
  return s + '</svg>';
}

function rifrazioneSVG() {
  // Terra piatta stilizzata, strato F a quota fissa; tre raggi con angoli diversi alla stessa frequenza
  const W = 680, H = 300, gy = 250, ly = 70, tx = 70;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Rifrazione delle onde radio nella ionosfera e zona di silenzio">`;
  s += `<rect x="0" y="${ly - 22}" width="${W}" height="44" class="s-f2" opacity=".55"/><text x="${W - 10}" y="${ly - 28}" text-anchor="end" class="s-sub">strato F (ionizzato)</text>`;
  s += `<rect x="0" y="${gy}" width="${W}" height="${H - gy}" class="s-ground"/>`;
  // raggio ripido: attraversa lo strato
  s += `<path d="M${tx},${gy} L${tx + 70},${ly - 22} Q${tx + 82},${ly - 45} ${tx + 95},${10}" class="s-ray s-pass"/><text x="${tx + 100}" y="22" class="s-sub">troppo ripido: si perde nello spazio</text>`;
  // raggio medio: torna al primo punto utile (fine zona di silenzio)
  const r1 = 330, r2 = 560;
  s += `<path d="M${tx},${gy} L${(tx + r1) / 2 - 25},${ly + 18} Q${(tx + r1) / 2},${ly - 30} ${(tx + r1) / 2 + 25},${ly + 18} L${r1},${gy}" class="s-ray s-ok"/>`;
  // raggio radente: torna più lontano
  s += `<path d="M${tx},${gy} L${(tx + r2) / 2 - 60},${ly + 18} Q${(tx + r2) / 2},${ly - 22} ${(tx + r2) / 2 + 60},${ly + 18} L${r2},${gy}" class="s-ray s-far"/>`;
  // onda di terra e zona di silenzio
  s += `<path d="M${tx},${gy - 4} L${tx + 70},${gy - 4}" class="s-ray s-ground-w"/><text x="${tx}" y="${gy + 18}" class="s-sub">onda di terra</text>`;
  s += `<rect x="${tx + 75}" y="${gy + 4}" width="${r1 - tx - 80}" height="12" class="s-skip"/><text x="${(tx + 75 + r1) / 2}" y="${gy + 36}" text-anchor="middle" class="s-lab2">zona di silenzio (skip)</text>`;
  s += `<text x="${r1}" y="${gy + 18}" text-anchor="middle" class="s-sub">primo ritorno</text><text x="${r2}" y="${gy + 18}" text-anchor="middle" class="s-sub">raggio radente</text>`;
  s += `<circle cx="${tx}" cy="${gy}" r="5" class="s-tx"/><text x="${tx - 8}" y="${gy - 10}" text-anchor="end" class="s-sub">TX</text>`;
  return s + '</svg>';
}

const HTML_IONO = `
<section class="card g-guida" id="ionosfera" style="margin-top:12px">
  <h2>La ionosfera in breve <span class="g-hint">(cliccare sui titoli per aprire le spiegazioni)</span></h2>
  <p class="note">Che cos'è, come è fatta e perché permette alle onde corte di fare il giro del mondo. Solo concetti, niente formule.</p>

  <details>
    <summary>Che cos'è la ionosfera</summary>
    <div class="g-body">
      <p>La <b>ionosfera</b> è la parte alta dell'atmosfera, tra circa 60 e 1000 km di quota, in cui la radiazione del Sole (ultravioletto e raggi X) strappa elettroni agli atomi e alle molecole dell'aria. Si forma così un gas debolmente <b>ionizzato</b>, con elettroni liberi: sono loro a interagire con le onde radio.</p>
      <p>La quantità di elettroni non è uniforme: cresce con la quota fino a un massimo intorno a 250–400 km e poi diminuisce. Cambia di continuo con l'<b>ora del giorno</b> (c'è il Sole o no), la <b>stagione</b>, il <b>ciclo solare</b> di circa 11 anni (più macchie solari, più ionizzazione) e l'<b>attività geomagnetica</b>. Per comodità la si descrive come una serie di <b>strati</b>: D, E, F.</p>
    </div>
  </details>

  <details>
    <summary>Gli strati D, E, F1, F2 e l'E sporadico</summary>
    <div class="g-body">
      <figure class="g-fig">${stratiSVG()}<figcaption>Quote indicative degli strati di giorno e di notte (disegno schematico; la scala sotto i 150 km è allargata per leggibilità).</figcaption></figure>
      <ul>
        <li><b>Strato D (60–90 km).</b> Esiste solo di giorno. L'aria a queste quote è ancora relativamente densa: gli elettroni, messi in vibrazione dall'onda, urtano continuamente le molecole e cedono loro energia. Il risultato è un <b>assorbimento</b>, tanto più forte quanto più bassa è la frequenza: per questo di giorno 160 e 80 m non vanno lontano. Al tramonto lo strato D scompare in pochi minuti, perché gli elettroni si ricombinano rapidamente con gli ioni.</li>
        <li><b>Strato E (90–130 km).</b> Segue il Sole: massimo a mezzogiorno, quasi assente di notte. Di giorno riflette le frequenze più basse delle HF, permettendo collegamenti fino a circa 2000 km.</li>
        <li><b>Strato F (oltre 150 km).</b> È il più importante per le onde corte, perché è il più alto e il più ionizzato: permette salti fino a circa 4000 km. <b>Di giorno si divide in due</b>: <b>F1</b> (circa 150–220 km) e <b>F2</b> (circa 250–400 km). Il motivo è che alle quote di F1 l'aria è ancora abbastanza densa da far ricombinare gli elettroni in fretta, e lo strato "segue" il Sole come lo strato E; più in alto, dove si forma F2, l'aria è così rarefatta che gli elettroni restano liberi a lungo e si accumulano, spinti anche da venti e diffusione. Di notte F1 svanisce e resta un unico <b>strato F</b>, che sale di quota e perde lentamente elettroni: per questo le onde corte funzionano anche di notte, ma su frequenze più basse.</li>
        <li><b>E sporadico (Es).</b> Sono nubi sottili, di pochi km di spessore, ma molto più dense del normale strato E, che compaiono all'improvviso a circa 95–120 km. Si formano quando i venti dell'alta atmosfera, che soffiano in direzioni diverse a quote vicine, "comprimono" in un velo sottile gli ioni metallici lasciati dalle meteore. Alle nostre latitudini sono frequenti d'estate e durano da pochi minuti a qualche ora. Possono riflettere frequenze molto alte: sono il motivo delle aperture improvvise su 10 m, 6 m e talvolta 2 m.</li>
      </ul>
    </div>
  </details>

  <details>
    <summary>Perché le onde radio "rimbalzano": la rifrazione</summary>
    <div class="g-body">
      <p>Le onde radio non vengono riflesse come da uno specchio: vengono <b>piegate</b> (rifratte) poco alla volta. Entrando in una zona con più elettroni l'onda cambia velocità e la sua traiettoria si curva, allontanandosi dalla zona più densa. Salendo nello strato incontra sempre più elettroni e si piega sempre di più, finché torna verso terra. È lo stesso fenomeno che fa sembrare spezzato un cucchiaino nel bicchiere d'acqua, o che crea i miraggi sull'asfalto caldo.</p>
      <figure class="g-fig">${rifrazioneSVG()}<figcaption>Stessa frequenza, angoli diversi: il raggio troppo ripido attraversa lo strato, quelli più inclinati vengono piegati e tornano a terra, sempre più lontano. Tra l'onda di terra e il primo ritorno c'è la zona di silenzio.</figcaption></figure>
      <p>Quanto l'onda si piega dipende da tre cose:</p>
      <ul>
        <li><b>La densità dello strato.</b> Più elettroni ci sono, più l'onda si piega. Uno strato molto ionizzato (di giorno, con il Sole attivo) riesce a riportare a terra frequenze più alte.</li>
        <li><b>La frequenza.</b> Le frequenze basse si piegano facilmente; quelle alte molto meno. Oltre una certa frequenza l'onda attraversa lo strato e si perde nello spazio: per questo le VHF di solito non tornano a terra.</li>
        <li><b>L'angolo con cui l'onda arriva allo strato.</b> Un'onda che sale quasi in verticale deve essere piegata moltissimo per tornare indietro; una che arriva "di striscio", con un angolo basso sull'orizzonte, ha bisogno di una piccola curvatura. Ecco perché, alla stessa ora, una frequenza che non torna in verticale può invece arrivare benissimo a 2000–3000 km.</li>
      </ul>
    </div>
  </details>

  <details>
    <summary>Zona di silenzio, salti e altri effetti sulle onde corte</summary>
    <div class="g-body">
      <ul>
        <li><b>Zona di silenzio (skip).</b> Per una certa frequenza, i raggi troppo ripidi passano oltre lo strato: il segnale torna a terra solo da una certa distanza in poi. Tra la fine dell'onda di terra (qualche decina di km) e il primo punto di ritorno c'è una fascia dove non si sente nulla. Più alta è la frequenza, più ampia è la zona di silenzio: sui 10 m può superare i 1000 km.</li>
        <li><b>Salti multipli.</b> Dopo il primo ritorno il segnale può rimbalzare sul suolo o sul mare e risalire verso la ionosfera, facendo un secondo, un terzo salto e così via. Così si fa il giro del mondo, ma a ogni salto si perde un po' di energia. Più lo strato è alto, più lungo è ogni salto: circa 2000 km con lo strato E, circa 4000 km con lo strato F2.</li>
        <li><b>Giorno e notte.</b> Di giorno la ionizzazione è alta: le bande alte (20–10 m) sono aperte, ma lo strato D assorbe quelle basse. Di notte lo strato D sparisce e le bande basse (40–160 m) vanno lontano, mentre le bande alte si chiudono perché lo strato F non è più abbastanza denso.</li>
        <li><b>Ciclo solare.</b> Negli anni di massima attività solare la ionosfera è molto più densa: i 10 m e i 12 m si aprono spesso. Negli anni di minimo restano frequentemente chiusi, salvo per l'E sporadico.</li>
        <li><b>Evanescenza (fading).</b> Il segnale arriva spesso per più strade contemporaneamente (salti diversi, componenti ordinaria e straordinaria) che si sommano e si annullano a vicenda: ne derivano le variazioni rapide di intensità tipiche delle onde corte.</li>
        <li><b>Disturbi dal Sole.</b> Un brillamento solare aumenta di colpo l'assorbimento dello strato D sul lato illuminato della Terra e può silenziare le HF per minuti od ore. Una tempesta geomagnetica, uno o due giorni dopo un'espulsione di massa coronale, può invece impoverire lo strato F2 e abbassare la MUF per uno o due giorni.</li>
      </ul>
    </div>
  </details>
</section>`;

const CSS = `
.g-guida details{border-top:1px solid var(--line);padding:8px 0}
.g-guida summary{cursor:pointer;font-weight:600;font-size:15px}
.g-guida .g-body{padding:6px 2px 4px;font-size:14px}
.g-guida .g-body p{margin:6px 0}
.g-guida .g-body ol{padding-left:20px;margin:6px 0}
.g-guida .g-body li{margin:4px 0}
.g-guida .g-tips li{margin:8px 0}
.g-guida .g-hint{font-weight:400;font-size:13px;color:var(--mute)}
.g-guida .g-ex{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px}
.g-guida .g-fig{margin:8px 0}
.g-guida .g-fig figcaption{font-size:12px;color:var(--mute)}
.g-guida .g-scroll{overflow-x:auto}
.g-guida .g-tab td,.g-guida .g-tab th{vertical-align:top;font-size:13px;white-space:normal}
.g-guida .g-tab{min-width:640px}
.g-guida .g-tab td:first-child{white-space:nowrap}
.g-svg{width:100%;max-width:760px;height:auto;display:block;background:var(--card);border:1px solid var(--line);border-radius:8px}
.g-svg text{fill:var(--mute);font-size:11px}
.g-svg .g-ax{font-size:12px}
.g-svg .g-small{font-size:10px}
.g-svg .g-grid{stroke:var(--line)}
.g-svg .g-abs{fill:var(--abs);opacity:.12}
.g-svg .g-tr{fill:none;stroke-width:3;stroke-linecap:round}
.g-svg .g-mark{stroke-dasharray:3 4;stroke-width:1;opacity:.7}
.g-svg .g-lab{font-size:12px;font-weight:600}
.g-svg .g-e{stroke:#2a9d8f;fill:#2a9d8f}
.g-svg .g-es{stroke:var(--es);fill:var(--es)}
.g-svg .g-f{stroke:var(--foF2);fill:var(--foF2)}
.g-svg .g-fx{stroke:var(--muf);fill:var(--muf)}
.g-svg path.g-e,.g-svg path.g-es,.g-svg path.g-f,.g-svg path.g-fx{fill:none}
.g-svg path.g-fx{stroke-dasharray:6 4;stroke-width:2}
.g-svg .g-box{fill:var(--bg);stroke:var(--line)}
.g-svg .g-k{fill:var(--ink);font-size:12px}
.g-svg .g-v{fill:var(--ink);font-size:12px;font-weight:600}
.g-svg .s-head{fill:var(--ink);font-size:13px;font-weight:600}
.g-svg .s-lab{fill:#fff;font-size:14px;font-weight:700}
.g-svg .s-lab2{fill:var(--ink);font-size:12px;font-weight:600}
.g-svg .s-sub{fill:var(--ink);font-size:11px}
.g-svg .s-d{fill:#e07b39;opacity:.85}
.g-svg .s-e{fill:#2a9d8f;opacity:.85}
.g-svg .s-weak{opacity:.3}
.g-svg .s-es{fill:var(--es)}
.g-svg .s-f1{fill:#6f9be8;opacity:.85}
.g-svg .s-f2{fill:var(--foF2);opacity:.85}
.g-svg .s-gone{fill:none;stroke:var(--line);stroke-dasharray:4 4}
.g-svg .s-ground{fill:#8a6d4b;opacity:.35}
.g-svg .s-ray{fill:none;stroke-width:2.5}
.g-svg .s-pass{stroke:var(--mute);stroke-dasharray:5 4}
.g-svg .s-ok{stroke:var(--open)}
.g-svg .s-far{stroke:var(--muf)}
.g-svg .s-ground-w{stroke:var(--marg);stroke-width:4}
.g-svg .s-skip{fill:var(--muf);opacity:.18}
.g-svg .s-tx{fill:var(--ink)}
.g-guida ul{padding-left:20px;margin:6px 0}
.g-btn{display:inline-block;padding:8px 14px;border-radius:8px;background:var(--foF2);color:#fff !important;text-decoration:none;font-weight:600}
.g-guida ul li{margin:6px 0}
`;

// pagina incorporata in un altro sito (iframe, es. Supersite): l'altezza del riquadro è fissa,
// quindi al posto delle spiegazioni lunghe si mostra un collegamento alla pagina completa
const EMBEDDED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const FULL_URL = location.href.split('#')[0];
const HTML_LINK = `
<section class="card g-guida" id="guida" style="margin-top:12px">
  <h2>Guida alla lettura, consigli e "La ionosfera in breve"</h2>
  <p>Consigli pratici per i radioamatori, come si legge uno ionogramma, il significato di foF2, MUF, mediana ed E sporadico, e una spiegazione semplice di come funziona la ionosfera.</p>
  <p><a class="g-btn" href="${FULL_URL}#guida" target="_blank" rel="noopener">Apri la guida (si apre in una nuova scheda) →</a></p>
</section>`;

function mount() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  if (EMBEDDED) {
    const w = document.createElement('div'); w.innerHTML = HTML_LINK.trim();
    const app0 = document.getElementById('iono-app') || document.body, f0 = app0.querySelector('footer');
    f0 ? app0.insertBefore(w.firstElementChild, f0) : app0.appendChild(w.firstElementChild);
    return;
  }
  const wrap = document.createElement('div'); wrap.innerHTML = HTML.trim();
  const sec = wrap.firstElementChild;
  const app = document.getElementById('iono-app') || document.body;
  const foot = app.querySelector('footer');
  foot ? app.insertBefore(sec, foot) : app.appendChild(sec);
  const w2 = document.createElement('div'); w2.innerHTML = HTML_IONO.trim();
  const sec2 = w2.firstElementChild;
  foot ? app.insertBefore(sec2, foot) : app.appendChild(sec2);
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', mount) : mount();
})();
