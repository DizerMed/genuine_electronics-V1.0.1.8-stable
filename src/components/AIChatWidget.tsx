import * as React from "react";
import { Bot, X, Send, Sparkles, Cpu, ShieldCheck } from "lucide-react";
import { Product } from "../types";

interface AIChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  theme?: "dark" | "light";
}

export default function AIChatWidget({
  isOpen,
  onClose,
  products,
  theme = "dark",
}: AIChatWidgetProps) {
  const isDark = theme === "dark";
  const [messages, setMessages] = React.useState<
    { sender: "user" | "bot"; text: string }[]
  >([
    {
      sender: "bot",
      text: "Hello! I am VoltBot, your Genuine Electronics AI Expert. How can I help you choose the right device, compare specifications, or check warranty details today?",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          context:
            "Client shopping assistance and genuine electronics specs consultation",
          productCatalog: products.map((p) => ({
            name: p.name,
            brand: p.brand,
            price: p.price,
            category: p.category,
            specs: p.specs,
          })),
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text:
            data.reply || "I am here to help you select genuine electronics!",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I encountered an error connecting to the AI assistant. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col h-[500px] transition-colors duration-200 ${
        isDark
          ? "bg-slate-900 border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-900"
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1">
              VoltBot AI Expert{" "}
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </h3>
            <p className="text-[10px] text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Genuine
              Electronics Assistant
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                m.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none shadow-sm"
                  : isDark
                    ? "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none shadow-sm"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className={`border rounded-2xl px-4 py-3 text-xs animate-pulse flex items-center gap-1.5 shadow-sm ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-400"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              <span>VoltBot is analyzing specifications...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className={`p-3 border-t flex items-center gap-2 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <input
          type="text"
          placeholder="Ask about specs, warranty, or device comparison..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`flex-1 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 border ${
            isDark
              ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500/40"
              : "bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-blue-600/30"
          }`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
