"""
Exports Office du BASK'EST EVENT BLUEPRINT.

    python3 scripts/export_office.py [concept-id]     (défaut : asg-grand-est-2027)

Lit docs/blueprints/<id>/blueprint.json (produit par `npm run blueprint`) et écrit :
  - <id>-dossier.docx          dossier complet (8 parties)
  - <id>-kit-operationnel.docx kit pour l'équipe organisatrice
  - <id>-budget.xlsx           budget MODIFIABLE (formules liées aux hypothèses) + trésorerie, planning…
  - <id>-presentation-partenaires.pptx  présentation synthétique pour les partenaires
"""
import json
import os
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from pptx import Presentation
from pptx.dml.color import RGBColor as PRGB
from pptx.util import Emu, Inches, Pt as PPt

NAVY = "0B1A33"
ORANGE = "F26B1D"
GOLD = "C9A227"
IVORY = "F7F5F0"

PART_LABELS = {
    "strategie": "Partie stratégique",
    "sportif": "Partie sportive",
    "creatif": "Partie créative",
    "operationnel": "Partie opérationnelle",
    "economique": "Partie économique",
    "mediatique": "Partie médiatique",
    "juridique": "Partie juridique et réglementaire",
    "developpement": "Partie développement",
}

OPS_SECTIONS = ["conducteur", "retroplanning", "organigramme", "responsabilites", "fiches_benevoles", "inventaire", "prestataires", "flux", "secours", "risques", "checklists", "plans", "implantation", "calendrier", "reglement", "arbitrage"]


def shade(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tc_pr.append(shd)


def add_table(doc, head, rows):
    t = doc.add_table(rows=1, cols=len(head))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]
        c.text = ""
        r = c.paragraphs[0].add_run(str(h))
        r.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        shade(c, NAVY)
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ""
            run = cells[i].paragraphs[0].add_run(str(v))
            run.font.size = Pt(9)
    return t


def render_blocks(doc, blocks, base):
    for b in blocks:
        k = b["kind"]
        if k == "p":
            doc.add_paragraph(b["text"])
        elif k == "list":
            style = "List Number" if b.get("ordered") else "List Bullet"
            for it in b["items"]:
                doc.add_paragraph(it, style=style)
        elif k == "table":
            if b.get("caption"):
                cap = doc.add_paragraph()
                r = cap.add_run(b["caption"])
                r.italic = True
                r.font.size = Pt(9)
            add_table(doc, b["head"], b["rows"])
            doc.add_paragraph()
        elif k == "kv":
            add_table(doc, ["Élément", "Valeur"], [[a, v] for a, v in b["items"]])
            doc.add_paragraph()
        elif k == "svg":
            png = os.path.join(base, b.get("png", f"assets/{b['name']}.png"))
            if os.path.exists(png):
                doc.add_picture(png, width=Cm(15 if b["name"] != "plan" else 16.5))
                doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
            cap = doc.add_paragraph()
            cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r = cap.add_run(b["caption"])
            r.italic = True
            r.font.size = Pt(9)
        elif k == "callout":
            para = doc.add_paragraph()
            icon = {"warn": "⚠ ", "ok": "✓ ", "info": "ℹ "}.get(b["tone"], "")
            run = para.add_run(icon + b["text"])
            run.italic = True
            run.font.color.rgb = RGBColor(0x8A, 0x5A, 0x00) if b["tone"] == "warn" else RGBColor(0x2B, 0x34, 0x45)


def base_doc():
    doc = Document()
    st = doc.styles["Normal"]
    st.font.name = "Calibri"
    st.font.size = Pt(10.5)
    for s in doc.sections:
        s.left_margin = s.right_margin = Cm(2)
        s.top_margin = s.bottom_margin = Cm(1.8)
    for lvl, size, color in [(1, 20, NAVY), (2, 14, NAVY)]:
        h = doc.styles[f"Heading {lvl}"]
        h.font.size = Pt(size)
        h.font.color.rgb = RGBColor.from_string(color)
    return doc


