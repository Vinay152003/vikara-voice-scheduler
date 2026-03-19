/**
 * Script to create/update the VAPI assistant for Vikara Voice Scheduler.
 *
 * Run: npx ts-node --esm scripts/create-vapi-assistant.ts
 * Or:  npx tsx scripts/create-vapi-assistant.ts
 *
 * Requires:
 *   VAPI_PRIVATE_KEY - your VAPI secret/private API key
 *   NEXT_PUBLIC_APP_URL - the deployed URL of your app (for webhook)
 */

const VAPI_API_URL = "https://api.vapi.ai";

const SYSTEM_PROMPT = `You are a friendly and professional scheduling assistant for Vikara.ai. Your job is to help callers schedule meetings by collecting their information through natural conversation.

## Your Conversation Flow:

1. **Greet & Ask Name**: Start by warmly greeting the caller and asking for their name.
   - Example: "Hello! Welcome to Vikara's scheduling assistant. I'd love to help you book a meeting. May I have your name, please?"

2. **Ask Date & Time**: Once you have their name, ask for their preferred date and time.
   - Be helpful with relative dates like "tomorrow", "next Monday", "this Friday at 3pm"
   - If they give a vague time, ask for clarification
   - Assume the current year is 2026 if not specified

3. **Ask for Timezone**: ALWAYS ask for the caller's timezone. This is mandatory — never skip this step.
   - Example: "What timezone are you in?" or "Which timezone should I use for this meeting?"
   - Common examples: Asia/Kolkata (IST), America/New_York (EST), America/Los_Angeles (PST), Europe/London (GMT), Asia/Dubai (GST), Asia/Tokyo (JST), Australia/Sydney (AEST)
   - If they say a city name or abbreviation like "IST" or "New York time", convert it to IANA timezone format

4. **Ask for Meeting Title** (optional): Ask if they'd like to give the meeting a specific title.
   - Example: "Would you like to give this meeting a title, or shall I just name it 'Meeting with [name]'?"
   - If they decline, use "Meeting with [name]" as default

5. **Confirm Details**: Before creating the event, clearly confirm ALL details including timezone:
   - Name
   - Date and time
   - Timezone (must be explicitly confirmed)
   - Meeting title
   - Duration (default 30 minutes unless specified)

6. **Create Event**: Once confirmed, call the createCalendarEvent function. ALWAYS pass the timezone parameter.

7. **Confirm Creation & End Call**: After the event is created:
   - First, FULLY confirm ALL details to the caller (date, time, timezone, title, duration)
   - Then say a warm goodbye like "Thank you for scheduling with Vikara! Have a wonderful day. Goodbye!"
   - ONLY AFTER you have completely finished speaking your confirmation and goodbye, call the endCall function
   - NEVER call endCall while you are still speaking or before your confirmation is complete

## Important Rules:
- Always be polite, professional, and conversational
- Keep responses concise — this is a voice conversation, not text
- ALWAYS ask for timezone — never assume or skip this step
- If the user provides all details at once, acknowledge them but still confirm timezone if not mentioned
- Parse dates intelligently. Today's date context will be provided by the system
- For the dateTime parameter, always use ISO 8601 format WITHOUT timezone offset: "YYYY-MM-DDTHH:MM:SS" (e.g. "2026-03-20T14:00:00"). The timezone is passed separately.
- If the caller doesn't specify AM/PM, ask for clarification
- When calling createCalendarEvent, ALWAYS include the timezone parameter in IANA format
- If the caller wants to cancel or start over, be accommodating
- Do NOT say anything about a calendar link being generated
- After confirming the event creation, say goodbye and THEN call the endCall function to hang up
- NEVER end the call abruptly — always finish your full sentence before ending`;

interface AssistantConfig {
  name: string;
  firstMessage: string;
  model: {
    provider: string;
    model: string;
    systemPrompt: string;
    temperature: number;
    tools: Array<{
      type: string;
      function: {
        name: string;
        description: string;
        parameters: {
          type: string;
          properties: Record<string, unknown>;
          required: string[];
        };
      };
      server?: {
        url: string;
      };
      async?: boolean;
    }>;
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  serverUrl?: string;
  endCallMessage: string;
  transcriber: {
    provider: string;
    model: string;
    language: string;
  };
  endCallFunctionEnabled: boolean;
  silenceTimeoutSeconds: number;
  maxDurationSeconds: number;
  backgroundSound: string;
  backchannelingEnabled: boolean;
}

async function createAssistant() {
  const apiKey = process.env.VAPI_PRIVATE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!apiKey) {
    console.error("Error: VAPI_PRIVATE_KEY environment variable is required.");
    console.error("Set it in your .env.local file or pass it directly.");
    process.exit(1);
  }

  const webhookUrl = `${appUrl}/api/vapi/webhook`;

  const assistantConfig: AssistantConfig = {
    name: "Vikara Scheduling Assistant",
    firstMessage:
      "Hello! Welcome to Vikara's scheduling assistant. I'd love to help you book a meeting. May I have your name, please?",
    model: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.7,
      tools: [
        {
          type: "function",
          function: {
            name: "createCalendarEvent",
            description:
              "Creates a calendar event with the provided details. Call this after the user confirms the meeting details. ALWAYS include the timezone parameter.",
            parameters: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The name of the person scheduling the meeting",
                },
                dateTime: {
                  type: "string",
                  description:
                    'The date and time in ISO 8601 format WITHOUT timezone offset, e.g. "2026-03-20T14:00:00". The timezone is specified separately.',
                },
                duration: {
                  type: "number",
                  description:
                    "Duration of the meeting in minutes. Defaults to 30 if not specified.",
                },
                title: {
                  type: "string",
                  description:
                    'Optional title for the meeting. Defaults to "Meeting with [name]" if not provided.',
                },
                timezone: {
                  type: "string",
                  description:
                    'REQUIRED. The IANA timezone for the meeting, e.g. "Asia/Kolkata", "America/New_York", "Europe/London". Always ask the user for this.',
                },
              },
              required: ["name", "dateTime", "timezone"],
            },
          },
          server: {
            url: webhookUrl,
          },
          async: false,
        },
      ],
    },
    voice: {
      provider: "11labs",
      voiceId: "sarah",
    },
    serverUrl: webhookUrl,
    endCallFunctionEnabled: true,
    endCallMessage:
      "Thank you for scheduling with Vikara! Have a wonderful day. Goodbye!",
    transcriber: {
      provider: "deepgram",
      model: "nova-3",
      language: "en",
    },
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 300,
    backgroundSound: "office",
    backchannelingEnabled: true,
  };

  console.log("Creating VAPI assistant...");
  console.log("Webhook URL:", webhookUrl);

  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(assistantConfig),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`VAPI API Error (${response.status}):`, errorBody);
      process.exit(1);
    }

    const assistant = await response.json();
    console.log("\n✅ Assistant created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  ID:   ${assistant.id}`);
    console.log(`  Name: ${assistant.name}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(
      "\n📋 Add this to your .env.local file:"
    );
    console.log(`  NEXT_PUBLIC_VAPI_ASSISTANT_ID=${assistant.id}`);
    console.log(
      "\nThen restart your Next.js dev server for the changes to take effect."
    );

    return assistant;
  } catch (error) {
    console.error("Failed to create assistant:", error);
    process.exit(1);
  }
}

createAssistant();
