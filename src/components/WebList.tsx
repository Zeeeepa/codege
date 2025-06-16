import React, { ReactNode, useState } from 'react';

export interface ListProps {
  children: ReactNode;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  isLoading?: boolean;
  searchBarPlaceholder?: string;
  filtering?: boolean;
  className?: string;
}

export interface ListItemProps {
  id?: string;
  title: string;
  subtitle?: string;
  accessories?: Array<{ text?: string; icon?: string; tooltip?: string }>;
  icon?: string;
  actions?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface ListSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

// Main List Component
export function List({ 
  children, 
  searchText, 
  onSearchTextChange, 
  isLoading, 
  searchBarPlaceholder = "Search...",
  filtering = true,
  className = '' 
}: ListProps) {
  const [internalSearchText, setInternalSearchText] = useState(searchText || '');

  const handleSearchChange = (value: string) => {
    setInternalSearchText(value);
    onSearchTextChange?.(value);
  };

  return (
    <div className={`web-list ${className}`}>
      {filtering && (
        <div className="list-search">
          <input
            type="text"
            placeholder={searchBarPlaceholder}
            value={searchText !== undefined ? searchText : internalSearchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="list-search-input"
          />
        </div>
      )}
      
      {isLoading ? (
        <div className="list-loading">
          <div className="loading-spinner"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <div className="list-content">
          {children}
        </div>
      )}
    </div>
  );
}

// List Item Component
export function ListItem({ 
  id,
  title, 
  subtitle, 
  accessories = [], 
  icon, 
  actions, 
  children,
  onClick,
  className = '' 
}: ListItemProps) {
  return (
    <div 
      className={`list-item ${onClick ? 'clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="list-item-content">
        {icon && (
          <div className="list-item-icon">
            <span className={`icon ${icon}`}></span>
          </div>
        )}
        
        <div className="list-item-text">
          <div className="list-item-title">{title}</div>
          {subtitle && <div className="list-item-subtitle">{subtitle}</div>}
          {children}
        </div>
        
        {accessories.length > 0 && (
          <div className="list-item-accessories">
            {accessories.map((accessory, index) => (
              <div key={index} className="list-item-accessory" title={accessory.tooltip}>
                {accessory.icon && <span className={`icon ${accessory.icon}`}></span>}
                {accessory.text && <span className="accessory-text">{accessory.text}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {actions && (
        <div className="list-item-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

// List Section Component
export function ListSection({ title, subtitle, children }: ListSectionProps) {
  return (
    <div className="list-section">
      {(title || subtitle) && (
        <div className="list-section-header">
          {title && <h3 className="list-section-title">{title}</h3>}
          {subtitle && <p className="list-section-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="list-section-content">
        {children}
      </div>
    </div>
  );
}

// Empty State Component
export function ListEmptyView({ 
  title, 
  description, 
  icon, 
  actions 
}: { 
  title: string; 
  description?: string; 
  icon?: string; 
  actions?: ReactNode; 
}) {
  return (
    <div className="list-empty-view">
      {icon && <div className={`empty-icon ${icon}`}></div>}
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

// Export with Raycast-compatible names
export {
  List as default,
  ListItem as List_Item,
  ListSection as List_Section,
  ListEmptyView as List_EmptyView,
};

