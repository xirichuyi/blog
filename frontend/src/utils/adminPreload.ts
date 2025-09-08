/**
 * Utility for preloading admin components based on user behavior
 * This helps improve perceived performance when navigating between admin pages
 */

/**
 * Preload admin components based on the current route
 * @param currentPath Current admin route path
 */
export const preloadAdminComponents = (currentPath: string): void => {
    // Only preload if we're in the admin section
    if (!currentPath.startsWith('/admin')) return;

    // Preload related components based on current route
    if (currentPath.includes('/admin/posts')) {
        // When in posts section, preload post editor
        import('../components/admin/PostEditor');

        // Also preload categories and tags management as it's related
        setTimeout(() => {
            import('../components/admin/CategoriesTagsManagement');
        }, 2000);
    }

    if (currentPath.includes('/admin/dashboard')) {
        // When in dashboard, preload commonly accessed sections with delay
        setTimeout(() => {
            import('../components/admin/PostManagement');
        }, 1000);

        setTimeout(() => {
            import('../components/admin/MusicManagement');
        }, 2000);
    }

    if (currentPath.includes('/admin/music')) {
        // When in music section, preload music upload
        import('../components/admin/MusicUpload');
    }
};

/**
 * Initialize admin preloading based on user navigation
 */
export const initAdminPreloading = (): void => {
    // Listen for route changes to preload relevant admin components
    const handleRouteChange = () => {
        preloadAdminComponents(window.location.pathname);
    };

    // Initial preload based on current route
    handleRouteChange();

    // Set up navigation listener
    window.addEventListener('popstate', handleRouteChange);

    // Clean up listener on unload
    window.addEventListener('unload', () => {
        window.removeEventListener('popstate', handleRouteChange);
    });
};

export default {
    preloadAdminComponents,
    initAdminPreloading
};

