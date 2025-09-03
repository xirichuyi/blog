import React, { useState, useEffect, useRef } from 'react';
import './EnhancedFormField.css';

interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: string) => boolean;
}

interface EnhancedFormFieldProps {
  label: string;
  type?: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'number' | 'url';
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  validationRules?: ValidationRule[];
  options?: { value: string; label: string }[]; // For select type
  rows?: number; // For textarea
  maxLength?: number;
  showCharCount?: boolean;
  helpText?: string;
  className?: string;
  autoComplete?: string;
  leadingIcon?: string;
  trailingIcon?: string;
  onTrailingIconClick?: () => void;
  debounceMs?: number; // For debounced validation
}

const EnhancedFormField: React.FC<EnhancedFormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  disabled = false,
  required = false,
  validationRules = [],
  options = [],
  rows = 4,
  maxLength,
  showCharCount = false,
  helpText,
  className = '',
  autoComplete,
  leadingIcon,
  trailingIcon,
  onTrailingIconClick,
  debounceMs = 300
}) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Add required rule if required prop is true
  const allRules = [
    ...(required ? [{ type: 'required' as const, message: `${label} is required` }] : []),
    ...validationRules
  ];

  // Validate field
  const validateField = (fieldValue: string): string[] => {
    const fieldErrors: string[] = [];

    allRules.forEach(rule => {
      switch (rule.type) {
        case 'required':
          if (!fieldValue.trim()) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (fieldValue && !emailRegex.test(fieldValue)) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'minLength':
          if (fieldValue.length < rule.value) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'maxLength':
          if (fieldValue.length > rule.value) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'pattern':
          const regex = new RegExp(rule.value);
          if (fieldValue && !regex.test(fieldValue)) {
            fieldErrors.push(rule.message);
          }
          break;
        case 'custom':
          if (rule.validator && fieldValue && !rule.validator(fieldValue)) {
            fieldErrors.push(rule.message);
          }
          break;
      }
    });

    return fieldErrors;
  };

  // Debounced validation
  const debouncedValidate = (fieldValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (touched) {
        const fieldErrors = validateField(fieldValue);
        setErrors(fieldErrors);
      }
    }, debounceMs);
  };

  // Effect for validation
  useEffect(() => {
    if (touched) {
      debouncedValidate(value);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, touched, debounceMs]);

  // Handle input change
  const handleChange = (newValue: string) => {
    // Enforce maxLength
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    onChange(newValue);
  };

  // Handle blur
  const handleBlur = () => {
    setTouched(true);
    setFocused(false);
    
    // Immediate validation on blur
    const fieldErrors = validateField(value);
    setErrors(fieldErrors);
    
    onBlur?.();
  };

  // Handle focus
  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Get field status
  const getFieldStatus = () => {
    if (!touched) return 'default';
    if (errors.length > 0) return 'error';
    if (value.trim()) return 'success';
    return 'default';
  };

  const fieldStatus = getFieldStatus();
  const hasError = fieldStatus === 'error';
  const hasSuccess = fieldStatus === 'success';

  // Render input based on type
  const renderInput = () => {
    const commonProps = {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleChange(e.target.value),
      onBlur: handleBlur,
      onFocus: handleFocus,
      placeholder,
      disabled,
      autoComplete,
      className: 'form-input',
      'aria-invalid': hasError,
      'aria-describedby': `${label}-help ${label}-error`
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
            className="form-textarea"
          />
        );
      
      case 'select':
        return (
          <select {...commonProps} className="form-select">
            <option value="">{placeholder || `Select ${label}`}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'password':
        return (
          <input
            {...commonProps}
            type={showPassword ? 'text' : 'password'}
            className="form-input"
          />
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={type}
            className="form-input"
          />
        );
    }
  };

  return (
    <div className={`enhanced-form-field ${className} ${fieldStatus} ${focused ? 'focused' : ''}`}>
      {/* Label */}
      <label className="form-label md-typescale-body-medium">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>

      {/* Input Container */}
      <div className="form-input-container">
        {/* Leading Icon */}
        {leadingIcon && (
          <md-icon class="form-icon leading-icon">{leadingIcon}</md-icon>
        )}

        {/* Input Field */}
        {renderInput()}

        {/* Trailing Icon */}
        {(trailingIcon || type === 'password') && (
          <div className="trailing-icons">
            {type === 'password' && (
              <md-icon-button
                onClick={togglePasswordVisibility}
                title={showPassword ? 'Hide password' : 'Show password'}
                class="password-toggle"
              >
                <md-icon>{showPassword ? 'visibility_off' : 'visibility'}</md-icon>
              </md-icon-button>
            )}
            {trailingIcon && (
              <md-icon-button
                onClick={onTrailingIconClick}
                class="trailing-icon-button"
              >
                <md-icon>{trailingIcon}</md-icon>
              </md-icon-button>
            )}
            {hasSuccess && (
              <md-icon class="form-icon success-icon">check_circle</md-icon>
            )}
            {hasError && (
              <md-icon class="form-icon error-icon">error</md-icon>
            )}
          </div>
        )}
      </div>

      {/* Character Count */}
      {showCharCount && maxLength && (
        <div className="char-count md-typescale-body-small">
          {value.length} / {maxLength}
        </div>
      )}

      {/* Help Text */}
      {helpText && !hasError && (
        <div id={`${label}-help`} className="help-text md-typescale-body-small">
          {helpText}
        </div>
      )}

      {/* Error Messages */}
      {hasError && errors.length > 0 && (
        <div id={`${label}-error`} className="error-messages">
          {errors.map((error, index) => (
            <div key={index} className="error-message md-typescale-body-small">
              <md-icon class="error-icon-small">error</md-icon>
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedFormField;
