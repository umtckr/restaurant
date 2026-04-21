"use client";

import { useCallback, useEffect, useRef } from "react";
import { getAccessToken } from "@/lib/api/http";
import { getApiBase } from "@/lib/api/client";

export type LocationEvent =
  | { type: "session.updated"; payload: { session_id: string; table_id: string; status: string } }
  | { type: "order.updated"; payload: { order_id: string; status: string; dining_session_id: string | null } }
  | { type: "customer_request.updated"; payload: { request_id: string; type: string; status: string; session_id: string } }
  | { type: "connection.ready"; payload?: Record<string, unknown> }
  | { type: "pong"; payload?: Record<string, unknown> };

function buildWsUrl(locationId: string): string {
  const apiBase = getApiBase() ?? "";
  // apiBase is like http://127.0.0.1:8000/api/v1 — extract host
  let host: string;
  try {
    const url = new URL(apiBase);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    host = `${protocol}//${url.host}`;
  } catch {
    // Fallback: same origin
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    host = `${protocol}//${window.location.host}`;
  }
  const token = getAccessToken() ?? "";
  return `${host}/ws/location/${locationId}/?token=${encodeURIComponent(token)}`;
}

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30000;
const PING_INTERVAL = 25000;

type SocketCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
};

/**
 * Connect to the location WebSocket and call `onEvent` for every message.
 * Handles reconnection with exponential backoff and keep-alive pings.
 */
export function useLocationSocket(
  locationId: string | null | undefined,
  onEvent: (event: LocationEvent) => void,
  callbacks?: SocketCallbacks,
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
    if (!locationId) return;
    cleanup();

    const url = buildWsUrl(locationId);
    const ws = new WebSocket(url);
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
        const data = JSON.parse(e.data) as LocationEvent;
        onEventRef.current(data);
      } catch { /* ignore malformed messages */ }
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
  }, [locationId, cleanup]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);
}
