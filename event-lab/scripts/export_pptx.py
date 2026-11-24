#!/usr/bin/env python3
"""EVENT LAB — dossier partenaires (PPTX 16:9) généré depuis event.json.

Usage : python3 scripts/export_pptx.py blueprints/<id> [--logo chemin.png]
Sortie : <dir>/exports/<id>-dossier-partenaires-v<version>.pptx
Toutes les audiences sont présentées comme des hypothèses tant qu'aucune édition n'a eu lieu.
"""
import json
import sys
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt

args = sys.argv[1:]
d = Path(args[0] if args else ".").resolve()
logo = Path(args[args.index("--logo") + 1]) if "--logo" in args else None
cfg = json.loads((d / "event.json").read_text(encoding="utf-8"))
out_dir = d / "exports"
out_dir.mkdir(exist_ok=True)
out = out_dir / f"{cfg['id']}-dossier-partenaires-v{cfg['version']}.pptx"

INK = RGBColor(0x11, 0x18, 0x27)
PAPER = RGBColor(0xFA, 0xFA, 0xF7)
ACCENT = RGBColor(0xF5, 0xB7, 0x00)
MUTED = RGBColor(0x9C, 0xA3, 0xAF)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
FONT = "Inter"

prs = Presentation()
prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)  # 16:9
W, H = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]


def bg(slide, color):
    r = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, W, H)
    r.fill.solid(); r.fill.fore_color.rgb = color; r.line.fill.background()
    r.shadow.inherit = False
    return r


def text(slide, x, y, w, h, value, size=18, color=INK, bold=False, align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    lines = value if isinstance(value, list) else [value]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        run.font.size, run.font.bold, run.font.name = Pt(size), bold, FONT
        run.font.color.rgb = color
        p.space_after = Pt(size * 0.4)
    return tb


def footer(slide, dark=False):
    note = f"{cfg['identity']['name']} · dossier partenaires · v{cfg['version']} · audiences = hypothèses de travail, non garanties"
    text(slide, Emu(457200), H - Emu(420000), W - Emu(914400), Emu(300000), note, 9, MUTED if dark else RGBColor(0x6B, 0x72, 0x80))


def bar(slide, x, y, w=Emu(900000)):
    r = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, Emu(70000))
    r.fill.solid(); r.fill.fore_color.rgb = ACCENT; r.line.fill.background()
    r.shadow.inherit = False


def content_slide(title_txt, dark=False):
    s = prs.slides.add_slide(BLANK)
    bg(s, INK if dark else PAPER)
    bar(s, Emu(457200), Emu(500000))
    text(s, Emu(457200), Emu(620000), W - Emu(914400), Emu(700000), title_txt, 30, WHITE if dark else INK, True)
    footer(s, dark)
    return s


M = Emu(457200)
ident = cfg["identity"]

# 1. Couverture
s = prs.slides.add_slide(BLANK)
bg(s, INK)
if logo and logo.exists():
    s.shapes.add_picture(str(logo), M, Emu(700000), height=Emu(1600000))
    y0 = Emu(2600000)
else:
    y0 = Emu(1500000)
bar(s, M, y0)
text(s, M, y0 + Emu(150000), W - 2 * M, Emu(1000000), ident["name"], 54, WHITE, True)
text(s, M, y0 + Emu(1150000), W - 2 * M, Emu(700000), ident["tagline"], 22, ACCENT)
text(s, M, y0 + Emu(1900000), W - 2 * M, Emu(500000), "Dossier partenaires — 1re édition (projet)", 16, MUTED)
footer(s, True)

# 2. Le concept
s = content_slide("Le concept")
text(s, M, Emu(1500000), Emu(6400000), Emu(4200000), ident["pitch"], 18)
mech = [b["label"] for b in cfg["format"]["building_blocks"] if b["type"] in ("qualification", "mise_en_scene", "mecanique_jeu")][:4]
text(s, Emu(7300000), Emu(1500000), Emu(4400000), Emu(4200000), ["Les mécaniques"] + [f"— {m}" for m in mech], 15)

# 3. La journée
s = content_slide("Une journée, quatre temps forts", dark=True)
keys = [("q1", "Qualifications"), ("r1", "Révélation de la grille"), ("p1", "Poules"), ("f2", "Finales et podiums")]
BLURB = {
    "q1": "Chaque équipe joue sa place sur un parcours chronométré. Trois manches, la dernière en solo devant tout le public.",
    "r1": "La grille apparaît sur grand écran : la pole est sacrée, les poules se dessinent en direct.",
    "p1": "Deux terrains en continu, des matchs courts et intenses, l'heure de chaque match affichée en direct.",
    "f2": "Entrée des finalistes par numéro de grille, finales sur le terrain central, podiums et photo officielle.",
}
prog = {p["id"]: p for p in cfg["program"]}


