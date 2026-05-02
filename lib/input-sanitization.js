/**
 * Input Sanitization & Validation Utilities
 * Prevents XSS, HTML injection, and other input-based attacks
 */

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };
  return String(text || "").replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitize user input by removing HTML tags and dangerous content
 * @param {string} input
 * @returns {string}
 */
export function sanitizeUserInput(input) {
  let text = String(input || "").trim();
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, "");
  
  // Remove common XSS patterns
  text = text
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/eval\(/gi, "")
    .replace(/expression\(/gi, "");
  
  // Limit length to prevent DOS
  text = text.slice(0, 5000);
  
  return text;
}

/**
 * Validate email address
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email || "").toLowerCase());
}

/**
 * Validate phone number (basic format)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
  const digitsOnly = String(phone || "").replace(/\D/g, "");
  return phoneRegex.test(phone || "") && digitsOnly.length >= 10;
}

/**
 * Validate URL
 * @param {string} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate strong password
 * Password must have:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * @param {string} password
 * @returns {boolean}
 */
export function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]{8,}$/;
  return regex.test(password || "");
}

/**
 * Validate slug (URL-friendly name)
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug || "");
}

/**
 * Sanitize object by removing dangerous properties and values
 * @param {Object} obj
 * @param {Array} allowedKeys - Whitelist of allowed keys
 * @returns {Object}
 */
export function sanitizeObject(obj, allowedKeys = []) {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const sanitized = {};
  
  for (const key of allowedKeys) {
    if (key in obj) {
      const value = obj[key];
      
      if (typeof value === "string") {
        sanitized[key] = sanitizeUserInput(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === "string" ? sanitizeUserInput(item) : item
        );
      }
      // Skip objects, functions, etc. for security
    }
  }

  return sanitized;
}

/**
 * Validate price/amount
 * @param {number} amount
 * @returns {boolean}
 */
export function isValidPrice(amount) {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num <= 999999;
}

/**
 * Validate date string (YYYY-MM-DD)
 * @param {string} dateString
 * @returns {boolean}
 */
export function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Sanitize SQL-like strings (basic prevention)
 * @param {string} input
 * @returns {string}
 */
export function sanitizeSqlInput(input) {
  let text = String(input || "");
  
  // Remove common SQL injection patterns
  text = text
    .replace(/['"`;]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "");
  
  return text;
}

/**
 * Normalize and validate user name
 * @param {string} name
 * @returns {string | null}
 */
export function normalizeUserName(name) {
  let normalized = sanitizeUserInput(name);
  
  // Trim and collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Validate length
  if (normalized.length < 2 || normalized.length > 100) {
    return null;
  }
  
  return normalized;
}

/**
 * Validate and normalize address
 * @param {string} address
 * @returns {string | null}
 */
export function normalizeAddress(address) {
  let normalized = sanitizeUserInput(address);
  
  // Trim and collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Validate length
  if (normalized.length < 5 || normalized.length > 500) {
    return null;
  }
  
  return normalized;
}

/**
 * Validate UUID format
 * @param {string} uuid
 * @returns {boolean}
 */
export function isValidUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid || "");
}

/**
 * Validate role
 * @param {string} role
 * @returns {boolean}
 */
export function isValidRole(role) {
  const validRoles = ["client", "vendor", "admin"];
  return validRoles.includes(String(role || "").toLowerCase());
}

/**
 * Create sanitization context object
 * Usage: const sanitizer = createSanitizer(); sanitizer.email(input)
 * @returns {Object}
 */
export function createSanitizer() {
  return {
    email: (value) => {
      const email = String(value || "").trim().toLowerCase();
      return isValidEmail(email) ? email : null;
    },
    phone: (value) => {
      const phone = String(value || "").trim();
      return isValidPhone(phone) ? phone : null;
    },
    password: (value) => {
      return isStrongPassword(value) ? value : null;
    },
    slug: (value) => {
      const slug = String(value || "").trim().toLowerCase();
      return isValidSlug(slug) ? slug : null;
    },
    userInput: sanitizeUserInput,
    html: escapeHtml,
    number: (value) => {
      const num = Number(value);
      return isNaN(num) ? null : num;
    },
    boolean: (value) => {
      return value === true || value === "true" || value === 1 || value === "1";
    },
    array: (value, itemSanitizer = (x) => x) => {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map(itemSanitizer).filter((x) => x !== null && x !== undefined);
    }
  };
}
