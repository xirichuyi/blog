import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  icon?: string;
}

interface ConfirmDialogProps extends ConfirmDialogOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  icon,
  onConfirm,
  onCancel
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleAnimationEnd = () => {
    if (!open) {
      setIsVisible(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  };

  const getTypeIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'check_circle';
      default:
        return 'info';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'warning':
        return 'var(--md-sys-color-tertiary)';
      case 'error':
        return 'var(--md-sys-color-error)';
      case 'success':
        return 'var(--md-sys-color-primary)';
      default:
        return 'var(--md-sys-color-primary)';
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <div
      className={`confirm-dialog-backdrop ${open ? 'open' : 'closing'}`}
      onClick={handleBackdropClick}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className={`confirm-dialog ${open ? 'open' : 'closing'} confirm-dialog-${type}`}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-icon" style={{ color: getTypeColor() }}>
            <md-icon>{getTypeIcon()}</md-icon>
          </div>
          <h2 id="dialog-title" className="confirm-dialog-title md-typescale-headline-small">
            {title}
          </h2>
        </div>

        <div className="confirm-dialog-content">
          <p id="dialog-message" className="confirm-dialog-message md-typescale-body-medium">
            {message}
          </p>
        </div>

        <div className="confirm-dialog-actions">
          <md-text-button onClick={onCancel} class="cancel-button">
            {cancelText}
          </md-text-button>
          <md-filled-button 
            onClick={onConfirm} 
            class={`confirm-button confirm-button-${type}`}
          >
            {confirmText}
          </md-filled-button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Global confirm dialog manager
class ConfirmDialogManager {
  private static instance: ConfirmDialogManager;
  private container: HTMLDivElement | null = null;
  private currentDialog: {
    resolve: (value: boolean) => void;
    component: React.ReactElement;
  } | null = null;

  static getInstance(): ConfirmDialogManager {
    if (!ConfirmDialogManager.instance) {
      ConfirmDialogManager.instance = new ConfirmDialogManager();
    }
    return ConfirmDialogManager.instance;
  }

  private createContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'confirm-dialog-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      // Close any existing dialog
      if (this.currentDialog) {
        this.currentDialog.resolve(false);
      }

      const container = this.createContainer();
      
      const handleConfirm = () => {
        this.currentDialog = null;
        resolve(true);
        this.unmount();
      };

      const handleCancel = () => {
        this.currentDialog = null;
        resolve(false);
        this.unmount();
      };

      const dialogComponent = (
        <ConfirmDialog
          {...options}
          open={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      this.currentDialog = {
        resolve,
        component: dialogComponent
      };

      // Use React 18's createRoot if available, fallback to ReactDOM.render
      if (typeof window !== 'undefined' && (window as any).React18Root) {
        const root = (window as any).React18Root.createRoot(container);
        root.render(dialogComponent);
      } else {
        // Fallback for older React versions
        import('react-dom').then(ReactDOM => {
          ReactDOM.render(dialogComponent, container);
        });
      }
    });
  }

  private unmount() {
    if (this.container) {
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
          this.container = null;
        }
      }, 300); // Wait for animation to complete
    }
  }
}

// Export the global function
export const showConfirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  return ConfirmDialogManager.getInstance().show(options);
};

export default ConfirmDialog;
