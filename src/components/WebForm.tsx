import React, { ReactNode } from 'react';

export interface FormProps {
  children: ReactNode;
  onSubmit?: (values: any) => void;
  className?: string;
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
}

export interface FormCheckboxProps extends FormItemProps {
  label: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
}

export interface DropdownItemProps {
  value: string;
  title: string;
  icon?: string;
}

// Main Form Component
export function Form({ children, onSubmit, className = '' }: FormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      const formData = new FormData(e.target as HTMLFormElement);
      const values = Object.fromEntries(formData.entries());
      onSubmit(values);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`web-form ${className}`}>
      {children}
    </form>
  );
}

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
  children 
}: FormDropdownProps) {
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">{title}</label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`form-select ${error ? 'error' : ''}`}
      >
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

// Export all components with Raycast-compatible names
export {
  Form as default,
  FormTextField as Form_TextField,
  FormTextArea as Form_TextArea,
  FormDropdown as Form_Dropdown,
  FormCheckbox as Form_Checkbox,
  DropdownItem as Dropdown_Item,
};