def hhmm(m):
    return f"{m // 60:02d}:{m % 60:02d}"


cw = (W - 2 * M) // 4
for i, (k, lab) in enumerate(keys):
    p = prog.get(k)
    x = M + i * cw
    box = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x + Emu(60000), Emu(1700000), cw - Emu(120000), Emu(3600000))
    box.fill.solid(); box.fill.fore_color.rgb = RGBColor(0x1F, 0x29, 0x37); box.line.fill.background()
    box.shadow.inherit = False
    text(s, x + Emu(200000), Emu(1850000), cw - Emu(400000), Emu(500000), hhmm(p["start_min"]) if p else "", 28, ACCENT, True)
    text(s, x + Emu(200000), Emu(2500000), cw - Emu(400000), Emu(600000), lab, 20, WHITE, True)
    text(s, x + Emu(200000), Emu(3200000), cw - Emu(400000), Emu(2000000), BLURB.get(k, p["label"] if p else ""), 13, MUTED)

# 4. Publics
s = content_slide("Qui sera là")
aud = [a for a in ident.get("audiences", []) if a["role"] in ("participant", "spectateur", "journaliste", "vip")]
att = cfg["audience"]["attendance"]
text(s, M, Emu(1450000), W - 2 * M, Emu(500000), f"Hypothèse de fréquentation : {att['prudent']} à {att['ambitieux']} spectateurs sur la journée (scénario central {att['central']}), {cfg['participants']['count']['central']} équipes de {cfg['participants']['team_size']} joueurs.", 15, RGBColor(0xB4, 0x53, 0x09), True)
for i, a in enumerate(aud[:4]):
    y = Emu(2150000) + i * Emu(950000)
    text(s, M, y, Emu(5200000), Emu(900000), a["segment"], 16, INK, True)
    text(s, Emu(5900000), y, Emu(5800000), Emu(900000), a.get("motivation", ""), 14)

# 5. Moments de visibilité
s = content_slide("Les moments qui se partagent", dark=True)
text(s, M, Emu(1500000), Emu(5500000), Emu(4300000), ["Moments forts"] + [f"— {m}" for m in cfg["media"]["viral_moments"]], 16, WHITE)
text(s, Emu(6400000), Emu(1500000), Emu(5300000), Emu(4300000), ["Espaces photo"] + [f"— {m}" for m in cfg["media"]["photo_spots"]] + ["", "Canaux : " + ", ".join(cfg["media"]["channels"])], 16, WHITE)

# 6+. Packs
for pk in cfg.get("sponsor_packages", []):
    s = content_slide(pk["name"])
    price = "En nature" if not pk["price"] else f"{pk['price']:,.0f} €".replace(",", " ")
    text(s, M, Emu(1450000), Emu(3600000), Emu(800000), price, 40, INK, True)
    text(s, M, Emu(2300000), Emu(3600000), Emu(1200000), [f"{pk['quantity']} place(s)", pk.get("exclusivity", "")], 15, RGBColor(0x6B, 0x72, 0x80))
    text(s, Emu(4600000), Emu(1450000), W - Emu(4600000) - M, Emu(4600000), [f"— {c}" for c in pk.get("counterparts", [])], 15)

# Calendrier partenaire
s = content_slide("Calendrier partenaire")
ms = [m for m in cfg.get("milestones", []) if m["offset_days"] in (-100, -60, -30, -7, 0, 7)]
for i, m in enumerate(ms):
    y = Emu(1450000) + i * Emu(760000)
    lab = "Jour J" if m["offset_days"] == 0 else f"J{m['offset_days']:+d}"
    text(s, M, y, Emu(1300000), Emu(700000), lab, 20, RGBColor(0xB4, 0x53, 0x09), True)
    text(s, Emu(1900000), y, W - Emu(1900000) - M, Emu(700000), m["label"], 14)

# Mesure
s = content_slide("Ce que nous mesurons et vous restituons", dark=True)
k = [x for x in cfg["kpis"] if x["id"] in ("K03", "K06", "K07", "K09")]
text(s, M, Emu(1500000), W - 2 * M, Emu(4000000), [f"— {x['label']} ({x.get('measure', '')})" for x in k] + ["", "Bilan de visibilité remis à J+7 : affluence mesurée, publications, vues, photos de l'activation."], 17, WHITE)

# Contact
s = prs.slides.add_slide(BLANK)
bg(s, INK)
bar(s, M, Emu(2300000))
text(s, M, Emu(2450000), W - 2 * M, Emu(900000), "Rejoignez la grille.", 44, WHITE, True)
text(s, M, Emu(3400000), W - 2 * M, Emu(900000), ["[Nom de l'association organisatrice]", "[Contact partenaires — e-mail, téléphone]"], 18, ACCENT)
footer(s, True)

prs.save(out)
print(out)
