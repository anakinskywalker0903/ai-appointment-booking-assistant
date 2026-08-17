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

from build_canvas import NumberedCanvas, CheatSheetCanvas
from setup_styles import (
    title_style, subtitle_style, h1_style, h2_style, body_style, bullet_style, code_style, callout_style, make_table
)

print("Starting generation of study guide artifacts...")

# Paths
MD_PATH = r"d:\Dev\numblebiz\StylistAI_Interview_Study_Guide.md"
PDF_STUDY_PATH = r"d:\Dev\numblebiz\StylistAI_Project_Interview_Study_Guide.pdf"
PDF_CHEAT_PATH = r"d:\Dev\numblebiz\StylistAI_15_Minute_Cheat_Sheet.pdf"

# -----------------------------------------------------------------------------
# BUILD STUDY GUIDE PDF
# -----------------------------------------------------------------------------

doc = SimpleDocTemplate(
    PDF_STUDY_PATH,
    pagesize=letter,
    leftMargin=36,
    rightMargin=36,
    topMargin=54,
    bottomMargin=54
)

story = []

# Title Banner
story.append(Paragraph("StylistAI — Project Interview Study Guide", title_style))
story.append(Paragraph("Deep-Dive Technical Preparation Guide Based Strictly on Repository Source Code", subtitle_style))
story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#EA580C"), spaceBefore=0, spaceAfter=12))

# Executive Callout
story.append(Paragraph(
    "<b>IMPORTANT PREPARATION NOTICE:</b> This study guide is built strictly from the actual codebase of <b>StylistAI</b> (repo: <i>ai-appointment-booking-assistant</i>). "
    "Primary Stack: <b>React 19 + Vite</b>, <b>Node.js / Express</b>, <b>Groq SDK (LLaMA 3.3 70B Versatile)</b>, <b>Supabase PostgreSQL</b>, <b>Google Calendar API (OAuth 2.0)</b>, <b>EmailJS</b>, and <b>Web Speech API</b>. "
    "No features, metrics, or APIs have been fabricated.",
    callout_style
))
story.append(Spacer(1, 8))

# -----------------------------------------------------------------------------
# PART 1: PROJECT IN ONE MINUTE
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 1 — PROJECT IN ONE MINUTE", h1_style))
story.append(Paragraph("<b>What did I build?</b> StylistAI — a full-stack, voice-enabled AI appointment booking assistant for hair salons. It features real-time natural language slot availability checking, automated double-booking prevention, 2-way Google Calendar synchronization with client reminders, automated EmailJS confirmations, and an administrative dashboard.", body_style))
story.append(Paragraph("<b>What problem does it solve?</b> Solves double-bookings, manual phone reservation overhead, outside-hours booking friction, and calendar synchronization errors for local service businesses.", body_style))
story.append(Paragraph("<b>Who uses it?</b> Salon customers (customer-facing voice/text chat) and salon administrators/managers (admin dashboard at <code>/admin</code>).", body_style))
story.append(Paragraph("<b>Why a salon scenario?</b> Salons feature multi-resource complexity (stylist skill matching + variable service durations + external calendar blocks + slot collisions), making it an ideal showcase for production-grade agentic AI.", body_style))
story.append(Paragraph("<b>What makes it more than a simple chatbot?</b> Traditional chatbots just return text responses. StylistAI extracts structured JSON intents via Groq LLaMA 3.3 70B, validates schema via Zod, queries live database state (Supabase) + external calendar API (Google Calendar), handles dynamic availability math, executes atomic DB insertions, creates calendar invites with reminders, and dispatches HTML confirmation emails.", body_style))

story.append(Spacer(1, 6))
story.append(Paragraph("Interview Pitch Variations", h2_style))

p_30s = (
    "<b>30-Second Explanation:</b><br/>"
    "\"I built StylistAI, an end-to-end voice and text AI booking assistant for hair salons. It uses Groq-accelerated LLaMA 3.3 70B to parse natural language requests, validates extracted parameters with Zod, and queries both Supabase PostgreSQL and Google Calendar API in real time to calculate live availability. Once a customer confirms, it atomically writes the booking to Supabase, syncs a Google Calendar invite with client reminders, and dispatches an EmailJS confirmation receipt.\""
)
story.append(Paragraph(p_30s, callout_style))

p_60s = (
    "<b>60-Second Explanation:</b><br/>"
    "\"StylistAI is an intelligent appointment booking platform designed to eliminate phone tag and scheduling collisions for salons. On the client side, customers converse using text or native browser voice. The Express backend uses Groq's high-speed LPU inference with LLaMA 3.3 70B to extract structured intents like service, date, time, and preferred stylist. <br/>"
    "Rather than letting the LLM guess availability, the backend enforces strict business rules: it checks stylist skill compatibility, inspects booked slots in Supabase, and checks Google Calendar busy intervals. If requested, it suggests smart alternatives. Upon confirmation, it writes to Supabase, creates a Google Calendar event with 24-hour and 30-minute notifications, and sends an EmailJS receipt. Admins can manage appointments and staff via a dedicated dashboard at <code>/admin</code>.\""
)
story.append(Paragraph(p_60s, callout_style))

p_2m = (
    "<b>2-Minute Explanation:</b><br/>"
    "\"The core motivation behind StylistAI was bridging the gap between natural language interaction and strict business constraints. Chatbots often fail in real-world booking because LLMs hallucinate open slots or offer services that staff cannot perform. StylistAI solves this through strict separation of concerns:<br/>"
    "1. <b>Language Understanding:</b> Groq SDK runs LLaMA 3.3 70B with temperature 0.2 and structured JSON mode to extract intent parameters validated against Zod schemas.<br/>"
    "2. <b>Business Rules & Availability Engine:</b> The Express backend owns all logic. It dynamically maps 30-minute slots between 9 AM and 6 PM, checks stylist capability junction tables, and performs a dual-layer conflict check across Supabase appointments and Google Calendar busy intervals.<br/>"
    "3. <b>Persistence & External Integration:</b> Confirmed bookings are written to Supabase with an employee slot uniqueness constraint (<code>appointments_employee_slot_unique</code>), synced to Google Calendar via OAuth 2.0, and emailed to the customer via EmailJS.<br/>"
    "4. <b>Admin Dashboard:</b> Built in React 19 with a Neumorphic Bento layout, featuring real-time KPIs, interactive appointment controls, Google Calendar OAuth status, and AI model telemetry logs.\""
)
story.append(Paragraph(p_2m, callout_style))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 2: COMPLETE ARCHITECTURE
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 2 — COMPLETE ARCHITECTURE", h1_style))
arch_diagram = (
    "BROWSER / CLIENT (React 19 + Vite + Web Speech API + EmailJS)\n"
    "      │\n"
    "      ▼  POST /api/chat { message, history, pendingBooking }\n"
    "EXPRESS BACKEND (server/src/index.js + chatController.js)\n"
    "      │\n"
    "      ├─► Zod Validation (chatRequestSchema)\n"
    "      ├─► AI Intent Extraction (Groq SDK / groq/compound)\n"
    "      ├─► Business Rules & Availability Engine (availabilityService.js)\n"
    "      │       ├─► Supabase PostgreSQL (DB Bookings & Junction Tables)\n"
    "      │       └─► Google Calendar API (OAuth 2.0 Busy Intervals)\n"
    "      │\n"
    "      ▼  Confirmation Payload Response\n"
    "CLIENT / EMAILJS (Dispatches Client Confirmation Email)"
)
story.append(Preformatted(arch_diagram, code_style))

