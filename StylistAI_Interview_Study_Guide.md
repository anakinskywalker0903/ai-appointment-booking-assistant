# StylistAI — Complete Project Technical Interview Study Guide

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
