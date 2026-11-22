#!/bin/bash
# Ciclo delle bande del ricevitore WSPR della rete (stazione di ascolto IQ0HL). Impostazioni in /etc/ricevitore-wspr.conf
# Due profili: GIORNO (bande alte comprese) e NOTTE (solo bande basse, le alte sono chiuse). Ogni banda occupa sempre gli
# stessi minuti dell'ora: MINUTI x numero di bande deve fare 60 (es. 6 bande x 10 min, 3 bande x 20 min).
# La frequenza si passa in Hz e non come nome di banda: con il nome, rtlsdr-wsprd attiva da solo il "campionamento
# diretto" (adatto alla V3) e una V4 diventa sorda. Con una V3 mettere DIRETTO=2, con una V4 DIRETTO=0.
. /etc/ricevitore-wspr.conf
DIRETTO=${DIRETTO:-0}
BANDE_GIORNO=${BANDE_GIORNO:-$BANDE}; MINUTI_GIORNO=${MINUTI_GIORNO:-$MINUTI}
BANDE_NOTTE=${BANDE_NOTTE:-$BANDE_GIORNO}; MINUTI_NOTTE=${MINUTI_NOTTE:-$MINUTI_GIORNO}
GIORNO_DA=${GIORNO_DA:-7}; GIORNO_A=${GIORNO_A:-18}          # ore italiane del profilo GIORNO (dalle 7 alle 18)
dial() { case $1 in 160m) echo 1836600;; 80m) echo 3568600;; 60m) echo 5287200;; 40m) echo 7038600;; 30m) echo 10138700;;
  20m) echo 14095600;; 17m) echo 18104600;; 15m) echo 21094600;; 12m) echo 24924600;; 10m) echo 28124600;; 6m) echo 50293000;; esac; }
while true; do
  h=$((10#$(date +%H)))
  if [ $h -ge $GIORNO_DA ] && [ $h -lt $GIORNO_A ]; then read -ra B <<< "$BANDE_GIORNO"; M=$MINUTI_GIORNO; prof=giorno
  else read -ra B <<< "$BANDE_NOTTE"; M=$MINUTI_NOTTE; prof=notte; fi
  now=$(date -u +%s); slot=$((M*60))
  i=$(( (now / slot) % ${#B[@]} )); resto=$(( slot - now % slot ))
  n=$(( resto / 120 - 1 ))                    # cicli WSPR interi che stanno nel turno (2 min l'uno)
  if [ $n -lt 1 ]; then sleep $resto; continue; fi
  f=$(dial ${B[$i]}); [ -n "$f" ] || { echo "banda sconosciuta: ${B[$i]}"; sleep 60; continue; }
  echo "[$prof] banda ${B[$i]} ($f Hz): $n cicli"
  stdbuf -oL -eL /usr/local/bin/rtlsdr_wsprd -f $f -c $NOMINATIVO -l $LOCATORE -g $GUADAGNO -p $PPM -d $DIRETTO -n $n || sleep 30
done
