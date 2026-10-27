/**
 * A single shared WebSocket connection for the whole app — Community/Chat
 * push events (new messages, typing, read receipts, new replies, accepted
 * answers) all arrive over this one socket rather than one connection per
 * open conversation. The backend endpoint (app/api/ws.py) is a pure
 * push/presence channel: every actual write still goes through the
 * ordinary REST calls in services/api.ts, so losing this connection never
 * loses data — it just means live updates resume on reconnect/reload
 * instead of arriving instantly.
 *
 * Auth travels as a query param (`?token=...`) because the browser
 * WebSocket API can't set a custom Authorization header — the same real
 * JWT authStore already holds, not a second credential.
 */
type SocketEvent =
  | { type: "chat.message"; conversation_id: number; message: Record<string, unknown> }
  | { type: "chat.read_receipt"; conversation_id: number; reader_id: number }
  | { type: "chat.typing"; conversation_id: number; user_id: number; is_typing: boolean }
  | { type: "discussion.reply"; discussion_id: number; reply: Record<string, unknown> }
  | { type: "discussion.accepted"; discussion_id: number; discussion: Record<string, unknown> }
  | { type: "discussion.created"; discussion: Record<string, unknown> }
  | { type: "pong" };

type Listener = (event: SocketEvent) => void;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;
const PING_INTERVAL_MS = 25000;

class ChatSocketClient {
  private socket: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private currentToken: string | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private closedByUser = false;

  connect(token: string): void {
    this.closedByUser = false;
    this.currentToken = token;
    this._open();
  }

  disconnect(): void {
    this.closedByUser = true;
    this.currentToken = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.socket?.close();
    this.socket = null;
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(payload: Record<string, unknown>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  sendTyping(conversationId: number, isTyping: boolean): void {
    this.send({ type: "typing", conversation_id: conversationId, is_typing: isTyping });
  }

  private _open(): void {
    if (!this.currentToken) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/api/ws?token=${encodeURIComponent(this.currentToken)}`;
    const ws = new WebSocket(url);
    this.socket = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send({ type: "ping" }), PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SocketEvent;
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // Not JSON — ignore rather than crash the socket handler.
      }
    };

    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      if (this.closedByUser || !this.currentToken) return;
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_DELAY_MS);
      this.reconnectAttempt += 1;
      this.reconnectTimer = setTimeout(() => this._open(), delay);
    };

    ws.onerror = () => {
      // onclose fires right after and handles reconnection — nothing
      // extra to do here beyond not letting this throw.
    };
  }
}

// One shared instance for the whole app, same pattern as the shared
// `api` axios instance in this file — every store that needs live events
// imports this same object rather than opening its own socket.
export const chatSocket = new ChatSocketClient();
export type { SocketEvent };
