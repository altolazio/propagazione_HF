#!/bin/bash
# Installazione, una volta sola, del ricevitore WSPR della rete (chiavetta RTL-SDR V3 o V4 + rtlsdr-wsprd).
# Servono anche ricevitore-wspr.sh e ricevitore-wspr.conf nella stessa cartella (controllare DIRETTO: 2 = V3, 0 = V4).
# Uso:  sudo bash installa-ricevitore-wspr.sh [NOMINATIVO] [LOCATORE]      es.  sudo bash installa-ricevitore-wspr.sh IQ0HL JN61AW
# Di giorno 6 bande x 10 min (40-30-20-17-15-10 m), di notte 3 bande x 20 min (80-40-30 m); manda gli spot a WSPRnet. Non tocca il gateway Meshtastic né l'archivio.
# Impostazioni modificabili dopo in /etc/ricevitore-wspr.conf  (poi: sudo systemctl restart ricevitore-wspr)
set -e
[ "$(id -u)" = 0 ] || { echo "Lanciare con sudo"; exit 1; }
NOM=${1:-IQ0HL}; LOC=${2:-JN61AW}
SRC=/usr/local/src

echo "== 1/5 pacchetti necessari"
apt-get update -q
apt-get install -y -q git cmake build-essential pkg-config libusb-1.0-0-dev libcurl4-openssl-dev libfftw3-dev >/dev/null

echo "== 2/5 il driver TV (DVB) non deve prendersi la chiavetta"
cat > /etc/modprobe.d/blacklist-rtlsdr.conf <<'X'
blacklist dvb_usb_rtl28xxu
blacklist rtl2832
blacklist rtl2830
blacklist rtl2832_sdr
X
for m in rtl2832_sdr dvb_usb_rtl28xxu rtl2832 rtl2830; do rmmod $m 2>/dev/null || true; done

echo "== 3/5 driver RTL-SDR Blog (serve per l'HF della V4) – qualche minuto"
mkdir -p $SRC && cd $SRC
[ -d rtl-sdr-blog ] && (cd rtl-sdr-blog && git pull -q) || git clone -q https://github.com/rtlsdrblog/rtl-sdr-blog.git
cd rtl-sdr-blog && mkdir -p build && cd build
cmake .. -DINSTALL_UDEV_RULES=ON -DDETACH_KERNEL_DRIVER=ON >/dev/null
make -j2 >/dev/null && make install >/dev/null && ldconfig
udevadm control --reload-rules && udevadm trigger

echo "== 4/5 programma rtlsdr-wsprd – qualche minuto"
cd $SRC
[ -d rtlsdr-wsprd ] && (cd rtlsdr-wsprd && git pull -q && git submodule update --init -q) || git clone -q --recursive https://github.com/Guenael/rtlsdr-wsprd.git
cd rtlsdr-wsprd && make -j2 >/dev/null
BIN=$(find . -name rtlsdr_wsprd -type f -perm -u+x | head -1)
[ -n "$BIN" ] || { echo "Compilazione di rtlsdr-wsprd non riuscita"; exit 1; }
install -m 755 "$BIN" /usr/local/bin/rtlsdr_wsprd

echo "== 5/5 servizio con riavvio automatico"
if [ ! -f /etc/ricevitore-wspr.conf ]; then
  install -m 644 "$(dirname "$0")/ricevitore-wspr.conf" /etc/ricevitore-wspr.conf
  sed -i "s/^NOMINATIVO=.*/NOMINATIVO=$NOM/; s/^LOCATORE=.*/LOCATORE=$LOC/" /etc/ricevitore-wspr.conf
fi
install -m 755 "$(dirname "$0")/ricevitore-wspr.sh" /usr/local/bin/ricevitore-wspr.sh
cat > /etc/systemd/system/ricevitore-wspr.service <<'X'
[Unit]
Description=Ricevitore WSPR della rete (RTL-SDR)
After=network-online.target time-sync.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/ricevitore-wspr.sh
Restart=always
RestartSec=30
Nice=5
User=root

[Install]
WantedBy=multi-user.target
X
systemctl daemon-reload
systemctl enable --now ricevitore-wspr.service
sleep 3
echo
echo "Fatto. Nominativo $NOM, locatore $LOC. Per vedere cosa riceve:  journalctl -u ricevitore-wspr -f"
echo "Gli spot compaiono su wsprnet.org cercando $NOM come ricevitore, dopo qualche ciclo di 2 minuti."
