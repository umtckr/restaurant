"use client";

import { useCallback, useEffect, useRef } from "react";
import { getApiBase } from "@/lib/api/client";

export type GuestEvent =
  | { type: "order.updated"; payload: { order_id: string; status: string; dining_session_id: string | null } }
  | { type: "session.updated"; payload: { session_id: string; table_id: string; status: string } }
  | { type: "customer_request.updated"; payload: { request_id: string; type: string; status: string; session_id: string } }
  | { type: "connection.ready"; payload?: Record<string, unknown> }
  | { type: "pong"; payload?: Record<string, unknown> };

function buildWsUrl(sessionToken: string): string {
  const apiBase = getApiBase() ?? "";
  let host: string;
  try {
    const url = new URL(apiBase);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    host = `${protocol}//${url.host}`;
  } catch {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    host = `${protocol}//${window.location.host}`;
  }
  return `${host}/ws/guest/${sessionToken}/`;
}

const RECONNECT_BASE = 1500;
const RECONNECT_MAX = 30000;
const PING_INTERVAL = 25000;

export function useGuestSocket(
  sessionToken: string | null | undefined,
  onEvent: (event: GuestEvent) => void,
  callbacks?: { onOpen?: () => void; onClose?: () => void },
) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pingTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const cleanup = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    clearInterval(pingTimerRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!sessionToken) return;
    cleanup();

    const ws = new WebSocket(buildWsUrl(sessionToken));
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      cbRef.current?.onOpen?.();
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as GuestEvent;
        onEventRef.current(data);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      clearInterval(pingTimerRef.current);
      cbRef.current?.onClose?.();
      const delay = Math.min(RECONNECT_BASE * 2 ** retriesRef.current, RECONNECT_MAX);
      retriesRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => connect(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionToken, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);
}
