/**
 * Reusable Button component
 */

import React from 'react'

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  className?: string
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'ui-inline-flex ui-items-center ui-justify-center ui-rounded-md ui-font-500 ui-transition-colors'

  const variantClasses = {
    primary: 'ui-btn ui-btn-primary',
    secondary: 'ui-btn',
    danger: 'ui-btn ui-btn-danger'
  }

  const sizeClasses = {
    small: 'ui-px-3 ui-py-1_5 ui-text-sm',
    medium: 'ui-px-4 ui-py-2 ui-text-base',
    large: 'ui-px-6 ui-py-3 ui-text-lg'
  }

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].join(' ')

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
