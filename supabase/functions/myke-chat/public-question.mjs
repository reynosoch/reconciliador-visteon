// Shared boundary for the unpaid provider, not a confidentiality/DLP detector.
// Actual inventory results and source identities never cross this boundary.
export function isMykePublicQuestion(question) {
  if (typeof question !== "string") return false;
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !(
    /\b(?:PN|part number|numero de parte)\s*[:#-]?\s*[A-Z0-9]*\d[A-Z0-9._/-]*/i.test(text) ||
    /\b[A-Z]{2,}[A-Z0-9]*-\d[A-Z0-9._/-]*/i.test(text) ||
    /^\s*\d{3,}\s*$/.test(text)
  );
}
