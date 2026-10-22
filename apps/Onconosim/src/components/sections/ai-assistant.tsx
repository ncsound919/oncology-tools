"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, User, Loader2, Sparkles, Eraser } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What tier is PT0511 actually at, and why isn't it tier 5?",
  "Design an experiment that fills the Leg 3 gap.",
  "Score the combination 'KRAS degrader + neoantigen vaccine'.",
  "Why is the 6-year pancreatic vaccine data tier 4, not tier 5?",
];

const FALLBACK_REPLY =
  "I reason inside the four-leg cure framework. Each leg has a 0–5 evidence ladder and I refuse to round up — a 6-year recurrence-free claim for a disease with a 15-year dormancy tail is tier 4 wearing tier 5's clothes. (Live model unavailable — this is a static fallback.)";

export default function AiAssistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? FALLBACK_REPLY;
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: FALLBACK_REPLY }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="assistant" className="border-t border-[#1F262D] py-20 md:py-28 bg-[#0A0D10]">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="onc-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9E8CF2]">
              AI research assistant
            </div>
            <h2 className="onc-sans mt-3 text-[28px] font-semibold leading-tight tracking-[-0.01em] text-[#E9E7DF] md:text-[36px]">
              Ask the framework. Get a tier-strict answer.
            </h2>
            <p className="onc-sans mt-3 max-w-2xl text-[14px] leading-relaxed text-[#8B9299]">
              OncoSIM reasons inside the four-leg cure framework and refuses to round evidence up.
              Ask it to score a combination, design an experiment for a specific gap, or stress-test
              a claim.
            </p>
          </div>
          <div className="onc-mono flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-[#5C646C]">
            <Sparkles className="h-3.5 w-3.5 text-[#9E8CF2]" />
            powered by z-ai-web-dev-sdk
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border border-[#1F262D] bg-[#0D1013]">
          {/* message area */}
          <div
            ref={scrollRef}
            className="onc-scroll max-h-[460px] min-h-[320px] overflow-y-auto p-4 md:p-6"
          >
            {messages.length === 0 && (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 rounded-full bg-[#9E8CF2]/20 blur-xl onc-pulse" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#9E8CF2]/40 bg-[#161B20]">
                    <Bot className="h-6 w-6 text-[#9E8CF2]" />
                  </div>
                </div>
                <div className="onc-sans text-[14px] font-medium text-[#E9E7DF]">
                  OncoSIM is ready.
                </div>
                <div className="onc-sans mt-1 max-w-sm text-[12px] leading-relaxed text-[#5C646C]">
                  Try one of these to start, or ask anything about the framework, assets, or experiments.
                </div>
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="onc-sans group rounded-lg border border-[#1F262D] bg-[#161B20]/40 px-3.5 py-2.5 text-left text-[12px] leading-snug text-[#8B9299] transition-all hover:border-[#9E8CF2]/40 hover:text-[#E9E7DF]"
                    >
                      <span className="onc-mono mr-1.5 text-[#9E8CF2]">→</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        borderColor: m.role === "user" ? "#262D34" : "#9E8CF2",
                        background: m.role === "user" ? "#161B20" : "#1a1525",
                      }}
                    >
                      {m.role === "user" ? (
                        <User className="h-4 w-4 text-[#8B9299]" />
                      ) : (
                        <Bot className="h-4 w-4 text-[#9E8CF2]" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg px-3.5 py-2.5 onc-sans text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-[#161B20] text-[#E9E7DF]"
                          : "border border-[#9E8CF2]/20 bg-[#9E8CF2]/06 text-[#E9E7DF]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#9E8CF2] bg-[#1a1525]">
                    <Bot className="h-4 w-4 text-[#9E8CF2]" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#9E8CF2]/20 bg-[#9E8CF2]/06 px-3.5 py-2.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9E8CF2]" />
                    <span className="onc-mono text-[11px] text-[#8B9299]">reasoning across legs…</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* input */}
          <div className="border-t border-[#1F262D] p-3 md:p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about a leg, an asset, a combination, or an experiment…"
                disabled={loading}
                className="onc-sans flex-1 rounded-md border border-[#262D34] bg-[#0D1013] px-3.5 py-2.5 text-[13px] text-[#E9E7DF] placeholder:text-[#5C646C] focus:border-[#9E8CF2]/50 focus:outline-none disabled:opacity-50"
              />
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="onc-mono rounded-md border border-[#262D34] p-2.5 text-[#5C646C] transition-colors hover:border-[#E8664F]/40 hover:text-[#E8664F]"
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              )}
              <VoiceInput
                label="Speak your question"
                onTranscript={(text) => {
                  setInput(text);
                  send(text);
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="onc-mono flex items-center gap-1.5 rounded-md bg-[#9E8CF2] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#0D1013] transition-all hover:bg-[#7C3AED] disabled:opacity-40 disabled:hover:bg-[#9E8CF2]"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
