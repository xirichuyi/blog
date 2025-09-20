// Material Web Components Type Declarations

declare namespace JSX {
  interface IntrinsicElements {
    // Segmented Button Components
    'md-segmented-button-set': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-segmented-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      selected?: boolean;
      onClick?: () => void;
    }, HTMLElement>;
    
    // Button Components
    'md-filled-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-outlined-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-text-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-fab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Input Components
    'md-outlined-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      label?: string;
      value?: string;
      type?: string;
      required?: boolean;
      disabled?: boolean;
    }, HTMLElement>;
    'md-filled-text-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      label?: string;
      value?: string;
      type?: string;
      required?: boolean;
      disabled?: boolean;
    }, HTMLElement>;
    
    // Selection Components
    'md-checkbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      checked?: boolean;
      indeterminate?: boolean;
      disabled?: boolean;
    }, HTMLElement>;
    'md-radio': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      checked?: boolean;
      disabled?: boolean;
      name?: string;
      value?: string;
    }, HTMLElement>;
    'md-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      selected?: boolean;
      disabled?: boolean;
    }, HTMLElement>;
    
    // Navigation Components
    'md-tabs': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-primary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      active?: boolean;
    }, HTMLElement>;
    'md-secondary-tab': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      active?: boolean;
    }, HTMLElement>;
    
    // Progress Components
    'md-circular-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      indeterminate?: boolean;
      value?: number;
      max?: number;
    }, HTMLElement>;
    'md-linear-progress': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      indeterminate?: boolean;
      value?: number;
      max?: number;
    }, HTMLElement>;
    
    // Menu Components
    'md-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      open?: boolean;
      anchor?: string;
    }, HTMLElement>;
    'md-menu-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Dialog Components
    'md-dialog': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      open?: boolean;
    }, HTMLElement>;
    
    // Card Components
    'md-elevated-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-filled-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-outlined-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // List Components
    'md-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-list-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Icon Component
    'md-icon': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      slot?: string;
    }, HTMLElement>;
    
    // Chip Components
    'md-assist-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-filter-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      selected?: boolean;
    }, HTMLElement>;
    'md-input-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'md-suggestion-chip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Slider Components
    'md-slider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
      value?: number;
      min?: number;
      max?: number;
      step?: number;
      disabled?: boolean;
    }, HTMLElement>;
    
    // Tooltip Component
    'md-tooltip': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Divider Component
    'md-divider': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Ripple Component
    'md-ripple': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
