import React, { useState } from 'react';
import { useShortcutsHelp } from '../../hooks/useKeyboardShortcuts';
import './ShortcutsHelp.css';

interface ShortcutsHelpProps {
  shortcuts: Array<{
    key: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    description: string;
  }>;
  trigger?: React.ReactNode;
}

const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ shortcuts, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getShortcutsList } = useShortcutsHelp(shortcuts);

  const shortcutsList = getShortcutsList();

  const defaultTrigger = (
    <md-icon-button 
      onClick={() => setIsOpen(true)}
      title="Keyboard shortcuts"
    >
      <md-icon>keyboard</md-icon>
    </md-icon-button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>
          {trigger}
        </div>
      ) : (
        defaultTrigger
      )}

      {isOpen && (
        <div className="shortcuts-help-backdrop" onClick={() => setIsOpen(false)}>
          <div className="shortcuts-help-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-help-header">
              <h2 className="md-typescale-headline-small">Keyboard Shortcuts</h2>
              <md-icon-button onClick={() => setIsOpen(false)}>
                <md-icon>close</md-icon>
              </md-icon-button>
            </div>
            
            <div className="shortcuts-help-content">
              {shortcutsList.length > 0 ? (
                <div className="shortcuts-list">
                  {shortcutsList.map((shortcut, index) => (
                    <div key={index} className="shortcut-item">
                      <div className="shortcut-keys">
                        {shortcut.keys.split(' + ').map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="shortcut-key">{key}</kbd>
                            {keyIndex < shortcut.keys.split(' + ').length - 1 && (
                              <span className="shortcut-plus">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="shortcut-description">
                        {shortcut.description.replace(/\s*\([^)]*\)/, '')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-shortcuts md-typescale-body-medium">
                  No keyboard shortcuts available for this page.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShortcutsHelp;
