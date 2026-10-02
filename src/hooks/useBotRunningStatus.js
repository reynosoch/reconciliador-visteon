import { useEffect, useState } from "react";

export function useBotRunningStatus() {
  const [botRunning, setBotRunning] = useState(false);
  useEffect(() => {
    const endpoint = String(import.meta.env.VITE_BOT_CONTROL_URL || "").replace(/\/$/, "");
    if (!endpoint) return undefined;
    let cancelled = false;
    let controller = null;
    const readBotStatus = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(endpoint + "/bot/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) {
          setBotRunning(data?.processState === "running");
        }
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          // El estado del bot es auxiliar; un controlador inaccesible no bloquea el dashboard.
        }
      }
    };
    void readBotStatus();
    const timer = window.setInterval(readBotStatus, 5000);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearInterval(timer);
    };
  }, []);

  return [botRunning, setBotRunning];
}
