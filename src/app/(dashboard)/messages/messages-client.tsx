"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: User;
}

interface Thread {
  id: string;
  hasUnread: boolean;
  otherMembers: User[];
  messages: { content: string; createdAt: string; sender: { name: string | null } }[];
}

export function MessagesClient({ userId, initialThreadId }: { userId: string; initialThreadId?: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreadId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) setThreads(await res.json());
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
    setLoading(false);
  }, []);

  const fetchMessages = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`/api/messages/${threadId}`);
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Poll for new messages when a thread is selected
  useEffect(() => {
    if (selectedThreadId) {
      fetchMessages(selectedThreadId);
      pollRef.current = setInterval(() => {
        fetchMessages(selectedThreadId);
        fetchThreads();
      }, 10000);
      return () => clearInterval(pollRef.current);
    }
  }, [selectedThreadId, fetchMessages, fetchThreads]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThreadId) return;

    setSending(true);
    try {
      const res = await fetch(`/api/messages/${selectedThreadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages(selectedThreadId);
        fetchThreads();
      }
    } catch (err) {
      console.error("Failed to send:", err);
    }
    setSending(false);
  }

  const selectedThread = threads.find((t) => t.id === selectedThreadId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">messages</h1>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="flex h-[600px]">
          {/* Thread list */}
          <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-zinc-500">Loading...</div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                <p>No conversations yet.</p>
                <p className="mt-1">
                  Message someone from the Discover or Matches page.
                </p>
              </div>
            ) : (
              threads.map((thread) => {
                const other = thread.otherMembers[0];
                const lastMsg = thread.messages[0];
                const isSelected = thread.id === selectedThreadId;

                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                      isSelected
                        ? "bg-cyan-50 dark:bg-cyan-900/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {other?.image ? (
                        <img
                          src={other.image}
                          alt=""
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium">
                          {other?.name?.[0] ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium truncate ${
                              thread.hasUnread ? "text-cyan-500" : ""
                            }`}
                          >
                            {other?.name || "Unknown"}
                          </p>
                          {thread.hasUnread && (
                            <span className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {lastMsg && (
                          <p className="text-xs text-zinc-500 truncate">
                            {lastMsg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Message area */}
          <div className="flex-1 flex flex-col">
            {selectedThreadId ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {selectedThread?.otherMembers[0]?.image ? (
                      <img
                        src={selectedThread.otherMembers[0].image}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium">
                        {selectedThread?.otherMembers[0]?.name?.[0] ?? "?"}
                      </div>
                    )}
                    <p className="font-medium">
                      {selectedThread?.otherMembers[0]?.name || "Unknown"}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.sender.id === userId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isMine
                              ? "bg-cyan-500 text-white"
                              : "bg-zinc-100 dark:bg-zinc-800"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isMine
                                ? "text-cyan-100"
                                : "text-zinc-400"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString(
                              undefined,
                              { hour: "numeric", minute: "2-digit" }
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSend}
                  className="p-4 border-t border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-400">
                <p>Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
