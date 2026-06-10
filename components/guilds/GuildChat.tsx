import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Dumbbell, AlertCircle, RotateCcw, Copy, Trash2, Check, CheckCheck } from "lucide-react";
import { NEON, glassPanel, timeAgo } from "./guildTheme";
import GuildAvatar from "./GuildAvatar";
import { fetchChatHistory, sendChatMessage, markChatAsRead, deleteChatMessage } from "../../lib/guildApi";
import { subscribeToGuild } from "../../lib/guildRealtime";
import type { GuildMessage, GuildRole } from "../../types";
import { showSystemToast } from "../SystemToast";

interface GuildChatProps {
  guildId: string;
  myUserId: string;
  myName: string;
  myAvatarUrl: string | null;
  myRole?: GuildRole | null;
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
  myRole,
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

  // Read receipts and deletion/copy states
  const [readStates, setReadStates] = useState<Record<string, string | null>>({});
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const lastReadMessageIdRef = useRef<string | null>(null);
  const latestRef = useRef<string | undefined>(undefined);
  const sendReadReceiptRef = useRef<(messageId: string) => void>(() => {});
  
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
      const res = await fetchChatHistory(guildId, undefined, afterTimestamp);
      const history = res.messages;
      
      if (res.readStates) {
        const statesMap: Record<string, string | null> = {};
        for (const s of res.readStates) {
          statesMap[s.userId] = s.lastReadMessageId;
        }
        setReadStates((prev) => ({ ...prev, ...statesMap }));
      }

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
    const { unsubscribe, sendReadReceipt } = subscribeToGuild(guildId, {
      onMessage: (msg) => mergeMessages([msg]),
      onKicked: (uid) => {
        if (uid === myUserId) onKicked();
      },
      onDisbanded,
      onMissionComplete,
      onMessageDeleted: ({ messageId }) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
      onReadReceipt: ({ userId, messageId }) => {
        setReadStates((prev) => ({ ...prev, [userId]: messageId }));
      },
      onResubscribe: () => {
        // Gap-fill history using virtual sync cursor on resubscription
        loadHistory(latestRef.current);
      },
    });
    sendReadReceiptRef.current = sendReadReceipt;
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
    // Broadcast realtime receipt to other online users
    sendReadReceiptRef.current(latest.id);
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
          const res = await fetchChatHistory(guildId, oldestMsg.createdAt, undefined, 30);
          const older = res.messages;
          
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

  const copyToClipboard = (text: string) => {
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      success = true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        success = true;
      } catch (err) {
        console.error("Fallback copy failed", err);
      }
      document.body.removeChild(textArea);
    }
    if (success) {
      showSystemToast({ title: "Message copied", type: "SUCCESS" });
    } else {
      showSystemToast({ title: "Failed to copy message", type: "WARNING" });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Optimistic update: remove the message immediately from local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      await deleteChatMessage(guildId, messageId);
      showSystemToast({ title: "Message deleted", type: "SUCCESS" });
    } catch (err: any) {
      showSystemToast({ title: err.message || "Failed to delete message", type: "WARNING" });
      // Re-hydrate chat history on failure
      loadHistory();
    } finally {
      setActiveMenuMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Click-away overlay to close open message context menus */}
      {activeMenuMessageId && (
        <div
          className="fixed inset-0 z-[98] bg-transparent"
          onClick={() => setActiveMenuMessageId(null)}
        />
      )}
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
              myRole={myRole}
              activeMenuMessageId={activeMenuMessageId}
              setActiveMenuMessageId={setActiveMenuMessageId}
              onDeleteMessage={handleDeleteMessage}
              onCopyMessage={copyToClipboard}
              readStates={readStates}
              messages={messages}
              myUserId={myUserId}
              onlineUserIds={onlineUserIds}
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

const MessageTicks: React.FC<{ status: "sending" | "failed" | "single" | "double" | "blue" }> = ({ status }) => {
  if (status === "sending" || status === "failed") return null;
  if (status === "single") {
    return <Check size={11} className="text-gray-500" />;
  }
  if (status === "double") {
    return <CheckCheck size={11} className="text-gray-500" />;
  }
  if (status === "blue") {
    return <CheckCheck size={11} className="text-[#00d4ff]" />;
  }
  return null;
};

