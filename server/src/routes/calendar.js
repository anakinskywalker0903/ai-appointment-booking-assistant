import { Router } from 'express';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  isConnected,
  verifyCalendarAccess,
  getAvailability,
} from '../services/calendarService.js';

export const calendarRoutes = Router();

/**
 * GET /api/calendar/auth
 * Generates the Google OAuth authorization URL and redirects the browser to Google.
 */
calendarRoutes.get('/auth', (req, res) => {
  try {
    const url = getAuthUrl();
    res.redirect(url);
  } catch (err) {
    console.error('[Calendar Auth Error]:', err.message);
    res.status(500).json({ error: 'Failed to initiate Google OAuth.', details: err.message });
  }
});

/**
 * GET /api/calendar/oauth/callback
 * Receives the authorization code, exchanges it for tokens, stores refresh token locally,
 * and verifies access by fetching the configured calendar.
 */
calendarRoutes.get('/oauth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[Google OAuth Error]:', error);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Calendar Authorization Failed</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#0f1117;color:#f0f0f5;text-align:center;">
          <h2 style="color:#ef4444;">❌ Google Calendar Authorization Denied</h2>
          <p>${error}</p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin" style="color:#6c63ff;">Return to Dashboard</a>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Missing Authorization Code</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#0f1117;color:#f0f0f5;text-align:center;">
          <h2 style="color:#ef4444;">❌ Missing Authorization Code</h2>
          <p>No authorization code received from Google.</p>
        </body>
      </html>
    `);
  }

  try {
    // 1. Exchange code for tokens & store locally
    await exchangeCodeForTokens(code);

    // 2. Verify access by fetching calendar metadata
    const calInfo = await verifyCalendarAccess();

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Calendar Connected</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#0f1117;color:#f0f0f5;text-align:center;">
          <div style="max-width:500px;margin:0 auto;background:#1a1d27;padding:32px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <h2 style="color:#22c55e;margin-bottom:12px;">✅ Google Calendar Connected Successfully!</h2>
            <p style="color:#9ca3af;font-size:0.95rem;margin-bottom:20px;">
              Authenticated Calendar: <strong style="color:#f0f0f5;">${calInfo.summary || calInfo.id}</strong><br/>
              Timezone: <span style="color:#6c63ff;">${calInfo.timeZone || 'Default'}</span>
            </p>
            <p style="font-size:0.85rem;color:#6b7280;">Tokens have been stored locally for the backend.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/admin"
               style="display:inline-block;margin-top:16px;background:#6c63ff;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">
              Return to Admin Dashboard →
            </a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[Token Exchange / Verification Error]:', err.message);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Connection Error</title></head>
        <body style="font-family:system-ui,sans-serif;padding:40px;background:#0f1117;color:#f0f0f5;text-align:center;">
          <h2 style="color:#ef4444;">❌ Failed to Connect Google Calendar</h2>
          <p style="color:#9ca3af;">${err.message}</p>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/calendar/status
 * Returns connection status and verified calendar metadata.
 */
calendarRoutes.get('/status', async (req, res) => {
  try {
    const connected = isConnected();
    if (!connected) {
      return res.json({ connected: false });
    }

    const calInfo = await verifyCalendarAccess();
    res.json({ connected: true, calendar: calInfo });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

/**
 * GET /api/calendar/verify-availability?date=YYYY-MM-DD
 * Verifies that the backend can read events from the calendar.
 */
calendarRoutes.get('/verify-availability', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await getAvailability(date);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
