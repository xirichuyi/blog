import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <md-icon className="error-boundary-icon">error</md-icon>
            
            <h2 className="error-boundary-title md-typescale-headline-medium">
              Something went wrong
            </h2>
            
            <p className="error-boundary-message md-typescale-body-large">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary-details">
                <summary className="error-boundary-details-summary md-typescale-title-medium">
                  Error Details (Development)
                </summary>
                <pre className="error-boundary-stack md-typescale-body-small">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="error-boundary-actions">
              <md-filled-button onClick={this.handleRetry}>
                <md-icon slot="icon">refresh</md-icon>
                Try Again
              </md-filled-button>
              
              <md-outlined-button onClick={this.handleReload}>
                <md-icon slot="icon">home</md-icon>
                Reload Page
              </md-outlined-button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
