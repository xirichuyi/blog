// Logger utility for conditional logging
// Only logs in development mode to avoid console pollution in production

const isDevelopment = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    error: (...args: unknown[]) => {
        if (isDevelopment) {
            console.error(...args);
        }
    },

    warn: (...args: unknown[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    info: (...args: unknown[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },

    debug: (...args: unknown[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    // Special method for critical errors that should always be logged
    critical: (...args: unknown[]) => {
        console.error('[CRITICAL]', ...args);
    }
};

export default logger;
