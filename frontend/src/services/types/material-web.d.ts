// Material Web Components Type Declarations
//
// Web components use `class` (not `className`) and need CSS custom properties
// in their style attribute, so we define a custom base props type.

import React from 'react';

/**
 * Style type that allows CSS custom properties (e.g. --md-circular-progress-size).
 * Extends CSSProperties to also accept `--*` custom property keys.
 */
type MdStyle = React.CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};

/**
 * Base props shared by all Material Web custom elements.
 * Includes standard HTML attributes plus web-component-specific ones.
 */
interface MdBaseProps {
  children?: React.ReactNode;
  key?: React.Key;
  class?: string;
  className?: string;
  slot?: string;
  id?: string;
  hidden?: boolean;
  dir?: string;
  lang?: string;
  title?: string;
  tabIndex?: number;
  role?: string;
  style?: MdStyle;
  ref?: React.Ref<HTMLElement>;

  // Common event handlers
  onClick?: React.MouseEventHandler<HTMLElement>;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLElement>;
  onPointerDown?: React.PointerEventHandler<HTMLElement>;
  onPointerUp?: React.PointerEventHandler<HTMLElement>;
  onMouseDown?: React.MouseEventHandler<HTMLElement>;
  onMouseUp?: React.MouseEventHandler<HTMLElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  onInput?: React.FormEventHandler<HTMLElement>;
  onChange?: React.FormEventHandler<HTMLElement>;

  // aria attributes
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-expanded'?: boolean | 'true' | 'false';
  'aria-haspopup'?: boolean | 'true' | 'false';
  'aria-controls'?: string;
  'aria-selected'?: boolean | 'true' | 'false';
  'aria-disabled'?: boolean | 'true' | 'false';
}

/** Props common to button-like elements. */
interface MdButtonProps extends MdBaseProps {
  disabled?: boolean;
  type?: string;
  href?: string;
  target?: string;
  'trailing-icon'?: boolean;
  hasIcon?: boolean;
}

/** Props common to progress elements. */
interface MdProgressProps extends MdBaseProps {
  indeterminate?: boolean;
  value?: number;
  max?: number;
  'four-color'?: boolean;
}

/** Props for text field elements. */
interface MdTextFieldProps extends MdBaseProps {
  label?: string;
  value?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  readOnly?: boolean;
  rows?: number;
  cols?: number;
  supportingText?: string;
  errorText?: string;
  error?: boolean;
  prefixText?: string;
  suffixText?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // ── Buttons ──────────────────────────────────────────────
      'md-filled-button': MdButtonProps;
      'md-outlined-button': MdButtonProps;
      'md-text-button': MdButtonProps;
      'md-elevated-button': MdButtonProps;
      'md-filled-tonal-button': MdButtonProps;

      // ── Icon Buttons ─────────────────────────────────────────
      'md-icon-button': MdButtonProps & { toggle?: boolean; selected?: boolean };
      'md-filled-icon-button': MdButtonProps & { toggle?: boolean; selected?: boolean };
      'md-outlined-icon-button': MdButtonProps & { toggle?: boolean; selected?: boolean };
      'md-filled-tonal-icon-button': MdButtonProps & { toggle?: boolean; selected?: boolean };

      // ── FAB ──────────────────────────────────────────────────
      'md-fab': MdButtonProps & { size?: string; label?: string; variant?: string };
      'md-branded-fab': MdButtonProps & { size?: string; label?: string };

      // ── Icon ─────────────────────────────────────────────────
      'md-icon': MdBaseProps;

      // ── Text Fields ──────────────────────────────────────────
      'md-outlined-text-field': MdTextFieldProps;
      'md-filled-text-field': MdTextFieldProps;

      // ── Form Controls ────────────────────────────────────────
      'md-checkbox': MdBaseProps & {
        checked?: boolean;
        indeterminate?: boolean;
        disabled?: boolean;
        name?: string;
        value?: string;
      };
      'md-radio': MdBaseProps & {
        checked?: boolean;
        disabled?: boolean;
        name?: string;
        value?: string;
      };
      'md-switch': MdBaseProps & {
        selected?: boolean;
        disabled?: boolean;
        name?: string;
        value?: string;
      };
      'md-slider': MdBaseProps & {
        value?: number;
        min?: number;
        max?: number;
        step?: number;
        disabled?: boolean;
      };

