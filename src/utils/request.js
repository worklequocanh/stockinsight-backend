function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeSearch(value) {
  return String(value || '').trim();
}

module.exports = {
  toPositiveInt,
  normalizeSearch,
};
