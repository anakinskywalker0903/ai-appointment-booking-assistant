# 🤖 SalonAI — AI-Powered Appointment Booking Assistant

> An intelligent, natural language appointment booking platform powered by **Google Gemini AI**, **Supabase PostgreSQL**, **Google Calendar API**, and a modern **React + Vite** frontend.

---

## 📋 Table of Contents
1. [Part 1: Problem Understanding](#part-1-problem-understanding-no-ai)
2. [Part 2: Spec & Plan](#part-2-spec--plan-ai-assisted)
3. [Part 3: Implementation & AI Insights](#part-3-implementation-ai-assisted)
4. [Part 4: Edge Cases & Robustness](#part-4-edge-cases--robustness)
5. [🚀 Quick Start & Installation](#-quick-start--installation)
6. [🧪 Test Suite Execution](#-test-suite-execution)

---

## Part 1: Problem Understanding (NO AI)

### Abstract (150–250 Words)

Traditional online appointment booking systems often suffer from rigid, friction-heavy multi-step forms where customers must manually search calendars, select services, check employee schedules, and fill redundant inputs. This often leads to high drop-off rates and inefficient administrative overhead for service businesses like hair salons, spas, and clinics.

**SalonAI** solves this problem by introducing a conversational AI receptionist that acts as a natural language interface for appointment scheduling. Customers can simply talk or type naturally—such as asking for *"a haircut tomorrow at 4 PM with Sarah"*—and the assistant parses intent, resolves relative dates (e.g. "tomorrow", "next Tuesday"), validates stylist capability and service durations, checks live real-time availability across both Supabase PostgreSQL and Google Calendar, and guides the customer to confirmation in seconds. 

For business managers and administrators, the system provides an Admin Dashboard offering full visibility into appointments, real-time schedule filtering, stylist management, service duration configuration, and instant Google Calendar integration. By automating the end-to-end booking funnel while guaranteeing zero double-bookings, SalonAI enhances customer satisfaction and eliminates scheduling errors.

---

## Part 2: Spec & Plan (AI-Assisted)

### 1. High-Level System Architecture

```
                               ┌─────────────────────────┐
                               │   React + Vite Frontend  │
                               │   (Chat UI & Admin)     │
                               └───────────┬─────────────┘
                                           │ HTTP / REST
                                           ▼
                               ┌─────────────────────────┐
                               │  Express Node.js Server │
                               └─────┬─────────┬─────────┘
                                     │         │
                   ┌─────────────────┘         └─────────────────┐
                   ▼                                             ▼
     ┌───────────────────────────┐                 ┌───────────────────────────┐
     │  Google Gemini AI Engine  │                 │    Google Calendar API    │
     │  (Structured JSON Output) │                 │ (Calendar Invites & Rem.) │
     └───────────────────────────┘                 └───────────────────────────┘
                   │                                             │
                   └─────────────────┬───────────────────────────┘
                                     ▼
                       ┌───────────────────────────┐
                       │    Supabase PostgreSQL    │
                       │ (Services, Staff, Appts)  │
                       └───────────────────────────┘
```

---

### 2. Feature Breakdown

| Component | Feature | Description |
|---|---|---|
| **Conversational Interface** | Multi-turn Chat Bot | Natural conversational flow asking for missing fields one at a time. |
| | Relative Date Resolution | Resolves "tomorrow", "this Friday", "next Monday" based on server IST time. |
| | Stylist Preference | Respects preferred stylist requests while checking staff service capabilities. |
| | Conflict Prevention | Dual validation against Supabase DB and live Google Calendar busy slots. |
| **Admin Management** | Dashboard Overview | Total appointments, active stylists, active services, upcoming schedules. |
| | Google OAuth Integration | Connect salon Google Calendar for automatic event creation & reminders. |
| | Schedule Filter | Filter bookings by date range, stylist, and status (confirmed, cancelled). |
| **Integrations** | Google Calendar Invites | Automatically creates event with 24h & 30m reminders for client and stylist. |

---

### 3. Prompt Design & Structured Intent Extraction

SalonAI utilizes Google Gemini (`gemini-flash-latest`) with **JSON Schema Enforcement** (`responseMimeType: 'application/json'`). 

#### System Prompt Strategy:
- **Dynamic Context Injection**: Services, active employees, current IST date/time, and calculated weekday references are dynamically injected into the system instruction on every prompt generation so the model never invents services or staff.
- **Strict Extraction Rules**: Forces intent classification (`BOOK_APPOINTMENT`, `CHECK_AVAILABILITY`, `CANCEL_APPOINTMENT`, `GENERAL`), date parsing (`YYYY-MM-DD`), time parsing (`HH:MM` 24h), and stylist preference extraction.

```json
{
  "type": "OBJECT",
  "properties": {
    "intent": { "type": "STRING", "enum": ["BOOK_APPOINTMENT", "CHECK_AVAILABILITY", "CANCEL_APPOINTMENT", "GENERAL"] },
    "service": { "type": "STRING", "nullable": true },
    "date": { "type": "STRING", "nullable": true },
    "time": { "type": "STRING", "nullable": true },
    "employeePreference": { "type": "STRING", "nullable": true },
    "customerName": { "type": "STRING", "nullable": true },
    "customerEmail": { "type": "STRING", "nullable": true },
    "confirmationResponse": { "type": "STRING", "enum": ["YES", "NO"], "nullable": true },
    "missingFields": { "type": "ARRAY", "items": { "type": "STRING" } },
    "message": { "type": "STRING" }
  },
  "required": ["intent", "missingFields", "message"]
}
```

---

### 4. Data Model (Relational Schema)

```sql
-- Services Table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Employees Table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Employee Services Junction (Capabilities)
CREATE TABLE employee_services (
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, service_id)
);

-- Appointments Table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service_id UUID REFERENCES services(id),
  employee_id UUID REFERENCES employees(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed',
  calendar_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 5. Implementation Plan Executed

1. **Database Setup**: Database tables created on Supabase with relational foreign key constraints & RLS policies.
2. **AI Layer**: Gemini API integration with JSON output schema enforcement & exponential backoff for rate limits/503 errors.
3. **Availability Engine**: Combined time-slot generator checking both Supabase DB bookings and Google Calendar busy intervals.
4. **Google Calendar Sync**: OAuth2 flow & Google Calendar API helper with non-blocking error fallback.
5. **Frontend UI**: Responsive glassmorphism React web app featuring a modern Chat interface and Admin Dashboard.

---

## Part 3: Implementation & AI Insights (AI-Assisted)

### AI Model Specification

- **Primary AI Model**: `Google Gemini Flash (gemini-flash-latest / Gemini 2.0)`
- **Reason for Selection**:
  1. **Latency & Speed**: Low sub-second response latency required for real-time interactive chat.
  2. **Native JSON Schema Output**: Guarantees valid structural JSON parsing without markdown wrappers or missing key errors.
  3. **Cost Efficiency**: High token efficiency for free-tier and low-cost production deployment.

### Token Usage Metrics

Typical conversational exchange metrics:
- **Prompt Token Count**: ~850 – 1,100 tokens (includes injected service catalog, staff capabilities, and system rules)
- **Completion Token Count**: ~100 – 160 tokens
- **Average Response Latency**: 600ms – 1.2s

---

## Part 4: Edge Cases & Robustness

| Edge Case | Solution & Handling |
|---|---|
| **Past Date Requested** | AI/Backend detects dates prior to today and prompts: *"That date has already passed. Could you please provide a future date?"* |
| **Closed Day (Sunday)** | Backend checks day of week. If Sunday: *"We're closed on Sundays! Could you choose a weekday or Saturday?"* |
| **Unknown Stylist Name** | Checked against database staff list. If not found, lists available team members. |
| **Stylist Cannot Perform Service** | `employee_services` junction table is checked. If incompatible, offers stylists who *can* perform that treatment. |
| **Slot Double-Booking / Conflict** | Double-checked against both Supabase DB and Google Calendar busy intervals before showing summary. |
| **Race Condition at Confirmation** | Atomic Supabase check performed right before SQL insert. If taken during prompt, informs client to pick another slot. |
| **Google Calendar API Failure** | Non-blocking fallback. Supabase booking completes successfully even if Google API is offline/unreachable. |
| **Gemini API 503 / 429 Spikes** | Exponential backoff retry handler (`2s`, `4s`, `6s`) built directly into `extractIntent()`. |

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js (v18+)
- Supabase Account
- Google Cloud Console Project (with Calendar API enabled)
- Gemini API Key

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Fill in GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
```

---

## 🧪 Test Suite Execution

Run the comprehensive test suites from the `server/` directory:

```bash
# 1. Supabase <-> Google Calendar Integration Test (12-step full verification)
node src/tests/test_integration.js

# 2. Comprehensive Conversational Scenario Test Suite
node src/tests/test_scenarios.js
```

---

### 📝 Submission Summary
- **Abstract**: Completed (Part 1, 194 words)
- **Spec & Plan**: High-level design, features, prompts, data model & plan included (Part 2)
- **Implementation**: Full stack React + Express + Supabase + Google Calendar + Gemini AI (Part 3)
- **Edge Cases**: 8 distinct edge cases handled & verified (Part 4)
