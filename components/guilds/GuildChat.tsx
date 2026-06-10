import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Dumbbell, AlertCircle, RotateCcw } from "lucide-react";
import { NEON, glassPanel, timeAgo } from "./guildTheme";
import GuildAvatar from "./GuildAvatar";
import { fetchChatHistory, sendChatMessage, markChatAsRead } from "../../lib/guildApi";
import { subscribeToGuild } from "../../lib/guildRealtime";
import type { GuildMessage } from "../../types";

interface GuildChatProps {
  guildId: string;
  myUserId: string;
  myName: string;
  myAvatarUrl: string | null;
  onKicked: () => void;
  onDisbanded: () => void;
  onMissionComplete: (p: { missionId: string; title: string }) => void;
  onlineUserIds?: Set<string>;
  typingUsers?: Record<string, { name: string; timestamp: number }>;
  sendTyping?: (isTyping: boolean) => void;
}

const GuildChat: React.FC<GuildChatProps> = ({
  guildId,
  myUserId,
  myName,
  myAvatarUrl,
  onKicked,
  onDisbanded,
  onMissionComplete,
  onlineUserIds = new Set(),
  typingUsers = {},
  sendTyping,
}) => {
  const [messages, setMessages] = useState<GuildMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination & Sync states
  const [fetchingMore, setFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const lastReadMessageIdRef = useRef<string | null>(null);
  const latestRef = useRef<string | undefined>(undefined);
  
  // Typing states
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);

  // Maintain latest message timestamp in ref for gap-filling on reconnect
  useEffect(() => {
    const latestMsg = messages[messages.length - 1];
    latestRef.current = latestMsg ? latestMsg.createdAt : undefined;
  }, [messages]);

  const mergeMessages = useCallback((incoming: GuildMessage[]) => {
    setMessages((prev) => {
      const map = new Map<string, GuildMessage>();
      for (const m of prev) map.set(m.id, m);
      for (const m of incoming) {
        map.set(m.id, m);
      }
      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  // Fetch history (optionally supporting after cursor for gap-filling)
  const loadHistory = useCallback(async (afterTimestamp?: string) => {
    try {
      const history = await fetchChatHistory(guildId, undefined, afterTimestamp);
      setMessages((prev) => {
        const map = new Map<string, GuildMessage>();
        
        // If gap-filling, preserve existing messages
        if (afterTimestamp) {
          for (const m of prev) map.set(m.id, m);
        }
        
        for (const m of history) map.set(m.id, m);
        
        // Keep any pending optimistic messages
        for (const m of prev) {
          if (m._status === "sending" || m._status === "failed") {
            map.set(m._tempId || m.id, m);
          }
        }
        
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      setError("");
    } catch (e: any) {
      if (!afterTimestamp) {
        setError(e?.message || "Could not load chat");
      }
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  // Initial load + realtime subscription with cleanup (avoids leaked channels).
  useEffect(() => {
    setLoading(true);
    loadHistory();
    const { unsubscribe } = subscribeToGuild(guildId, {
      onMessage: (msg) => mergeMessages([msg]),
      onKicked: (uid) => {
        if (uid === myUserId) onKicked();
      },
      onDisbanded,
      onMissionComplete,
      onResubscribe: () => {
        // Gap-fill history using virtual sync cursor on resubscription
        loadHistory(latestRef.current);
      },
    });
    return unsubscribe;
  }, [
    guildId,
    myUserId,
    loadHistory,
    mergeMessages,
    onKicked,
    onDisbanded,
    onMissionComplete,
  ]);

  // Mark chat as read logic
  const checkMarkAsRead = useCallback(() => {
    if (messages.length === 0 || !atBottomRef.current) return;
    const latest = messages[messages.length - 1];
    if (!latest.id || latest.id.startsWith("temp-") || latest.id === lastReadMessageIdRef.current) return;
    
    lastReadMessageIdRef.current = latest.id;
    markChatAsRead(guildId, latest.id).catch((err) => {
      console.warn("[Chat] Failed to mark chat as read:", err);
    });
  }, [guildId, messages]);

  // Run read tracker whenever messages change
  useEffect(() => {
    checkMarkAsRead();
  }, [messages, checkMarkAsRead]);

  // Auto-scroll to bottom on new messages if user is already near the bottom.
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onScroll = async () => {
    const el = scrollRef.current;
    if (!el) return;
    
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = atBottom;
    
    if (atBottom) {
      checkMarkAsRead();
    }

    // Infinite scroll: fetch older messages when reaching the top
    if (el.scrollTop < 50 && !loading && !fetchingMore && hasMore && messages.length > 0) {
      const oldestMsg = messages.find((m) => !m.id.startsWith("temp-"));
      if (oldestMsg) {
        setFetchingMore(true);
        try {
          const oldScrollHeight = el.scrollHeight;
          const older = await fetchChatHistory(guildId, oldestMsg.createdAt, undefined, 30);
          
          if (older.length < 30) {
            setHasMore(false);
          }
          
          if (older.length > 0) {
            setMessages((prev) => {
              const map = new Map<string, GuildMessage>();
              for (const m of older) map.set(m.id, m);
              for (const m of prev) map.set(m.id, m);
              return Array.from(map.values()).sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });

            // Adjust scroll position to prevent jumping
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight - oldScrollHeight;
              }
            }, 0);
          }
        } catch (err) {
          console.warn("[Chat] Failed to load older messages:", err);
        } finally {
          setFetchingMore(false);
        }
      }
    }
  };

  const doSend = async (tempId: string, body: string) => {
    try {
      const { message } = await sendChatMessage(guildId, body);
      setMessages((prev) => {
        const map = new Map<string, GuildMessage>();
        for (const m of prev) {
          if (m._tempId === tempId) continue; // drop our optimistic copy
          map.set(m.id, m);
        }
        map.set(message.id, message);
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._tempId === tempId ? { ...m, _status: "failed" } : m
        )
      );
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);

    if (!sendTyping) return;

    // Send typing broadcast (throttled to once every 2 seconds)
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current > 2000) {
      lastTypingBroadcastRef.current = now;
      sendTyping(true);
    }

    // Set timeout to clear typing state after 3 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
      lastTypingBroadcastRef.current = 0;
    }, 3000);
  };

  const handleSend = () => {
    const body = input.trim();
    if (!body) return;

    // Clear typing timeout and send typing = false broadcast immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTyping?.(false);
    lastTypingBroadcastRef.current = 0;

    const tempId = `temp-${Date.now()}`;
    const optimistic: GuildMessage = {
      id: tempId,
      _tempId: tempId,
      _status: "sending",
      guildId,
      userId: myUserId,
      type: "user",
      body,
      meta: {},
      createdAt: new Date().toISOString(),
      author: { userId: myUserId, name: myName, avatarUrl: myAvatarUrl },
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");
    atBottomRef.current = true;
    doSend(tempId, body);
  };

  const retry = (m: GuildMessage) => {
    setMessages((prev) =>
      prev.map((x) =>
        x._tempId === m._tempId ? { ...x, _status: "sending" } : x
      )
    );
    doSend(m._tempId!, m.body);
  };

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-10 w-2/3 rounded-2xl animate-pulse ${
                  i % 2 ? "ml-auto" : ""
                }`}
                style={{ background: "rgba(255,255,255,0.04)" }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <AlertCircle size={28} className="text-red-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-3">{error}</p>
            <button
              onClick={() => loadHistory()}
              className="px-4 py-2 rounded-xl text-sm"
              style={{ background: "rgba(0,212,255,0.15)", color: NEON }}
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No messages yet.</p>
            <p className="text-gray-600 text-xs mt-1">
              Be the first to rally your guild.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageRow
              key={m._tempId || m.id}
              m={m}
              mine={m.userId === myUserId}
              onRetry={retry}
              isOnline={m.userId ? onlineUserIds.has(m.userId) : false}
            />
          ))
        )}
      </div>

      {/* Typing indicator */}
      {Object.keys(typingUsers).length > 0 && (
        <div className="px-4 py-1 text-xs text-gray-500 font-mono flex items-center gap-1.5 animate-pulse">
          <div className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span>
            {Object.values(typingUsers)
              .map((u) => u.name)
              .join(", ")}{" "}
            {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing…
          </span>
        </div>
      )}

      {/* Composer */}
      <div className="px-3 py-3 border-t border-white/5">
        <div
          className="flex items-center gap-2 px-3 rounded-2xl"
          style={glassPanel}
        >
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Message your guild…"
            maxLength={1000}
            className="flex-1 bg-transparent py-3 text-sm text-white focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${NEON}, #6d28d9)` }}
          >
            <Send size={16} className="text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageRow: React.FC<{
  m: GuildMessage;
  mine: boolean;
  onRetry: (m: GuildMessage) => void;
  isOnline?: boolean;
}> = ({ m, mine, onRetry, isOnline = false }) => {
  if (m.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-gray-500 bg-white/5 px-3 py-1 rounded-full">
          {m.body}
        </span>
      </div>
    );
  }

  if (m.type === "workout") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${mine ? "justify-end" : "justify-start"}`}
      >
        <div className="max-w-[78%]">
          {!mine && (
            <p className="text-[11px] text-gray-500 mb-1 ml-1">
              {m.author?.name || "Hunter"}
            </p>
          )}
          <div
            className="rounded-2xl p-3"
            style={{ ...glassPanel, border: `1px solid ${NEON}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell size={15} style={{ color: NEON }} />
              <span className="text-xs font-bold text-white">
                Workout Complete
              </span>
            </div>
            <p className="text-sm text-gray-200">{m.body}</p>
            {m.meta?.xp != null && (
              <div
                className="flex gap-3 mt-2 text-[11px] font-mono"
                style={{ color: NEON }}
              >
                <span>+{m.meta.xp} XP</span>
                {m.meta?.exercises != null && (
                  <span className="text-gray-400">
                    {m.meta.exercises} exercises
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (m.type === "quest") {
    const meta = m.meta || {};
    const streak = meta.streak || 0;
    const xpGained = meta.xpGained || 50;
    const level = meta.level || 1;
    const currentXp = meta.currentXp || 0;
    const requiredXp = meta.requiredXp || 100;
    const pct = Math.min(100, Math.max(0, Math.round((currentXp / requiredXp) * 100)));
    const nextLevel = level + 1;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${mine ? "justify-end" : "justify-start"}`}
      >
        <div className="max-w-[85%] w-72">
          {!mine && (
            <p className="text-[11px] text-gray-500 mb-1 ml-1">
              {m.author?.name || "Hunter"}
            </p>
          )}
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              ...glassPanel,
              border: `1px solid rgba(0, 212, 255, 0.4)`,
              boxShadow: `0 0 15px rgba(0, 212, 255, 0.15)`,
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em]" style={{ color: NEON }}>
                DAILY QUEST COMPLETED
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-3 truncate">
              {m.body.replace("Completed Quest: ", "")}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-center">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-0.5">Streak</p>
                <p className="text-sm font-mono font-bold text-white">
                  {streak} {streak === 1 ? "Day" : "Days"}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-center">
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-0.5">XP Gain</p>
                <p className="text-sm font-mono font-bold text-cyan-400">
                  +{xpGained} XP
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[9px] font-mono text-gray-400 mb-1">
                <span>LVL {level}</span>
                <span>{pct}% TO LVL {nextLevel}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${NEON}, #00aaff)`,
                    boxShadow: `0 0 6px ${NEON}`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
    >
      {!mine && (
        <GuildAvatar
          name={m.author?.name}
          avatarUrl={m.author?.avatarUrl}
          size={30}
          isOnline={isOnline}
        />
      )}
      <div className={`max-w-[72%] ${mine ? "items-end" : ""}`}>
        {!mine && (
          <p className="text-[11px] text-gray-500 mb-0.5 ml-1">
            {m.author?.name || "Hunter"}
          </p>
        )}
        <div
          className="px-3 py-2 rounded-2xl text-sm break-words"
          style={
            mine
              ? {
                  background: "rgba(0,212,255,0.18)",
                  border: "1px solid rgba(0,212,255,0.3)",
                  color: "#e0f7ff",
                }
              : { background: "rgba(255,255,255,0.06)", color: "#e5e7eb" }
          }
        >
          {m.body}
        </div>
        <div
          className={`flex items-center gap-1.5 mt-0.5 ${
            mine ? "justify-end" : ""
          }`}
        >
          {m._status === "sending" && (
            <span className="text-[10px] text-gray-500">sending…</span>
          )}
          {m._status === "failed" ? (
            <button
              onClick={() => onRetry(m)}
              className="text-[10px] text-red-400 flex items-center gap-0.5"
            >
              <RotateCcw size={10} /> retry
            </button>
          ) : (
            <span className="text-[10px] text-gray-600">
              {timeAgo(m.createdAt)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GuildChat;
