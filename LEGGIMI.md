# Archivio storico – Progetto sperimentale di previsione della propagazione HF

Sezione A.R.I. Alto Lazio (IQ0HL) – https://propagazione.arialtolazio.it/

Questo ramo (`archivio`) raccoglie ogni ora le previsioni emesse dalla pagina, le misure delle ionosonde
e i collegamenti reali (WSPR, DX cluster), per poter verificare il modello anche a distanza di anni.
Il salvataggio è automatico, fatto dall'azione GitHub "Aggiorna dati INGV" (script `scripts/archivio.mjs` del ramo `main`).

## Regole generali

- Tutti gli orari sono in **UTC**, nel formato `AAAA-MM-GGThh:mm:ssZ`.
- Un file per tipo di dato e per mese, nella cartella `AAAA-MM/`. Formato CSV, UTF-8, separatore virgola, punto decimale.
- Una cella vuota significa "dato non disponibile".
- Le frequenze sono in MHz salvo dove indicato (`_khz`, `_hz`); le distanze in km.
- `stato.json` serve solo allo script per sapere cosa ha già salvato.
- `CAMBIAMENTI.md` elenca le modifiche al modello e alla pagina: va letto prima di confrontare periodi diversi.

## File mensili

### previsioni.csv – previsione "congelata" al momento dell'emissione
Ogni ora, per ogni ionosonda, la previsione a +1…+24 ore, calcolata con lo stesso codice della pagina.

| Colonna | Significato |
|---|---|
| emissione_utc | momento in cui la previsione è stata calcolata |
| stazione | rm041 Roma AIS, ro041 Roma Digisonde, sp044 La Spezia, gm037d Gibilmanna |
| versione_modello | impronta del codice del modello in `index.html` (cambia a ogni modifica del modello) |
| ultima_misura_utc | ultima misura di foF2 usata |
| scarto_log | ln(foF2 / mediana 27 giorni) nell'ultima ora |
| tau_h | costante di ritorno verso la mediana scelta dal modello (ore) |
| tendenza_24h | 1 se il modello usa lo scarto medio delle ultime 24 h, 0 se no |
| errore_backtest_mhz | errore medio del modello sugli ultimi giorni (MHz) |
| anticipo_h | ore tra l'ora piena di emissione e l'ora prevista (1…24) |
| valida_utc | ora a cui si riferisce la previsione |
| fof2_mhz, muf3000_mhz | valori previsti |
| muf3000_basso_mhz, muf3000_alto_mhz | fascia di incertezza (circa 68%) |
| mediana27_fof2_mhz | mediana INGV di foF2 a 27 giorni per quell'ora |
| m3000 | fattore M(3000)F2 usato |

### bande.csv – cosa mostrava la pagina
Stato di ogni banda per le distanze della tabella (150 = NVIS, 500, 1000, 2000, 3000 km), calcolato dall'ultima misura.
Valori: `open` aperta, `marg` marginale, `closed` chiusa, `abs` assorbita, `es` via E sporadico, `nd` non disponibile.
`muf_mhz` è la MUF di base calcolata per quella distanza.

### misure.csv – misure INGV
Tutte le misure ricevute, a piena risoluzione (5 o 15 minuti secondo la ionosonda).
Colonne: foF2, MUF(3000)F2, M(3000)F2, foE, ftEs (o foEs per le Digisonde), h'Es, hmF2 (solo AIS),
mediana INGV di foF2 a 27 giorni, e `scaricato_utc` = quando l'abbiamo scaricata.
Fonte: INGV eSWua, doi:10.13127/ESWUA/HF, licenza CC BY 4.0. Citare l'INGV in ogni riuso.

### wspr_spot.csv – spot WSPR tra stazioni italiane (grezzi)
Tutti gli spot con trasmettitore e ricevitore italiani, da wspr.live (rete WSPRnet).
`snr_db` è riferito a 2500 Hz; `potenza_dbm` è quella dichiarata dal trasmettitore.
Le ore vengono salvate con 2 ore di ritardo, perché molti spot arrivano in ritardo.

### wspr_ore.csv – riassunto orario WSPR (criteri della pagina)
Per ogni ora e banda con fonia (160, 80, 40, 20, 17, 15, 12, 10 m), percorsi tra 100 e 1500 km.
`percorsi_da_ssb` = percorsi con SNR riportato a 100 W (snr + 50 − potenza) di almeno +10 dB.
Zero percorsi può voler dire banda chiusa oppure nessuna stazione attiva su quella banda.

### cluster_spot.csv – spot SSB del DX cluster
Spot in fonia fatti da o verso stazioni italiane (nodo IQ1LA-6 di A.R.I. Loano, riserva IW1PSC-6).
`area_dx` / `area_spotter` = zona di nominativo italiana (0–9, S = Sardegna).

### meteo_spazio.csv – meteo spaziale (NOAA SWPC)
Ogni ora: ultimo indice Kp e la sua ora, flusso solare a 10,7 cm, numero di macchie (SWPC) del giorno indicato,
ultimo brillamento (classe e ora del massimo).

### registro.csv – buchi e problemi
Ionosonde senza misure nuove, servizi non raggiungibili, altri eventi. Un buco nei dati va controllato qui
prima di interpretarlo come "nessuna propagazione".

## Come citare

A.R.I. Sezione Alto Lazio (IQ0HL), "Archivio previsioni e misure – Progetto sperimentale di previsione della
propagazione HF", https://github.com/altolazio/propagazione_HF (ramo archivio). Misure ionosferiche: INGV eSWua, doi:10.13127/ESWUA/HF.
