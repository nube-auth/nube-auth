import React from 'react';

export interface FormGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export interface FormHintProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  error?: boolean;
}

export const FormGroup = React.forwardRef<HTMLDivElement, FormGroupProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col gap-2 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FormGroup.displayName = 'FormGroup';

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className = '', children, required = false, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  }
);

FormLabel.displayName = 'FormLabel';

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${className}`}
        {...props}
      />
    );
  }
);

FormInput.displayName = 'FormInput';

export const FormHint = React.forwardRef<HTMLParagraphElement, FormHintProps>(
  ({ className = '', error = false, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-xs ${error ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'} m-0 ${className}`}
        {...props}
      >
        {children}
      </p>
    );
  }
);

FormHint.displayName = 'FormHint';
