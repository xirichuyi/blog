import React, { Suspense, lazy, ComponentType } from 'react';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Higher-order component for lazy loading admin components
 * This helps reduce the initial bundle size by loading admin components only when needed
 * 
 * @param importFn Function that returns a dynamic import promise
 * @param fallback Optional custom loading component
 * @returns Lazy-loaded component with suspense
 */
export function lazyAdminComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback: React.ReactNode = <LoadingSpinner size="medium" />
) {
    const LazyComponent = lazy(importFn);

    return (props: React.ComponentProps<T>) => (
        <Suspense fallback={fallback}>
            <LazyComponent {...props} />
        </Suspense>
    );
}

// Pre-defined lazy components for common admin sections
export const LazyPostEditor = lazyAdminComponent(() =>
    import('./PostEditor')
);

export const LazyPostManagement = lazyAdminComponent(() =>
    import('./PostManagement')
);

export const LazyMusicManagement = lazyAdminComponent(() =>
    import('./MusicManagement')
);

export const LazyMusicUpload = lazyAdminComponent(() =>
    import('./MusicUpload')
);

export const LazyCategoriesTagsManagement = lazyAdminComponent(() =>
    import('./CategoriesTagsManagement')
);

export const LazyAboutManagement = lazyAdminComponent(() =>
    import('./AboutManagement')
);

export const LazyDashboard = lazyAdminComponent(() =>
    import('./Dashboard')
);

export default lazyAdminComponent;