def cover(doc, bp, base, subtitle_extra=""):
    logo = os.path.join(base, "assets", "logo.png")
    if os.path.exists(logo):
        doc.add_picture(logo, width=Cm(12))
        doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = t.add_run(bp["title"] + subtitle_extra)
    r.bold = True
    r.font.size = Pt(24)
    r.font.color.rgb = RGBColor.from_string(NAVY)
    s = doc.add_paragraph()
    s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = s.add_run(bp["subtitle"])
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor.from_string(ORANGE)
    m = doc.add_paragraph()
    m.alignment = WD_ALIGN_PARAGRAPH.CENTER
    m.add_run(f"Statut : {bp['status']} · Version {bp['version']} · généré le {bp['generatedAt'][:10]} par BASK’EST LAB").font.size = Pt(9)
    w = doc.add_paragraph()
    w.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr = w.add_run("Document de travail : estimations à remplacer par des devis, plans à valider par le gestionnaire du lieu et les services de sécurité. Information générale, pas un conseil juridique ou fiscal personnalisé.")
    rr.italic = True
    rr.font.size = Pt(8.5)
    doc.add_page_break()


def export_docx(bp, base, out, only=None, title_suffix=""):
    doc = base_doc()
    cover(doc, bp, base, title_suffix)
    part = None
    for s in bp["sections"]:
        if only and s["id"] not in only:
            continue
        if s["part"] != part and not only:
            part = s["part"]
            doc.add_heading(PART_LABELS[part], level=1)
        doc.add_heading(s["title"], level=2)
        render_blocks(doc, s["blocks"], base)
    doc.save(out)


