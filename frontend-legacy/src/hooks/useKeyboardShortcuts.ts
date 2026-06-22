import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: HTMLElement | Document;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, target = document } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const activeElement = document.activeElement;
    const isInputField = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.tagName === 'SELECT' ||
      activeElement.getAttribute('contenteditable') === 'true' ||
      activeElement.closest('md-outlined-text-field') ||
      activeElement.closest('md-filled-text-field')
    );

    // Allow certain shortcuts even in input fields (like Ctrl+S)
    const allowInInputFields = ['s', 'z', 'y', 'a', 'c', 'v', 'x'];
    const shouldSkip = isInputField && 
      !(event.ctrlKey || event.metaKey) && 
      !allowInInputFields.includes(event.key.toLowerCase());

    if (shouldSkip) return;

    for (const shortcut of shortcuts) {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    target.addEventListener('keydown', handleKeyDown as EventListener);
    
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, enabled, target]);
};

// Common shortcuts for admin pages
export const createCommonShortcuts = (actions: {
  save?: () => void;
  publish?: () => void;
  cancel?: () => void;
  preview?: () => void;
  newItem?: () => void;
  search?: () => void;
  refresh?: () => void;
}) => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.save) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      action: actions.save,
      description: 'Save (Ctrl+S)'
    });
  }

  if (actions.publish) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      action: actions.publish,
      description: 'Publish (Ctrl+Shift+S)'
    });
  }

  if (actions.cancel) {
    shortcuts.push({
      key: 'Escape',
      action: actions.cancel,
      description: 'Cancel (Esc)',
      preventDefault: false
    });
  }

  if (actions.preview) {
    shortcuts.push({
      key: 'p',
      ctrlKey: true,
      action: actions.preview,
      description: 'Preview (Ctrl+P)'
    });
  }

  if (actions.newItem) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      action: actions.newItem,
      description: 'New Item (Ctrl+N)'
    });
  }

  if (actions.search) {
    shortcuts.push({
      key: 'f',
      ctrlKey: true,
      action: actions.search,
      description: 'Search (Ctrl+F)'
    });
  }

  if (actions.refresh) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      action: actions.refresh,
      description: 'Refresh (Ctrl+R)'
    });
  }

  return shortcuts;
};

// Hook for displaying keyboard shortcuts help
export const useShortcutsHelp = (shortcuts: KeyboardShortcut[]) => {
  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = [];
    
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.metaKey) keys.push('Cmd');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.altKey) keys.push('Alt');
    
    keys.push(shortcut.key.toUpperCase());
    
    return keys.join(' + ');
  };

  const getShortcutsList = () => {
    return shortcuts.map(shortcut => ({
      keys: formatShortcut(shortcut),
      description: shortcut.description
    }));
  };

  return {
    formatShortcut,
    getShortcutsList
  };
};

export default useKeyboardShortcuts;
