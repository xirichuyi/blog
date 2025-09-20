// Admin Login Page Component

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useForm, FormConfigs } from '../../../hooks/useForm';
import { ValidationRules } from '../../../utils';
import './style.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, isAuthenticated, error, isLoading, clearError } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate, location]);

    // Clear error when component unmounts
    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    // Clear error when user starts typing (handled in input handlers)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const success = await login({ username: username.trim(), password });

            if (success) {
                const from = (location.state as any)?.from?.pathname || '/admin/dashboard';
                navigate(from, { replace: true });
            }
        } catch (err) {
            console.error('Login failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
        if (error) clearError();
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (error) clearError();
    };

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-loading">
                        <md-circular-progress indeterminate></md-circular-progress>
                        <p>Checking authentication...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <md-icon className="login-icon">admin_panel_settings</md-icon>
                        <h1 className="login-title">Admin Login</h1>
                        <p className="login-subtitle">Sign in to access the admin panel</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-field">
                            <md-outlined-text-field
                                label="Username"
                                type="text"
                                value={username}
                                onInput={handleUsernameChange}
                                required
                                autocomplete="username"
                                class="login-input"
                            >
                                <md-icon slot="leading-icon">person</md-icon>
                            </md-outlined-text-field>
                        </div>

                        <div className="form-field">
                            <md-outlined-text-field
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onInput={handlePasswordChange}
                                required
                                autocomplete="current-password"
                                class="login-input"
                            >
                                <md-icon slot="leading-icon">lock</md-icon>
                                <md-icon-button
                                    slot="trailing-icon"
                                    onClick={() => setShowPassword(!showPassword)}
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    <md-icon>{showPassword ? 'visibility_off' : 'visibility'}</md-icon>
                                </md-icon-button>
                            </md-outlined-text-field>
                        </div>

                        {error && (
                            <div className="error-message">
                                <md-icon className="error-icon">error</md-icon>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="form-actions">
                            <md-filled-button
                                type="submit"
                                disabled={!username.trim() || !password.trim() || isSubmitting}
                                class="login-button"
                            >
                                {isSubmitting ? (
                                    <>
                                        <md-circular-progress
                                            indeterminate
                                            slot="icon"
                                            style={{ "--md-circular-progress-size": "18px" }}
                                        ></md-circular-progress>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <md-icon slot="icon">login</md-icon>
                                        Sign In
                                    </>
                                )}
                            </md-filled-button>
                        </div>
                    </form>

                    <div className="login-footer">
                        <md-text-button onClick={() => navigate('/')}>
                            <md-icon slot="icon">arrow_back</md-icon>
                            Back to Blog
                        </md-text-button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
