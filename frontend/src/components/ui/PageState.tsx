import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './PageState.css';

interface PageStateProps {
  type: 'loading' | 'error' | 'empty' | 'offline';
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const PageState: React.FC<PageStateProps> = ({
  type,
  title,
  message,
  icon,
  actionLabel,
  onAction,
  className = '',
  size = 'medium'
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'loading':
        return {
          title: 'Loading...',
          message: 'Please wait while we load the content.',
          icon: null
        };
      case 'error':
        return {
          title: 'Something went wrong',
          message: 'An error occurred while loading the content. Please try again.',
          icon: 'error',
          actionLabel: 'Try Again'
        };
      case 'empty':
        return {
          title: 'No content found',
          message: 'There is no content to display at the moment.',
          icon: 'inbox',
          actionLabel: 'Refresh'
        };
      case 'offline':
        return {
          title: 'You\'re offline',
          message: 'Please check your internet connection and try again.',
          icon: 'wifi_off',
          actionLabel: 'Retry'
        };
      default:
        return {
          title: 'Unknown state',
          message: 'Something unexpected happened.',
          icon: 'help'
        };
    }
  };

  const defaultContent = getDefaultContent();
  const finalTitle = title || defaultContent.title;
  const finalMessage = message || defaultContent.message;
  const finalIcon = icon || defaultContent.icon;
  const finalActionLabel = actionLabel || defaultContent.actionLabel;

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'page-state--small';
      case 'large':
        return 'page-state--large';
      default:
        return 'page-state--medium';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return '48px';
      case 'large':
        return '80px';
      default:
        return '64px';
    }
  };

  return (
    <div className={`page-state page-state--${type} ${getSizeClass()} ${className}`}>
      <div className="page-state__content">
        {type === 'loading' ? (
          <LoadingSpinner
            size={size}
            message={finalMessage}
            className="page-state__loading"
          />
        ) : (
          <>
            {finalIcon && (
              <md-icon 
                className={`page-state__icon page-state__icon--${type}`}
                style={{ fontSize: getIconSize() }}
              >
                {finalIcon}
              </md-icon>
            )}
            
            <h2 className={`page-state__title ${
              size === 'small' ? 'md-typescale-title-large' : 
              size === 'large' ? 'md-typescale-display-small' : 
              'md-typescale-headline-medium'
            }`}>
              {finalTitle}
            </h2>
            
            <p className={`page-state__message ${
              size === 'small' ? 'md-typescale-body-medium' : 'md-typescale-body-large'
            }`}>
              {finalMessage}
            </p>
            
            {finalActionLabel && onAction && (
              <div className="page-state__actions">
                <md-filled-button onClick={onAction}>
                  <md-icon slot="icon">refresh</md-icon>
                  {finalActionLabel}
                </md-filled-button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Convenience components for common states
export const LoadingState: React.FC<Omit<PageStateProps, 'type'>> = (props) => (
  <PageState type="loading" {...props} />
);

export const ErrorState: React.FC<Omit<PageStateProps, 'type'>> = (props) => (
  <PageState type="error" {...props} />
);

export const EmptyState: React.FC<Omit<PageStateProps, 'type'>> = (props) => (
  <PageState type="empty" {...props} />
);

export const OfflineState: React.FC<Omit<PageStateProps, 'type'>> = (props) => (
  <PageState type="offline" {...props} />
);

// Hook for managing page states
export const usePageState = () => {
  const [state, setState] = React.useState<{
    type: PageStateProps['type'] | null;
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
  }>({ type: null });

  const setLoading = (message?: string) => {
    setState({ type: 'loading', message });
  };

  const setError = (title?: string, message?: string, onRetry?: () => void) => {
    setState({ 
      type: 'error', 
      title, 
      message, 
      actionLabel: 'Try Again',
      onAction: onRetry 
    });
  };

  const setEmpty = (title?: string, message?: string, onRefresh?: () => void) => {
    setState({ 
      type: 'empty', 
      title, 
      message, 
      actionLabel: 'Refresh',
      onAction: onRefresh 
    });
  };

  const setOffline = (onRetry?: () => void) => {
    setState({ 
      type: 'offline',
      actionLabel: 'Retry',
      onAction: onRetry 
    });
  };

  const clearState = () => {
    setState({ type: null });
  };

  const renderState = (props?: Partial<PageStateProps>) => {
    if (!state.type) return null;
    
    return (
      <PageState
        type={state.type}
        title={state.title}
        message={state.message}
        actionLabel={state.actionLabel}
        onAction={state.onAction}
        {...props}
      />
    );
  };

  return {
    state: state.type,
    setLoading,
    setError,
    setEmpty,
    setOffline,
    clearState,
    renderState
  };
};

export default PageState;
