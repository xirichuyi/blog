// Protected Route Component for Admin Pages

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { preloadAdminComponents } from '../../utils/adminPreload';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="protected-route-loading">
        <md-circular-progress indeterminate></md-circular-progress>
        <p className="md-typescale-body-medium">Verifying access...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Preload related admin components based on current path
  useEffect(() => {
    preloadAdminComponents(location.pathname);
  }, [location.pathname]);

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
