/**
 * Monaco Editor 优化配置
 */

import type { editor } from 'monaco-editor';

// Monaco Editor 基础配置
export const monacoEditorConfig: editor.IStandaloneEditorConstructionOptions = {
  // 主题和外观
  theme: 'vs-dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
  lineHeight: 1.5,
  letterSpacing: 0.5,
  
  // 编辑器行为
  automaticLayout: true,
  wordWrap: 'on',
  wordWrapColumn: 80,
  wrappingIndent: 'indent',
  
  // 滚动和导航
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  mouseWheelZoom: true,
  
  // 代码编辑功能
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: true,
  trimAutoWhitespace: true,
  
  // 代码提示和补全
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false,
  },
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  acceptSuggestionOnCommitCharacter: true,
  
  // 代码折叠
  folding: true,
  foldingStrategy: 'indentation',
  showFoldingControls: 'mouseover',
  
  // 行号和装订线
  lineNumbers: 'on',
  lineNumbersMinChars: 3,
  glyphMargin: false,
  
  // 选择和光标
  selectOnLineNumbers: true,
  selectionHighlight: true,
  occurrencesHighlight: 'singleFile',
  cursorBlinking: 'blink',
  cursorSmoothCaretAnimation: 'on',
  
  // 括号匹配
  matchBrackets: 'always',
  bracketPairColorization: {
    enabled: true,
  },
  
  // 缩进指南
  renderIndentGuides: true,
  highlightActiveIndentGuide: true,
  
  // 空白字符
  renderWhitespace: 'selection',
  
  // 性能优化
  minimap: {
    enabled: false, // 禁用小地图以提高性能
  },
  
  // 禁用不需要的功能以减少包大小
  contextmenu: false,
  links: false,
  hover: {
    enabled: false,
  },
  
  // 滚动条
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
};

// Markdown 特定配置
export const markdownEditorConfig: editor.IStandaloneEditorConstructionOptions = {
  ...monacoEditorConfig,
  language: 'markdown',
  wordWrap: 'on',
  lineNumbers: 'off',
  folding: false,
  renderLineHighlight: 'none',
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
};

// 编辑器主题配置
export const customTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
    { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
    { token: 'string', foreground: 'CE9178' },
    { token: 'number', foreground: 'B5CEA8' },
    { token: 'regexp', foreground: 'D16969' },
    { token: 'type', foreground: '4EC9B0' },
    { token: 'class', foreground: '4EC9B0' },
    { token: 'function', foreground: 'DCDCAA' },
    { token: 'variable', foreground: '9CDCFE' },
    { token: 'constant', foreground: '4FC1FF' },
  ],
  colors: {
    'editor.background': '#0d1117',
    'editor.foreground': '#c9d1d9',
    'editor.lineHighlightBackground': '#161b22',
    'editor.selectionBackground': '#264f78',
    'editor.inactiveSelectionBackground': '#3a3d41',
    'editorCursor.foreground': '#c9d1d9',
    'editorWhitespace.foreground': '#484f58',
    'editorIndentGuide.background': '#21262d',
    'editorIndentGuide.activeBackground': '#30363d',
    'editorLineNumber.foreground': '#6e7681',
    'editorLineNumber.activeForeground': '#c9d1d9',
  },
};

// 编辑器性能优化配置
export const performanceConfig = {
  // 工作线程配置
  workers: {
    options: {
      baseUrl: '/monaco-editor-workers/',
    },
  },
};

// 编辑器实例管理
export class MonacoEditorManager {
  private static instances = new Map<string, editor.IStandaloneCodeEditor>();

  static createEditor(
    container: HTMLElement,
    options: editor.IStandaloneEditorConstructionOptions,
    id?: string
  ): editor.IStandaloneCodeEditor | null {
    try {
      // @ts-ignore - monaco is available globally
      const editorInstance = window.monaco?.editor?.create(container, options);

      if (editorInstance && id) {
        this.instances.set(id, editorInstance);
      }

      return editorInstance || null;
    } catch (error) {
      console.error('Failed to create Monaco editor:', error);
      return null;
    }
  }
  
  static getEditor(id: string): editor.IStandaloneCodeEditor | undefined {
    return this.instances.get(id);
  }
  
  static disposeEditor(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.dispose();
      this.instances.delete(id);
    }
  }
  
  static disposeAllEditors(): void {
    this.instances.forEach((instance) => {
      instance.dispose();
    });
    this.instances.clear();
  }
}

// 编辑器工具函数
export const editorUtils = {
  /**
   * 设置编辑器值并保持光标位置
   */
  setValueWithCursor: (
    editor: editor.IStandaloneCodeEditor,
    value: string,
    preserveCursor = true
  ) => {
    if (preserveCursor) {
      const position = editor.getPosition();
      editor.setValue(value);
      if (position) {
        editor.setPosition(position);
      }
    } else {
      editor.setValue(value);
    }
  },

  /**
   * 获取选中的文本
   */
  getSelectedText: (editor: editor.IStandaloneCodeEditor): string => {
    const selection = editor.getSelection();
    if (selection) {
      return editor.getModel()?.getValueInRange(selection) || '';
    }
    return '';
  },
};

export default monacoEditorConfig;
