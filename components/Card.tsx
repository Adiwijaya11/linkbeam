import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`relative bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
