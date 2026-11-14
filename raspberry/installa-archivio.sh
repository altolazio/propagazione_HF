#!/bin/bash
# Installazione, una volta sola, della copia notturna dell'archivio sulla chiavetta USB.
# Uso:  sudo bash installa-archivio.sh
# Prima: la chiavetta deve essere formattata ext4 con etichetta ARCHIVIO (vedi istruzioni).
set -e
UTENTE=${SUDO_USER:-pi}
DEST=/mnt/archivio
[ "$(id -u)" = 0 ] || { echo "Lanciare con sudo"; exit 1; }

DEV=$(blkid -L ARCHIVIO || true)
if [ -z "$DEV" ]; then
  echo "Nessuna chiavetta con etichetta ARCHIVIO. Chiavette collegate:"; lsblk -o NAME,SIZE,FSTYPE,LABEL,MOUNTPOINTS
  echo "Vedi le istruzioni per formattarla (ext4, etichetta ARCHIVIO)."; exit 1
fi
echo "Chiavetta trovata: $DEV"

# 1. montaggio automatico all'avvio; "nofail" = il Raspberry si avvia comunque anche senza chiavetta
mkdir -p "$DEST"
grep -q 'LABEL=ARCHIVIO' /etc/fstab || echo 'LABEL=ARCHIVIO /mnt/archivio ext4 defaults,noatime,nofail,x-systemd.device-timeout=15s 0 2' >> /etc/fstab
systemctl daemon-reload
mountpoint -q "$DEST" || mount "$DEST"
chown "$UTENTE": "$DEST"

# 2. script di aggiornamento
install -m 755 "$(dirname "$0")/aggiorna-archivio.sh" /usr/local/bin/aggiorna-archivio.sh

# 3. servizio e timer: ogni notte alle 03:15 e 10 minuti dopo ogni riaccensione;
#    "Persistent=true" recupera l'esecuzione persa se il Raspberry era spento all'ora prevista
cat > /etc/systemd/system/archivio-propagazione.service <<UNIT
[Unit]
Description=Copia notturna archivio propagazione HF (A.R.I. Alto Lazio)
Wants=network-online.target
After=network-online.target
RequiresMountsFor=$DEST

[Service]
Type=oneshot
User=$UTENTE
ExecStart=/usr/local/bin/aggiorna-archivio.sh
Nice=10
UNIT
cat > /etc/systemd/system/archivio-propagazione.timer <<UNIT
[Unit]
Description=Copia notturna archivio propagazione HF

[Timer]
OnCalendar=*-*-* 03:15:00
OnBootSec=10min
Persistent=true
RandomizedDelaySec=5min

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now archivio-propagazione.timer
echo "Prima copia in corso…"
systemctl start archivio-propagazione.service || true
tail -n 5 "$DEST/aggiornamento.log" 2>/dev/null || true
echo; systemctl list-timers archivio-propagazione.timer --no-pager
echo "Fatto."
