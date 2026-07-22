import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const WEBHOOK_URL = "https://hook.eu2.make.com/fiz07uhud87cxk4yfddca3y2fsrjsipa";

interface Msg {
  role: "user" | "bot";
  text: string;
  time: string;
}

const getSessionId = () => {
  let id = localStorage.getItem("chat_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("chat_session_id", id);
  }
  return id;
};

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = localStorage.getItem("chat_messages");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: "bot",
        text: "你好！我係 CatMan 客服 🐱 有咩可以幫到你？",
        time: new Date().toISOString(),
      },
    ];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("chat_messages", JSON.stringify(messages.slice(-50)));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const now = new Date().toISOString();
    setMessages((m) => [...m, { role: "user", text, time: now }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          message: text,
          timestamp: now,
          url: window.location.href,
        }),
      });
      const raw = await res.text();
      let reply = raw;
      try {
        const j = JSON.parse(raw);
        reply = j.reply || j.message || j.text || j.output || raw;
      } catch {}
      if (!reply || reply === "Accepted") reply = "已收到你的訊息，我哋會盡快回覆你 🐾";
      setMessages((m) => [...m, { role: "bot", text: reply, time: new Date().toISOString() }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "訊息發送失敗，請稍後再試 😿", time: new Date().toISOString() },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-[340px] sm:w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-elevated flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🐱</div>
              <div>
                <div className="font-semibold text-sm">CatMan 客服</div>
                <div className="text-[10px] opacity-80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  在線
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-background/50">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-sm text-sm flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="text-muted-foreground">輸入中…</span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-2 border-t border-border flex gap-2 bg-card"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入訊息…"
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      <Button
        onClick={() => setOpen((o) => !o)}
        size="icon"
        className="h-14 w-14 rounded-full shadow-elevated bg-gradient-primary hover:opacity-90 hover:scale-105 transition-all"
        aria-label="開啟聊天"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>
    </div>
  );
};

export default ChatWidget;
