import os
import sys
import reportlab
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable, Preformatted
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Define Canvas for Header/Footer Page Numbering
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages 2+)
        if self._pageNumber > 1:
            self.drawString(36, 756, "StylistAI — Technical Interview Study Guide")
            self.drawRightString(612 - 36, 756, "CONFIDENTIAL / APPLICANT PREPARATION")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 750, 612 - 36, 750)
            
        # Footer (all pages)
        self.setFont("Helvetica", 8)
        self.drawString(36, 25, "StylistAI Project Interview Guide | Groq LLaMA 3.3 70B + Node + Supabase + GCal")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 36, 25, page_text)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 35, 612 - 36, 35)
        self.restoreState()

class CheatSheetCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#EA580C"))
        self.drawString(36, 756, "⚡ StylistAI — 15-MINUTE LAST-MINUTE CHEAT SHEET")
        self.drawRightString(612 - 36, 756, f"Page {self._pageNumber} of {page_count}")
        self.setStrokeColor(colors.HexColor("#FDBA74"))
        self.setLineWidth(1)
        self.line(36, 750, 612 - 36, 750)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 20, "StylistAI Technical Cheat Sheet — Quick Memory Review")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 30, 612 - 36, 30)
        self.restoreState()

print("Canvas helper classes initialized.")
