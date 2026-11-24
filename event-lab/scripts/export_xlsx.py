#!/usr/bin/env python3
"""EVENT LAB — export XLSX d'un blueprint : modèle financier À FORMULES + tableaux opérationnels.

Usage : python3 scripts/export_xlsx.py blueprints/<id>
Entrées : <dir>/event.json, <dir>/generated/summary.json (produit par build-blueprint.mjs)
Sortie  : <dir>/exports/<id>-v<version>.xlsx

Le modèle financier reproduit les formules de docs/07-algorithmes.md §7 : l'utilisateur peut modifier
fréquentation, montants ou taux, et tout se recalcule. La feuille « Contrôle » compare au moteur.
"""
import json
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

d = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
cfg = json.loads((d / "event.json").read_text(encoding="utf-8"))
summary = json.loads((d / "generated" / "summary.json").read_text(encoding="utf-8"))
out_dir = d / "exports"
out_dir.mkdir(exist_ok=True)
out = out_dir / f"{cfg['id']}-v{cfg['version']}.xlsx"

INK = "1F2937"
HEAD = PatternFill("solid", fgColor="111827")
INPUT = PatternFill("solid", fgColor="FEF3C7")   # cellules saisissables
CALC = PatternFill("solid", fgColor="F3F4F6")
WHITE = Font(color="FFFFFF", bold=True)
BOLD = Font(bold=True, color=INK)
thin = Side(style="thin", color="D1D5DB")
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
EUR = '#,##0 "€";[Red]-#,##0 "€"'
EUR2 = '#,##0.00 "€"'
PCT = "0%"
SC = ["prudent", "central", "ambitieux"]
SC_LABEL = {"prudent": "Prudent", "central": "Central", "ambitieux": "Ambitieux"}

wb = Workbook()


def header(ws, row, values, widths=None):
    for i, v in enumerate(values, 1):
        c = ws.cell(row=row, column=i, value=v)
        c.fill, c.font, c.border = HEAD, WHITE, BOX
        c.alignment = Alignment(wrap_text=True, vertical="center")
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=row + 1, column=1)


def title(ws, text, sub=None):
    ws["A1"] = text
    ws["A1"].font = Font(bold=True, size=14, color=INK)
    if sub:
        ws["A2"] = sub
        ws["A2"].font = Font(italic=True, color="6B7280")


# ---------------------------------------------------------------- Paramètres
ws = wb.active
ws.title = "Paramètres"
title(ws, f"{cfg['identity']['name']} — paramètres du modèle (v{cfg['version']})", "Cellules jaunes = saisissables. Toutes les autres feuilles financières se recalculent.")
header(ws, 4, ["Paramètre", *[SC_LABEL[s] for s in SC], "Note"], [46, 14, 14, 14, 60])
p = cfg.get("scenarios", {})
rows = [
    ("Spectateurs uniques", [cfg["audience"]["attendance"][s] for s in SC], "Hypothèse H-04", "0"),
    ("Équipes participantes", [cfg["participants"]["count"][s] for s in SC], "Unité : équipe", "0"),
    ("Part de spectateurs payants", [cfg["audience"].get("paying_share", 1)] * 3, "Gratuité -12 ans, invités", PCT),
    ("Réalisation — recettes sécurisées", [p.get(s, {}).get("realization", {}).get("secured", 1) for s in SC], "Appliqué aux recettes forfaitaires uniquement", PCT),
    ("Réalisation — recettes probables", [p.get(s, {}).get("realization", {}).get("probable", 0) for s in SC], "docs/07 §7.1", PCT),
    ("Réalisation — recettes hypothétiques", [p.get(s, {}).get("realization", {}).get("hypothetical", 0) for s in SC], "docs/07 §7.1", PCT),
    ("Dérive des coûts non devisés", [p.get(s, {}).get("cost_overrun", 0) for s in SC], "Appliquée si certitude ≠ devis", PCT),
    ("Provision pour aléas", [cfg["budget"].get("contingency_rate", 0.1)] * 3, "Sur le total des dépenses", PCT),
]
PARAM = {}
for i, (label, vals, note, fmt) in enumerate(rows, start=5):
    ws.cell(row=i, column=1, value=label).border = BOX
    for j, v in enumerate(vals, start=2):
        c = ws.cell(row=i, column=j, value=v)
        c.fill, c.border, c.number_format = INPUT, BOX, fmt
    ws.cell(row=i, column=5, value=note).border = BOX
    PARAM[label] = i