      // ── Select ───────────────────────────────────────────────
      'md-filled-select': MdBaseProps & {
        label?: string;
        value?: string;
        disabled?: boolean;
        required?: boolean;
      };
      'md-outlined-select': MdBaseProps & {
        label?: string;
        value?: string;
        disabled?: boolean;
        required?: boolean;
      };
      'md-select-option': MdBaseProps & {
        value?: string;
        selected?: boolean;
        disabled?: boolean;
        headline?: string;
      };

      // ── Tabs / Navigation ────────────────────────────────────
      'md-tabs': MdBaseProps & { 'active-tab-index'?: number };
      'md-primary-tab': MdBaseProps & { active?: boolean; 'inline-icon'?: boolean };
      'md-secondary-tab': MdBaseProps & { active?: boolean; 'inline-icon'?: boolean };

      // ── Progress Indicators ──────────────────────────────────
      'md-circular-progress': MdProgressProps;
      'md-linear-progress': MdProgressProps & { buffer?: number };

      // ── Cards ────────────────────────────────────────────────
      'md-elevated-card': MdBaseProps;
      'md-filled-card': MdBaseProps;
      'md-outlined-card': MdBaseProps;

      // ── Chips ────────────────────────────────────────────────
      'md-chip-set': MdBaseProps;
      'md-assist-chip': MdBaseProps & { disabled?: boolean; label?: string; elevated?: boolean };
      'md-filter-chip': MdBaseProps & { selected?: boolean; disabled?: boolean; label?: string; elevated?: boolean };
      'md-input-chip': MdBaseProps & { disabled?: boolean; label?: string; 'remove-only'?: boolean };
      'md-suggestion-chip': MdBaseProps & { disabled?: boolean; label?: string; elevated?: boolean };

      // ── List ─────────────────────────────────────────────────
      'md-list': MdBaseProps;
      'md-list-item': MdBaseProps & {
        type?: string;
        disabled?: boolean;
        href?: string;
        target?: string;
      };

      // ── Menu ─────────────────────────────────────────────────
      'md-menu': MdBaseProps & {
        open?: boolean;
        anchor?: string;
        positioning?: string;
        'has-overflow'?: boolean;
        quick?: boolean;
      };
      'md-menu-item': MdBaseProps & { disabled?: boolean; keepOpen?: boolean };
      'md-sub-menu': MdBaseProps;

      // ── Dialog ───────────────────────────────────────────────
      'md-dialog': MdBaseProps & {
        open?: boolean;
        type?: string;
      };

      // ── Divider ──────────────────────────────────────────────
      'md-divider': MdBaseProps & { inset?: boolean; 'inset-start'?: boolean; 'inset-end'?: boolean };

      // ── Badge (labs) ─────────────────────────────────────────
      'md-badge': MdBaseProps & { value?: string | number };

      // ── Item (labs) ──────────────────────────────────────────
      'md-item': MdBaseProps;

      // ── Navigation (labs) ────────────────────────────────────
      'md-navigation-bar': MdBaseProps & { 'active-index'?: number };
      'md-navigation-tab': MdBaseProps & { active?: boolean; label?: string; 'badge-value'?: string };
      'md-navigation-drawer': MdBaseProps & { opened?: boolean };
      'md-navigation-drawer-modal': MdBaseProps & { opened?: boolean };

      // ── Segmented Button (labs) ──────────────────────────────
      'md-outlined-segmented-button-set': MdBaseProps;
      'md-outlined-segmented-button': MdBaseProps & {
        selected?: boolean;
        disabled?: boolean;
        label?: string;
      };

      // ── Segmented Button (aliases without "outlined-" prefix) ──
      'md-segmented-button-set': MdBaseProps;
      'md-segmented-button': MdBaseProps & {
        selected?: boolean;
        disabled?: boolean;
        label?: string;
      };

      // ── Ripple ───────────────────────────────────────────────
      'md-ripple': MdBaseProps & { disabled?: boolean };

      // ── Tooltip ──────────────────────────────────────────────
      'md-tooltip': MdBaseProps;
    }
  }
}

export {};
