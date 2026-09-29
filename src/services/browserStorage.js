import Dexie from "dexie";

// Preserve the existing database and its out-of-line keys during the upgrade.
export const browserDb = new Dexie("visteon-inventory-ui");
browserDb.version(2).stores({ state: "", alerts: "&id, inventoryId" });
export const STORAGE_WARNING =
  "No pudimos guardar los últimos cambios. Puedes seguir trabajando; descarga un respaldo antes de cerrar.";
export function safeReadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return { ok: true, value: raw ? JSON.parse(raw) : fallback };
  } catch (error) {
    return { ok: false, value: fallback, error };
  }
}
// Only small preferences remain in localStorage.
export function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
export async function idbGet(key, fallback = null) {
  try {
    return { ok: true, value: (await browserDb.state.get(key)) ?? fallback };
  } catch (error) {
    return { ok: false, value: fallback, error };
  }
}
export async function idbSet(key, value) {
  try {
    await browserDb.state.put(value, key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
export async function loadAlerts(inventoryId) {
  await browserDb.transaction(
    "rw",
    browserDb.state,
    browserDb.alerts,
    async () => {
      const key = `alerts:${inventoryId}`;
      const old = await browserDb.state.get(key);
      if (old && typeof old === "object") {
        const records = Object.values(old)
          .filter((x) => x?.id)
          .map((x) => ({ ...x, inventoryId }));
        if (records.length) await browserDb.alerts.bulkPut(records);
        await browserDb.state.delete(key);
      }
    },
  );
  return Object.fromEntries(
    (
      await browserDb.alerts.where("inventoryId").equals(inventoryId).toArray()
    ).map((x) => [x.id, x]),
  );
}
export async function saveAlerts(inventoryId, state) {
  const records = Object.values(state).map((x) => ({ ...x, inventoryId }));
  await browserDb.transaction("rw", browserDb.alerts, async () => {
    const ids = new Set(records.map((x) => x.id));
    const existing = await browserDb.alerts
      .where("inventoryId")
      .equals(inventoryId)
      .primaryKeys();
    await browserDb.alerts.bulkDelete(existing.filter((id) => !ids.has(id)));
    await browserDb.alerts.bulkPut(records);
  });
}
// Archive old local history successfully before releasing its quota.
export async function archiveLegacyStorage() {
  for (const key of [
    "visteon.inventory.operationalAlerts.v1",
    ...[1, 2, 3].map((v) => `visteon.inventory.meetingCuts.v${v}`),
  ]) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    await browserDb.transaction("rw", browserDb.state, async () => {
      const archiveKey = `legacy:${key}`;
      if ((await browserDb.state.get(archiveKey)) === undefined)
        await browserDb.state.put(JSON.parse(raw), archiveKey);
    });
    localStorage.removeItem(key);
  }
}
export function downloadJson(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
