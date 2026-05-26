from pathlib import Path
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_FILE = OUT_DIR / "FreelanceFlow_Walkthrough.pdf"


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="TitleCustom",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=24,
    leading=30,
    textColor=colors.HexColor("#0f172a"),
    alignment=TA_LEFT,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="SubtitleCustom",
    parent=styles["Normal"],
    fontName="Helvetica",
    fontSize=10.5,
    leading=15,
    textColor=colors.HexColor("#475569"),
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="SectionCustom",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=15,
    leading=19,
    textColor=colors.HexColor("#0f172a"),
    spaceBefore=12,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="BodyCustom",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10.2,
    leading=14.5,
    textColor=colors.HexColor("#111827"),
    spaceAfter=6,
))
styles.add(ParagraphStyle(
    name="ListCustom",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=10.1,
    leading=14.2,
    leftIndent=14,
    firstLineIndent=0,
    bulletIndent=0,
    spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="SmallCustom",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.8,
    leading=11.5,
    textColor=colors.HexColor("#475569"),
))


def bullet(text):
    return Paragraph(f"- {text}", styles["ListCustom"])


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#0f172a"))
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(doc.leftMargin, height - 28, "FreelanceFlow Walkthrough Guide")
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 8.5)
    canvas.drawRightString(width - doc.rightMargin, height - 28, date.today().isoformat())
    canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
    canvas.setLineWidth(0.7)
    canvas.line(doc.leftMargin, height - 34, width - doc.rightMargin, height - 34)
    canvas.setStrokeColor(colors.HexColor("#e5e7eb"))
    canvas.line(doc.leftMargin, 28, width - doc.rightMargin, 28)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.setFont("Helvetica", 8.5)
    canvas.drawCentredString(width / 2, 18, f"Page {doc.page}")
    canvas.restoreState()


def build_story():
    story = []

    intro_table = Table(
        [
            [
                Paragraph("<b>Student Demo Goal</b><br/>Show the app as a realistic freelancer dashboard that manages projects, clients, time, invoices, and finance in one place.", styles["BodyCustom"]),
                Paragraph("<b>What to prove</b><br/>The interface is responsive, interactive, and demonstrates the full product idea in a clean SaaS-style presentation.", styles["BodyCustom"]),
            ]
        ],
        colWidths=[3.15 * inch, 3.15 * inch],
    )
    intro_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))

    story.append(Paragraph("FreelanceFlow", styles["TitleCustom"]))
    story.append(Paragraph("A student walkthrough for presenting the freelance project management dashboard.", styles["SubtitleCustom"]))
    story.append(intro_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("1. What the student should say first", styles["SectionCustom"]))
    story.append(bullet("FreelanceFlow is built for freelancers who handle multiple clients, deadlines, invoices, and time logs at once."))
    story.append(bullet("The site combines project management, CRM, billing, and financial tracking into one dashboard."))
    story.append(bullet("This demo is frontend-focused, but the layout is prepared for a future Node.js API backend."))

    story.append(Paragraph("2. Recommended demo flow", styles["SectionCustom"]))
    demo_steps = [
        "Start on the main dashboard and point out the summary metrics at the top: income, outstanding invoices, tracked hours, and active clients.",
        "Scroll or glance at the project cards to show task status, deadlines, budgets, and progress bars.",
        "Use the search field to prove that the dashboard can filter projects, clients, and invoices quickly.",
        "Open the time tracker, select a project and task, start the timer, wait a few seconds, then stop it to show that time entries are logged.",
        "Move to the invoice table and switch between All, Paid, and Pending to show financial organization.",
        "Explain the client CRM cards and how they store contact info, last contact date, and communication notes.",
        "Point at the charts to describe how revenue and expense data are visualized for business decisions.",
        "Finish by showing the pricing tiers and explain the monetization strategy for the product.",
    ]
    for step in demo_steps:
        story.append(bullet(step))

    story.append(Paragraph("3. What to demonstrate on each section", styles["SectionCustom"]))
    section_table = Table(
        [
            ["Section", "What to show", "Why it matters"],
            ["Dashboard cards", "The four summary stats", "Shows a clear executive overview"],
            ["Projects", "Progress bars, tasks, deadlines", "Proves project tracking"],
            ["Time tracking", "Start and stop timer", "Shows productivity logging"],
            ["Clients", "Contact notes and history", "Demonstrates simple CRM behavior"],
            ["Invoices", "Statuses and filters", "Proves billing management"],
            ["Charts", "Revenue and expense visuals", "Highlights financial insight"],
            ["Plans", "Starter, Pro, Studio+", "Explains monetization"],
        ],
        colWidths=[1.3 * inch, 3.15 * inch, 2.25 * inch],
        repeatRows=1,
    )
    section_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.1),
        ("LEADING", (0, 0), (-1, -1), 12),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(section_table)

    story.append(Paragraph("4. Suggested presentation script", styles["SectionCustom"]))
    script_points = [
        "<b>Problem:</b> Freelancers manage too many moving parts in separate tools.",
        "<b>Solution:</b> FreelanceFlow puts projects, clients, invoices, and time tracking into one simple workspace.",
        "<b>Business model:</b> Tiered subscriptions based on project and client limits, plus advanced billing features.",
        "<b>Design choice:</b> Minimal dark dashboard styling with responsive cards and charts to make it feel professional.",
    ]
    for point in script_points:
        story.append(bullet(point))

    story.append(Paragraph("5. Demo checklist before the student presents", styles["SectionCustom"]))
    checklist = [
        "Open the site in a browser and make sure the layout fits the screen.",
        "Try the search bar once so the audience sees it is interactive.",
        "Start and stop the timer so the logging flow is visible.",
        "Change invoice filters to show dynamic status views.",
        "Talk through the pricing tiers as the monetization strategy.",
        "If asked about the backend, mention that a Node.js API can connect to the same UI.",
    ]
    for item in checklist:
        story.append(bullet(item))

    story.append(Paragraph("6. Short closing line the student can use", styles["SectionCustom"]))
    story.append(Paragraph(
        "FreelanceFlow is designed to help freelancers manage their work in one place by combining planning, tracking, billing, and financial visibility in a clean dashboard experience.",
        styles["BodyCustom"]
    ))

    story.append(PageBreak())
    story.append(Paragraph("Quick Reference", styles["SectionCustom"]))
    quick_table = Table(
        [
            ["Action", "How to do it"],
            ["Open dashboard", "Load index.html in a browser"],
            ["Search", "Type in the search box at the top"],
            ["Create item", "Use New Client, New Project, or Create Invoice"],
            ["Track time", "Select project and task, then click Start Timer"],
            ["Filter invoices", "Click All, Paid, or Pending"],
            ["Review finance", "Look at revenue and expense charts"],
        ],
        colWidths=[1.9 * inch, 4.9 * inch],
        repeatRows=1,
    )
    quick_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9.3),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(quick_table)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Tip: The cleanest live demo is to keep the browser window full screen and walk through the sections in the order above.",
        styles["SmallCustom"]
    ))

    return story


def main():
    doc = BaseDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.65 * inch,
        title="FreelanceFlow Walkthrough Guide",
        author="Codex",
        subject="Student walkthrough PDF for FreelanceFlow",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="page", frames=[frame], onPage=header_footer)])
    doc.build(build_story())
    print("PDF created: output/pdf/FreelanceFlow_Walkthrough.pdf")


if __name__ == "__main__":
    main()
