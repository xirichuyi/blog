import React, { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showPreview?: boolean;
  showToolbar?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
  onSave?: () => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  shortcut?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing...',
  disabled = false,
  showPreview = true,
  showToolbar = true,
  minHeight = 300,
  maxHeight = 800,
  className = '',
  onSave,
  autoSave = false,
  autoSaveDelay = 2000
}) => {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveRef = useRef<NodeJS.Timeout>();

  // Calculate word and character count
  useEffect(() => {
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const chars = value.length;
    setWordCount(words);
    setCharCount(chars);
  }, [value]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && onSave) {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
      
      autoSaveRef.current = setTimeout(() => {
        onSave();
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveRef.current) {
        clearTimeout(autoSaveRef.current);
      }
    };
  }, [value, autoSave, onSave, autoSaveDelay]);

  // Insert text at cursor position
  const insertText = (text: string, selectText = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    onChange(newValue);

    // Set cursor position after insertion
    setTimeout(() => {
      if (selectText) {
        textarea.setSelectionRange(start, start + text.length);
      } else {
        textarea.setSelectionRange(start + text.length, start + text.length);
      }
      textarea.focus();
    }, 0);
  };

  // Wrap selected text
  const wrapText = (before: string, after: string = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      const wrappedText = before + selectedText + after;
      const newValue = value.substring(0, start) + wrappedText + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.setSelectionRange(start + before.length, end + before.length);
        textarea.focus();
      }, 0);
    } else {
      insertText(before + after, true);
    }
  };

  // Toolbar actions
  const toolbarActions: ToolbarAction[] = [
    {
      id: 'bold',
      label: 'Bold',
      icon: 'format_bold',
      action: () => wrapText('**'),
      shortcut: 'Ctrl+B'
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: 'format_italic',
      action: () => wrapText('*'),
      shortcut: 'Ctrl+I'
    },
    {
      id: 'heading',
      label: 'Heading',
      icon: 'title',
      action: () => insertText('## '),
      shortcut: 'Ctrl+H'
    },
    {
      id: 'link',
      label: 'Link',
      icon: 'link',
      action: () => insertText('[Link text](https://example.com)'),
      shortcut: 'Ctrl+K'
    },
    {
      id: 'image',
      label: 'Image',
      icon: 'image',
      action: () => insertText('![Alt text](image-url)'),
      shortcut: 'Ctrl+Shift+I'
    },
    {
      id: 'code',
      label: 'Code',
      icon: 'code',
      action: () => wrapText('`'),
      shortcut: 'Ctrl+`'
    },
    {
      id: 'code-block',
      label: 'Code Block',
      icon: 'code_blocks',
      action: () => insertText('\n```\ncode here\n```\n'),
      shortcut: 'Ctrl+Shift+`'
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: 'format_quote',
      action: () => insertText('> '),
      shortcut: 'Ctrl+Q'
    },
    {
      id: 'list',
      label: 'List',
      icon: 'format_list_bulleted',
      action: () => insertText('- '),
      shortcut: 'Ctrl+L'
    },
    {
      id: 'numbered-list',
      label: 'Numbered List',
      icon: 'format_list_numbered',
      action: () => insertText('1. '),
      shortcut: 'Ctrl+Shift+L'
    }
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const action = toolbarActions.find(a => {
        const shortcut = a.shortcut?.toLowerCase();
        if (!shortcut) return false;
        
        const keys = shortcut.split('+').map(k => k.trim());
        const hasShift = keys.includes('shift');
        const key = keys[keys.length - 1];
        
        return e.key.toLowerCase() === key && 
               e.shiftKey === hasShift;
      });

      if (action) {
        e.preventDefault();
        action.action();
      } else if (e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle mode change
  const handleModeChange = (newMode: 'edit' | 'preview' | 'split') => {
    setMode(newMode);
  };

  return (
    <div className={`markdown-editor ${className} ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="editor-toolbar">
          <div className="toolbar-section">
            {toolbarActions.map((action) => (
              <md-icon-button
                key={action.id}
                onClick={action.action}
                title={`${action.label} (${action.shortcut})`}
                disabled={disabled}
              >
                <md-icon>{action.icon}</md-icon>
              </md-icon-button>
            ))}
          </div>

          <div className="toolbar-section">
            {showPreview && (
              <div className="mode-selector">
                <md-segmented-button-set>
                  <md-segmented-button
                    selected={mode === 'edit'}
                    onClick={() => handleModeChange('edit')}
                  >
                    <md-icon slot="icon">edit</md-icon>
                    Edit
                  </md-segmented-button>
                  <md-segmented-button
                    selected={mode === 'split'}
                    onClick={() => handleModeChange('split')}
                  >
                    <md-icon slot="icon">view_column</md-icon>
                    Split
                  </md-segmented-button>
                  <md-segmented-button
                    selected={mode === 'preview'}
                    onClick={() => handleModeChange('preview')}
                  >
                    <md-icon slot="icon">preview</md-icon>
                    Preview
                  </md-segmented-button>
                </md-segmented-button-set>
              </div>
            )}

            <md-icon-button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <md-icon>{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</md-icon>
            </md-icon-button>

            {onSave && (
              <md-filled-button onClick={onSave} disabled={disabled}>
                <md-icon slot="icon">save</md-icon>
                Save
              </md-filled-button>
            )}
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div 
        className="editor-content"
        style={{ 
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`
        }}
      >
        {/* Edit Mode */}
        {(mode === 'edit' || mode === 'split') && (
          <div className={`editor-pane ${mode === 'split' ? 'split-pane' : ''}`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="editor-textarea"
              spellCheck={true}
            />
          </div>
        )}

        {/* Preview Mode */}
        {(mode === 'preview' || mode === 'split') && (
          <div className={`preview-pane ${mode === 'split' ? 'split-pane' : ''}`}>
            <div className="preview-content">
              <MarkdownRenderer content={value} />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="editor-status-bar">
        <div className="status-info">
          <span className="md-typescale-body-small">
            {wordCount} words • {charCount} characters
          </span>
          {autoSave && (
            <span className="md-typescale-body-small auto-save-indicator">
              <md-icon>cloud_sync</md-icon>
              Auto-save enabled
            </span>
          )}
        </div>
        
        <div className="status-actions">
          <span className="md-typescale-body-small">
            Markdown supported
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;
