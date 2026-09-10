#!/usr/bin/env python3
"""Die Feder der App, als CSS-Kurve.

Gedämpfter harmonischer Oszillator:  m·x'' + c·x' + k·x = 0
    ω₀ = √(k/m)              Eigenfrequenz
    ζ  = c / (2·√(k·m))      Dämpfungsgrad   (ζ < 1: schwingt über)
    ω_d = ω₀·√(1 − ζ²)       gedämpfte Frequenz
    x(t) = 1 − e^(−ζω₀t)·(cos ω_d t + (ζω₀/ω_d)·sin ω_d t)

Ausgabe ist die Zeile für --feder in assets/styles.css.
Aufruf:  python3 feder.py [k] [c]
"""
import math, sys

def kurve(masse=1.0, steifigkeit=170.0, daempfung=16.0, stuetzstellen=26):
    w0 = math.sqrt(steifigkeit / masse)
    zeta = daempfung / (2 * math.sqrt(steifigkeit * masse))
    dauer = -math.log(0.005) / (zeta * w0)          # bis die Hülle unter 0,5 % fällt
    wd = w0 * math.sqrt(max(1e-9, 1 - zeta * zeta))
    werte = []
    for i in range(stuetzstellen + 1):
        t = dauer * i / stuetzstellen
        if zeta < 1:
            x = 1 - math.exp(-zeta * w0 * t) * (math.cos(wd * t) + (zeta * w0 / wd) * math.sin(wd * t))
        else:
            x = 1 - math.exp(-w0 * t) * (1 + w0 * t)
        werte.append(x)
    return dauer, zeta, w0, werte

if __name__ == '__main__':
    k = float(sys.argv[1]) if len(sys.argv) > 1 else 170.0
    c = float(sys.argv[2]) if len(sys.argv) > 2 else 16.0
    dauer, zeta, w0, werte = kurve(steifigkeit=k, daempfung=c)
    print(f"k={k}  c={c}  ->  w0={w0:.2f}/s  zeta={zeta:.2f}  "
          f"Überschwingen={100*(max(werte)-1):.1f}%  Dauer={dauer*1000:.0f} ms")
    zahlen = ", ".join(f"{w:.4f}".rstrip('0').rstrip('.') for w in werte)
    print(f"--feder: linear({zahlen});")
    print(f"--feder-zeit: {dauer:.2f}s;")
