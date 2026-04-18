import { useEffect, useRef, useState } from "react";
import { createLiveSocket } from "../api/client";
import type { DailyKPIs, LiveReading, SystemAlert, WSPayload } from "../types";

export function useLiveData(liveMode = true): {
  readings:     LiveReading[];
  dailyKPIs:    DailyKPIs | null;
  alerts:       SystemAlert[];
  alertCount:   number;
  criticalCount:number;
  connected:    boolean;
  lastUpdated:  Date | null;
} {
  const [readings,      setReadings]      = useState<LiveReading[]>([]);
  const [dailyKPIs,     setDailyKPIs]     = useState<DailyKPIs | null>(null);
  const [alerts,        setAlerts]        = useState<SystemAlert[]>([]);
  const [alertCount,    setAlertCount]    = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [connected,     setConnected]     = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState<Date | null>(null);

  const wsRef    = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function disconnect() {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (wsRef.current)    { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }
    setConnected(false);
  }

  function connect() {
    const ws = createLiveSocket(
      (payload: WSPayload) => {
        setReadings(payload.live_readings ?? []);
        setDailyKPIs(payload.daily_kpis ?? null);
        setAlerts(payload.active_alerts ?? []);
        setAlertCount(payload.alert_count ?? 0);
        setCriticalCount(payload.critical_count ?? 0);
        setLastUpdated(new Date());
        setConnected(true);
      },
      () => { setConnected(false); scheduleRetry(); }
    );
    ws.onclose = () => { setConnected(false); scheduleRetry(); };
    ws.onopen  = () => setConnected(true);
    wsRef.current = ws;
  }

  function scheduleRetry() {
    if (!liveMode) return;
    if (retryRef.current) clearTimeout(retryRef.current);
    retryRef.current = setTimeout(connect, 5_000);
  }

  useEffect(() => {
    if (liveMode) {
      connect();
    } else {
      disconnect();
    }
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode]);

  return { readings, dailyKPIs, alerts, alertCount, criticalCount, connected, lastUpdated };
}
