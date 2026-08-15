# 🎬 StylistAI — Demo Video Voiceover Recording Script

> **Target Duration:** 3:30 – 4:30 minutes *(Max allowed: 5 minutes)*  
> **Recommended Tool:** Loom / OBS / Screen Studio *(1080p Fullscreen, Microphone Enabled)*  
> **Live Demo URL:** [https://ai-appointment-booking-assistant.vercel.app/](https://ai-appointment-booking-assistant.vercel.app/)

---

## 📋 Pre-Recording Checklist

1. Open **[https://ai-appointment-booking-assistant.vercel.app/](https://ai-appointment-booking-assistant.vercel.app/)** in your browser.
2. In a second browser tab, open your **Gmail inbox** (to show the incoming EmailJS confirmation email).
3. In a third tab, open **Google Calendar** (to show the synced calendar event).
4. Make sure your computer sound/microphone is ready and top-nav **VOICE ON** is active if you want Aria to speak.

---

## 🎙️ Word-for-Word Recording Script

---

### ⏱️ [0:00 – 0:45] Part 1: Introduction & The Problem

**[Screen Action]:** Start on the homepage of `https://ai-appointment-booking-assistant.vercel.app/`. Move your cursor around to show the Neo-Brutalist design, orange sparks, and floating header.

> **Voiceover:**  
> *"Hello everyone! Today I'm excited to present **StylistAI** — an AI-powered conversational appointment booking assistant and salon management platform.*  
>  
> *Traditional appointment booking systems are clunky, requiring users to click through multi-step dropdowns and static date pickers that fail to understand natural human language.  
>  
> StylistAI solves this by turning the entire scheduling experience into a seamless, natural conversation. Built with **Groq's ultra-fast LLaMA 3.3 70B model**, **Supabase PostgreSQL**, **Google Calendar OAuth**, and **EmailJS**, it enables instant bookings, live availability collision checks, and automated multi-channel confirmations in seconds."*

---

### ⏱️ [0:45 – 1:45] Part 2: Live AI Booking & Selection Cloud Demo

**[Screen Action]:** In the chat input box, type:  
`"Hi Aria, I'm looking for a Hair Spa next Tuesday at 3:00 PM with Sarah for Rohit (rohitdubey39005@gmail.com)"` *(or use voice)* and press Enter.

**[Screen Action]:** Point your cursor to the **Right-Hand Selection Cloud** as chips float in in real time (`Hair Spa`, `Est. Cost: $65`, `Sarah`, `Tue, Aug 18`, `3:00 PM`, `Rohit`, `Email`).

> **Voiceover:**  
> *"Let's test a natural booking flow. I'll tell Aria: 'I'm looking for a Hair Spa next Tuesday at 3:00 PM with Sarah for Rohit.'*  
>  
> *Notice how fast that responded — in under 300 milliseconds! Groq's LLaMA 3.3 70B model extracted all the parameters: the service, stylist preference, relative date, time, and customer details.*  
>  
> *On the right-hand side, our **Real-Time Selection Cloud** dynamically populated chips with everything Aria understood, including our dynamic **Estimated Cost of $65**.*  
>  
> *In the chat stream, Aria rendered an interactive **Suggested Slot Card** with the duration, estimated price badge, stylist name, and one-click action buttons."*

---

### ⏱️ [1:45 – 2:30] Part 3: One-Click Confirmation & Multi-Channel Sync

**[Screen Action]:** Click the orange **"Confirm"** button on the Suggested Slot Card.

**[Screen Action]:** Show the **Booking Confirmed Badge** (`Booking ID: ...`) appear in the chat.  
**[Screen Action]:** Switch tab to your **Gmail inbox** to show the incoming branded HTML confirmation email.  
**[Screen Action]:** Switch tab to **Google Calendar** to show the event created on your calendar.

> **Voiceover:**  
> *"Now I'll click **Confirm**.*  
>  
> *Immediately, the slot is atomically committed to our Supabase database to prevent double bookings.  
>  
> Aria returns our unique Booking ID, and two automated confirmation workflows trigger instantly:  
> 1. **First, via EmailJS:** The customer receives a beautifully formatted, mobile-responsive confirmation email with their booking breakdown and estimated price.  
> 2. **Second, via Google Calendar OAuth 2.0:** The appointment is synchronized directly to our master salon calendar with automated 24-hour and 30-minute client reminders."*

---

### ⏱️ [2:30 – 3:45] Part 4: Admin Operations Command Center

**[Screen Action]:** Click the **ADMIN** button in the top right header (or navigate to `/admin`). Enter passphrase `admin123` and click Unlock.

**[Screen Action]:** Walk through the sidebar tabs:
1. **Overview:** Point to the KPI cards (Today's Bookings, Upcoming, Confirmed, Active Stylists) and the Live AI Feed.
2. **Appointments:** Click **Appointments** tab. Show the search bar, filter chips (All, Confirmed, Cancelled), and show how clicking **Cancel** or **Confirm** instantly updates status.
3. **Staff:** Click **Staff** tab. Show Sarah, Emma, and David with their specialties and working hours.
4. **AI Bookings:** Click **AI Bookings** tab. Show the Groq LLaMA 3.3 70B telemetry logs (~280ms average latency).
5. **Calendar:** Click **Calendar** tab to show the active Google Calendar OAuth status.

> **Voiceover:**  
> *"Now let's explore the business side. Clicking the **Admin** portal brings us to the Salon Management Command Center.*  
>  
> *Here on the **Overview** dashboard, salon managers get high-level KPI cards, today's schedule timeline, a live AI booking audit feed, and real-time system health metrics.*  
>  
> *Under the **Appointments** tab, managers can search through all historical and upcoming bookings by customer name, stylist, or service, and execute instant status updates.*  
>  
> *Under **Staff**, we can see our stylist roster — Sarah, Emma, and David — their active specialties, and weekly booking loads.*  
>  
> *And under **AI Bookings**, we can inspect our model telemetry, showing our sub-300ms inference speeds and 100% schema accuracy with Groq LLaMA 3.3."*

---

### ⏱️ [3:45 – 4:30] Part 5: Edge Cases, Architecture & Wrap-Up

**[Screen Action]:** Switch back to the home chat. Briefly type: `"Can I book a haircut this Sunday?"` to show Aria handling closed days.

> **Voiceover:**  
> *"StylistAI is built with extensive edge case handling:  
> - It enforces closed Sunday rules and rejects past dates.  
> - It validates stylist capabilities — for instance, if you ask David for Balayage, Aria politely clarifies that Sarah is the colorist.  
> - And it uses a 3-tier model fallback cascade (70B → 8B → Gemma 2) to guarantee 99.99% system uptime.*  
>  
> *In summary, StylistAI transforms appointment booking into a fast, effortless, and delightful conversational experience.*  
>  
> *Thank you so much for watching!"*

---

## 🎯 Recording Tips:
* Speak clearly at a steady, confident pace.
* Keep your mouse movements deliberate and smooth when pointing to features.
* The whole script takes **~4 minutes**, well under the 5-minute requirement! 🚀
