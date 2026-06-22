// Logger utility for conditional logging
// Only logs in development mode to avoid console pollution in production

const isDevelopment = import.meta.env.DEV;

export const logger = {
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    error: (...args: any[]) => {
        if (isDevelopment) {
            console.error(...args);
        }
    },

    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },

    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    // Special method for critical errors that should always be logged
    critical: (...args: any[]) => {
        console.error('[CRITICAL]', ...args);
    }
};

export default logger;