arch_table_data = [
    ["Component", "File / Location", "Input Received", "Output Returned", "Role & Connection"],
    [
        "Frontend Client",
        "client/src/pages/ChatPage.jsx\nChatWindow.jsx",
        "User text input or SpeechRecognition voice transcript",
        "POST /api/chat payload",
        "Renders chat UI, manages pending booking state, triggers Web Speech TTS and EmailJS on confirmation."
    ],
    [
        "Express Backend Router",
        "server/src/index.js\nserver/src/routes/chat.js",
        "HTTP POST requests",
        "JSON response payloads",
        "Applies CORS, express.json(10kb), routes to controllers, handles global errors via errorHandler middleware."
    ],
    [
        "AI Extraction Engine",
        "server/src/ai/groq.js\nserver/src/ai/prompts.js",
        "userMessage, history, services, employees",
        "{ intent, usage } object validated by Zod",
        "Calls Groq API (groq/compound cascade). Performs natural language intent extraction into JSON schema."
    ],
    [
        "Availability Engine",
        "server/src/services/availabilityService.js",
        "employeeId, serviceId, date, time, durationMin",
        "Available slots array / Boolean availability",
        "Executes dual-layer conflict checks against Supabase appointments AND Google Calendar busy intervals."
    ],
    [
        "Database Layer",
        "server/src/db/supabase.js\nmigration_salon.sql",
        "SQL queries / Supabase JS API calls",
        "Data objects / rows",
        "Persists services, employees, employee_services junction table, and appointments with unique slot index."
    ],
    [
        "Google Calendar Service",
        "server/src/services/calendarService.js\nroutes/calendar.js",
        "OAuth authorization code / booking details",
        "OAuth tokens / GCal Event ID / Busy intervals",
        "Manages OAuth 2.0 token storage, fetches external calendar blocks, creates/deletes calendar events."
    ],
    [
        "Email Service",
        "client/src/services/emailService.js",
        "Confirmed appointment object",
        "EmailJS status (success/error)",
        "Client-side dispatch of branded HTML confirmation emails via @emailjs/browser SDK."
    ],
    [
        "Admin Dashboard",
        "client/src/pages/AdminPage.jsx",
        "Admin Passphrase, UI interactions",
        "Dashboard views, status updates",
        "Provides salon managers with live KPI grid, appointment status controls, GCal sync, staff roster, and AI telemetry."
    ]
]