R_ATT, R_PART, R_SHARE, R_SEC, R_PROB, R_HYP, R_OVR, R_CONT = (PARAM[r[0]] for r in rows)
COL = {"prudent": "B", "central": "C", "ambitieux": "D"}


def P(row, s):
    return f"Paramètres!${COL[s]}${row}"


def vol(base_cell, s):
    return (f'IF({base_cell}="fixed",1,IF({base_cell}="per_attendee",{P(R_ATT, s)},'
            f'IF({base_cell}="per_participant",{P(R_PART, s)},{P(R_ATT, s)}*{P(R_SHARE, s)})))')


bases = DataValidation(type="list", formula1='"fixed,per_attendee,per_paying_attendee,per_participant"', allow_blank=False)

# ---------------------------------------------------------------- Dépenses
ws = wb.create_sheet("Dépenses")
title(ws, "Dépenses prévisionnelles (configuration standard)", "Montant = forfait ou montant unitaire selon la base. Certitude : devis / estimation / hypothese.")
header(ws, 4, ["Id", "Catégorie", "Poste", "Montant", "Base", "Certitude", "Priorité", "Optionnel", "Paiement (J±)", "Prudent", "Central", "Ambitieux"], [7, 18, 56, 12, 20, 12, 9, 10, 12, 13, 13, 13])
ws.add_data_validation(bases)
cert = DataValidation(type="list", formula1='"devis,estimation,hypothese"')
ws.add_data_validation(cert)
first = 5
for i, e in enumerate(cfg["budget"]["expenses"], start=first):
    vals = [e["id"], e["category"], e["label"], e["amount"], e["basis"], e.get("certainty", "estimation"), e.get("priority", 2), "oui" if e.get("optional") else "non", e.get("pay_offset_days", 0)]
    for j, v in enumerate(vals, 1):
        c = ws.cell(row=i, column=j, value=v)
        c.border = BOX
        if j in (4, 5, 6, 8):
            c.fill = INPUT
    ws.cell(row=i, column=4).number_format = EUR2 if e["basis"] != "fixed" else EUR
    bases.add(ws.cell(row=i, column=5))
    cert.add(ws.cell(row=i, column=6))
    for k, s in enumerate(SC, start=10):
        f = f"=D{i}*{vol(f'E{i}', s)}*(1+IF(F{i}=\"devis\",0,{P(R_OVR, s)}))"
        c = ws.cell(row=i, column=k, value=f)
        c.number_format, c.fill, c.border = EUR, CALC, BOX
last = first + len(cfg["budget"]["expenses"]) - 1
EXP_TOTAL = last + 2
ws.cell(row=EXP_TOTAL, column=3, value="Sous-total dépenses").font = BOLD
for k in range(10, 13):
    col = get_column_letter(k)
    c = ws.cell(row=EXP_TOTAL, column=k, value=f"=SUM({col}{first}:{col}{last})")
    c.number_format, c.font = EUR, BOLD

