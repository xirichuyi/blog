// 表单处理工具函数

// Material Design Web Components 事件类型
export interface MDCInputEvent {
  target: {
    value: string;
  };
  detail?: {
    value: string;
  };
}

/**
 * 从Material Design Web Components获取值的通用函数
 */
export function getInputValue(event: MDCInputEvent): string {
  return event.target.value || event.detail?.value || '';
}

/**
 * 创建输入处理函数
 */
export function createInputHandler(
  setValue: (value: string) => void,
  onClearError?: () => void
): (event: MDCInputEvent) => void {
  return (event: MDCInputEvent) => {
    const value = getInputValue(event);
    setValue(value);
    if (onClearError) {
      onClearError();
    }
  };
}

/**
 * 创建表单提交处理函数
 */
export function createSubmitHandler(
  onSubmit: () => void | Promise<void>,
  isSubmitting: boolean = false
): (event: React.FormEvent<HTMLFormElement>) => Promise<void> {
  return async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    try {
      await onSubmit();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };
}

/**
 * 检查表单是否可以提交
 */
export function canSubmitForm(
  formData: Record<string, string>,
  requiredFields: string[],
  isSubmitting: boolean = false
): boolean {
  if (isSubmitting) return false;

  return requiredFields.every(field =>
    formData[field] && formData[field].trim().length > 0
  );
}

/**
 * 重置表单数据
 */
export function resetFormData<T extends Record<string, string>>(
  initialData: T
): T {
  const resetData = {} as T;
  for (const key in initialData) {
    (resetData as any)[key] = '';
  }
  return resetData;
}

/**
 * 表单数据转换工具
 */
export const FormDataTransformers = {
  /**
   * 清理字符串字段（去除首尾空格）
   */
  trimStrings<T extends Record<string, any>>(data: T): T {
    const cleaned = {} as T;
    for (const [key, value] of Object.entries(data)) {
      cleaned[key as keyof T] = typeof value === 'string' ? value.trim() : value;
    }
    return cleaned;
  },

  /**
   * 移除空字段
   */
  removeEmptyFields<T extends Record<string, any>>(data: T): Partial<T> {
    const filtered = {} as Partial<T>;
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined) {
        filtered[key as keyof T] = value;
      }
    }
    return filtered;
  },

  /**
   * 转换标签字符串为数组
   */
  parseTagsString(tagsString: string): string[] {
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  },

  /**
   * 转换标签数组为字符串
   */
  stringifyTags(tags: string[]): string {
    return tags.join(', ');
  }
};

/**
 * 表单状态管理器
 */
export class FormStateManager<T extends Record<string, string>> {
  private data: T;
  private errors: Record<keyof T, string[]>;
  private touched: Record<keyof T, boolean>;

  constructor(initialData: T) {
    this.data = { ...initialData };
    this.errors = {} as Record<keyof T, string[]>;
    this.touched = {} as Record<keyof T, boolean>;
  }

  getData(): T {
    return { ...this.data };
  }

  getField(field: keyof T): string {
    return this.data[field];
  }

  setField(field: keyof T, value: string): void {
    (this.data as any)[field] = value;
    this.touched[field] = true;
  }

  getErrors(field?: keyof T): string[] | Record<keyof T, string[]> {
    if (field) {
      return this.errors[field] || [];
    }
    return { ...this.errors };
  }

  setErrors(errors: Record<keyof T, string[]>): void {
    this.errors = { ...errors };
  }

  clearErrors(field?: keyof T): void {
    if (field) {
      delete this.errors[field];
    } else {
      this.errors = {} as Record<keyof T, string[]>;
    }
  }

  isTouched(field: keyof T): boolean {
    return this.touched[field] || false;
  }

  hasErrors(field?: keyof T): boolean {
    if (field) {
      return (this.errors[field] || []).length > 0;
    }
    return Object.keys(this.errors).length > 0;
  }

  reset(initialData: T): void {
    this.data = { ...initialData };
    this.errors = {} as Record<keyof T, string[]>;
    this.touched = {} as Record<keyof T, boolean>;
  }
}
