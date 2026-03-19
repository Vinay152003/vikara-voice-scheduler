# Vikara Voice Scheduler

A production-grade, real-time voice assistant that schedules meetings and creates Google Calendar events through natural conversation. Built for [Vikara.ai](https://vikara.ai).

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![VAPI](https://img.shields.io/badge/VAPI-Voice_AI-purple)
![Claude](https://img.shields.io/badge/Claude-Anthropic-orange)

## Live Demo

**Deployed URL:** [https://vikara-voice-scheduler.vercel.app](https://vikara-voice-scheduler.vercel.app)

**Calender Link** [https://calendar.google.com/calendar/u/1?cid=NTdiODYxMzZiOGYxYTcxMTAyNGYxMDQwOGFlMjZkYWJkYjcwN2RjZTZkOTJiOTE0M2U2NWQ1MDI0MjhjMDRmYUBncm91cC5jYWxlbmRhci5nb29nbGUuY29t]

### How to Test

1. Open the deployed URL in a browser (Chrome recommended)
2. Allow microphone access when prompted
3. Click **"Start Conversation"**
4. The assistant will greet you and ask for your:
   - **Name**
   - **Preferred date & time**
   - **Meeting title** (optional)
5. Confirm the details when the assistant reads them back
6. A real Google Calendar event is created instantly
7. You'll see the live transcript on-screen throughout

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User's Browser                     │
│  ┌───────────────────────────────────────────────┐  │
│  │         Next.js Frontend (React)               │  │
│  │  ┌─────────────┐  ┌───────────────────────┐   │  │
│  │  │ VAPI Web SDK │  │  Live Transcript UI   │   │  │
│  │  │  (WebRTC)    │  │  (Chat Bubbles)       │   │  │
│  │  └──────┬───────┘  └───────────────────────┘   │  │
│  └─────────┼─────────────────────────────────────┘  │
└────────────┼────────────────────────────────────────┘
             │ WebRTC Audio
             ▼
┌─────────────────────────────┐
│        VAPI Platform         │
│  ┌─────────┐ ┌───────────┐  │
│  │Deepgram  │ │ElevenLabs │  │
│  │STT       │ │TTS        │  │
│  │(Nova 3)  │ │(Sarah)    │  │
│  └────┬─────┘ └─────▲─────┘  │
│       │              │        │
│  ┌────▼──────────────┴─────┐  │
│  │   Claude (Anthropic)     │  │
│  │   LLM Orchestration      │  │
│  └────────────┬─────────────┘  │
└───────────────┼────────────────┘
                │ Tool Call (HTTP POST)
                ▼
┌─────────────────────────────────┐
│  Next.js API Route              │
│  /api/vapi/webhook              │
│  ┌───────────────────────────┐  │
│  │ createCalendarEvent()     │  │
│  │ → Google Calendar API     │  │
│  │ → Returns confirmation    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 16 + React 19 | App shell, routing, UI |
| Voice SDK | VAPI Web SDK | WebRTC audio, voice interface |
| STT | Deepgram Nova 3 | Speech-to-text transcription |
| LLM | Claude (Anthropic) | Conversation intelligence |
| TTS | ElevenLabs (Sarah) | Natural text-to-speech |
| Calendar | Google Calendar API | Event creation via service account |
| Styling | Tailwind CSS 4 | Responsive, modern UI |
| Deployment | Vercel | Serverless hosting |

## Calendar Integration

### How It Works

1. **Service Account Authentication**: We use a Google Cloud service account (not OAuth) which means no user login flow is needed. The service account has been granted "Make changes to events" permission on the target calendar.

2. **Event Creation Flow**:
   - User speaks their scheduling request
   - Claude (via VAPI) extracts: name, dateTime, duration, title, timezone
   - Claude calls the `createCalendarEvent` tool
   - VAPI sends an HTTP POST to our `/api/vapi/webhook` endpoint
   - The webhook handler calls Google Calendar API's `events.insert`
   - Confirmation is returned to Claude, which speaks it back to the user

3. **Date/Time Handling**: The LLM converts natural language dates ("next Monday at 3pm", "tomorrow morning") into ISO 8601 format before calling the tool.

4. **Timezone**: Defaults to `Asia/Kolkata` (IST). Users can specify their timezone in conversation.

## Project Structure

```
vikara-voice-scheduler/
├── src/
│   ├── app/
│   │   ├── api/vapi/webhook/
│   │   │   └── route.ts          # VAPI webhook handler
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Landing page
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   └── VoiceAgent.tsx         # Voice interface component
│   └── lib/
│       └── google-calendar.ts     # Google Calendar service
├── scripts/
│   └── create-vapi-assistant.ts   # VAPI assistant setup script
├── .env.example                   # Environment variables template
├── .env.local                     # Local environment variables (git-ignored)
├── package.json
├── tsconfig.json
└── README.md
```

## Running Locally

### Prerequisites

- Node.js 18+
- A VAPI account ([vapi.ai](https://vapi.ai))
- A Google Cloud project with Calendar API enabled
- A Google Calendar shared with your service account

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/vikara-voice-scheduler.git
   cd vikara-voice-scheduler
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in all values in `.env.local` (see [Environment Variables](#environment-variables) below).

4. **Create the VAPI assistant:**
   ```bash
   npm run setup:assistant
   ```
   Copy the outputted `NEXT_PUBLIC_VAPI_ASSISTANT_ID` into your `.env.local`.

5. **Start the dev server:**
   ```bash
   npm run dev
   ```

6. **Expose localhost for VAPI webhooks** (needed for local testing):
   ```bash
   npx ngrok http 3000
   ```
   Then update the assistant's `serverUrl` in the VAPI dashboard to your ngrok URL + `/api/vapi/webhook`.

7. Open [http://localhost:3000](http://localhost:3000) and start talking!

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | VAPI public API key (client-side) |
| `VAPI_PRIVATE_KEY` | VAPI private/secret API key (server-side) |
| `NEXT_PUBLIC_VAPI_ASSISTANT_ID` | VAPI assistant ID (from setup script) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Google service account private key (PEM format) |
| `GOOGLE_CALENDAR_ID` | Target Google Calendar ID |
| `NEXT_PUBLIC_APP_URL` | App URL (localhost or deployed URL) |

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add all environment variables from `.env.local` to Vercel's Environment Variables settings
4. Update `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL
5. Deploy
6. Update the VAPI assistant's webhook URL:
   - Go to VAPI Dashboard → Assistants → Your assistant → Edit
   - Update the server URL to `https://your-app.vercel.app/api/vapi/webhook`
   - Also update the tool's server URL to the same

## Conversation Example

```
Assistant: Hello! Welcome to Vikara's scheduling assistant.
           I'd love to help you book a meeting. May I have your name, please?

User:      Hi, I'm Rahul.

Assistant: Nice to meet you, Rahul\! When would you like to schedule your meeting?

User:      How about next Monday at 2:30 PM?

Assistant: Got it\! And would you like to give the meeting a specific title,
           or shall I name it "Meeting with Rahul"?

User:      Let's call it "Product Demo Review".

Assistant: Let me confirm the details:
           - Name: Rahul
           - Date: Monday, March 23rd, 2026 at 2:30 PM IST
           - Title: Product Demo Review
           - Duration: 30 minutes
           Shall I go ahead and create this event?

User:      Yes, please\!

Assistant: Your meeting has been created successfully\!
           "Product Demo Review" is scheduled for March 23rd at 2:30 PM.
           Is there anything else I can help you with?
```

## License

MIT
