import React, { ReactNode } from 'react';

export interface FormProps {
  children: ReactNode;
  onSubmit?: (values: any) => void;
  className?: string;
  navigationTitle?: string;
  actions?: ReactNode;
  isLoading?: boolean;
}

export interface FormItemProps {
  id?: string;
  title: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  info?: string;
  children?: ReactNode;
}

export interface FormTextFieldProps extends FormItemProps {
  type?: 'text' | 'password' | 'email';
}

export interface FormTextAreaProps extends FormItemProps {
  rows?: number;
}

export interface FormDropdownProps extends FormItemProps {
  children: ReactNode;
  defaultValue?: string;
  storeValue?: boolean;
}

export interface FormCheckboxProps {
  id?: string;
  title: string;
  label: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
  error?: string;
  info?: string;
}

export interface DropdownItemProps {
  value: string;
  title: string;
  icon?: string;
}

export interface FormDescriptionProps {
  title?: string;
  text: string;
}

// Main Form Component
export function Form({ children, onSubmit, className = '', navigationTitle, actions, isLoading }: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      const formData = new FormData(e.target as HTMLFormElement);
      const values = Object.fromEntries(formData.entries());
      onSubmit(values);
    }
  };

  return (
    <div className={`web-form-container ${className}`}>
      {navigationTitle && <h1 className="form-title">{navigationTitle}</h1>}
      {isLoading && <div className="form-loading">Loading...</div>}
      <form onSubmit={handleSubmit} className="web-form">
        {children}
      </form>
      {actions && <div className="form-actions">{actions}</div>}
    </div>
  );
}

// Add static properties to Form for dot notation access
Form.Description = FormDescription;
Form.TextArea = FormTextArea;
Form.TextField = FormTextField;
Form.Dropdown = FormDropdown;
Form.Checkbox = FormCheckbox;

// Add static properties to FormDropdown for dot notation access
FormDropdown.Item = DropdownItem;

// Form TextField Component
export function FormTextField({ 
  id, 
  title, 
  placeholder, 
  value, 
  onChange, 
  error, 
  info, 
  type = 'text' 
}: FormTextFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{title}</label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`form-input ${error ? 'error' : ''}`}
      />
      {info && <div className="form-info">{info}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

// Form TextArea Component
export function FormTextArea({ 
  id, 
  title, 
  placeholder, 
  value, 
  onChange, 
  error, 
  info, 
  rows = 4 
}: FormTextAreaProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{title}</label>
      <textarea
        id={id}
        name={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        rows={rows}
        className={`form-textarea ${error ? 'error' : ''}`}
      />
      {info && <div className="form-info">{info}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

// Form Dropdown Component
export function FormDropdown({ 
  id, 
  title, 
  value, 
  onChange, 
  error, 
  info, 
  children,
  defaultValue,
  storeValue,
  placeholder
}: FormDropdownProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{title}</label>
      <select
        id={id}
        name={id}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange?.(e.target.value)}
        className={`form-select ${error ? 'error' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      {info && <div className="form-info">{info}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

// Dropdown Item Component
export function DropdownItem({ value, title }: DropdownItemProps) {
  return <option value={value}>{title}</option>;
}

// Form Checkbox Component
export function FormCheckbox({ 
  id, 
  title, 
  label, 
  value, 
  onChange, 
  error, 
  info 
}: FormCheckboxProps) {
  return (
    <div className="form-field">
      <div className="form-checkbox-wrapper">
        <input
          id={id}
          name={id}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange?.(e.target.checked)}
          className="form-checkbox"
        />
        <label htmlFor={id} className="form-checkbox-label">{label}</label>
      </div>
      {info && <div className="form-info">{info}</div>}
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}

// Form Description Component
export function FormDescription({ title, text }: FormDescriptionProps) {
  return (
    <div className="form-description">
      {title && <h3 className="form-description-title">{title}</h3>}
      <p className="form-description-text">{text}</p>
    </div>
  );
}

// Export all components with Raycast-compatible names
export {
  Form as default,
  FormTextField as Form_TextField,
  FormTextArea as Form_TextArea,
  FormDropdown as Form_Dropdown,
  FormCheckbox as Form_Checkbox,
  FormDescription as Form_Description,
  DropdownItem as Dropdown_Item,
};
