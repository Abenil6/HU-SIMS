/**
 * Standardize grade value (e.g., "Grade 9" -> "9", "9" -> "9")
 */
const normalizeGrade = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/^Grade\s+/i, '')
    .trim();
};

/**
 * Standardize stream/section value (e.g., "Natural Science" -> "Natural")
 */
const normalizeStream = (value) => {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/\s*Science$/i, '')
    .trim();
};

module.exports = {
  normalizeGrade,
  normalizeStream,
};