story.append(make_table(arch_table_data, [85, 115, 110, 110, 120]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 3: FULL REQUEST LIFECYCLE
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 3 — FULL REQUEST LIFECYCLE", h1_style))
story.append(Paragraph("Example Scenario: <i>\"I want a haircut tomorrow around 4 PM with Sarah. My name is Alex Ray, email alex@example.com\"</i>", body_style))

lifecycle_data = [
    ["Step", "File", "Function", "Input -> Output", "Purpose & Execution Detail"],
    [
        "1. Input Capture",
        "client/src/components/chat/ChatInput.jsx",
        "handleSubmit / toggleMic",
        "Voice/Text -> message string",
        "Captures user text or Web Speech SpeechRecognition transcript."
    ],
    [
        "2. Client Dispatch",
        "client/src/pages/ChatPage.jsx",
        "sendMessage",
        "message, history, pendingBooking -> HTTP POST",
        "Sends request payload to Express endpoint /api/chat via Axios (api.js)."
    ],
    [
        "3. Route & Schema",
        "server/src/controllers/chatController.js",
        "handleChat",
        "req.body -> parsed object",
        "Validates payload using Zod chatRequestSchema. Rejects empty messages."
    ],
    [
        "4. Prompt Context",
        "server/src/controllers/chatController.js",
        "supabase.from('services').select()",
        "DB query -> active services & employees",
        "Fetches live service catalog and active employee skills to inject into system prompt."
    ],
    [
        "5. Groq AI Extraction",
        "server/src/ai/groq.js",
        "extractIntent",
        "userMessage, history, dynamic prompt -> raw JSON",
        "Calls Groq LLaMA 3.3 70B with json_object format. Resolves 'tomorrow' to YYYY-MM-DD and '4 PM' to '16:00'."
    ],
    [
        "6. Zod Validation",
        "server/src/ai/groq.js",
        "intentSchema.safeParse",
        "raw JSON -> validated intent object",
        "Validates intent structure. Fallbacks to default values if partial parsing fails."
    ],
    [
        "7. Service Matching",
        "server/src/controllers/chatController.js",
        "services.find()",
        "intent.service ('Haircut') -> matchedService object",
        "Validates service against DB list. Rejects invalid treatments with available list."
    ],
    [
        "8. Date & Day Check",
        "server/src/controllers/chatController.js",
        "isPast / isWeekend",
        "intent.date -> Boolean",
        "Rejects past dates and Sunday requests (salon closed on Sundays)."
    ],
    [
        "9. Stylist Capability",
        "server/src/controllers/chatController.js",
        "employees.find / canPerform check",
        "employeePreference ('Sarah') -> preferredEmployee",
        "Checks if Sarah offers Haircut. (If invalid/incapable, returns list of capable stylists)."
    ],
    [
        "10. Dual Availability",
        "server/src/services/availabilityService.js",
        "isSlotAvailable",
        "Sarah ID, date, '16:00', 45 min -> Boolean",
        "Queries Supabase appointments AND Google Calendar busy intervals for conflicts."
    ],
    [
        "11. Alternatives (If Busy)",
        "server/src/services/availabilityService.js",
        "getAlternativesForEmployee",
        "Sarah ID, date, '16:00' -> alt slots array",
        "If Sarah is busy at 16:00, finds nearest open slots and checks other available stylists."
    ],
    [
        "12. Summary Card",
        "server/src/controllers/chatController.js",
        "handleChat response",
        "All parameters present -> pendingBooking object",
        "Returns formatted summary message with pendingBooking object asking for user confirmation."
    ],
    [
        "13. User Confirmation",
        "client/src/pages/ChatPage.jsx",
        "handleConfirm -> sendMessage",
        "'Yes, please confirm' -> POST /api/chat",
        "User clicks 'Confirm Appointment' or types 'Yes'. Payload includes pendingBooking."
    ],
    [
        "14. Final Race Check",
        "server/src/controllers/chatController.js",
        "confirmBooking -> isSlotAvailable",
        "pendingBooking -> Boolean",
        "Re-verifies slot availability right before database insertion to prevent race conditions."
    ],
    [
        "15. Atomic DB Insert",
        "server/src/controllers/chatController.js",
        "supabase.from('appointments').insert()",
        "pendingBooking -> appointment DB record",
        "Inserts confirmed appointment into Supabase. Enforces appointments_employee_slot_unique index."
    ],
    [
        "16. GCal Event Sync",
        "server/src/services/calendarService.js",
        "createCalendarEvent",
        "booking details -> calendarEventId",
        "Creates Google Calendar event with attendees, description, and 24h/30m reminders."
    ],
    [
        "17. GCal ID Storage",
        "server/src/controllers/chatController.js",
        "supabase.from('appointments').update()",
        "appointment.id, calendarEventId -> updated DB row",
        "Updates Supabase appointment row with calendar_event_id for two-way tracking."
    ],
    [
        "18. Email Receipt",
        "client/src/services/emailService.js",
        "sendBookingEmail",
        "appointment object -> EmailJS dispatch",
        "Client receives response payload with appointment object and dispatches confirmation email."
    ],
    [
        "19. Voice Output",
        "client/src/services/ttsService.js",
        "speakText",
        "data.message -> Web Speech audio",
        "Cleans markdown formatting and speaks assistant reply using Web Speech Synthesis API."
    ]
]

story.append(make_table(lifecycle_data, [60, 115, 100, 110, 155]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 4: AI / LLM IMPLEMENTATION
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 4 — AI / LLM IMPLEMENTATION", h1_style))
story.append(Paragraph("<b>Why Groq?</b> Ultra-low inference latency (~280ms on LPUs vs 1.5–3.0s on standard cloud GPUs). Instant conversational responsiveness is essential for a voice/chat booking experience.", body_style))
story.append(Paragraph("<b>Model Cascade Architecture:</b><br/>"
                       "1. <code>groq/compound</code> (Primary — top-tier reasoning and schema adherence)<br/>"
                       "2. <code>llama-3.1-8b-instant</code> (Fallback 1 — sub-150ms speed)<br/>"
                       "3. <code>gemma2-9b-it</code> (Fallback 2 — Google Gemma 2 9B instruction-tuned)", body_style))

story.append(Paragraph("<b>Prompt Construction (<code>server/src/ai/prompts.js</code>):</b> Dynamically injects current date, current time, today's day of week, calculated relative weekday dates (Next Monday...Next Saturday), available services with durations, and active stylists with their offered services. Forces model to output strict JSON.", body_style))

story.append(Paragraph("<b>Structured Output & Zod Validation:</b> System prompt requires a strict JSON object. Output is validated against Zod <code>intentSchema</code>. Fields extracted: <code>intent</code>, <code>service</code>, <code>date</code>, <code>time</code>, <code>employeePreference</code>, <code>customerName</code>, <code>customerEmail</code>, <code>confirmationResponse</code>, <code>missingFields</code>, <code>message</code>.", body_style))

story.append(Paragraph("<b>Fallback & Error Recovery:</b> Each model in the cascade gets 2 attempts. If a model hits a 429 rate limit, it immediately jumps to the next model in the cascade. Transient 503 errors trigger a 2-second delay and retry.", body_style))

story.append(Paragraph("Core Architectural Separation of Concerns", h2_style))
sep_data = [
    ["Layer", "Technology", "Responsibility", "What It MUST NOT Do"],
    [
        "AI Layer",
        "Groq SDK (LLaMA 3.3 70B)",
        "Natural language understanding, relative date resolution, JSON intent extraction.",
        "MUST NOT check slot availability, MUST NOT invent staff/services, MUST NOT execute bookings."
    ],
    [
        "Backend Engine",
        "Node.js / Express",
        "Enforces business logic, checks stylist skills, dynamic slot math, conflict evaluation.",
        "MUST NOT store state locally (stateless execution)."
    ],
    [
        "Database Store",
        "Supabase PostgreSQL",
        "Stores service directory, employee skills, appointment records, slot uniqueness index.",
        "MUST NOT perform natural language parsing."
    ],
    [
        "External Calendar",
        "Google Calendar API v3",
        "Provides owner's external schedule blocks, creates events with reminders.",
        "MUST NOT act as primary application database."
    ]
]
story.append(make_table(sep_data, [80, 110, 160, 190]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 5: CONVERSATIONAL INTENTS
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 5 — CONVERSATIONAL INTENTS", h1_style))

intent_table = [
    ["Intent Name", "Status", "Example User Input", "Extracted Fields", "Backend Behavior & Response"],
    [
        "BOOK_APPOINTMENT",
        "IMPLEMENTED",
        "\"I want a haircut tomorrow at 4 PM with Sarah.\"",
        "service: 'Haircut', date: 'YYYY-MM-DD', time: '16:00', employeePreference: 'Sarah'",
        "Validates service/stylist capability, checks dual availability, prompts for name/email or presents pending confirmation card."
    ],
    [
        "CHECK_AVAILABILITY",
        "IMPLEMENTED",
        "\"Are there any open slots on Friday?\"",
        "date: 'YYYY-MM-DD', service: null, employeePreference: null",
        "Queries availability across all stylists for requested date. Returns formatted time slots list."
    ],
    [
        "CANCEL_APPOINTMENT",
        "IMPLEMENTED",
        "\"Cancel my booking\" or Admin status change",
        "intent: 'CANCEL_APPOINTMENT' or PATCH /api/appointments/:id { status: 'cancelled' }",
        "Updates Supabase status to 'cancelled', deletes corresponding Google Calendar event if calendar_event_id exists."
    ],
    [
        "GENERAL",
        "IMPLEMENTED",
        "\"What services do you offer?\" / \"Where are you located?\"",
        "intent: 'GENERAL'",
        "Returns warm receptionist conversational reply based on prompt context."
    ],
    [
        "RESCHEDULING",
        "PARTIALLY IMPLEMENTED",
        "\"Move my appointment to 5 PM\"",
        "Extracted as CANCEL + new BOOK",
        "Handled via user cancelling existing booking and creating a new slot reservation."
    ]
]
story.append(make_table(intent_table, [110, 95, 115, 110, 110]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 6: DATABASE / SUPABASE
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 6 — DATABASE / SUPABASE", h1_style))
er_diagram = (
    "  ┌──────────────────────────┐             ┌──────────────────────────┐\n"
    "  │        SERVICES          │             │        EMPLOYEES         │\n"
    "  ├──────────────────────────┤             ├──────────────────────────┤\n"
    "  │ id (UUID PK)             │             │ id (UUID PK)             │\n"
    "  │ name (TEXT UNIQUE)       │             │ name (TEXT UNIQUE)       │\n"
    "  │ duration_minutes (INT)   │             │ role (TEXT)              │\n"
    "  │ description (TEXT)       │             │ bio (TEXT)               │\n"
    "  │ is_active (BOOLEAN)      │             │ is_active (BOOLEAN)      │\n"
    "  └────────────┬─────────────┘             │ calendar_id (TEXT)       │\n"
    "               │                           └────────────┬─────────────┘\n"
    "               │    ┌──────────────────────┐            │\n"
    "               └───►│  EMPLOYEE_SERVICES   │◄───────────┘\n"
    "                    ├──────────────────────┤\n"
    "                    │ employee_id (UUID FK)│\n"
    "                    │ service_id (UUID FK) │\n"
    "                    │ PRIMARY KEY (emp,svc)│\n"
    "                    └──────────────────────┘\n"
    "                               │\n"
    "                               ▼\n"
    "                   ┌──────────────────────────┐\n"
    "                   │       APPOINTMENTS       │\n"
    "                   ├──────────────────────────┤\n"
    "                   │ id (UUID PK)             │\n"
    "                   │ customer_name (TEXT)     │\n"
    "                   │ customer_email (TEXT)    │\n"
    "                   │ service_id (UUID FK)     │\n"
    "                   │ employee_id (UUID FK)    │\n"
    "                   │ appointment_date (DATE)  │\n"
    "                   │ appointment_time (TIME)  │\n"
    "                   │ status (TEXT)            │\n"
    "                   │ calendar_event_id (TEXT) │\n"
    "                   └──────────────────────────┘"
)
story.append(Preformatted(er_diagram, code_style))

story.append(Paragraph("<b>Key Database Features:</b>", body_style))
story.append(Paragraph("• <b>Junction Table (<code>employee_services</code>):</b> Implements many-to-many relationships. Sarah performs Haircut, Coloring, Spa; Emma performs Haircut, Spa, Facial; David performs Haircut, Beard Trim.", bullet_style))
story.append(Paragraph("• <b>Double-Booking Unique Index:</b> <code>CREATE UNIQUE INDEX appointments_employee_slot_unique ON appointments (employee_id, appointment_date, appointment_time) WHERE status != 'cancelled';</code> — Ensures no single stylist can have two active bookings at the exact same time, while allowing different stylists to work simultaneously.", bullet_style))
story.append(Paragraph("• <b>Backend Connection:</b> <code>server/src/db/supabase.js</code> uses <code>@supabase/supabase-js</code> initialized with <code>SUPABASE_SECRET_KEY</code> (server-side only, <code>autoRefreshToken: false</code>).", bullet_style))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 7: GOOGLE CALENDAR
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 7 — GOOGLE CALENDAR", h1_style))
gcal_flow = (
    "User / Admin  ──►  GET /api/calendar/auth  ──►  Google Consent Screen\n"
    "                                                        │\n"
    "tokens/google-tokens.json  ◄── Save Tokens ◄── OAuth Callback (/api/calendar/oauth/callback)\n"
    "           │\n"
    "           ▼\n"
    "CalendarService.js  ──►  google.calendar({ version: 'v3', auth })\n"
    "           │\n"
    "           ├─► getGoogleCalendarBusyIntervals(date) -> filters open slots\n"
    "           ├─► createCalendarEvent(booking) -> returns calendarEventId\n"
    "           └─► deleteCalendarEvent(eventId) -> cleans up on cancellation"
)
story.append(Preformatted(gcal_flow, code_style))

story.append(Paragraph("<b>Why OAuth 2.0 over Service Accounts?</b> Service Accounts require domain-wide delegation or explicitly sharing private Google Calendars with a service account email. OAuth 2.0 allows the salon owner to grant direct access to their primary Google Calendar in 1-click.", body_style))
story.append(Paragraph("<b>Resilience on Failure:</b> If Google Calendar API fails or tokens expire, the system logs a warning (<code>[CalendarService Error]</code>) and proceeds with booking in Supabase. Calendar sync is non-blocking.", body_style))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 8: AVAILABILITY ENGINE
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 8 — AVAILABILITY ENGINE", h1_style))
story.append(Paragraph("The availability engine in <code>server/src/services/availabilityService.js</code> calculates dynamic slot availability:", body_style))
story.append(Paragraph("1. <b>Slot Generation:</b> <code>generateSlots()</code> generates 30-minute time strings from 09:00 to 17:30 (18 total slots for 9 AM – 6 PM business hours).", bullet_style))
story.append(Paragraph("2. <b>Supabase Bookings Fetch:</b> Queries <code>appointments</code> table for <code>employee_id</code> and <code>appointment_date</code> where <code>status != 'cancelled'</code>.", bullet_style))
story.append(Paragraph("3. <b>Google Calendar Busy Intervals Fetch:</b> Calls Google Calendar <code>events.list</code> for the requested day, converting event start/end times into minute offsets from midnight IST.", bullet_style))
story.append(Paragraph("4. <b>Conflict Formula:</b> Slot <code>slotStart</code> (in minutes) and <code>slotEnd = slotStart + durationMinutes</code> is conflicted if: <code>slotStart &lt; interval.endMinutes &amp;&amp; slotEnd &gt; interval.startMinutes</code>.", bullet_style))
story.append(Paragraph("5. <b>No Stylist Preference (\"Anyone is fine\"):</b> <code>findBestAvailable()</code> queries all stylists who can perform the service, finds their open slots, picks the slot closest to user's preferred time, and returns ranked options.", bullet_style))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 9: REAL-WORLD EDGE CASES
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 9 — REAL-WORLD EDGE CASES", h1_style))

edge_cases = [
    ["Scenario", "User Input", "System Action", "Engineering Rationale"],
    [
        "Stylist Unavailable",
        "\"Haircut tomorrow at 4 PM with Sarah\"",
        "Sarah busy at 16:00 -> returns Sarah's alt slots + other available stylists at 16:00",
        "Prevents hard rejection; converts lost booking into alternative option."
    ],
    [
        "Stylist Incompatible",
        "\"Facial with David\"",
        "David doesn't offer Facial -> returns \"David does not offer Facial. You can book with: Emma\"",
        "Checks employee_services junction table before presenting slot choices."
    ],
    [
        "No Preference",
        "\"Haircut at 4 PM. Anyone is fine.\"",
        "Calls findBestAvailable() -> finds best slot across Sarah, Emma, David",
        "Maximizes resource utilization across active staff."
    ],
    [
        "Sunday Request",
        "\"Book haircut for Sunday at 10 AM\"",
        "Rejects request -> \"We're closed on Sundays! Please choose a weekday or Saturday.\"",
        "Enforces salon operating hours before evaluating availability."
    ],
    [
        "Past Date",
        "\"Book haircut for yesterday\"",
        "Rejects request -> \"That date has already passed. Please provide a future date.\"",
        "Validates date parameter using Dayjs isBefore() check."
    ],
    [
        "Duplicate Slot Race",
        "Two users confirm identical slot simultaneously",
        "DB throws 23505 error -> returns \"That slot was just booked by another customer.\"",
        "Enforced by Supabase appointments_employee_slot_unique index."
    ],
    [
        "GCal API Failure",
        "Google API rate limit / token error",
        "Logs warning; proceeds with Supabase booking confirmation",
        "Non-blocking design keeps core booking functional even if GCal is down."
    ]
]
story.append(make_table(edge_cases, [85, 110, 150, 195]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 10 - PART 12: VOICE, EMAIL, ADMIN
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 10 — VOICE IMPLEMENTATION", h1_style))
story.append(Paragraph("Implemented using 100% browser-native <b>Web Speech API</b> (zero external API cost or latency):", body_style))
story.append(Paragraph("• <b>STT (Speech-to-Text):</b> <code>window.SpeechRecognition</code> in <code>ChatInput.jsx</code> listens to microphone input and appends transcripts to input text field.", bullet_style))
story.append(Paragraph("• <b>TTS (Text-to-Speech):</b> <code>window.speechSynthesis</code> in <code>ttsService.js</code>. <code>speakText(text)</code> strips markdown symbols, emojis, and links using regex before rendering natural voice speech.", bullet_style))
story.append(Paragraph("• <b>Decoupling Principle:</b> Voice is purely an input/output layer on the frontend; backend AI and business logic receive clean text strings.", bullet_style))

story.append(Spacer(1, 6))
story.append(Paragraph("PART 11 — EMAILJS INTEGRATION", h1_style))
story.append(Paragraph("Dispatched client-side via <code>@emailjs/browser</code> in <code>client/src/services/emailService.js</code>. Triggered immediately when backend returns a confirmed <code>appointment</code> object. Environment keys: <code>VITE_EMAILJS_SERVICE_ID</code>, <code>VITE_EMAILJS_TEMPLATE_ID</code>, <code>VITE_EMAILJS_PUBLIC_KEY</code>. Sends formatted HTML table with Booking ID, service name, stylist, date, time, and estimated cost.", body_style))

story.append(Spacer(1, 6))
story.append(Paragraph("PART 12 — ADMIN DASHBOARD", h1_style))
story.append(Paragraph("Located at <code>/admin</code> in <code>client/src/pages/AdminPage.jsx</code>. Protected by local session auth gate (<code>AuthGate</code>) checking <code>VITE_ADMIN_PASS</code> ('admin123'). Features 8 module tabs: Overview (KPI grid, timeline, AI feed, health), Appointments (search/filter table with status controls), Calendar (Google OAuth status), Staff (stylist roster), Customers (client directory), AI Bookings (model telemetry logs), Notifications (EmailJS logs), Settings.", body_style))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 13 — FILE-BY-FILE MAP
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 13 — FILE-BY-FILE MAP", h1_style))

file_map = [
    ["File Path", "Primary Responsibility", "Important Functions / Components", "Why It Exists"],
    ["server/src/index.js", "Express app entry point", "express(), app.use(), app.listen()", "Bootstraps server, configures CORS & 10kb body parser, mounts API routes."],
    ["server/src/routes/chat.js", "Chat API endpoint", "chatRoutes.post('/')", "Routes chat messages to chatController.js."],
    ["server/src/controllers/chatController.js", "Core booking orchestration", "handleChat(), confirmBooking()", "Coordinates AI extraction, skill validation, slot math, DB inserts, GCal sync."],
    ["server/src/ai/groq.js", "Groq LLaMA 3.3 70B AI engine", "extractIntent()", "Executes model cascade, parses JSON output, validates with Zod."],
    ["server/src/ai/prompts.js", "Dynamic system prompt builder", "buildSystemPrompt()", "Injects current date/time, active services, and stylists into AI prompt."],
    ["server/src/services/availabilityService.js", "Availability calculation engine", "getAvailableSlotsForEmployee(), findBestAvailable(), isSlotAvailable()", "Executes dual-layer conflict checking across Supabase & Google Calendar."],
    ["server/src/services/calendarService.js", "Google Calendar OAuth 2.0 API", "getCalendarClient(), createCalendarEvent(), getGoogleCalendarBusyIntervals()", "Handles OAuth token storage, busy interval queries, and event creation/deletion."],
    ["server/src/db/supabase.js", "Supabase client setup", "createClient()", "Initializes server-side Supabase client with secret key."],
    ["server/src/db/migration_salon.sql", "PostgreSQL database schema", "CREATE TABLE, CREATE UNIQUE INDEX", "Defines schema, junction tables, and double-booking unique index."],
    ["client/src/pages/ChatPage.jsx", "Main customer chat page", "ChatPage(), sendMessage(), handleReset()", "Manages state, message list, pending booking cards, voice & email triggers."],
    ["client/src/pages/AdminPage.jsx", "Salon admin management portal", "AdminPage(), AuthGate(), updateStatus()", "Multi-tab admin dashboard for appointment controls, staff, and AI logs."],
    ["client/src/services/ttsService.js", "Text-to-Speech audio service", "speakText(), cleanTextForSpeech()", "Renders assistant voice articulation using browser Web Speech API."],
    ["client/src/services/emailService.js", "Confirmation email service", "sendBookingEmail()", "Dispatches customer HTML confirmation email via EmailJS browser SDK."]
]
story.append(make_table(file_map, [110, 110, 150, 170]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 14 — IMPORTANT FUNCTIONS
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 14 — TOP 15 IMPORTANT FUNCTIONS", h1_style))

funcs_data = [
    ["Function Name", "File Location", "Input / Output", "Why An Interviewer Will Ask"],
    ["extractIntent()", "server/src/ai/groq.js", "(userMsg, history, services, employees) -> { intent, usage }", "Heart of AI intent extraction. Demonstrates Groq model cascading and Zod schema validation."],
    ["handleChat()", "server/src/controllers/chatController.js", "(req, res, next) -> JSON response", "Primary API controller. Orchestrates prompt construction, AI intent routing, and slot checking."],
    ["confirmBooking()", "server/src/controllers/chatController.js", "(pendingBooking, res, next) -> JSON response", "Executes atomic booking insertion, pre-check race condition verification, and GCal event creation."],
    ["isSlotAvailable()", "server/src/services/availabilityService.js", "(empId, date, time, durationMin) -> Boolean", "Core availability function. Evaluates conflicts against both Supabase DB and Google Calendar."],
    ["getAvailableSlotsForEmployee()", "server/src/services/availabilityService.js", "(empId, date, durationMin) -> Array of HH:MM", "Filters standard 30-min daily slots against DB bookings, GCal busy blocks, and past times."],
    ["findBestAvailable()", "server/src/services/availabilityService.js", "(svcId, date, prefTime, durationMin) -> Ranked options array", "Powers 'anyone is fine' bookings by querying all capable stylists and ranking open slots."],
    ["getGoogleCalendarBusyIntervals()", "server/src/services/availabilityService.js", "(dateStr) -> Array of { startMinutes, endMinutes }", "Fetches external GCal events and converts start/end ISO timestamps to minute offsets."],
    ["createCalendarEvent()", "server/src/services/calendarService.js", "(booking) -> calendarEventId", "Creates Google Calendar event with attendees, custom summary/description, and 24h/30m reminders."],
    ["buildSystemPrompt()", "server/src/ai/prompts.js", "(services, employees) -> String system prompt", "Prevents AI hallucinations by dynamically injecting live date, time, service list, and staff skills."],
    ["sendBookingEmail()", "client/src/services/emailService.js", "(appointment) -> EmailJS response", "Client-side dispatch of branded HTML email confirmation receipts via EmailJS."],
    ["speakText()", "client/src/services/ttsService.js", "(text) -> Audio articulation", "Cleans markdown syntax & emojis from text before feeding to Web Speech Synthesis API."],
    ["updateAppointmentStatus()", "server/src/controllers/appointmentsController.js", "(req, res, next) -> JSON response", "Admin status controller. Deletes GCal event automatically if status is changed to 'cancelled'."],
    ["exchangeCodeForTokens()", "server/src/services/calendarService.js", "(code) -> tokens object", "OAuth callback handler. Exchanges Google authorization code for access/refresh tokens."],
    ["getAuthUrl()", "server/src/services/calendarService.js", "() -> Google OAuth URL string", "Generates Google OAuth 2.0 consent URL with offline access prompt."],
    ["generateSlots()", "server/src/services/availabilityService.js", "() -> ['09:00', '09:30', ... '17:30']", "Generates base 30-minute business operating slots for 9 AM to 6 PM."]
]
story.append(make_table(funcs_data, [115, 120, 140, 165]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 15 & 16: TECH DECISIONS & COMPARISONS
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 15 & 16 — TECHNOLOGY DECISIONS & COMPARISONS", h1_style))

tech_table = [
    ["Technology", "Why Chosen (Simple Answer)", "Deeper Technical Answer", "Why Not Alternative?"],
    [
        "Groq LLaMA 3.3 70B",
        "Ultra-fast AI inference (~280ms) makes voice/chat natural.",
        "Groq LPU hardware processes 450+ tokens/sec, enabling multi-turn intent extraction without latency lag.",
        "Vs OpenAI/Gemini: Standard LLM APIs suffer 1.5–3.0s latency delays."
    ],
    [
        "Supabase PostgreSQL",
        "Instant relational DB with foreign keys and unique indexes.",
        "Relational model perfect for employee_services junction tables and unique slot constraints.",
        "Vs MongoDB: Document DBs lack declarative multi-field slot uniqueness constraints."
    ],
    [
        "Google Calendar API",
        "Syncs with salon owner's real personal/business schedule.",
        "OAuth 2.0 integration provides two-way sync, busy interval checks, and automated client reminders.",
        "Vs Custom Calendar: Custom DB calendars ignore staff personal conflicts outside the app."
    ],
    [
        "EmailJS",
        "Instant client-side confirmation email dispatch.",
        "Zero backend SMTP configuration required; dispatches pixel-perfect HTML email templates from browser.",
        "Vs SendGrid: Avoids managing server API keys or complex backend mailer setups."
    ],
    [
        "Web Speech API",
        "Free, zero-latency browser speech recognition & synthesis.",
        "Native browser API requires zero external API keys, zero network overhead, and runs 100% locally.",
        "Vs Whisper: Whisper API adds network latency and extra API usage cost."
    ]
]
story.append(make_table(tech_table, [85, 120, 175, 160]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 20: TOP 20 INTERVIEW QUESTIONS & ANSWERS
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 20 — TOP 20 INTERVIEW QUESTIONS & ANSWERS", h1_style))

qa_list = [
    ("Q1: How do you prevent the AI from double-booking a stylist?",
     "<b>Short Answer:</b> The AI never performs bookings or checks availability directly. The Express backend checks Supabase DB and Google Calendar busy intervals. Supabase also enforces a partial unique index (<code>appointments_employee_slot_unique</code>).<br/>"
     "<b>Deeper Answer:</b> Double booking is prevented at two layers. First, <code>isSlotAvailable()</code> checks existing appointments in Supabase and busy intervals in Google Calendar. Second, if two concurrent requests bypass the application check, Supabase enforces a database-level unique constraint on <code>(employee_id, appointment_date, appointment_time) WHERE status != 'cancelled'</code>, causing the second insertion to fail with error code <code>23505</code>.<br/>"
     "<b>Code Location:</b> <code>server/src/services/availabilityService.js:157</code> & <code>server/src/db/migration_salon.sql:60</code>"),
    
    ("Q2: Why use Groq instead of Gemini or OpenAI?",
     "<b>Short Answer:</b> Groq provides ultra-fast LPU inference (~280ms per response), which is essential for a seamless voice and chat experience.<br/>"
     "<b>Deeper Answer:</b> Traditional cloud GPUs take 1.5 to 3.0 seconds to stream response tokens. Groq's Language Processing Units (LPUs) process tokens at ~450 tokens/second. We run <code>groq/compound</code> with a fallback cascade to <code>llama-3.1-8b-instant</code> and <code>gemma2-9b-it</code> for resilience.<br/>"
     "<b>Code Location:</b> <code>server/src/ai/groq.js:48</code>"),

    ("Q3: How do you check availability across both database and Google Calendar?",
     "<b>Short Answer:</b> We run a <code>Promise.all</code> querying Supabase booked slots and Google Calendar busy intervals, merging both conflict sets before returning open times.<br/>"
     "<b>Deeper Answer:</b> <code>getAvailableSlotsForEmployee()</code> fetches booked times from Supabase for that date/stylist and calls <code>getGoogleCalendarBusyIntervals()</code> to get start/end minute intervals. Any 30-minute slot between 9 AM and 6 PM that overlaps with either set is marked unavailable.<br/>"
     "<b>Code Location:</b> <code>server/src/services/availabilityService.js:125</code>"),

    ("Q4: What happens if Google Calendar API goes down?",
     "<b>Short Answer:</b> The system logs a warning and proceeds with booking in Supabase. Google Calendar integration is designed to be non-blocking.<br/>"
     "<b>Deeper Answer:</b> Calendar operations are wrapped in try/catch blocks. If <code>createCalendarEvent()</code> or <code>getGoogleCalendarBusyIntervals()</code> fails due to rate limits or network issues, the backend catches the error, proceeds with Supabase appointment confirmation, and alerts the admin on the dashboard.<br/>"
     "<b>Code Location:</b> <code>server/src/controllers/chatController.js:439</code>"),

    ("Q5: How does the AI extract structured data from user messages?",
     "<b>Short Answer:</b> We instruct Groq to output JSON mode matching a system prompt template, then validate the output using Zod's <code>intentSchema</code>.<br/>"
     "<b>Deeper Answer:</b> <code>buildSystemPrompt()</code> injects active services, stylist names, and calculated relative dates (Today, Tomorrow, Next Monday...). Groq is called with <code>response_format: { type: 'json_object' }</code>. The resulting JSON is parsed and validated via <code>intentSchema.safeParse()</code>.<br/>"
     "<b>Code Location:</b> <code>server/src/ai/groq.js:90</code> & <code>server/src/ai/prompts.js:8</code>"),

    ("Q6: How do you verify if a stylist can perform a requested service?",
     "<b>Short Answer:</b> We query the <code>employee_services</code> junction table to check if the employee ID is mapped to the service ID.<br/>"
     "<b>Deeper Answer:</b> When a user requests a specific stylist (e.g. 'Facial with David'), <code>handleChat()</code> inspects <code>preferredEmployee.services</code>. If David does not offer facials, the system returns a friendly message offering capable stylists (Emma).<br/>"
     "<b>Code Location:</b> <code>server/src/controllers/chatController.js:169</code>"),

    ("Q7: How does the 'anyone is fine' (no stylist preference) logic work?",
     "<b>Short Answer:</b> <code>findBestAvailable()</code> queries all stylists capable of performing the service and ranks open slots nearest to the requested time.<br/>"
     "<b>Deeper Answer:</b> The function retrieves capable employees from <code>employee_services</code>, fetches available slots for each employee, identifies the slot closest to the user's requested time (using minute delta math), and returns ranked options.<br/>"
     "<b>Code Location:</b> <code>server/src/services/availabilityService.js:178</code>"),

    ("Q8: How does Google Calendar OAuth 2.0 work in this project?",
     "<b>Short Answer:</b> The salon owner authenticates via <code>/api/calendar/auth</code>. The authorization code is exchanged for tokens and stored locally in <code>tokens/google-tokens.json</code>.<br/>"
     "<b>Deeper Answer:</b> We use Google's <code>googleapis</code> SDK configured with <code>access_type: 'offline'</code> and <code>prompt: 'consent'</code> to guarantee a refresh token. An <code>auth.on('tokens')</code> listener automatically persists refreshed access tokens to disk.<br/>"
     "<b>Code Location:</b> <code>server/src/services/calendarService.js:68</code> & <code>server/src/routes/calendar.js:31</code>"),

    ("Q9: How are confirmation emails sent to customers?",
     "<b>Short Answer:</b> Client-side via <code>@emailjs/browser</code> in <code>emailService.js</code> immediately after receiving a confirmed appointment object from the backend.<br/>"
     "<b>Deeper Answer:</b> Upon receiving the <code>appointment</code> payload from <code>/api/chat</code>, <code>ChatPage.jsx</code> invokes <code>sendBookingEmail()</code>, which formats the appointment details into an HTML template and dispatches it via EmailJS.<br/>"
     "<b>Code Location:</b> <code>client/src/services/emailService.js:10</code> & <code>client/src/pages/ChatPage.jsx:82</code>"),

    ("Q10: How is voice speech-to-text and text-to-speech implemented?",
     "<b>Short Answer:</b> Using native Web Speech API (<code>SpeechRecognition</code> for voice input and <code>SpeechSynthesis</code> for audio output).<br/>"
     "<b>Deeper Answer:</b> <code>ChatInput.jsx</code> listens via <code>window.SpeechRecognition</code>. <code>ttsService.js</code> uses <code>window.speechSynthesis</code>. <code>cleanTextForSpeech()</code> uses regex to strip markdown formatting, emojis, and links before reading replies.<br/>"
     "<b>Code Location:</b> <code>client/src/components/chat/ChatInput.jsx:14</code> & <code>client/src/services/ttsService.js:45</code>")
]

for q_title, q_body in qa_list:
    story.append(Paragraph(f"<b>{q_title}</b>", h2_style))
    story.append(Paragraph(q_body, body_style))
    story.append(Spacer(1, 4))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 21: SIMULATED 15-MINUTE INTERVIEW
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 21 — THE MOST LIKELY 15-MINUTE INTERVIEW SIMULATION", h1_style))

sim_data = [
    ["Time", "Interviewer Question", "Ideal Candidate Response", "Trap / Mistake To Avoid"],
    [
        "0:00 - 1:30",
        "\"Tell me about your project.\"",
        "Use 60-second pitch: Full-stack AI appointment booking platform for salons using Groq LLaMA 3.3 70B, Node/Express, Supabase, and Google Calendar API.",
        "Don't spend 5 minutes listing generic software engineering tools."
    ],
    [
        "1:30 - 4:00",
        "\"Walk me through the architecture.\"",
        "Explain separation: AI extracts intent -> Express enforces business rules -> Supabase stores state -> Google Calendar syncs external events.",
        "Don't claim the LLM directly queries the database or decides slot availability."
    ],
    [
        "4:00 - 6:30",
        "\"How does the AI parse user intent?\"",
        "Detail Groq SDK with LLaMA 3.3 70B, temperature 0.2, dynamic system prompt injection, JSON mode, and Zod schema validation with fallback models.",
        "Don't forget to mention Zod schema validation and model fallback cascading."
    ],
    [
        "6:30 - 9:00",
        "\"How do you check slot availability?\"",
        "Explain 30-min slot math (9 AM - 6 PM), dual-layer conflict checking (Supabase DB + GCal busy intervals), and 'anyone is fine' ranking via findBestAvailable().",
        "Don't confuse slot availability with service capability (employee_services check)."
    ],
    [
        "9:00 - 11:30",
        "\"How does Google Calendar sync work?\"",
        "Explain OAuth 2.0 flow, offline token storage in tokens/google-tokens.json, busy interval checks, and event creation with 24h/30m client reminders.",
        "Don't claim you used a Service Account if the code actually uses OAuth 2.0."
    ],
    [
        "11:30 - 13:30",
        "\"What happens if two users book the same slot at once?\"",
        "Explain pre-check availability verification + atomic Supabase insert enforced by appointments_employee_slot_unique index (error code 23505).",
        "Don't say 'it will never happen' — explain database unique constraints."
    ],
    [
        "13:30 - 15:00",
        "\"What would you improve for production?\"",
        "Mention multi-tenant salon support, per-employee Google Calendars, Redis slot locking, JWT admin auth, and SMS notifications via Twilio.",
        "Don't say 'the project is 100% production ready' without acknowledging trade-offs."
    ]
]
story.append(make_table(sim_data, [65, 115, 180, 180]))
story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 23: ACTUAL PROJECT LIMITATIONS
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 23 — ACTUAL PROJECT LIMITATIONS & HONEST SHORTS", h1_style))
story.append(Paragraph("<b>Things You Should NOT Pretend Are Implemented:</b>", body_style))
story.append(Paragraph("1. <b>Single Business Instance:</b> Currently hardcoded for 1 salon business (\"SalonAI\"). Multi-tenant salon organization IDs are not in DB schema.", bullet_style))
story.append(Paragraph("2. <b>Single Primary Google Calendar:</b> Calendar sync connects to 1 primary Google Calendar ID (salon owner), rather than 3 separate calendar IDs for Sarah, Emma, and David.", bullet_style))
story.append(Paragraph("3. <b>Local Token & Passphrase Storage:</b> Google OAuth tokens stored in local JSON file (<code>tokens/google-tokens.json</code>) and Admin passphrase checked via local session storage rather than JWT tokens.", bullet_style))
story.append(Paragraph("4. <b>EmailJS Client Trigger:</b> Email confirmations dispatched from frontend browser SDK rather than backend queue worker (e.g. BullMQ / Redis).", bullet_style))
story.append(Paragraph("<b>How To Phrase This In An Interview:</b> <i>\"For our demo MVP, we focused on perfecting intent extraction, dual-layer slot availability, and real-time calendar integration. For a enterprise multi-tenant rollout, we would migrate token storage to AWS Secrets Manager, add organization tenant IDs, and use Redis distributed locks for slot booking.\"</i>", callout_style))

story.append(Spacer(1, 10))

# -----------------------------------------------------------------------------
# PART 25: CODE WALKTHROUGH PATH
# -----------------------------------------------------------------------------
story.append(Paragraph("PART 25 — GUIDED 20-MINUTE CODE WALKTHROUGH PATH", h1_style))
story.append(Paragraph("Follow this exact path when opening the repository during an interview:", body_style))
story.append(Paragraph("1. Open <code>server/src/index.js</code> -> Show Express setup, CORS, and route mounts.", bullet_style))
story.append(Paragraph("2. Open <code>server/src/ai/groq.js</code> -> Point out <code>MODEL_CASCADE</code> array and <code>extractIntent()</code> function with Zod validation.", bullet_style))
story.append(Paragraph("3. Open <code>server/src/ai/prompts.js</code> -> Show dynamic date calculation and prompt injection.", bullet_style))
story.append(Paragraph("4. Open <code>server/src/controllers/chatController.js</code> -> Walk through <code>handleChat()</code> intent switch statement and <code>confirmBooking()</code>.", bullet_style))
story.append(Paragraph("5. Open <code>server/src/services/availabilityService.js</code> -> Highlight <code>getAvailableSlotsForEmployee()</code> and <code>hasCalendarConflict()</code>.", bullet_style))
story.append(Paragraph("6. Open <code>server/src/services/calendarService.js</code> -> Explain OAuth token storage, <code>createCalendarEvent()</code>, and reminders.", bullet_style))
story.append(Paragraph("7. Open <code>server/src/db/migration_salon.sql</code> -> Show <code>employee_services</code> junction table and <code>appointments_employee_slot_unique</code> index.", bullet_style))
story.append(Paragraph("8. Open <code>client/src/pages/ChatPage.jsx</code> & <code>AdminPage.jsx</code> -> Demonstrate frontend Bento UI, voice TTS, EmailJS trigger, and admin portal.", bullet_style))

# Build Document
doc.build(story, canvasmaker=NumberedCanvas)
print("PDF Study Guide built successfully at:", PDF_STUDY_PATH)

# -----------------------------------------------------------------------------
# BUILD 15-MINUTE CHEAT SHEET PDF
# -----------------------------------------------------------------------------

doc_cheat = SimpleDocTemplate(
    PDF_CHEAT_PATH,
    pagesize=letter,
    leftMargin=36,
    rightMargin=36,
    topMargin=54,
    bottomMargin=54
)

story_c = []
story_c.append(Paragraph("StylistAI — 15-Minute Last-Minute Cheat Sheet", title_style))
story_c.append(Paragraph("Quick Memory Refresh for Technical Interview", subtitle_style))
story_c.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#EA580C"), spaceBefore=0, spaceAfter=8))

c_box1 = (
    "<b>ELEVATOR PITCH (30 SECONDS):</b><br/>"
    "\"StylistAI is a voice-enabled AI appointment booking assistant for hair salons. Built with React 19, Node/Express, Groq LLaMA 3.3 70B, Supabase PostgreSQL, and Google Calendar API. It parses natural language booking requests, enforces stylist skill matching, evaluates real-time dual-layer slot availability (Supabase + Google Calendar), creates calendar invites with client reminders, and dispatches EmailJS receipts.\""
)
story_c.append(Paragraph(c_box1, callout_style))
story_c.append(Spacer(1, 6))

story_c.append(Paragraph("CORE ARCHITECTURE & STACK SNAPSHOT", h2_style))
cheat_stack = [
    ["Layer", "Technology", "Key File", "Core Function"],
    ["Frontend", "React 19 + Vite", "client/src/pages/ChatPage.jsx", "Neumorphic Bento UI, state management, Web Speech API voice TTS."],
    ["Backend API", "Node.js / Express", "server/src/index.js", "CORS, Express JSON (10kb), routing, global error handler."],
    ["AI Intent Engine", "Groq SDK (LLaMA 3.3 70B)", "server/src/ai/groq.js", "Sub-300ms inference, JSON mode extraction, Zod validation, 3-tier cascade."],
    ["Availability Engine", "Node.js Custom Engine", "server/src/services/availabilityService.js", "30-min slot math (9AM-6PM), dual-layer conflict checking (Supabase + GCal)."],
    ["Database", "Supabase PostgreSQL", "server/src/db/migration_salon.sql", "Services, employees, employee_services junction table, unique slot index."],
    ["Calendar API", "Google Calendar v3 (OAuth)", "server/src/services/calendarService.js", "OAuth 2.0 token storage, busy intervals, events with 24h & 30m reminders."],
    ["Email Dispatch", "EmailJS Browser SDK", "client/src/services/emailService.js", "Client-side HTML confirmation receipts dispatches upon booking."],
    ["Admin Portal", "React 19 Dashboard", "client/src/pages/AdminPage.jsx", "Passphrase auth gate, live KPI grid, appointment controls, AI telemetry."]
]
story_c.append(make_table(cheat_stack, [75, 110, 155, 200]))
story_c.append(Spacer(1, 8))

story_c.append(Paragraph("TOP 10 INTERVIEW MUST-KNOWS", h2_style))
story_c.append(Paragraph("1. <b>AI vs Backend Split:</b> AI ONLY parses language into JSON; backend ENFORCES availability & business rules.", bullet_style))
story_c.append(Paragraph("2. <b>Why Groq?</b> ~280ms inference latency vs 2-3s on standard cloud GPUs makes conversational chat seamless.", bullet_style))
story_c.append(Paragraph("3. <b>Model Cascade:</b> <code>groq/compound</code> -> <code>llama-3.1-8b-instant</code> -> <code>gemma2-9b-it</code>.", bullet_style))
story_c.append(Paragraph("4. <b>Double-Booking Prevention:</b> Supabase partial index <code>appointments_employee_slot_unique</code> on <code>(employee_id, date, time) WHERE status != 'cancelled'</code>.", bullet_style))
story_c.append(Paragraph("5. <b>Dual Availability Check:</b> Combines Supabase booked slots AND Google Calendar busy intervals in <code>isSlotAvailable()</code>.", bullet_style))
story_c.append(Paragraph("6. <b>Stylist Capability Match:</b> Checked via <code>employee_services</code> junction table before presenting time slots.", bullet_style))
story_c.append(Paragraph("7. <b>No Stylist Preference:</b> <code>findBestAvailable()</code> ranks open slots across all capable stylists near preferred time.", bullet_style))
story_c.append(Paragraph("8. <b>Google OAuth 2.0:</b> Salon owner authenticates via <code>/api/calendar/auth</code>; tokens stored in <code>tokens/google-tokens.json</code>.", bullet_style))
story_c.append(Paragraph("9. <b>Voice Speech:</b> 100% client-side Web Speech API (<code>SpeechRecognition</code> + <code>SpeechSynthesis</code>).", bullet_style))
story_c.append(Paragraph("10. <b>Non-Blocking External Services:</b> GCal or EmailJS failures log warnings but DO NOT block Supabase booking insertion.", bullet_style))
story_c.append(Spacer(1, 8))

story_c.append(Paragraph("TOP 5 TRAP QUESTIONS & INSTANT ANSWERS", h2_style))
story_c.append(Paragraph("• <b>Q: Does the AI check database availability?</b><br/><i>A: No! The AI only extracts intent JSON. Express backend queries Supabase and Google Calendar.</i>", body_style))
story_c.append(Paragraph("• <b>Q: What happens if two users book Sarah at 4 PM at the exact same second?</b><br/><i>A: Pre-check allows both, but Supabase enforces <code>appointments_employee_slot_unique</code>. The second insert fails with error 23505 and prompts user for a new time.</i>", body_style))
story_c.append(Paragraph("• <b>Q: Why use OAuth 2.0 instead of a Service Account?</b><br/><i>A: OAuth 2.0 lets the salon owner connect their real primary Google Calendar in 1 click without complex Google Workspace delegation.</i>", body_style))
story_c.append(Paragraph("• <b>Q: Why Zod if Groq already outputs JSON?</b><br/><i>A: JSON mode ensures valid syntax, but Zod guarantees exact field types and enums required by the backend.</i>", body_style))
story_c.append(Paragraph("• <b>Q: Can Sarah and David both have appointments at 4 PM?</b><br/><i>A: Yes! Uniqueness is per employee slot <code>(employee_id, date, time)</code>, not global slot.</i>", body_style))

doc_cheat.build(story_c, canvasmaker=CheatSheetCanvas)
print("Cheat Sheet PDF built successfully at:", PDF_CHEAT_PATH)

# -----------------------------------------------------------------------------
# BUILD MARKDOWN STUDY GUIDE FILE
# -----------------------------------------------------------------------------

md_content = """# StylistAI — Complete Project Technical Interview Study Guide

> **Repository:** `anakinskywalker0903/ai-appointment-booking-assistant` (Local: `numblebiz`)  
> **Tech Stack:** React 19, Vite, Node.js, Express, Groq SDK (LLaMA 3.3 70B), Supabase PostgreSQL, Google Calendar API (OAuth 2.0), EmailJS, Web Speech API.

---

## PART 1 — PROJECT IN ONE MINUTE

### What did I build?
**StylistAI** — a full-stack, voice-enabled AI appointment booking assistant for hair salons ("SalonAI"). It parses natural language booking requests, validates parameters, evaluates dual-layer real-time availability across Supabase PostgreSQL and Google Calendar API, prevents double bookings, creates calendar events with reminders, sends EmailJS receipts, and provides an admin dashboard.

### What problem does it solve?
Eliminates phone tag, scheduling collisions, outside-hours booking friction, and manual calendar management for local service businesses.

### Who uses it?
1. **Salon Customers:** Interactive text/voice chat assistant for booking, checking availability, and viewing services.
2. **Salon Administrators:** Protected dashboard (`/admin`) for viewing KPIs, managing appointments, monitoring AI telemetry, and checking Google Calendar OAuth sync.

### Why a salon scenario?
Salons feature multi-resource complexity (stylist skill matching + variable service durations + external calendar blocks + slot collisions), making it an ideal showcase for production-grade agentic AI.

### 30-Second Interview Explanation
> "I built StylistAI, an end-to-end voice and text AI booking assistant for hair salons. It uses Groq-accelerated LLaMA 3.3 70B to parse natural language requests, validates extracted parameters with Zod, and queries both Supabase PostgreSQL and Google Calendar API in real time to calculate live availability. Once a customer confirms, it atomically writes the booking to Supabase, syncs a Google Calendar invite with client reminders, and dispatches an EmailJS confirmation receipt."

### 60-Second Interview Explanation
> "StylistAI is an intelligent appointment booking platform designed to eliminate phone tag and scheduling collisions for salons. On the client side, customers converse using text or native browser voice. The Express backend uses Groq's high-speed LPU inference with LLaMA 3.3 70B to extract structured intents like service, date, time, and preferred stylist.  
> Rather than letting the LLM guess availability, the backend enforces strict business rules: it checks stylist skill compatibility, inspects booked slots in Supabase, and checks Google Calendar busy intervals. If requested, it suggests smart alternatives. Upon confirmation, it writes to Supabase, creates a Google Calendar event with 24-hour and 30-minute notifications, and sends an EmailJS receipt. Admins can manage appointments and staff via a dedicated dashboard at `/admin`."

---

## PART 2 — COMPLETE ARCHITECTURE

```
BROWSER / CLIENT (React 19 + Vite + Web Speech API + EmailJS)
      │
      ▼  POST /api/chat { message, history, pendingBooking }
EXPRESS BACKEND (server/src/index.js + chatController.js)
      │
      ├─► Zod Validation (chatRequestSchema)
      ├─► AI Intent Extraction (Groq SDK / groq/compound)
      ├─► Business Rules & Availability Engine (availabilityService.js)
      │       ├─► Supabase PostgreSQL (DB Bookings & Junction Tables)
      │       └─► Google Calendar API (OAuth 2.0 Busy Intervals)
      │
      ▼  Confirmation Payload Response
CLIENT / EMAILJS (Dispatches Client Confirmation Email)
```

| Component | File / Location | Input Received | Output Returned | Role & Connection |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Client** | `client/src/pages/ChatPage.jsx` | User input | POST payload | Renders UI, manages state, triggers Web Speech TTS & EmailJS. |
| **Express Backend** | `server/src/index.js` | HTTP requests | JSON response | Applies CORS, body parsing, mounts routes, handles errors. |
| **AI Intent Engine** | `server/src/ai/groq.js` | Message & context | Validated intent JSON | Calls Groq LLaMA 3.3 70B cascade; parses JSON with Zod. |
| **Availability Engine**| `server/src/services/availabilityService.js` | Date, time, stylist | Open slots / Boolean | Evaluates dual conflict checks (Supabase + Google Calendar). |
| **Database Store** | `server/src/db/supabase.js` | SQL queries | Data rows | Persists services, employees, junction table, and appointments. |
| **Google Calendar** | `server/src/services/calendarService.js` | Auth code / booking | Tokens / Event ID | Manages OAuth, fetches busy intervals, creates/deletes events. |
| **Email Service** | `client/src/services/emailService.js` | Appointment object | Delivery status | Client-side dispatch of HTML receipts via EmailJS. |
| **Admin Dashboard** | `client/src/pages/AdminPage.jsx` | Admin Passphrase | Management UI | Portal for appointment status controls, staff, and AI telemetry. |

---

## PART 3 — FULL REQUEST LIFECYCLE

**Example:** *"I want a haircut tomorrow around 4 PM with Sarah. My name is Alex Ray, email alex@example.com"*

1. **Input Capture:** `ChatInput.jsx` captures text input or Web Speech transcript.
2. **Client Dispatch:** `ChatPage.jsx` sends `POST /api/chat` with `{ message, history, pendingBooking }`.
3. **Route Validation:** `chatController.js` validates payload with Zod `chatRequestSchema`.
4. **Prompt Building:** `prompts.js` fetches active services and staff skills from Supabase and injects dynamic dates into `buildSystemPrompt()`.
5. **Groq Intent Extraction:** `groq.js` calls `groq/compound`. AI extracts: `intent: "BOOK_APPOINTMENT"`, `service: "Haircut"`, `date: "YYYY-MM-DD"`, `time: "16:00"`, `employeePreference: "Sarah"`.
6. **Zod Schema Parse:** `intentSchema.safeParse()` validates fields.
7. **Service & Date Check:** `chatController.js` verifies Haircut exists in DB and date is not past/Sunday.
8. **Stylist Skill Check:** `chatController.js` verifies Sarah can perform Haircut via `employee_services` junction table.
9. **Dual Availability Check:** `availabilityService.js` calls `isSlotAvailable()`:
   - Queries Supabase for existing bookings for Sarah on that date at 16:00.
   - Queries Google Calendar for busy intervals overlapping 16:00-16:45.
10. **Pending Summary Generation:** If slot is free and customer details present, returns `pendingBooking` card with summary.
11. **User Confirmation:** User clicks "Confirm", sending `pendingBooking` back to `/api/chat`.
12. **Race Check & Atomic Insert:** `confirmBooking()` re-verifies slot and inserts into Supabase (`appointments_employee_slot_unique` prevents duplicates).
13. **GCal Event Creation:** `calendarService.js` creates Google Calendar event with 24h & 30m reminders, returning `calendarEventId`.
14. **EmailJS Dispatch:** Client receives confirmed appointment object and sends confirmation email via `@emailjs/browser`.

---

## PART 4 — AI / LLM IMPLEMENTATION

- **Why Groq?** Sub-300ms inference latency (~450 tokens/sec) on LPU hardware vs 1.5–3.0s delays on standard GPUs.
- **Model Cascade:** Primary: `groq/compound` -> Fallback 1: `llama-3.1-8b-instant` -> Fallback 2: `gemma2-9b-it`. (2 attempts per model, skip on 429 rate limit).
- **Core Separation of Concerns:**
  - **AI:** Language understanding & JSON intent extraction ONLY.
  - **Backend:** Enforces business logic, Sunday closures, stylist capability matching, and availability math.
  - **Supabase:** Stores application data and unique slot constraints.
  - **Google Calendar:** Tracks external calendar busy intervals.

---

## PART 6 — DATABASE SCHEMA & DOUBLE BOOKING PREVENTION

### Schema Tables (`server/src/db/migration_salon.sql`):
- `services`: `id` (UUID PK), `name` (TEXT), `duration_minutes` (INT), `description` (TEXT).
- `employees`: `id` (UUID PK), `name` (TEXT UNIQUE), `role` (TEXT), `bio` (TEXT).
- `employee_services`: Junction table mapping `(employee_id, service_id)`.
- `appointments`: `id` (UUID PK), `customer_name`, `customer_email`, `service_id`, `employee_id`, `appointment_date`, `appointment_time`, `status`, `calendar_event_id`.

### Double-Booking Unique Index:
```sql
CREATE UNIQUE INDEX appointments_employee_slot_unique
  ON appointments (employee_id, appointment_date, appointment_time)
  WHERE status != 'cancelled';
```
*Why this matters:* Dropped global slot uniqueness in favor of per-employee uniqueness. Two stylists can work at 4 PM, but Sarah cannot have two simultaneous bookings at 4 PM.

---

## PART 20 — TOP INTERVIEW QUESTIONS & QUICK ANSWERS

1. **How do you prevent double bookings?**  
   *Answer:* Dual-layer checking in `isSlotAvailable()` (Supabase + GCal) plus Supabase DB partial unique index `appointments_employee_slot_unique`.
2. **Why use Groq instead of OpenAI?**  
   *Answer:* Ultra-low latency (~280ms on LPUs vs 2s on OpenAI) enables instant conversational chat and voice.
3. **How does Google Calendar sync work?**  
   *Answer:* Salon owner authenticates via OAuth 2.0 (`/api/calendar/auth`). Tokens stored in `tokens/google-tokens.json`. System reads busy intervals and creates events with 24h & 30m reminders.
4. **What happens if Google Calendar is down?**  
   *Answer:* Graceful fallback: warning is logged, GCal sync skipped, but appointment is safely created in Supabase DB.
5. **How does voice work?**  
   *Answer:* Native browser Web Speech API (`SpeechRecognition` for input, `SpeechSynthesis` for audio output cleaned of markdown by regex).

---
"""

with open(MD_PATH, "w", encoding="utf-8") as f:
    f.write(md_content)

print("Markdown Study Guide generated successfully at:", MD_PATH)
print("All study guide artifacts generated successfully!")