# ---------------------------------------------------------------- Recettes
ws = wb.create_sheet("Recettes")
title(ws, "Recettes prévisionnelles", "Le taux de réalisation ne s'applique qu'aux recettes forfaitaires (sponsors, subventions) : les autres dépendent déjà du volume du scénario.")
header(ws, 4, ["Id", "Flux", "Recette", "Montant unitaire", "Base", "Taux de marge", "Certitude", "Encaissement (J±)", "Prudent", "Central", "Ambitieux"], [7, 15, 52, 15, 20, 12, 13, 15, 13, 13, 13])
ws.add_data_validation(bases)
certr = DataValidation(type="list", formula1='"secured,probable,hypothetical"')
ws.add_data_validation(certr)
rfirst = 5
for i, r in enumerate(cfg["budget"]["revenues"], start=rfirst):
    vals = [r["id"], r["stream"], r["label"], r["unit_amount"], r["basis"], r.get("margin_rate", 1), r["certainty"], r.get("cash_offset_days", 0)]
    for j, v in enumerate(vals, 1):
        c = ws.cell(row=i, column=j, value=v)
        c.border = BOX
        if j in (4, 5, 6, 7):
            c.fill = INPUT
    ws.cell(row=i, column=4).number_format = EUR2 if r["basis"] != "fixed" else EUR
    ws.cell(row=i, column=6).number_format = PCT
    bases.add(ws.cell(row=i, column=5))
    certr.add(ws.cell(row=i, column=7))
    for k, s in enumerate(SC, start=9):
        real = f'IF(G{i}="secured",{P(R_SEC, s)},IF(G{i}="probable",{P(R_PROB, s)},{P(R_HYP, s)}))'
        f = f'=D{i}*{vol(f"E{i}", s)}*F{i}*IF(E{i}="fixed",{real},1)'
        c = ws.cell(row=i, column=k, value=f)
        c.number_format, c.fill, c.border = EUR, CALC, BOX
rlast = rfirst + len(cfg["budget"]["revenues"]) - 1
REV_TOTAL = rlast + 2
ws.cell(row=REV_TOTAL, column=3, value="Total recettes").font = BOLD
for k in range(9, 12):
    col = get_column_letter(k)
    c = ws.cell(row=REV_TOTAL, column=k, value=f"=SUM({col}{rfirst}:{col}{rlast})")
    c.number_format, c.font = EUR, BOLD
for j, cname in enumerate(["secured", "probable", "hypothetical"]):
    rr = REV_TOTAL + 1 + j
    ws.cell(row=rr, column=3, value=f"dont {cname}")
    for k in range(9, 12):
        col = get_column_letter(k)
        c = ws.cell(row=rr, column=k, value=f'=SUMIF($G${rfirst}:$G${rlast},"{cname}",{col}{rfirst}:{col}{rlast})')
        c.number_format = EUR

# ---------------------------------------------------------------- Synthèse
ws = wb.create_sheet("Synthèse", 0)
title(ws, f"{cfg['identity']['name']} — synthèse financière (v{cfg['version']})", "Calculée par formules à partir des feuilles Paramètres, Dépenses et Recettes.")
header(ws, 4, ["Indicateur", *[SC_LABEL[s] for s in SC]], [44, 16, 16, 16])
lines = [
    ("Spectateurs uniques", [f"={P(R_ATT, s)}" for s in SC], "0"),
    ("Équipes", [f"={P(R_PART, s)}" for s in SC], "0"),
    ("Total recettes", [f"=Recettes!{c}{REV_TOTAL}" for c in "IJK"], EUR),
    ("Dépenses (dérive incluse)", [f"=Dépenses!{c}{EXP_TOTAL}" for c in "JKL"], EUR),
    ("Provision pour aléas", [f"=Dépenses!{c}{EXP_TOTAL}*{P(R_CONT, s)}" for c, s in zip("JKL", SC)], EUR),
]
for i, (label, fs, fmt) in enumerate(lines, start=5):
    ws.cell(row=i, column=1, value=label).border = BOX
    for j, f in enumerate(fs, start=2):
        c = ws.cell(row=i, column=j, value=f)
        c.number_format, c.border = fmt, BOX
row_tot = 5 + len(lines)
ws.cell(row=row_tot, column=1, value="Total dépenses").font = BOLD
for j in range(2, 5):
    col = get_column_letter(j)
    c = ws.cell(row=row_tot, column=j, value=f"={col}8+{col}9")
    c.number_format, c.font = EUR, BOLD
row_res = row_tot + 1
ws.cell(row=row_res, column=1, value="RÉSULTAT").font = Font(bold=True, size=12)
for j in range(2, 5):
    col = get_column_letter(j)
    c = ws.cell(row=row_res, column=j, value=f"={col}7-{col}{row_tot}")
    c.number_format, c.font = EUR, Font(bold=True, size=12)
