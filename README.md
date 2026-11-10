# Propagazione HF – Italia · versione GitHub Pages

Pagina web per radioamatori con i dati in tempo reale delle ionosonde INGV italiane
(Roma AIS, Roma Digisonde, La Spezia, Gibilmanna), lo stato delle bande per distanza
e una previsione a 24 ore che si verifica e si tara da sola.

Funziona senza server né PHP: **GitHub scarica i dati INGV ogni 15 minuti** e li pubblica
accanto alla pagina. I visitatori leggono solo file su GitHub (in HTTPS) e non contattano
mai direttamente i server INGV.

```
index.html                         la pagina
guida.js                           guida alla lettura e consigli (sezione in fondo alla pagina)
scripts/fetch-ingv.mjs             scarica dati e ionogrammi dall'INGV
.github/workflows/aggiorna.yml     esegue lo script ogni 15 minuti e pubblica il sito
.github/workflows/mantieni-attivo.yml  commit mensile per non far sospendere le azioni
```

## Messa online (circa 10 minuti, tutto dal browser)

1. **Account**: registratevi su https://github.com (gratuito). Conviene un account della
   sezione/associazione, non personale.
2. **Repository**: in alto a destra *+ → New repository*. Nome ad esempio `propagazione`,
   visibilità **Public** (con il piano gratuito Pages funziona solo con repository pubblici),
   poi *Create repository*.
3. **Caricare i file**: *Add file → Upload files* e trascinate **il contenuto** della cartella
   estratta dallo zip (anche la cartella `.github`; su Mac/Windows le cartelle che iniziano
   con il punto possono essere nascoste: attivate la visualizzazione dei file nascosti).
   Poi *Commit changes*.
   Controllo: nel repository devono comparire `index.html`, `scripts/` e `.github/workflows/`.
   Se `.github` non è stata caricata: *Add file → Create new file*, come nome scrivete
   `.github/workflows/aggiorna.yml` e incollate il contenuto del file; fate lo stesso per
   `mantieni-attivo.yml`.
4. **Attivare Pages**: *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
5. **Primo avvio**: scheda *Actions* → se richiesto, *I understand… enable them* →
   a sinistra *Aggiorna dati INGV* → *Run workflow*. Dopo 1–2 minuti diventa verde.
   Aprendo l'esecuzione e il passo "Scarica dati e ionogrammi dall'INGV" si vede quanti
   valori sono stati scaricati per ogni stazione.
6. **Indirizzo della pagina**: `https://NOME-UTENTE.github.io/propagazione/`
   (si trova anche in *Settings → Pages*).

Da quel momento l'aggiornamento è automatico. Per modificare la pagina basta modificare
`index.html` su GitHub (icona della matita): il sito si ripubblica da solo.

## Collegarla al sito Supersite

Due possibilità:

- **Pagina incorporata (consigliata)**: se l'editor di Supersite ha un blocco "HTML",
  "Codice" o "Embed", inserite:
  ```html
  <iframe src="https://altolazio.github.io/propagazione_HF/"
          style="width:100%;height:2600px;border:0" loading="lazy"
          title="Propagazione HF – Italia"></iframe>
  ```
  Così i soci restano sul vostro sito.
- **Collegamento o reindirizzamento**: una voce di menu o un pulsante che punta
  all'indirizzo GitHub. Funziona sempre, ma si esce dal vostro sito.

## Cose da sapere

- **Ritardi**: GitHub esegue le azioni programmate "al meglio": a volte con 5–20 minuti di
  ritardo, raramente di più nelle ore di punta. La pagina mostra sempre l'ora dei dati.
- **Carico sull'INGV**: al primo avvio lo script scarica 4 giorni di storico; poi solo le
  ultime ore (4 piccole richieste ogni 15 minuti), riusando i dati già pubblicati.
  Con molti visitatori il carico sull'INGV non cambia.
- **Sospensione**: GitHub sospende le azioni programmate dei repository fermi da 60 giorni;
  `mantieni-attivo.yml` lo evita con un commit vuoto al mese. Se arrivasse comunque una mail
  di sospensione, basta riattivare il workflow dalla scheda *Actions*.
- **Se l'INGV non risponde** (manutenzione), la pagina continua a mostrare l'ultimo dato
  valido e lo segnala con l'ora.
- La versione per un sito con PHP (proxy) è nel pacchetto precedente; questa non ne ha bisogno.

## Fonti e licenze

- **Parametri ionosferici** – INGV eSWua, licenza **CC BY 4.0** (indicata nella documentazione
  del servizio web eSWua). Citazione obbligatoria: Upper atmosphere physics and radiopropagation
  Working Group; Marcocci C., Pezzopane M., Pica E., Romano V., Sabbagh D., Scotto C.,
  Zuccheretti E. – *Electronic Space Weather Upper Atmosphere Database (eSWua) – HF Data*,
  v1.0, INGV 2020, doi:10.13127/ESWUA/HF.
- **Ionogrammi obliqui** – IONONET, © INGV, tutti i diritti riservati; la riproduzione di parti
  è consentita con citazione completa della fonte: Zirizzotti A., Zuccheretti E., Sciacca U.,
  Bianchi C., Baskaradas J. (2023), *IONONET Network of oblique sounding*, INGV,
  doi:10.13127/iononet.
- **Ionogrammi verticali** (immagini da ionos.ingv.it) – proprietà INGV; non è indicata una
  licenza specifica, si applica la stessa citazione eSWua. Per scrupolo è utile una mail di
  cortesia all'INGV (eswua@ingv.it) per segnalare l'uso: potrebbero anche suggerire migliorie.
- **Indice Kp** – NOAA Space Weather Prediction Center (dati pubblici USA).

Tutte le citazioni sono già nel piè di pagina di `index.html`: non rimuovetele.
MUF per distanza, stato delle bande e previsioni sono elaborazioni di questa pagina,
non prodotti dell'INGV.

## Il modello in breve

- **MUF per distanza**: legge della secante su Terra sferica, calibrata sulla MUF(3000) misurata
  (a 3000 km coincide con il valore INGV, a 0 km con foF2). FOT = 85% della MUF.
- **Previsione**: mediana di foF2 a 27 giorni per ogni quarto d'ora (fornita dall'INGV) ×
  scarto attuale dalla mediana, che si attenua con costante τ.
- **Autoverifica**: a ogni caricamento la pagina rifà le previsioni degli ultimi giorni, sceglie la
  taratura che avrebbe sbagliato meno e mostra l'errore medio. La fascia di incertezza del
  grafico viene da questi errori reali.
- **Limiti**: descrive la ionosfera sopra le ionosonde (Italia e paesi vicini); per i DX lunghi è
  indicativo; non prevede l'inizio delle tempeste geomagnetiche (c'è un avviso basato sul Kp NOAA).
