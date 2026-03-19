import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, CalendarEventInput } from "@/lib/google-calendar";

// VAPI sends various message types; we care about "function-call"
interface VapiToolCallMessage {
  message: {
    type: string;
    toolCallList?: Array<{
      id: string;
      type: string;
      function: {
        name: string;
        arguments: Record<string, unknown>;
      };
    }>;
    // Legacy format
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VapiToolCallMessage;
    const messageType = body.message?.type;

    console.log("[VAPI Webhook] Received message type:", messageType);

    // Handle tool-calls (new format)
    if (messageType === "tool-calls" && body.message.toolCallList) {
      const results = [];

      for (const toolCall of body.message.toolCallList) {
        if (toolCall.function.name === "createCalendarEvent") {
          const args = toolCall.function.arguments;
          console.log("[VAPI Webhook] Creating calendar event with args:", JSON.stringify(args));

          const eventInput: CalendarEventInput = {
            name: (args.name as string) || "Guest",
            dateTime: args.dateTime as string,
            duration: (args.duration as number) || 30,
            title: args.title as string | undefined,
            timezone: args.timezone as string | undefined,
          };

          const result = await createCalendarEvent(eventInput);

          results.push({
            toolCallId: toolCall.id,
            result: result.success
              ? `Event created successfully! Title: "${result.summary}". Scheduled from ${result.startTime} to ${result.endTime}.`
              : `Failed to create event: ${result.error}`,
          });
        }
      }

      return NextResponse.json({ results });
    }

    // Handle function-call (legacy format)
    if (messageType === "function-call" && body.message.functionCall) {
      const { name, parameters } = body.message.functionCall;

      if (name === "createCalendarEvent") {
        console.log("[VAPI Webhook] Creating calendar event with params:", JSON.stringify(parameters));

        const eventInput: CalendarEventInput = {
          name: (parameters.name as string) || "Guest",
          dateTime: parameters.dateTime as string,
          duration: (parameters.duration as number) || 30,
          title: parameters.title as string | undefined,
          timezone: parameters.timezone as string | undefined,
        };

        const result = await createCalendarEvent(eventInput);

        return NextResponse.json({
          result: result.success
            ? `Event created successfully! Title: "${result.summary}". Scheduled from ${result.startTime} to ${result.endTime}. Calendar link: ${result.eventLink}`
            : `Failed to create event: ${result.error}`,
        });
      }
    }

    // Handle other message types (status-update, transcript, etc.)
    if (messageType === "status-update") {
      console.log("[VAPI Webhook] Status update:", JSON.stringify(body.message));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[VAPI Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Vikara Voice Scheduler - VAPI Webhook",
    timestamp: new Date().toISOString(),
  });
}
