// History remains stored. Only evaluated findings belong in the current bell.
export function currentAlerts(state, findings, evaluationValid) {
  if (!evaluationValid) return [];
  return findings
    .map((f) => state[f.id] || { ...f, read: false })
    .filter((x) => x.active !== false);
}
