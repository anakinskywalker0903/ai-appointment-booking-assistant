import sys
import os
import reportlab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Import Canvas helpers
from build_canvas import NumberedCanvas, CheatSheetCanvas

print("Generating Markdown and PDF documents...")

# Setup Styles
styles = getSampleStyleSheet()

# Custom styles
primary_color = colors.HexColor("#0F172A")
accent_color = colors.HexColor("#EA580C")
text_dark = colors.HexColor("#1E293B")
bg_light = colors.HexColor("#F8FAFC")
border_color = colors.HexColor("#E2E8F0")

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=24,
    leading=28,
    textColor=primary_color,
    spaceAfter=6
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=12,
    leading=16,
    textColor=accent_color,
    spaceAfter=15
)

h1_style = ParagraphStyle(
    'Heading1_Custom',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=15,
    leading=19,
    textColor=primary_color,
    spaceBefore=16,
    spaceAfter=8,
    keepWithNext=True
)

h2_style = ParagraphStyle(
    'Heading2_Custom',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=15,
    textColor=accent_color,
    spaceBefore=12,
    spaceAfter=6,
    keepWithNext=True
)

body_style = ParagraphStyle(
    'Body_Custom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=text_dark,
    spaceAfter=6
)

bullet_style = ParagraphStyle(
    'Bullet_Custom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=text_dark,
    leftIndent=12,
    firstLineIndent=-8,
    spaceAfter=4
)

code_style = ParagraphStyle(
    'Code_Custom',
    parent=styles['Normal'],
    fontName='Courier',
    fontSize=7.5,
    leading=10,
    textColor=colors.HexColor("#0F172A"),
    backColor=colors.HexColor("#F1F5F9"),
    borderColor=colors.HexColor("#CBD5E1"),
    borderWidth=0.5,
    borderPadding=5,
    spaceAfter=6
)

callout_style = ParagraphStyle(
    'Callout_Custom',
    parent=styles['Normal'],
    fontName='Helvetica-Oblique',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor("#475569"),
    backColor=colors.HexColor("#FFF7ED"),
    borderColor=colors.HexColor("#FDBA74"),
    borderWidth=0.5,
    borderPadding=6,
    spaceAfter=6
)

def make_table(data, col_widths=None):
    formatted_data = []
    for row in data:
        formatted_row = []
        for cell in row:
            if isinstance(cell, str):
                formatted_row.append(Paragraph(cell, body_style))
            else:
                formatted_row.append(cell)
        formatted_data.append(formatted_row)
    
    t = Table(formatted_data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    return t

print("Styles initialized successfully.")
