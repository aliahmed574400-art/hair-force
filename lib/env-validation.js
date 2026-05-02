/**
 * Environment Variable Validation
 * Ensures all required environment variables are properly set
 * Run this on application startup
 */

const REQUIRED_ENV_VARS = {
  // Database
  DATABASE_URL: {
    required: true,
    description: "PostgreSQL database connection string",
    pattern: /^postgres(ql)?:\/\//
  },

  // Session
  SESSION_SECRET: {
    required: true,
    description: "Session signing secret (64+ hex characters)",
    pattern: /^[a-f0-9]{64,}$/,
    minLength: 64
  },

  // Payment
  STRIPE_SECRET_KEY: {
    required: false,
    description: "Stripe API secret key",
    pattern: /^sk_live_|^sk_test_/
  },

  // Email
  RESEND_API_KEY: {
    required: false,
    description: "Resend email API key"
  },

  // Google OAuth
  GOOGLE_OAUTH_ID: {
    required: false,
    description: "Google OAuth client ID"
  },

  GOOGLE_OAUTH_SECRET: {
    required: false,
    description: "Google OAuth client secret"
  },

  // Google Maps
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: {
    required: false,
    description: "Google Maps API key"
  },

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: {
    required: false,
    description: "Cloudinary cloud name"
  },

  // Security
  NODE_ENV: {
    required: true,
    description: "Node environment",
    pattern: /^(development|production|staging)$/
  }
};

const OPTIONAL_ENV_VARS = {
  OTP_TTL_SECONDS: {
    description: "OTP expiration time in seconds (min 30, default 60)",
    default: 60,
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= 30;
    }
  },

  PASSWORD_RESET_TOKEN_TTL_SECONDS: {
    description: "Password reset token expiration (min 300, default 900)",
    default: 900,
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && num >= 300;
    }
  },

  SESSION_MAX_AGE_SECONDS: {
    description: "Session max age in seconds (default: 7 days)",
    default: 60 * 60 * 24 * 7,
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && num > 0;
    }
  },

  NEXT_PUBLIC_APP_URL: {
    description: "Application URL for redirects",
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
  },

  LOG_LEVEL: {
    description: "Log level (error, warn, info, debug)",
    default: "info",
    validate: (value) => ["error", "warn", "info", "debug"].includes(value)
  }
};

/**
 * Validate environment variable exists
 * @param {string} name
 * @param {Object} config
 * @returns {{valid: boolean, error?: string}}
 */
function validateEnvVar(name, config = {}) {
  const value = process.env[name];

  if (!value) {
    if (config.required) {
      return {
        valid: false,
        error: `Missing required environment variable: ${name}`
      };
    }
    return { valid: true };
  }

  // Check pattern
  if (config.pattern && !config.pattern.test(value)) {
    return {
      valid: false,
      error: `Invalid format for ${name}: ${config.description}`
    };
  }

  // Check minimum length
  if (config.minLength && value.length < config.minLength) {
    return {
      valid: false,
      error: `${name} must be at least ${config.minLength} characters`
    };
  }

  // Custom validation
  if (config.validate && !config.validate(value)) {
    return {
      valid: false,
      error: `Invalid value for ${name}: ${config.description}`
    };
  }

  return { valid: true };
}

/**
 * Validate all environment variables
 * @returns {{valid: boolean, errors: Array<string>}}
 */
export function validateAllEnvVars() {
  const errors = [];

  // Check required vars
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const validation = validateEnvVar(name, config);
    if (!validation.valid) {
      errors.push(validation.error);
    }
  }

  // Check optional vars with validation
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const validation = validateEnvVar(name, config);
    if (!validation.valid && process.env[name]) {
      errors.push(validation.error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Print environment variable setup instructions
 * @param {Array<string>} missingVars
 */
export function printEnvSetupInstructions(missingVars = []) {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║          Environment Setup Required for HairForce             ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  console.log("Create a .env.local file in your project root with:\n");

  // Required variables
  console.log("REQUIRED VARIABLES:");
  console.log("─".repeat(60));
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    if (config.required) {
      console.log(`✗ ${name}`);
      console.log(`  Description: ${config.description}`);
      if (config.pattern) {
        console.log(`  Pattern: ${config.pattern}`);
      }
      console.log("");
    }
  }

  // Optional but recommended
  console.log("\nRECOMMENDED VARIABLES:");
  console.log("─".repeat(60));
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!config.required) {
      console.log(`○ ${name}`);
      console.log(`  Description: ${config.description}`);
      if (config.pattern) {
        console.log(`  Pattern: ${config.pattern}`);
      }
      console.log("");
    }
  }

  // Generate SESSION_SECRET helper
  console.log("\nTo generate a secure SESSION_SECRET, run:");
  console.log("─".repeat(60));
  console.log('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.log("");
}

/**
 * Initialize and validate environment on app startup
 * Call this in your app initialization
 */
export function initializeEnvironment() {
  const validation = validateAllEnvVars();

  if (!validation.valid) {
    console.error("\n❌ ENVIRONMENT VALIDATION FAILED:\n");
    validation.errors.forEach((error) => {
      console.error(`   • ${error}`);
    });
    console.error("");

    if (process.env.NODE_ENV === "production") {
      console.error(
        "🚨 Cannot start production server with invalid environment configuration."
      );
      process.exit(1);
    } else {
      printEnvSetupInstructions(validation.errors);
      console.warn("⚠️  Continuing in development mode, but fix these issues before deploying.");
    }
  } else {
    console.log("✅ Environment variables validated successfully");
  }

  return validation.valid;
}

/**
 * Get environment variable with validation
 * @param {string} name
 * @param {*} defaultValue
 * @returns {*}
 */
export function getEnvVar(name, defaultValue = undefined) {
  const value = process.env[name];

  if (!value && defaultValue !== undefined) {
    return defaultValue;
  }

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

/**
 * Check if running in production
 * @returns {boolean}
 */
export function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in development
 * @returns {boolean}
 */
export function isDevelopment() {
  return process.env.NODE_ENV === "development";
}

/**
 * Get debug mode
 * @returns {boolean}
 */
export function isDebugMode() {
  return process.env.DEBUG === "true" || isDevelopment();
}

export { REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS };
