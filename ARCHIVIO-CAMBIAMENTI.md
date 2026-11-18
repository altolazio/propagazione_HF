# Diario delle modifiche al modello e alla pagina

Ogni modifica che può cambiare i numeri dell'archivio va scritta qui, con data e motivo.
La colonna `versione_modello` di previsioni.csv e bande.csv cambia da sola quando cambia il codice del modello.

| Data (UTC) | Modifica | Motivo |
|---|---|---|
| 2026-11-14 | Inizio dell'archivio storico orario. Modello: mediana INGV a 27 giorni + scarto attuale che si attenua con costante τ, τ e fascia di incertezza ritarati sugli ultimi 4 giorni. MUF per distanza: legge della secante calibrata su foF2 e MUF(3000). Banda aperta sotto l'85% della MUF. | Verificare il modello nel tempo |
| 2026-11-18 | Nuovo file rete_copertura.csv (beacon della rete sentiti o no dai ricevitori WSPRnet europei, per fasce di distanza). Non cambia il modello. | Rete WSPR fatta soprattutto di beacon commerciali che solo trasmettono |
