/**
 * Generate URL-friendly slug from string
 * @param {string} text
 * @returns {string} slug
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with -
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens
};

export default slugify;
