#!/usr/bin/env python3
"""Estrae dall'archivio della chiavetta i dati di una notte (o di un intervallo) in un unico file Excel,
un foglio per tipo di dato.

Uso:  estrai-archivio.py                  -> la notte appena passata (00–06 ora italiana di oggi)
      estrai-archivio.py 2026-11-18       -> la notte del 18 novembre (00–06 ora italiana)
      estrai-archivio.py 2026-11-18 0 24  -> tutto il giorno 18 (dalle 0 alle 24 ora italiana)
      estrai-archivio.py 2026-11-17 18 30 -> dalle 18 del 17 alle 06 del 18 (le ore oltre 24 vanno al giorno dopo)
Il file va in /mnt/archivio/estratti/ e una copia si chiama sempre ultimo.xlsx (comoda da scaricare sul PC).
"""
import csv, gzip, io, os, shutil, sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter

ARCH = os.environ.get('ARCHIVIO', '/mnt/archivio/propagazione-archivio')
OUT = os.environ.get('ESTRATTI', '/mnt/archivio/estratti')
ROMA = ZoneInfo('Europe/Rome')

# fogli nell'ordine in cui compaiono; per ognuno il file e, se serve, cosa scartare
FOGLI = [
    ('misure', 'misure.csv', 'Misure delle ionosonde INGV'),
    ('previsioni', 'previsioni.csv', 'Previsioni emesse (+1…+24 h)'),
    ('bande', 'bande.csv', 'Stato delle bande mostrato dalla pagina'),
    ('wspr_ore', 'wspr_ore.csv', 'WSPR: riassunto orario (solo ore con percorsi)'),
    ('wspr_spot', 'wspr_spot.csv', 'WSPR: tutti gli spot tra stazioni italiane'),
    ('cluster', 'cluster_spot.csv', 'Spot SSB del DX cluster'),
    ('meteo_spazio', 'meteo_spazio.csv', 'Kp, flusso solare, macchie, brillamenti'),
    ('registro', 'registro.csv', 'Buchi e problemi'),
]

def leggi(percorso):
    """righe di un CSV del mese, anche se compresso (.csv.gz)"""
    for p in (percorso, percorso + '.gz'):
        if os.path.exists(p):
            f = gzip.open(p, 'rt', encoding='utf-8') if p.endswith('.gz') else open(p, encoding='utf-8')
            with f:
                yield from csv.reader(f)
            return

def numero(v):
    try:
        return int(v) if v.lstrip('-').isdigit() else float(v)
    except ValueError:
        return v

def main():
    a = sys.argv[1:]
    oggi = datetime.now(ROMA).date()
    giorno = datetime.strptime(a[0], '%Y-%m-%d').date() if a else oggi
    h_da = int(a[1]) if len(a) > 1 else 0
    h_a = int(a[2]) if len(a) > 2 else 6
    inizio = datetime(giorno.year, giorno.month, giorno.day, tzinfo=ROMA) + timedelta(hours=h_da)
    fine = datetime(giorno.year, giorno.month, giorno.day, tzinfo=ROMA) + timedelta(hours=h_a)
    u0, u1 = inizio.astimezone(timezone.utc), fine.astimezone(timezone.utc)
    k0, k1 = u0.strftime('%Y-%m-%dT%H:%M:%SZ'), u1.strftime('%Y-%m-%dT%H:%M:%SZ')
    mesi = sorted({u0.strftime('%Y-%m'), (u1 - timedelta(seconds=1)).strftime('%Y-%m')})

    wb = Workbook(); wb.remove(wb.active)
    testa = Font(bold=True); fondo = PatternFill('solid', start_color='DDE6F0')
    riepilogo = []
    for nome, file, descr in FOGLI:
        intest, righe = None, []
        for m in mesi:
            for i, r in enumerate(leggi(f'{ARCH}/{m}/{file}')):
                if i == 0:
                    intest = intest or r; continue
                if not r: continue
                if nome == 'wspr_ore' and len(r) > 2 and r[2] == '0': continue
                if k0 <= r[0] < k1: righe.append(r)
        ws = wb.create_sheet(nome)
        if not intest:
            ws.append(['nessun file per questo periodo']); riepilogo.append((nome, descr, 0)); continue
        ws.append(['ora_italiana'] + intest)
        for c in ws[1]: c.font = testa; c.fill = fondo
        for r in righe:
            t = datetime.strptime(r[0], '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc).astimezone(ROMA)
            ws.append([t.replace(tzinfo=None)] + [r[0]] + [numero(v) for v in r[1:]])
        for c in ws['A'][1:]: c.number_format = 'dd/mm/yyyy hh:mm'
        ws.freeze_panes = 'C2'
        if righe: ws.auto_filter.ref = ws.dimensions
        for i, cella in enumerate(ws[1], 1):
            ws.column_dimensions[get_column_letter(i)].width = max(10, min(28, len(str(cella.value)) + 2))
        ws.column_dimensions['A'].width = 17; ws.column_dimensions['B'].width = 21
        riepilogo.append((nome, descr, len(righe)))

    info = wb.create_sheet('leggimi', 0)
    info.append(['Estratto archivio propagazione HF – Sezione A.R.I. Alto Lazio']); info['A1'].font = Font(bold=True, size=13)
    info.append([f"Periodo: dalle {inizio:%d/%m/%Y %H:%M} alle {fine:%d/%m/%Y %H:%M} ora italiana ({k0} – {k1} UTC)"])
    info.append(['Colonna A = ora italiana; colonna B = ora originale in UTC. Descrizione delle colonne: LEGGIMI.md nell\'archivio.'])
    info.append(['Gli spot WSPR arrivano con 2 ore di ritardo: per la notte appena passata possono essere incompleti.'])
    info.append([])
    info.append(['Foglio', 'Contenuto', 'Righe'])
    for c in info[6]: c.font = testa; c.fill = fondo
    for r in riepilogo: info.append(list(r))
    info.column_dimensions['A'].width = 16; info.column_dimensions['B'].width = 52; info.column_dimensions['C'].width = 8

    os.makedirs(OUT, exist_ok=True)
    nomefile = f"{OUT}/archivio_{inizio:%Y-%m-%d_%H}-{fine:%Y-%m-%d_%H}.xlsx"
    wb.save(nomefile); shutil.copyfile(nomefile, f'{OUT}/ultimo.xlsx')
    print(nomefile)
    for r in riepilogo: print(f'  {r[0]:<13} {r[2]:>6} righe')

if __name__ == '__main__':
    main()
