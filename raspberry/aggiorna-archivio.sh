#!/bin/bash
# Copia di sicurezza dell'archivio storico (ramo "archivio" di GitHub) sulla chiavetta USB del Raspberry.
# Lanciato ogni notte e dopo ogni riaccensione dal timer systemd "archivio-propagazione.timer".
set -u
DEST=/mnt/archivio
REPO="$DEST/propagazione-archivio"
LOG="$DEST/aggiornamento.log"
URL=https://github.com/altolazio/propagazione_HF.git

# 1. la chiavetta deve essere montata, altrimenti non si scrive nulla (così non si riempie la SD)
if ! mountpoint -q "$DEST"; then logger -t archivio "chiavetta non montata in $DEST: salto"; exit 1; fi

# 2. dopo una mancanza di corrente la rete può arrivare dopo qualche minuto: si aspetta fino a 10 minuti
for i in $(seq 60); do getent hosts github.com >/dev/null 2>&1 && break; sleep 10; done

{
  echo "$(date -u '+%F %T') UTC – inizio"
  if [ -d "$REPO/.git" ]; then
    if ! git -C "$REPO" pull -q --ff-only origin archivio; then
      # copia rovinata (es. corrente mancata durante un aggiornamento): la si mette da parte e si riscarica tutto
      echo "pull non riuscito: rinomino la copia e la riscarico"
      mv "$REPO" "$REPO.guasta-$(date -u +%Y%m%d%H%M)"
      git clone -q --branch archivio --single-branch "$URL" "$REPO"
    fi
  else
    git clone -q --branch archivio --single-branch "$URL" "$REPO" || echo "ramo archivio non ancora disponibile: riprovo alla prossima esecuzione"
  fi
  [ -d "$REPO/.git" ] && echo "ultimo salvataggio: $(git -C "$REPO" log -1 --format='%s')"
  sync
  echo "$(date -u '+%F %T') UTC – fine"
} >> "$LOG" 2>&1
# il registro non deve crescere all'infinito: si tengono le ultime 2000 righe
tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
