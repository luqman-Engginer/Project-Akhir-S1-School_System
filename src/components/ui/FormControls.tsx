import React, { forwardRef, useId } from 'react'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label: React.FC<LabelProps> = ({ children, required, className = '', ...props }) => (
  <label className={`block text-sm font-medium text-[#1F2A2E] mb-1.5 ${className}`} {...props}>
    {children}
    {required && <span className="text-[#C8643B] ml-1">*</span>}
  </label>
)

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, hint, required, id, className = '', ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const effectiveHelper = helperText || hint
    const helperId = `${inputId}-helper`

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : effectiveHelper ? helperId : undefined}
          className={`w-full min-h-[44px] px-3.5 py-2 text-base text-[#1F2A2E] bg-white border rounded-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-[#F4F0E8] disabled:text-[#8B9699] disabled:cursor-not-allowed ${
            error
              ? 'border-[#962828] focus:ring-[#962828]'
              : 'border-[#E6E0D6] focus:border-[#1F5C4D] focus:ring-[#1F5C4D]'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-[#962828] flex items-center gap-1">
            <span>•</span> {error}
          </p>
        ) : effectiveHelper ? (
          <p id={helperId} className="mt-1.5 text-sm text-[#5B676B]">
            {effectiveHelper}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, required, id, className = '', rows = 3, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id || generatedId
    const errorId = `${textareaId}-error`
    const helperId = `${textareaId}-helper`

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={textareaId} required={required}>
            {label}
          </Label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full p-3 text-base text-[#1F2A2E] bg-white border rounded-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-[#F4F0E8] disabled:text-[#8B9699] disabled:cursor-not-allowed ${
            error
              ? 'border-[#962828] focus:ring-[#962828]'
              : 'border-[#E6E0D6] focus:border-[#1F5C4D] focus:ring-[#1F5C4D]'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-[#962828] flex items-center gap-1">
            <span>•</span> {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="mt-1.5 text-sm text-[#5B676B]">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, required, id, options, children, className = '', ...props }, ref) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const errorId = `${selectId}-error`
    const helperId = `${selectId}-helper`

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={selectId} required={required}>
            {label}
          </Label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full min-h-[44px] px-3.5 py-2 pr-9 text-base text-[#1F2A2E] bg-white border rounded-[10px] appearance-none transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-[#F4F0E8] disabled:text-[#8B9699] disabled:cursor-not-allowed ${
              error
                ? 'border-[#962828] focus:ring-[#962828]'
                : 'border-[#E6E0D6] focus:border-[#1F5C4D] focus:ring-[#1F5C4D]'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5B676B]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-[#962828] flex items-center gap-1">
            <span>•</span> {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="mt-1.5 text-sm text-[#5B676B]">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Select.displayName = 'Select'
