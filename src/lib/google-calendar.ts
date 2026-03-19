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
    const startDate = new Date(input.dateTime);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    const timezone = input.timezone || "Asia/Kolkata";

    const summary = input.title || `Meeting with ${input.name}`;
    const description = `Scheduled by Vikara Voice Assistant\n\nAttendee: ${input.name}`;

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: endDate.toISOString(),
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
