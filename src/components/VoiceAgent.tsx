"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Vapi from "@vapi-ai/web";

type CallStatus = "idle" | "connecting" | "active" | "ending";

interface TranscriptEntry {
  role: "assistant" | "user";
  text: string;
  timestamp: Date;
}

export default function VoiceAgent() {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      console.error("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set");
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      console.log("[VAPI] Call started");
      setCallStatus("active");
    });

    vapi.on("call-end", () => {
      console.log("[VAPI] Call ended");
      setCallStatus("idle");
    });

    vapi.on("message", (message) => {
      if (message.type === "transcript") {
        const msg = message as { type: string; role: string; transcript: string; transcriptType: string };
        if (msg.transcriptType === "final") {
          setTranscript((prev) => [
            ...prev,
            {
              role: msg.role as "assistant" | "user",
              text: msg.transcript,
              timestamp: new Date(),
            },
          ]);
        }
      }
    });

    vapi.on("volume-level", (level: number) => {
      setVolumeLevel(level);
    });

    vapi.on("error", (error) => {
      console.error("[VAPI] Error:", error);
      setCallStatus("idle");
    });

    return () => {
      vapi.stop();
    };
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const startCall = useCallback(async () => {
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    if (!assistantId) {
      console.error("NEXT_PUBLIC_VAPI_ASSISTANT_ID is not set");
      alert("Assistant ID is not configured. Please run the setup script first.");
      return;
    }

    setCallStatus("connecting");
    setTranscript([]);

    try {
      await vapiRef.current?.start(assistantId);
    } catch (error) {
      console.error("[VAPI] Failed to start call:", error);
      setCallStatus("idle");
    }
  }, []);

  const endCall = useCallback(() => {
    setCallStatus("ending");
    vapiRef.current?.stop();
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Voice Control */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
        <div className="flex flex-col items-center">
          {/* Animated Orb */}
          <div className="relative mb-8">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                callStatus === "active"
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-200"
                  : callStatus === "connecting"
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200 animate-pulse"
                  : "bg-gradient-to-br from-gray-200 to-gray-300"
              }`}
              style={
                callStatus === "active"
                  ? {
                      transform: `scale(${1 + volumeLevel * 0.15})`,
                    }
                  : undefined
              }
            >
              {callStatus === "idle" && (
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {callStatus === "connecting" && (
                <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {callStatus === "active" && (
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
              {callStatus === "ending" && (
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>

            {/* Pulse rings when active */}
            {callStatus === "active" && (
              <>
                <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping" />
                <div className="absolute -inset-2 rounded-full bg-emerald-400 opacity-10 animate-pulse" />
              </>
            )}
          </div>

          {/* Status Text */}
          <p className="text-sm font-medium text-gray-500 mb-6 uppercase tracking-wider">
            {callStatus === "idle" && "Ready to schedule"}
            {callStatus === "connecting" && "Connecting..."}
            {callStatus === "active" && "Listening..."}
            {callStatus === "ending" && "Ending call..."}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {callStatus === "idle" ? (
              <button
                onClick={startCall}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Start Conversation
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-3 rounded-full transition-all duration-200 ${
                    isMuted
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={endCall}
                  disabled={callStatus === "ending"}
                  className="px-8 py-3 bg-red-500 text-white rounded-full font-semibold shadow-lg hover:bg-red-600 hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  End Call
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Transcript */}
      {transcript.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Live Transcript
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex ${
                  entry.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    entry.role === "user"
                      ? "bg-emerald-500 text-white rounded-br-md"
                      : "bg-gray-100 text-gray-800 rounded-bl-md"
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
