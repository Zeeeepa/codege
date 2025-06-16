import React, { ReactNode, useState } from 'react';

export interface ActionPanelProps {
  children: ReactNode;
  title?: string;
}

export interface ActionProps {
  title: string;
  onAction?: () => void;
  icon?: string;
  shortcut?: { modifiers: string[]; key: string };
  style?: 'default' | 'destructive';
  className?: string;
}

export interface ActionSectionProps {
  title?: string;
  children: ReactNode;
}

// Main ActionPanel Component
export function ActionPanel({ children, title }: ActionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="action-panel">
      <button 
        className="action-panel-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open actions menu"
      >
        <span className="icon menu"></span>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="action-panel-overlay" 
            onClick={() => setIsOpen(false)}
          />
          <div className="action-panel-content">
            {title && <div className="action-panel-title">{title}</div>}
            <div className="action-panel-actions">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Action Component
export function Action({ 
  title, 
  onAction, 
  icon, 
  shortcut, 
  style = 'default',
  className = '' 
}: ActionProps) {
  const handleClick = () => {
    onAction?.();
  };

  const shortcutText = shortcut 
    ? `${shortcut.modifiers.join('+')}+${shortcut.key}`
    : undefined;

  return (
    <button
      className={`action-item ${style} ${className}`}
      onClick={handleClick}
      title={shortcutText}
    >
      {icon && <span className={`action-icon ${icon}`}></span>}
      <span className="action-title">{title}</span>
      {shortcutText && (
        <span className="action-shortcut">{shortcutText}</span>
      )}
    </button>
  );
}

// Action Section Component
export function ActionSection({ title, children }: ActionSectionProps) {
  return (
    <div className="action-section">
      {title && <div className="action-section-title">{title}</div>}
      <div className="action-section-content">
        {children}
      </div>
    </div>
  );
}

// Submenu Action Component
export function SubmenuAction({ 
  title, 
  icon, 
  children 
}: { 
  title: string; 
  icon?: string; 
  children: ReactNode; 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="submenu-action">
      <button
        className="submenu-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        {icon && <span className={`action-icon ${icon}`}></span>}
        <span className="action-title">{title}</span>
        <span className={`submenu-arrow ${isOpen ? 'open' : ''}`}>▶</span>
      </button>
      
      {isOpen && (
        <div className="submenu-content">
          {children}
        </div>
      )}
    </div>
  );
}

// Copy Action Component (common use case)
export function CopyAction({ 
  title = "Copy", 
  content, 
  onCopy 
}: { 
  title?: string; 
  content: string; 
  onCopy?: () => void; 
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <Action
      title={title}
      icon="copy"
      onAction={handleCopy}
    />
  );
}

// Open Action Component (common use case)
export function OpenAction({ 
  title = "Open", 
  target, 
  onOpen 
}: { 
  title?: string; 
  target: string; 
  onOpen?: () => void; 
}) {
  const handleOpen = () => {
    window.open(target, '_blank', 'noopener,noreferrer');
    onOpen?.();
  };

  return (
    <Action
      title={title}
      icon="external-link"
      onAction={handleOpen}
    />
  );
}

// Export with Raycast-compatible names
export {
  ActionPanel as default,
  Action,
  ActionSection as Action_Section,
  SubmenuAction as Submenu_Action,
  CopyAction as Copy_Action,
  OpenAction as Open_Action,
};

