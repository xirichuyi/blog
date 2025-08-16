// 表单验证工具函数
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

/**
 * 验证单个字段
 */
export function validateField(value: string, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (rule.required && !value.trim()) {
      errors.push(rule.message || 'This field is required');
      continue;
    }

    if (value.trim() && rule.minLength && value.trim().length < rule.minLength) {
      errors.push(rule.message || `Minimum length is ${rule.minLength} characters`);
    }

    if (value.trim() && rule.maxLength && value.trim().length > rule.maxLength) {
      errors.push(rule.message || `Maximum length is ${rule.maxLength} characters`);
    }

    if (value.trim() && rule.pattern && !rule.pattern.test(value.trim())) {
      errors.push(rule.message || 'Invalid format');
    }

    if (value.trim() && rule.custom && !rule.custom(value.trim())) {
      errors.push(rule.message || 'Invalid value');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 验证整个表单
 */
export function validateForm<T extends Record<string, string>>(
  formData: T,
  validationRules: Partial<Record<keyof T, ValidationRule[]>>
): FormValidationResult {
  const errors: Record<string, string[]> = {};
  let isValid = true;

  for (const fieldName of Object.keys(validationRules)) {
    const rules = validationRules[fieldName as keyof T];
    if (rules) {
      const fieldValue = formData[fieldName as keyof T] || '';
      const fieldResult = validateField(fieldValue, rules);

      if (!fieldResult.isValid) {
        errors[fieldName] = fieldResult.errors;
        isValid = false;
      }
    }
  }

  return { isValid, errors };
}

/**
 * 常用验证规则
 */
export const ValidationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'This field is required'
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    minLength: length,
    message: message || `Minimum length is ${length} characters`
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    maxLength: length,
    message: message || `Maximum length is ${length} characters`
  }),

  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Please enter a valid email address'
  }),

  password: (message?: string): ValidationRule => ({
    minLength: 6,
    pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
    message: message || 'Password must be at least 6 characters and contain both letters and numbers'
  }),

  username: (message?: string): ValidationRule => ({
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: message || 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
  }),

  url: (message?: string): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message: message || 'Please enter a valid URL'
  }),

  custom: (validator: (value: string) => boolean, message: string): ValidationRule => ({
    custom: validator,
    message
  })
};

/**
 * 预定义的表单验证配置
 */
export const FormValidationConfigs = {
  login: {
    username: [ValidationRules.required(), ValidationRules.username()],
    password: [ValidationRules.required()]
  },

  contact: {
    name: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(50)],
    email: [ValidationRules.required(), ValidationRules.email()],
    subject: [ValidationRules.required(), ValidationRules.minLength(5), ValidationRules.maxLength(100)],
    message: [ValidationRules.required(), ValidationRules.minLength(10), ValidationRules.maxLength(1000)]
  },

  post: {
    title: [ValidationRules.required(), ValidationRules.minLength(5), ValidationRules.maxLength(200)],
    content: [ValidationRules.required(), ValidationRules.minLength(50)],
    excerpt: [ValidationRules.maxLength(300)],
    category: [ValidationRules.required()],
    tags: [ValidationRules.required()]
  },

  music: {
    title: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(100)],
    artist: [ValidationRules.required(), ValidationRules.minLength(2), ValidationRules.maxLength(100)],
    album: [ValidationRules.maxLength(100)],
    genre: [ValidationRules.maxLength(50)]
  }
};
