import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadRouteResources } from '../../utils/preloadResources';

/**
 * Route Preloader Component
 * 
 * This component listens for route changes and preloads resources
 * for the new route to improve performance.
 */
const RoutePreloader: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        // Preload resources for the current route
        preloadRouteResources(location.pathname);
    }, [location.pathname]);

    // This component doesn't render anything
    return null;
};

export default RoutePreloader;

