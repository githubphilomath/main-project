/**
 * Badge Component
 */

import React from 'react';
import { cn } from '@/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-green-500/20 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    error: 'bg-red-500/20 text-red-600 dark:text-red-400',
    info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