def export_xlsx(bp, out):
    d = bp["data"]
    wb = Workbook()
    head_fill = PatternFill("solid", fgColor=NAVY)
    head_font = Font(color="FFFFFF", bold=True)
    input_fill = PatternFill("solid", fgColor="FFF4D6")

    def header(ws, cols, widths=None):
        ws.append(cols)
        for i, _ in enumerate(cols, 1):
            c = ws.cell(row=1, column=i)
            c.fill = head_fill
            c.font = head_font
            c.alignment = Alignment(wrap_text=True, vertical="center")
        for i, w in enumerate(widths or [18] * len(cols), 1):
            ws.column_dimensions[get_column_letter(i)].width = w
        ws.freeze_panes = "A2"

    # --- Hypothèses (cellules modifiables, en jaune) ---
    hyp = wb.active
    hyp.title = "Hypothèses"
    header(hyp, ["Hypothèse", "Valeur", "Note"], [34, 14, 70])
    a = d["assumptions"]
    rows = [
        ("Spectateurs", a["spectateurs"], "Modifier ici : tout le budget se recalcule"),
        ("Participants (joueurs)", a["participants"], ""),
        ("Équipes", a["equipes"], ""),
        ("Part de spectateurs payants", a["part_payante"], "0 à 1"),
        ("Provision imprévus", a["imprevus"], "≥ 5 % recommandé"),
    ]
    for r in rows:
        hyp.append(list(r))
    for row in range(2, 7):
        hyp.cell(row=row, column=2).fill = input_fill
    hyp["A9"] = "Les montants unitaires sont des ESTIMATIONS à remplacer par des devis (cellules jaunes des onglets Charges et Produits)."
    hyp["A9"].font = Font(italic=True)

    mult = '=IF(C{r}="fixe",1,IF(C{r}="par_spectateur",Hypothèses!$B$2,IF(C{r}="par_spectateur_payant",Hypothèses!$B$2*Hypothèses!$B$5,IF(C{r}="par_participant",Hypothèses!$B$3,Hypothèses!$B$4))))'

    ch = wb.create_sheet("Charges")
    header(ch, ["Catégorie", "Libellé", "Base", "Coût unitaire (€)", "Quantité", "Multiplicateur", "En nature", "Montant (€)"], [26, 46, 20, 16, 11, 15, 11, 14])
    charges = [l for l in d["budgetLines"] if l["type"] == "charge"]
    for i, l in enumerate(charges, start=2):
        ch.append([l["category"], l["label"], l["basis"], l["unit"], l["quantity"], mult.format(r=i), "oui" if l.get("inKind") else "non", f"=D{i}*E{i}*F{i}"])
        ch.cell(row=i, column=4).fill = input_fill
        ch.cell(row=i, column=5).fill = input_fill
    n_ch = len(charges) + 1

    pr = wb.create_sheet("Produits")
    header(pr, ["Flux", "Nature", "Libellé", "Base", "Montant unitaire (€)", "Quantité", "Multiplicateur", "Probabilité", "Sécurisé", "Montant brut (€)", "Montant pondéré (€)"], [16, 26, 44, 20, 16, 10, 15, 12, 10, 15, 16])
    produits = [l for l in d["budgetLines"] if l["type"] == "produit"]
    pmult = mult.replace("C{r}", "D{r}")
    for i, l in enumerate(produits, start=2):
        pr.append([l["category"], l.get("nature", ""), l["label"], l["basis"], l["unit"], l["quantity"], pmult.format(r=i), l.get("probability", 1), "oui" if l.get("secured") else "non", f"=E{i}*F{i}*G{i}", f'=IF(I{i}="oui",J{i},J{i}*H{i})'])
        for col in (5, 6, 8):
            pr.cell(row=i, column=col).fill = input_fill
    n_pr = len(produits) + 1

    sy = wb.create_sheet("Synthèse", 1)
    header(sy, ["Indicateur", "Montant (€)", "Commentaire"], [44, 18, 60])
    sy.append(["Charges décaissées", f'=SUMIF(Charges!G2:G{n_ch},"non",Charges!H2:H{n_ch})', ""])
    sy.append(["Imprévus", "=B2*Hypothèses!B6", "Provision sur charges décaissées"])
    sy.append(["Charges valorisées en nature", f'=SUMIF(Charges!G2:G{n_ch},"oui",Charges!H2:H{n_ch})', "Neutre : compensé par l’apport en nature"])
    sy.append(["TOTAL CHARGES", "=B2+B3+B4", ""])
    for nat in ["Recettes commerciales", "Dons et mécénat", "Subventions", "Apports (nature / fonds propres)"]:
        sy.append([nat + " (pondéré)", f'=SUMIF(Produits!B2:B{n_pr},"{nat}",Produits!K2:K{n_pr})', ""])
    sy.append(["Emprunts (hors résultat)", f'=SUMIF(Produits!B2:B{n_pr},"Emprunts (hors résultat)",Produits!K2:K{n_pr})', "Un emprunt n’est pas une recette"])
    sy.append(["TOTAL PRODUITS (hors emprunts)", "=SUM(B6:B9)", ""])
    sy.append(["RÉSULTAT (scénario réaliste pondéré)", "=B11-B5", "Recalculé selon les hypothèses (le simulateur ajoute +3 % de dérive des coûts en scénario réaliste)"])
    sy.append(["Part des produits sécurisés", f'=IFERROR(SUMIF(Produits!I2:I{n_pr},"oui",Produits!K2:K{n_pr})/B11,0)', "Objectif ≥ 60 % au go/no-go J-30"])
    sy.append(["Dépendance aux subventions", "=IFERROR(B8/B11,0)", "Alerte au-delà de 40 %"])
    for r in (5, 11, 12):
        sy.cell(row=r, column=1).font = Font(bold=True)
        sy.cell(row=r, column=2).font = Font(bold=True)
    for r in range(2, 13):
        sy.cell(row=r, column=2).number_format = '#,##0 €'
    sy.cell(row=13, column=2).number_format = "0%"
    sy.cell(row=14, column=2).number_format = "0%"

    sc = wb.create_sheet("Scénarios")
    header(sc, ["Scénario", "Charges", "Produits", "Résultat", "Point mort (spectateurs)", "Trésorerie minimale"], [14, 14, 14, 14, 24, 20])
    for s in d["scenarios"]:
        sc.append([s["name"], s["costs"], s["revenues"], s["result"], s["breakEven"] if s["breakEven"] is not None else "non atteignable", s["minCash"]])
    sc["A6"] = "Valeurs calculées par le simulateur financier BASK’EST LAB (prudent / réaliste / ambitieux)."

    tr = wb.create_sheet("Trésorerie")
    header(tr, ["Jour (J0 = événement)", "Solde cumulé (€)"], [24, 18])
    for f in d["cashflow"]:
        tr.append([f["day"], f["balance"]])
    chart = LineChart()
    chart.title = "Trésorerie (scénario réaliste)"
    chart.y_axis.title = "€"
    chart.x_axis.title = "Jour"
    data = Reference(tr, min_col=2, min_row=1, max_row=len(d["cashflow"]) + 1)
    cats = Reference(tr, min_col=1, min_row=2, max_row=len(d["cashflow"]) + 1)
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    chart.height, chart.width = 8, 16
    tr.add_chart(chart, "D2")

    def simple(name, cols, rows, widths):
        ws = wb.create_sheet(name)
        header(ws, cols, widths)
        for r in rows:
            ws.append(r)

    simple("Planning", ["Heure", "Terrain", "Match", "Équipe A", "Équipe B"], [[m["time"], m["court"], m["label"], m["home"], m["away"]] for m in d["schedule"]], [10, 10, 40, 22, 22])
    simple("Conducteur", ["Heure", "Durée (min)", "Séquence", "Responsable"], [[r["time"], r["duration"], r["item"], r["owner"]] for r in d["runOfShow"]], [10, 12, 60, 24])
    simple("Rétroplanning", ["J", "Tâche", "Responsable", "Livrable", "Fait ?"], [[r["day"], r["task"], r["owner"], r["deliverable"], ""] for r in d["retroplanning"]], [8, 70, 22, 28, 10])
    simple("Risques", ["Risque", "Probabilité", "Impact", "Mesure", "Responsable"], [[r["risk"], r["probability"], r["impact"], r["mitigation"], r["owner"]] for r in d["risks"]], [44, 12, 10, 60, 22])
    simple("Offres partenaires", ["Offre", "Prix HT (€)", "Nombre", "Contreparties", "Total (€)"], [[s["name"], s["price"], s["quantity"], s["counterparts"], f"=B{i}*C{i}"] for i, s in enumerate(d["sponsorPackages"], start=2)], [30, 12, 10, 90, 12])
    simple("KPI", ["Indicateur", "Cible", "Source", "Réalisé"], [[k["kpi"], k["target"], k["source"], ""] for k in d["kpis"]], [34, 18, 30, 14])
    simple("Notation", ["Critère", "Points", "Max"], [[s["criterion"], s["points"], s["max"]] for s in d["score"]] + [["TOTAL", f"=SUM(B2:B{len(d['score']) + 1})", f"=SUM(C2:C{len(d['score']) + 1})"]], [34, 10, 10])
    wb.save(out)