ws.cell(row=row_res + 2, column=1, value="Lecture : valeurs prévisionnelles fondées sur des estimations et hypothèses (voir event.json → hypotheses). Remplacer par des devis avant toute décision.").font = Font(italic=True, color="6B7280")

# Comparaison des variantes (valeurs du moteur)
r0 = row_res + 4
ws.cell(row=r0, column=1, value="Comparaison des configurations (valeurs calculées par le moteur EVENT LAB)").font = BOLD
header_row = r0 + 1
for i, v in enumerate(["Configuration", "Résultat prudent", "Résultat central", "Résultat ambitieux", "Dépenses (central)", "Seuil (spectateurs)", "Besoin de trésorerie"], 1):
    c = ws.cell(row=header_row, column=i, value=v)
    c.fill, c.font, c.border = HEAD, WHITE, BOX
for k, (vid, v) in enumerate(summary["summary"]["variants"].items(), start=header_row + 1):
    label = {"standard": "Standard"}.get(vid, next((x["label"] for x in cfg.get("variants", []) if x["id"] == vid), vid))
    vals = [label, v["results"]["prudent"], v["results"]["central"], v["results"]["ambitieux"], v["expensesCentral"], v["breakevenCentral"], v["cashNeedCentral"]]
    for i, x in enumerate(vals, 1):
        c = ws.cell(row=k, column=i, value=x)
        c.border = BOX
        if 2 <= i <= 5 or i == 7:
            c.number_format = EUR
for col, w in zip("EFG", (16, 16, 18)):
    ws.column_dimensions[col].width = w

# ---------------------------------------------------------------- Contrôle
ws = wb.create_sheet("Contrôle")
title(ws, "Contrôle de cohérence avec le moteur", "Écart attendu = 0 tant que les cellules jaunes n'ont pas été modifiées.")
header(ws, 4, ["Scénario", "Résultat (formules)", "Résultat (moteur)", "Écart"], [16, 20, 20, 14])
for i, s in enumerate(SC, start=5):
    col = "BCD"[i - 5]
    ws.cell(row=i, column=1, value=SC_LABEL[s])
    ws.cell(row=i, column=2, value=f"=Synthèse!{col}{row_res}").number_format = EUR
    ws.cell(row=i, column=3, value=summary["scenarios"][s]["totals"]["result"]).number_format = EUR
    ws.cell(row=i, column=4, value=f"=ROUND(B{i}-C{i},0)").number_format = EUR


# ---------------------------------------------------------------- Tableaux du moteur
def sheet(name, head, widths, data, fmts=None, sub=None):
    w = wb.create_sheet(name)
    title(w, name, sub)
    header(w, 4, head, widths)
    for i, row in enumerate(data, start=5):
        for j, v in enumerate(row, 1):
            c = w.cell(row=i, column=j, value=v)
            c.border = BOX
            c.alignment = Alignment(wrap_text=True, vertical="top")
            if fmts and fmts.get(j):
                c.number_format = fmts[j]
    return w


cf = summary["cashflow"]
sheet("Trésorerie", ["Jour (J±)", "Flux", "Montant", "Solde cumulé"], [11, 60, 14, 14],
      [[t["day"], t["label"], t["amount"], t["cumulative"]] for t in cf["timeline"]], {3: EUR, 4: EUR},
      f"Scénario central — besoin maximal {round(cf['maxNeed'])} € au jour J{cf['maxNeedDay']:+d} (dépenses provisionnées de l'aléa).")
sheet("Sensibilité", ["Facteur", "Variation", "Impact si baisse", "Impact si hausse", "Amplitude", "Élasticité"], [30, 12, 16, 16, 14, 12],
      [[x["label"], x["range"], x["low"], x["high"], x["swing"], x["elasticity"]] for x in summary["sensitivity"]["items"]], {2: PCT, 3: EUR, 4: EUR, 5: EUR},
      f"Scénario central, résultat de base {round(summary['sensitivity']['base'])} €.")


def hhmm(m):
    day, mm = divmod(m, 1440)
    s = f"{mm // 60:02d}:{mm % 60:02d}"
    return f"J{day} {s}" if day < 0 else s


