# 🧠 StylistAI — How It Works (Deep-Dive System Architecture)

This document provides a comprehensive technical walkthrough of how **StylistAI** orchestrates conversational intent extraction, real-time slot availability checking, Google Calendar synchronization, multi-channel confirmation dispatch, and admin dashboard operations.

---

## 🏗️ 1. End-to-End Request Lifecycle

```
[User Input (Text / Voice)]
         │
         ▼
[Vite React Client] ─── (Attaches conversation history & pending state) ───► [Express Backend API]
                                                                                   │
                                                                                   ▼
                                                                     [Zod Schema Request Validation]
                                                                                   │
                                                                                   ▼
                                                                     [Fetch Services & Stylists from Supabase]
                                                                                   │
                                                                                   ▼
                                                                     [Groq LLaMA 3.3 70B Cascading Router]
                                                                                   │
                                                                                   ▼
                                                                     [Strict JSON Output Extraction]
                                                                                   │
                                                   ┌───────────────────────────────┴───────────────────────────────┐
                                                   ▼                                                               ▼
                                       [Intent: CHECK_AVAILABILITY]                                   [Intent: BOOK_APPOINTMENT]
                                                   │                                                               │
                                                   ▼                                                               ▼
                                    [Query Supabase + Google Cal]                                   [Validate Service & Stylist Skills]
                                                   │                                                               │
                                                   ▼                                                               ▼
                                    [Return Available Slot Matrix]                                  [Collision Check & Create Pending Card]
                                                                                                                   │
                                                                                                                   ▼
                                                                                                    [User Confirms Interactive Card]
                                                                                                                   │
                                                                                                                   ▼
                                                                                                    [Atomic Insert into Supabase DB]
                                                                                                                   │
                                                                                                                   ▼
                                                                                                    [Google Calendar OAuth 2.0 Event]
                                                                                                                   │
                                                                                                                   ▼
                                                                                                    [EmailJS Client Email Dispatch]
```

---

## ⚡ 2. Groq AI Engine & Multi-Model Cascade

Located in [`server/src/ai/groq.js`](./server/src/ai/groq.js), the AI extraction engine utilizes Groq's high-speed inference LPU hardware with a 3-tier fallback cascade:

```javascript
const MODEL_CASCADE = [
  'llama-3.3-70b-versatile', // Primary: 70B parameters, ultra-high reasoning (~280ms)
  'llama-3.1-8b-instant',    // Fallback 1: 8B parameters, sub-150ms speed
  'gemma2-9b-it',            // Fallback 2: Google Gemma 2 9B instruction-tuned
];
```

### Why This Architecture?
1. **Sub-300ms Latency:** Traditional LLM APIs take 1.5–3.0s, creating unnatural pauses in chat. Groq LLaMA 3.3 70B processes tokens at ~450 tokens/second, making the conversational assistant feel instantaneous.
2. **Strict Zod Schema Enforcement:** Output is validated against `intentSchema` before entering the application pipeline, completely eliminating hallucinated formats.
3. **Resilience:** If the primary 70B model encounters rate limits, the system instantly catches the error and retries with the 8B instant model in <100ms.

---

## 📅 3. Real-Time Slot Collision & Availability Engine

Located in [`server/src/services/availabilityService.js`](./server/src/services/availabilityService.js):

1. **Working Hours Granularity:** Business hours (09:00 AM – 06:00 PM) are sliced into dynamic 30-minute intervals.
2. **Dual-Layer Checking:**
   - **Layer 1 (Database):** Queries all confirmed appointments in Supabase for the requested date and stylist.
   - **Layer 2 (Google Calendar):** If the salon owner has authorized Google Calendar, queries Google Calendar's `events.list` for external conflicts (e.g. personal events, salon maintenance).
3. **Collision Detection:** Any slot overlapping with existing appointments or external calendar blocks is marked `BUSY`.
4. **Smart Alternatives:** When a requested time is taken, the engine scans nearest open slots (+/- 30m, 60m) and returns the 3 best alternatives.

---

## 🔐 4. Two-Way Google Calendar Integration

Located in [`server/src/services/calendarService.js`](./server/src/services/calendarService.js):

* **OAuth 2.0 Security:** Uses standard Google OAuth authorization flow with offline access tokens.
* **Token Storage:** Refresh tokens are securely maintained in server environment / local encrypted token stores (never pushed to git).
* **Automatic Calendar Invites:** Upon booking confirmation, creates an event with:
  - **Summary:** `StylistAI: {ServiceName} for {CustomerName}`
  - **Description:** Includes service duration, assigned stylist name, and Booking ID.
  - **Reminders:** Configures popup and email reminders at **24 hours** and **30 minutes** prior to the appointment.

---

## ✉️ 5. Automated Email Confirmation Pipeline

Located in [`client/src/services/emailService.js`](./client/src/services/emailService.js):

* **Client-Side Trigger:** Directly upon receiving the server's confirmed appointment payload, the client invokes `@emailjs/browser`.
* **Universal Email HTML Table:** Built using standard HTML table structures so formatting (brand headers, Booking ID, estimated price, date, time) renders with 100% pixel fidelity across Gmail, Outlook, and mobile email apps.
* **Non-Blocking Resilience:** If email dispatch encounters network issues on the user's side, the appointment remains safely confirmed in the database with clear on-screen confirmation.

---

## 📊 6. Admin Management Architecture

Located in [`client/src/pages/AdminPage.jsx`](./client/src/pages/AdminPage.jsx):

* **Local Session Auth Gate:** Protects admin routes with a configurable passphrase (`VITE_ADMIN_PASS`).
* **Interactive Module Tabs:**
  1. **Overview:** Real-time KPI matrix, Today's Timeline, Live AI Feed, and Health metrics.
  2. **Appointments:** Searchable and filterable data table with instant status actions (`Confirm`, `Cancel`).
  3. **Calendar:** Live OAuth status verification and synchronization hub.
  4. **Staff:** Stylist directory detailing active specialties, schedules, and assigned booking counts.
  5. **Customers:** Automatically derived customer directory with contact history and lifetime visits.
  6. **AI Bookings:** Telemetry logs showing latency metrics and intent classification logs.
  7. **Notifications:** EmailJS delivery logs and webhook status.
  8. **Settings:** Salon operating parameters, timezones (`Asia/Kolkata`), and security controls.
