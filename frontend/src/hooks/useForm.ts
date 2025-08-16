// 通用表单Hook
import { useState, useCallback, useMemo } from 'react';
import {
  validateForm,
  createInputHandler,
  FormDataTransformers
} from '../utils';
import type {
  ValidationRule,
  FormValidationResult,
  MDCInputEvent
} from '../utils';

export interface UseFormOptions<T extends Record<string, string>> {
  initialData: T;
  validationRules?: Partial<Record<keyof T, ValidationRule[]>>;
  onSubmit?: (data: T) => Promise<void> | void;
  onError?: (error: string) => void;
  transformOnSubmit?: (data: T) => T;
}

export interface UseFormReturn<T extends Record<string, string>> {
  // 数据
  formData: T;
  errors: Record<keyof T, string[]>;
  
  // 状态
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  
  // 方法
  setField: (field: keyof T, value: string) => void;
  getInputHandler: (field: keyof T) => (event: MDCInputEvent) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  reset: () => void;
  clearErrors: (field?: keyof T) => void;
  validate: () => FormValidationResult;
  
  // 工具方法
  canSubmit: boolean;
  getFieldError: (field: keyof T) => string | undefined;
  hasFieldError: (field: keyof T) => boolean;
}

export function useForm<T extends Record<string, string>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const {
    initialData,
    validationRules = {} as Partial<Record<keyof T, ValidationRule[]>>,
    onSubmit,
    onError,
    transformOnSubmit = FormDataTransformers.trimStrings
  } = options;

  // 状态
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<keyof T, string[]>>({} as Record<keyof T, string[]>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // 清除错误
  const clearErrors = useCallback((field?: keyof T) => {
    if (field) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } else {
      setErrors({} as Record<keyof T, string[]>);
    }
  }, []);

  // 验证表单
  const validate = useCallback((): FormValidationResult => {
    if (Object.keys(validationRules).length === 0) {
      return { isValid: true, errors: {} };
    }
    
    return validateForm(formData, validationRules);
  }, [formData, validationRules]);

  // 计算是否有效
  const isValid = useMemo(() => {
    const result = validate();
    return result.isValid;
  }, [validate]);

  // 计算是否可以提交
  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (!isValid) return false;

    // 检查所有必填字段是否都有值
    for (const fieldName of Object.keys(validationRules)) {
      const rules = validationRules[fieldName as keyof T];
      if (rules && Array.isArray(rules) && rules.some((rule: ValidationRule) => rule.required)) {
        const fieldValue = formData[fieldName as keyof T];
        if (!fieldValue || !fieldValue.trim()) {
          return false;
        }
      }
    }

    return true;
  }, [formData, validationRules, isSubmitting, isValid]);

  // 设置字段值
  const setField = useCallback((field: keyof T, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    // 清除该字段的错误
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // 获取输入处理函数
  const getInputHandler = useCallback((field: keyof T) => {
    return createInputHandler(
      (value: string) => setField(field, value),
      () => clearErrors(field)
    );
  }, [setField, clearErrors]);

  // 处理提交
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (isSubmitting || !onSubmit) return;

    // 验证表单
    const validationResult = validate();
    if (!validationResult.isValid) {
      setErrors(validationResult.errors as Record<keyof T, string[]>);
      return;
    }

    setIsSubmitting(true);
    clearErrors();

    try {
      const transformedData = transformOnSubmit(formData);
      await onSubmit(transformedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (onError) {
        onError(errorMessage);
      } else {
        console.error('Form submission error:', error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, onSubmit, onError, validate, transformOnSubmit, clearErrors]);

  // 重置表单
  const reset = useCallback(() => {
    setFormData(initialData);
    setErrors({} as Record<keyof T, string[]>);
    setIsSubmitting(false);
    setIsDirty(false);
  }, [initialData]);

  // 获取字段错误
  const getFieldError = useCallback((field: keyof T): string | undefined => {
    const fieldErrors = errors[field];
    return fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined;
  }, [errors]);

  // 检查字段是否有错误
  const hasFieldError = useCallback((field: keyof T): boolean => {
    return !!(errors[field] && errors[field].length > 0);
  }, [errors]);

  return {
    // 数据
    formData,
    errors,
    
    // 状态
    isSubmitting,
    isValid,
    isDirty,
    
    // 方法
    setField,
    getInputHandler,
    handleSubmit,
    reset,
    clearErrors,
    validate,
    
    // 工具方法
    canSubmit,
    getFieldError,
    hasFieldError
  };
}

// 预定义的表单配置
export const FormConfigs = {
  login: {
    initialData: { username: '', password: '' },
    validationRules: {
      username: [{ required: true, message: 'Username is required' }],
      password: [{ required: true, message: 'Password is required' }]
    }
  },

  contact: {
    initialData: { name: '', email: '', subject: '', message: '' },
    validationRules: {
      name: [
        { required: true, message: 'Name is required' },
        { minLength: 2, message: 'Name must be at least 2 characters' }
      ],
      email: [
        { required: true, message: 'Email is required' },
        { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email' }
      ],
      subject: [
        { required: true, message: 'Subject is required' },
        { minLength: 5, message: 'Subject must be at least 5 characters' }
      ],
      message: [
        { required: true, message: 'Message is required' },
        { minLength: 10, message: 'Message must be at least 10 characters' }
      ]
    }
  },

  post: {
    initialData: { title: '', content: '', excerpt: '', category: '', tags: '' },
    validationRules: {
      title: [
        { required: true, message: 'Title is required' },
        { minLength: 5, message: 'Title must be at least 5 characters' }
      ],
      content: [
        { required: true, message: 'Content is required' },
        { minLength: 50, message: 'Content must be at least 50 characters' }
      ],
      category: [{ required: true, message: 'Category is required' }],
      tags: [{ required: true, message: 'At least one tag is required' }]
    }
  }
};
