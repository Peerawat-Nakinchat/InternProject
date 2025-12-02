// __mocks__/isomorphic-dompurify.js
/**
 * Mock for isomorphic-dompurify to avoid parse5 ESM issues in Jest
 */
const mockSanitize = (val, options) => {
  if (typeof val !== 'string') return val;
  
  // Remove all HTML tags
  let clean = val.replace(/<[^>]*>/g, '');
  
  // Apply trim if ALLOWED_TAGS is empty array
  if (options?.ALLOWED_TAGS?.length === 0) {
    clean = clean.trim();
  }
  
  return clean;
};

// Export both default and named export for compatibility
const DOMPurify = {
  sanitize: mockSanitize
};

export default DOMPurify;
export { mockSanitize as sanitize };