prog = sorted(cfg["program"], key=lambda x: x["start_min"])
sheet("Conducteur", ["Début", "Fin", "Durée (min)", "Séquence", "Type", "Espace", "Responsable", "Tops", "Critique"], [10, 10, 10, 60, 13, 10, 26, 40, 9],
      [[hhmm(x["start_min"]), hhmm(x["start_min"] + x["duration_min"]), x["duration_min"], x["label"], x["kind"], x.get("space", ""), x.get("owner_role", ""), " · ".join(x.get("cues", [])), "oui" if x.get("critical") else ""] for x in prog])
sheet("Compétition", ["Étape", "Type", "Matchs / passages", "Tours", "Créneaux", "Créneau (min)", "Durée nette (min)", "Avec marge (min)", "Occupation"], [26, 20, 12, 8, 10, 12, 14, 14, 12],
      [[s["label"], s["type"], s["matches"], s["rounds"], s["slots"], s["slotMin"], s["netMin"], s["withMarginMin"], s["utilization"]] for s in summary["competition"]["stages"]], {9: PCT})
sheet("Rétroplanning", ["Échéance (J±)", "Jalon", "Responsable", "Livrable", "Go / no-go", "Statut"], [12, 60, 24, 30, 60, 10],
      [[m["offset_days"], m["label"], m.get("owner_role", ""), m.get("deliverable", ""), m.get("go_no_go", ""), "à faire"] for m in sorted(cfg.get("milestones", []), key=lambda x: x["offset_days"])])
sheet("Risques", ["Id", "Catégorie", "Risque", "P", "I", "P×I", "Critique", "Signes précurseurs", "Prévention", "Plan de continuité", "Responsable", "Statut"], [7, 13, 44, 5, 5, 6, 8, 36, 50, 50, 22, 9],
      [[r["id"], r["category"], r["description"], r["probability"], r["impact"], r["probability"] * r["impact"], "oui" if r.get("critical") else "", " ; ".join(r.get("warning_signs", [])), " ; ".join(r.get("prevention", [])), r.get("continuity_plan", ""), r.get("owner_role", ""), r.get("status", "ouvert")] for r in sorted(cfg["risks"], key=lambda r: -r["probability"] * r["impact"])])
sheet("Conformité", ["Id", "Point", "Interlocuteur", "Obligatoire", "Statut", "Échéance (J±)"], [7, 70, 28, 11, 12, 12],
      [[c["id"], c["item"], c.get("authority", ""), "oui" if c.get("mandatory") else "non", c["status"], c.get("deadline_offset_days")] for c in sorted(cfg["compliance"], key=lambda c: c.get("deadline_offset_days", 0))],
      sub="Points à vérifier auprès des autorités et de l'exploitant : EVENT LAB ne valide pas la conformité.")
sheet("Ressources humaines", ["Rôle", "Effectif", "Statut", "Heures", "Note"], [52, 9, 13, 8, 60],
      [[s["role"], s["count"], s.get("status", ""), s.get("hours"), s.get("ratio_note", "")] for s in cfg["resources"]["staff"]])
sheet("Matériel", ["Matériel", "Quantité", "Provenance", "Puissance (W)", "Note"], [64, 10, 16, 13, 50],
      [[e["item"], e["qty"], e.get("source", ""), e.get("power_w"), e.get("notes", "")] for e in cfg["resources"]["equipment"]])
sheet("KPIs", ["Id", "Phase", "Indicateur", "Cible", "Unité", "Mesure", "Réel"], [6, 9, 44, 12, 22, 30, 10],
      [[k["id"], k.get("phase", ""), k["label"], k["target"], k.get("unit", ""), k.get("measure", ""), k.get("actual")] for k in cfg["kpis"]])
sheet("Partenaires", ["Pack", "Prix", "Quantité", "Recette liée", "Exclusivité", "Contreparties"], [26, 10, 9, 12, 28, 100],
      [[s["name"], s["price"], s["quantity"], s.get("revenue_ref") or "en nature", s.get("exclusivity", ""), " ; ".join(s.get("counterparts", []))] for s in cfg.get("sponsor_packages", [])], {2: EUR})

wb.save(out)
print(out)
