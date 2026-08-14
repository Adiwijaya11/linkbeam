'use client';
import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer touch-manipulation";
  
  const variants = {
    primary: "bg-brand-primary text-white hover:bg-sky-600 focus:ring-brand-primary shadow-md hover:shadow-lg",
    secondary: "bg-white text-brand-text border border-slate-200 hover:bg-slate-50 focus:ring-brand-text shadow-sm hover:shadow",
  };

  const widthStyle = fullWidth ? "w-full" : "";
  const sizeStyle = "px-6 py-3 text-lg";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
