// Protected Route Component - Guards admin pages from unauthorized access

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import './style.css';

interface ProtectedRouteProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    fallback
}) => {
    const { isAuthenticated, user, isLoading, checkAuth } = useAuth();
    const location = useLocation();
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        const verifyAuth = async () => {
            if (!isAuthenticated && !isLoading) {
                // Try to verify authentication if not already authenticated
                try {
                    setIsVerifying(true);
                    await checkAuth();
                } catch (error) {
                    console.error('Auth verification failed:', error);
                } finally {
                    setIsVerifying(false);
                }
            } else {
                setIsVerifying(false);
            }
        };

        verifyAuth();
    }, [isAuthenticated, isLoading, checkAuth]);

    // Show loading spinner while checking authentication
    if (isLoading || isVerifying) {
        return (
            <div className="protected-route-loading">
                <LoadingSpinner />
                <p className="loading-text">验证身份中...</p>
            </div>
        );
    }

    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to="/admin/login"
                state={{
                    from: location.pathname,
                    message: '请先登录以访问管理后台'
                }}
                replace
            />
        );
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
        return (
            <div className="protected-route-unauthorized">
                <div className="unauthorized-content">
                    <md-icon className="unauthorized-icon">block</md-icon>
                    <h2 className="md-typescale-headline-medium">访问被拒绝</h2>
                    <p className="md-typescale-body-large">
                        您没有权限访问此页面。只有管理员可以访问后台管理系统。
                    </p>
                    <div className="unauthorized-actions">
                        <md-filled-button onClick={() => window.history.back()}>
                            <md-icon slot="icon">arrow_back</md-icon>
                            返回上一页
                        </md-filled-button>
                        <md-outlined-button onClick={() => window.location.href = '/'}>
                            <md-icon slot="icon">home</md-icon>
                            回到首页
                        </md-outlined-button>
                    </div>
                </div>
            </div>
        );
    }

    // User is authenticated and has admin role, render children
    return <>{children}</>;
};

export default ProtectedRoute;
