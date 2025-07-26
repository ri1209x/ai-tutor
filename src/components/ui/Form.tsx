'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const formVariants = cva(
  'space-y-6',
  {
    variants: {
      variant: {
        default: '',
        card: 'bg-white p-6 rounded-lg border border-gray-200 shadow-sm',
        inline: 'space-y-0 flex flex-wrap gap-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface FormProps
  extends React.FormHTMLAttributes<HTMLFormElement>,
    VariantProps<typeof formVariants> {}

const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, variant, ...props }, ref) => (
    <form
      ref={ref}
      className={cn(formVariants({ variant, className }))}
      {...props}
    />
  )
);

Form.displayName = 'Form';

// Form Field Component
const FormField = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    error?: string;
    required?: boolean;
  }
>(({ className, error, required, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-2', className)}
    {...props}
  >
    {children}
    {error && (
      <p className="text-sm text-error-500" role="alert">
        {error}
      </p>
    )}
  </div>
));

FormField.displayName = 'FormField';

// Form Label Component
const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium text-text-primary',
      className
    )}
    {...props}
  >
    {children}
    {required && (
      <span className="text-error-500 ml-1" aria-label="必須">
        *
      </span>
    )}
  </label>
));

FormLabel.displayName = 'FormLabel';

// Form Description Component
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-muted', className)}
    {...props}
  />
));

FormDescription.displayName = 'FormDescription';

// Form Group Component (for grouping related fields)
const FormGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    description?: string;
  }
>(({ className, title, description, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-4', className)}
    {...props}
  >
    {(title || description) && (
      <div className="space-y-1">
        {title && (
          <h3 className="text-base font-medium text-text-primary">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-text-muted">
            {description}
          </p>
        )}
      </div>
    )}
    <div className="space-y-4">
      {children}
    </div>
  </div>
));

FormGroup.displayName = 'FormGroup';

// Form Actions Component (for submit/cancel buttons)
const FormActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: 'left' | 'center' | 'right';
  }
>(({ className, align = 'right', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex gap-3 pt-4',
      {
        'justify-start': align === 'left',
        'justify-center': align === 'center',
        'justify-end': align === 'right',
      },
      className
    )}
    {...props}
  />
));

FormActions.displayName = 'FormActions';

// Select Component
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    error?: boolean;
  }
>(({ className, error, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-error-500 focus:ring-error-500',
      className
    )}
    {...props}
  />
));

Select.displayName = 'Select';

// Textarea Component
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: boolean;
  }
>(({ className, error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'resize-vertical',
      error && 'border-error-500 focus:ring-error-500',
      className
    )}
    {...props}
  />
));

Textarea.displayName = 'Textarea';

// Checkbox Component
const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    description?: string;
  }
>(({ className, label, description, id, ...props }, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex items-start space-x-3">
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className={cn(
          'h-4 w-4 mt-0.5 rounded border-gray-300 text-primary-500',
          'focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
          className
        )}
        {...props}
      />
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium text-text-primary cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-text-muted">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

// Radio Component
const Radio = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    description?: string;
  }
>(({ className, label, description, id, ...props }, ref) => {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex items-start space-x-3">
      <input
        ref={ref}
        type="radio"
        id={radioId}
        className={cn(
          'h-4 w-4 mt-0.5 border-gray-300 text-primary-500',
          'focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
          className
        )}
        {...props}
      />
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <label
              htmlFor={radioId}
              className="text-sm font-medium text-text-primary cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-text-muted">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';

export {
  Form,
  FormField,
  FormLabel,
  FormDescription,
  FormGroup,
  FormActions,
  Select,
  Textarea,
  Checkbox,
  Radio,
};