def export_pptx(bp, base, out):
    d = bp["data"]
    secs = {s["id"]: s for s in bp["sections"]}
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    W, H = prs.slide_width, prs.slide_height

    def bg(slide, color=NAVY):
        fill = slide.background.fill
        fill.solid()
        fill.fore_color.rgb = PRGB.from_string(color)

    def text(slide, x, y, w, h, txt, size=18, color="FFFFFF", bold=False, font="Calibri"):
        tb = slide.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        lines = txt if isinstance(txt, list) else [txt]
        for i, line in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            r = p.add_run()
            r.text = line
            r.font.size = PPt(size)
            r.font.bold = bold
            r.font.name = font
            r.font.color.rgb = PRGB.from_string(color)
            p.space_after = PPt(6)
        return tb

    def title_slide(t, kicker=None):
        s = prs.slides.add_slide(blank)
        bg(s)
        if kicker:
            text(s, Inches(0.6), Inches(0.4), Inches(12), Inches(0.5), kicker.upper(), 12, ORANGE, True)
        text(s, Inches(0.6), Inches(0.8), Inches(12), Inches(1), t, 32, "FFFFFF", True)
        return s

    def table_slide(t, kicker, head, rows, col_w=None):
        s = title_slide(t, kicker)
        rows = rows[:10]
        tbl = s.shapes.add_table(len(rows) + 1, len(head), Inches(0.6), Inches(2), Inches(12.1), Inches(0.4) * (len(rows) + 1)).table
        for i, h in enumerate(head):
            c = tbl.cell(0, i)
            c.text = str(h)
            c.fill.solid()
            c.fill.fore_color.rgb = PRGB.from_string(ORANGE)
            for p in c.text_frame.paragraphs:
                for r in p.runs:
                    r.font.size = PPt(13)
                    r.font.bold = True
                    r.font.color.rgb = PRGB.from_string("FFFFFF")
        for ri, row in enumerate(rows, start=1):
            for ci, v in enumerate(row):
                c = tbl.cell(ri, ci)
                c.text = str(v)
                c.fill.solid()
                c.fill.fore_color.rgb = PRGB.from_string("16264A" if ri % 2 else "1D2F57")
                for p in c.text_frame.paragraphs:
                    for r in p.runs:
                        r.font.size = PPt(11)
                        r.font.color.rgb = PRGB.from_string("FFFFFF")
        if col_w:
            for i, w in enumerate(col_w):
                tbl.columns[i].width = Inches(w)
        return s

    # 1. Couverture
    s = prs.slides.add_slide(blank)
    bg(s)
    poster = os.path.join(base, "assets", "affiche.png")
    if os.path.exists(poster):
        s.shapes.add_picture(poster, Inches(8.6), Inches(0.4), height=Inches(6.7))
    logo = os.path.join(base, "assets", "logo.png")
    if os.path.exists(logo):
        s.shapes.add_picture(logo, Inches(0.6), Inches(0.8), width=Inches(6.5))
    text(s, Inches(0.6), Inches(4.3), Inches(7.6), Inches(1), "Dossier partenaires", 30, "FFFFFF", True)
    text(s, Inches(0.6), Inches(5.1), Inches(7.6), Inches(1), bp["subtitle"], 16, GOLD)
    text(s, Inches(0.6), Inches(6.4), Inches(7.6), Inches(0.6), "by Bask’Est · association loi 1901, Nancy", 12, "D0D6E2")

    # 2. Le concept
    s = title_slide("Le concept", "En une phrase")
    concept = secs.get("concept", {}).get("blocks", [{}])[0].get("text", "")
    text(s, Inches(0.6), Inches(2), Inches(12), Inches(3.5), concept, 20, "FFFFFF")

    # 3. Chiffres clés
    s = title_slide("Les chiffres clés", "Objectifs de l’édition")
    kv = next((b for b in secs["resume"]["blocks"] if b["kind"] == "kv"), None)
    items = [(k, v) for k, v in (kv["items"] if kv else []) if k in ("Date", "Lieu", "Public attendu", "Durée")]
    for i, (k, v) in enumerate(items):
        x = Inches(0.6 + (i % 2) * 6.2)
        y = Inches(2 + (i // 2) * 2.2)
        box = s.shapes.add_shape(1, x, y, Inches(5.9), Inches(1.9))
        box.fill.solid()
        box.fill.fore_color.rgb = PRGB.from_string("16264A")
        box.line.color.rgb = PRGB.from_string(GOLD)
        text(s, x + Inches(0.3), y + Inches(0.2), Inches(5.4), Inches(0.5), k.upper(), 12, ORANGE, True)
        text(s, x + Inches(0.3), y + Inches(0.7), Inches(5.4), Inches(1.1), v, 20, "FFFFFF", True)

    # 4. Programme
    table_slide("Le programme", "Conducteur de la soirée", ["Heure", "Séquence"], [[r["time"], r["item"]] for r in d["runOfShow"] if r["duration"] < 120][:10], [2, 10.1])

    # 5. Publics
    cibles = next((b for b in secs["cibles"]["blocks"] if b["kind"] == "table"), None)
    if cibles:
        table_slide("Pour qui ?", "Publics et réponses", cibles["head"], cibles["rows"], [3, 4, 5.1])

    # 6. Expérience
    s = title_slide("L’expérience", "Ce que vivent le public et les joueurs")
    exp = secs["concept"]["blocks"][1]["items"] if len(secs["concept"]["blocks"]) > 1 else []
    text(s, Inches(0.6), Inches(2), Inches(12), Inches(5), ["• " + e for e in exp[:6]], 17)

    # 7. Visibilité & contenus
    capt = next((b for b in secs["captation"]["blocks"] if b["kind"] == "table"), None)
    if capt:
        table_slide("Visibilité et contenus", "Une machine à contenus", capt["head"], capt["rows"], [3.2, 2, 5.4, 1.5])

    # 8. Offres partenaires
    table_slide("Devenir partenaire", "Offres", ["Offre", "Prix HT", "Contreparties"], [[p["name"], f"{p['price']:,} €".replace(",", " ") if p["price"] else "Apport en nature", p["counterparts"]] for p in d["sponsorPackages"]], [3, 1.8, 7.3])

    # 9. Impact
    s = title_slide("L’impact sur le territoire", "Pourquoi s’engager")
    text(s, Inches(0.6), Inches(2), Inches(12), Inches(5), [
        "• Un événement qui fédère quartiers, clubs et familles du Grand Est autour du basket",
        "• Parité : tableau féminin et masculin au même format, sur la même scène",
        "• Accessibilité : places PMR, sous-titrage, zone calme, gratuit pour les moins de 12 ans",
        "• Passerelles : la saison Bask’Est (Bask’Cup, Échelle de l’Est) mène à l’All Star Game",
        "• Bilan chiffré remis à chaque partenaire sous 15 jours",
    ], 18)

    # 10. KPI & contact
    table_slide("Nos engagements mesurables", "Indicateurs", ["Indicateur", "Cible", "Source"], [[k["kpi"], k["target"], k["source"]] for k in d["kpis"]], [4.5, 3, 4.6])
    s = title_slide("Construisons l’édition ensemble", "Contact")
    text(s, Inches(0.6), Inches(2.2), Inches(12), Inches(2), ["Association Bask’Est — Nancy", "Contact partenariats : [à compléter par l’association]", "Dossier complet et budget détaillé disponibles sur demande."], 20)
    prs.save(out)


def main():
    cid = sys.argv[1] if len(sys.argv) > 1 else "asg-grand-est-2027"
    base = os.path.join("docs", "blueprints", cid)
    with open(os.path.join(base, "blueprint.json"), encoding="utf-8") as f:
        bp = json.load(f)
    export_docx(bp, base, os.path.join(base, f"{cid}-dossier.docx"))
    export_docx(bp, base, os.path.join(base, f"{cid}-kit-operationnel.docx"), only=set(OPS_SECTIONS), title_suffix=" — Kit opérationnel")
    export_xlsx(bp, os.path.join(base, f"{cid}-budget.xlsx"))
    export_pptx(bp, base, os.path.join(base, f"{cid}-presentation-partenaires.pptx"))
    print("Exports écrits dans", base)


if __name__ == "__main__":
    main()
