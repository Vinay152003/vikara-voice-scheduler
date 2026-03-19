import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail) {
    throw new Error(
      "Missing Google Calendar credentials. Check GOOGLE_PRIVATE_KEY and GOOGLE_SERVICE_ACCOUNT_EMAIL env vars."
    );
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
}

export interface CalendarEventInput {
  name: string;
  dateTime: string; // ISO 8601 format e.g. "2026-03-20T14:00:00"
  duration?: number; // in minutes, defaults to 30
  title?: string;
  description?: string;
  timezone?: string;
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  summary?: string;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      throw new Error("Missing GOOGLE_CALENDAR_ID env var.");
    }

    const durationMinutes = input.duration || 30;
    const timezone = input.timezone || "Asia/Kolkata";

    // Keep the raw dateTime as-is (e.g. "2026-03-20T14:00:00") and let
    // Google Calendar interpret it in the specified timezone.
    // This ensures the event appears at the exact time the user requested.
    const startDateTime = input.dateTime.includes("+") || input.dateTime.includes("Z")
      ? input.dateTime
      : input.dateTime; // no offset — Google uses timeZone field

    // Calculate end time by parsing and adding duration
    const startParts = input.dateTime.replace("Z", "").split(/[T+]/);
    const startForCalc = new Date(`${startParts[0]}T${startParts[1] || "00:00:00"}`);
    const endForCalc = new Date(startForCalc.getTime() + durationMinutes * 60 * 1000);
    const endDateTime = `${endForCalc.getFullYear()}-${String(endForCalc.getMonth() + 1).padStart(2, "0")}-${String(endForCalc.getDate()).padStart(2, "0")}T${String(endForCalc.getHours()).padStart(2, "0")}:${String(endForCalc.getMinutes()).padStart(2, "0")}:${String(endForCalc.getSeconds()).padStart(2, "0")}`;

    const summary = input.title || `Meeting with ${input.name}`;
    const description = `Scheduled by Vikara Voice Assistant\n\nAttendee: ${input.name}\nTimezone: ${timezone}`;

    console.log("[Google Calendar] Creating event:", { startDateTime, endDateTime, timezone, summary });

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 10 },
          ],
        },
      },
    });

    console.log("[Google Calendar] Event created:", event.data.id);

    return {
      success: true,
      eventId: event.data.id || undefined,
      eventLink: event.data.htmlLink || undefined,
      summary: event.data.summary || undefined,
      startTime: event.data.start?.dateTime || undefined,
      endTime: event.data.end?.dateTime || undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Google Calendar] Error creating event:", message);
    return {
      success: false,
      error: message,
    };
  }
}
