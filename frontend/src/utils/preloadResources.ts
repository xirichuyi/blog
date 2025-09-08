/**
 * Utility for preloading resources based on the current route
 * This helps improve performance by loading critical assets before they're needed
 */

interface PreloadOptions {
    as: 'script' | 'style' | 'image' | 'font' | 'fetch';
    type?: string;
    crossOrigin?: boolean;
    fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Preload a resource with a specified priority
 * @param url Resource URL to preload
 * @param options Preload options
 */
export const preloadResource = (url: string, options: PreloadOptions): void => {
    // Skip if the resource is already preloaded or loaded
    const existingLinks = document.querySelectorAll(`link[href="${url}"]`);
    if (existingLinks.length > 0) return;

    const link = document.createElement('link');
    link.rel = options.as === 'script' ? 'modulepreload' : 'preload';
    link.href = url;
    link.as = options.as;

    if (options.type) {
        link.type = options.type;
    }

    if (options.crossOrigin) {
        link.crossOrigin = 'anonymous';
    }

    if (options.fetchPriority) {
        link.setAttribute('fetchpriority', options.fetchPriority);
    }

    document.head.appendChild(link);
};

/**
 * Prefetch a resource (lower priority than preload)
 * @param url Resource URL to prefetch
 */
export const prefetchResource = (url: string): void => {
    // Skip if the resource is already prefetched or loaded
    const existingLinks = document.querySelectorAll(`link[href="${url}"]`);
    if (existingLinks.length > 0) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
};

/**
 * Preconnect to a domain to establish early connection
 * @param url Domain URL to preconnect to
 * @param crossOrigin Whether to include crossorigin attribute
 */
export const preconnect = (url: string, crossOrigin = false): void => {
    const existingLinks = document.querySelectorAll(`link[href="${url}"]`);
    if (existingLinks.length > 0) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;

    if (crossOrigin) {
        link.crossOrigin = 'anonymous';
    }

    document.head.appendChild(link);
};

// Route-based preloading strategies
interface RouteResources {
    [key: string]: {
        preload: Array<{ url: string, options: PreloadOptions }>;
        prefetch: Array<string>;
    };
}

// Define critical resources for each route
const routeResources: RouteResources = {
    // Home page resources
    '/': {
        preload: [
            {
                url: '/assets/blog-DtFIdPV9.css',
                options: { as: 'style' }
            },
            {
                url: '/assets/blog-DNxQE78E.js',
                options: { as: 'script' }
            }
        ],
        prefetch: [
            '/assets/index-Cr_CckH0.css',
            '/assets/index-QTv9X-bu.js'
        ]
    },
    // Admin page resources
    '/admin': {
        preload: [
            {
                url: '/assets/admin-6CHzR_PM.css',
                options: { as: 'style' }
            },
            {
                url: '/assets/admin-CrARhWOK.js',
                options: { as: 'script' }
            }
        ],
        prefetch: []
    },
    // Blog post page resources
    '/post': {
        preload: [
            {
                url: '/assets/blog-DtFIdPV9.css',
                options: { as: 'style' }
            },
            {
                url: '/assets/blog-DNxQE78E.js',
                options: { as: 'script' }
            }
        ],
        prefetch: []
    }
};

/**
 * Preload resources based on the current route
 * @param currentPath Current route path
 */
export const preloadRouteResources = (currentPath: string): void => {
    // Find the matching route pattern
    const routePattern = Object.keys(routeResources).find(pattern =>
        currentPath === pattern || currentPath.startsWith(pattern + '/')
    );

    if (!routePattern || !routeResources[routePattern]) return;

    const resources = routeResources[routePattern];

    // Preload high priority resources
    resources.preload.forEach(resource => {
        preloadResource(resource.url, resource.options);
    });

    // Prefetch lower priority resources
    resources.prefetch.forEach(url => {
        prefetchResource(url);
    });
};

/**
 * Initialize preloading for the current route
 */
export const initPreloading = (): void => {
    // Preload resources for the initial route
    preloadRouteResources(window.location.pathname);

    // Set up navigation observer to preload resources on route changes
    const observer = new MutationObserver(() => {
        preloadRouteResources(window.location.pathname);
    });

    // Start observing the document body for changes that might indicate route changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Clean up observer on page unload
    window.addEventListener('unload', () => {
        observer.disconnect();
    });
};

export default {
    preloadResource,
    prefetchResource,
    preconnect,
    preloadRouteResources,
    initPreloading
};

