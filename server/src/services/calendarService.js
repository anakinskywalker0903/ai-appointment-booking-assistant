import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, '../../tokens/google-tokens.json');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/oauth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from environment variables.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Load stored tokens from disk.
 * Returns null if not yet authorized.
 */
function loadTokens() {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return null;
    const raw = fs.readFileSync(TOKEN_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save tokens to local storage (gitignored).
 * Does not log any token values.
 */
function saveTokens(tokens) {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

/**
 * Get an authenticated Google Calendar client using stored refresh token.
 * Returns null if not connected.
 */
export function getCalendarClient() {
  const tokens = loadTokens();
  if (!tokens?.refresh_token && !tokens?.access_token) return null;

  const auth = getOAuthClient();
  auth.setCredentials(tokens);

  // Automatically update stored tokens when refreshed
  auth.on('tokens', (newTokens) => {
    const current = loadTokens() || {};
    saveTokens({ ...current, ...newTokens });
  });

  return google.calendar({ version: 'v3', auth });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate Google OAuth authorization URL.
 */
export function getAuthUrl() {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Ensures refresh token is provided
  });
}

/**
 * Exchange authorization code for tokens and save them.
 */
export async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  saveTokens(tokens);
  return { success: true };
}

/**
 * Check if calendar is connected (tokens exist).
 */
export function isConnected() {
  const tokens = loadTokens();
  return !!(tokens?.refresh_token || tokens?.access_token);
}

/**
 * Verify access by fetching the configured calendar information.
 */
export async function verifyCalendarAccess() {
  const calendar = getCalendarClient();
  if (!calendar) {
    throw new Error('Google Calendar is not authenticated yet.');
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const res = await calendar.calendars.get({ calendarId });
  return {
    id: res.data.id,
    summary: res.data.summary,
    timeZone: res.data.timeZone,
  };
}

/**
 * Verify availability by listing events for a given day on the primary calendar.
 */
export async function getAvailability(dateStr) {
  const calendar = getCalendarClient();
  if (!calendar) return { connected: false, events: [] };

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const timeMin = new Date(`${dateStr}T00:00:00Z`).toISOString();
  const timeMax = new Date(`${dateStr}T23:59:59Z`).toISOString();

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return {
    connected: true,
    events: (res.data.items || []).map(item => ({
      id: item.id,
      summary: item.summary,
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date,
    })),
  };
}

/**
 * Create a calendar event.
 */
export async function createCalendarEvent(booking) {
  const calendar = getCalendarClient();
  if (!calendar) {
    console.warn('[CalendarService] Calendar client not authenticated.');
    return null;
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const startDt = `${booking.date}T${booking.time}:00`;
  const [hh, mm] = booking.time.split(':').map(Number);
  const totalMin = hh * 60 + mm + (booking.durationMin || 45);
  const endHH = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const endMM = String(totalMin % 60).padStart(2, '0');
  const endDt = `${booking.date}T${endHH}:${endMM}:00`;

  try {
    const res = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${booking.serviceName} — ${booking.customerName}`,
        description: `Stylist: ${booking.employeeName || 'Assigned Stylist'}\nService: ${booking.serviceName}\nCustomer: ${booking.customerName} (${booking.customerEmail})`,
        start: { dateTime: startDt, timeZone: 'Asia/Kolkata' },
        end: { dateTime: endDt, timeZone: 'Asia/Kolkata' },
        attendees: booking.customerEmail ? [{ email: booking.customerEmail, displayName: booking.customerName }] : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    });
    return res.data.id;
  } catch (err) {
    console.error('[CalendarService Error]:', err.message);
    return null;
  }
}

export const createEvent = createCalendarEvent;

/**
 * Delete a calendar event.
 */
export async function deleteCalendarEvent(eventId) {
  const calendar = getCalendarClient();
  if (!calendar || !eventId) return false;

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  try {
    await calendar.events.delete({ calendarId, eventId });
    return true;
  } catch (err) {
    console.error('[CalendarService Delete Error]:', err.message);
    return false;
  }
}

export const deleteEvent = deleteCalendarEvent;