const MessageRow: React.FC<{
  m: GuildMessage;
  mine: boolean;
  onRetry: (m: GuildMessage) => void;
  isOnline?: boolean;
  myRole?: GuildRole | null;
  activeMenuMessageId: string | null;
  setActiveMenuMessageId: (id: string | null) => void;
  onDeleteMessage: (id: string) => void;
  onCopyMessage: (text: string) => void;
  readStates: Record<string, string | null>;
  messages: GuildMessage[];
  myUserId: string;
  onlineUserIds: Set<string>;
}> = ({
  m,
  mine,
  onRetry,
  isOnline = false,
  myRole,
  activeMenuMessageId,
  setActiveMenuMessageId,
  onDeleteMessage,
  onCopyMessage,
  readStates,
  messages,
  myUserId,
  onlineUserIds,
}) => {
  const getMessageTickStatus = (): "sending" | "failed" | "single" | "double" | "blue" => {
    if (m._status === "sending") return "sending";
    if (m._status === "failed") return "failed";
    if (m.id.startsWith("temp-")) return "sending";

    // Filter read states for other users in the guild
    const otherMembersRead = Object.entries(readStates).filter(([uid]) => uid !== myUserId);
    
    let hasBeenReadByOther = false;
    for (const [uid, lastReadId] of otherMembersRead) {
      if (!lastReadId) continue;
      if (lastReadId === m.id) {
        hasBeenReadByOther = true;
        break;
      }
      const msgIndex = messages.findIndex((x) => x.id === m.id);
      const readIndex = messages.findIndex((x) => x.id === lastReadId);
      if (msgIndex !== -1 && readIndex !== -1 && readIndex > msgIndex) {
        hasBeenReadByOther = true;
        break;
      }
    }

    if (hasBeenReadByOther) {
      return "blue";
    }

    const otherOnline = Array.from(onlineUserIds).some((uid) => uid !== myUserId);
    if (otherOnline) {
      return "double";
    }

    return "single";
  };

  const renderDropdownMenu = () => {
    if (m.id.startsWith("temp-")) return null;
    return (
      <div
        className="absolute z-[99] min-w-[120px] rounded-xl border border-white/10 shadow-2xl py-1"
        style={{
          ...glassPanel,
          background: "rgba(8,8,20,0.98)",
          top: "100%",
          left: mine ? "auto" : "0px",
          right: mine ? "0px" : "auto",
          marginTop: "4px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            onCopyMessage(m.body);
            setActiveMenuMessageId(null);
          }}
          className="w-full px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/5 flex items-center gap-2 transition"
        >
          <Copy size={12} />
          <span>Copy Text</span>
        </button>

        {(mine || myRole === "master" || myRole === "vice") && (
          <button
            onClick={() => {
              onDeleteMessage(m.id);
              setActiveMenuMessageId(null);
            }}
            className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition border-t border-white/5"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        )}
      </div>
    );
  };

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
        <div className="max-w-[78%] relative">
          {!mine && (
            <p className="text-[11px] text-gray-500 mb-1 ml-1">
              {m.author?.name || "Hunter"}
            </p>
          )}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!m.id.startsWith("temp-")) {
                setActiveMenuMessageId(activeMenuMessageId === m.id ? null : m.id);
              }
            }}
            className="rounded-2xl p-3 cursor-pointer select-none hover:brightness-110 active:scale-[0.99] transition-all relative"
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

            {/* Context Dropdown Menu */}
            {activeMenuMessageId === m.id && renderDropdownMenu()}
          </div>
          <div
            className={`flex items-center gap-1.5 mt-0.5 ${
              mine ? "justify-end" : ""
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600">
                {timeAgo(m.createdAt)}
              </span>
              {mine && !m.id.startsWith("temp-") && (
                <MessageTicks status={getMessageTickStatus()} />
              )}
            </div>
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
        <div className="max-w-[85%] w-72 relative">
          {!mine && (
            <p className="text-[11px] text-gray-500 mb-1 ml-1">
              {m.author?.name || "Hunter"}
            </p>
          )}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (!m.id.startsWith("temp-")) {
                setActiveMenuMessageId(activeMenuMessageId === m.id ? null : m.id);
              }
            }}
            className="rounded-2xl p-4 relative overflow-hidden cursor-pointer select-none hover:brightness-110 active:scale-[0.99] transition-all"
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

            {/* Context Dropdown Menu */}
            {activeMenuMessageId === m.id && renderDropdownMenu()}
          </div>
          <div
            className={`flex items-center gap-1.5 mt-0.5 ${
              mine ? "justify-end" : ""
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600">
                {timeAgo(m.createdAt)}
              </span>
              {mine && !m.id.startsWith("temp-") && (
                <MessageTicks status={getMessageTickStatus()} />
              )}
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
          onClick={(e) => {
            e.stopPropagation();
            if (!m.id.startsWith("temp-")) {
              setActiveMenuMessageId(activeMenuMessageId === m.id ? null : m.id);
            }
          }}
          className="px-3 py-2 rounded-2xl text-sm break-words cursor-pointer select-none hover:brightness-110 active:scale-[0.99] transition-all relative"
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

          {/* Context Dropdown Menu */}
          {activeMenuMessageId === m.id && renderDropdownMenu()}
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
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-600">
                {timeAgo(m.createdAt)}
              </span>
              {mine && !m.id.startsWith("temp-") && (
                <MessageTicks status={getMessageTickStatus()} />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GuildChat;
