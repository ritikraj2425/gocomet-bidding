import { useEffect, useRef, useCallback } from 'react';

interface WsMessage {
  event: string;
  data: unknown;
}

export function useWebSocket(rfqId: string | undefined, handlers: Record<string, (data: any) => void>) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!rfqId) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/${rfqId}`);

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        const handler = handlers[msg.event];
        if (handler) handler(msg.data);
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setTimeout(() => connect(), 3000);
    };

    wsRef.current = ws;
  }, [rfqId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}

