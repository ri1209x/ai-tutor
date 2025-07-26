import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'border-transparent bg-secondary-500 text-white hover:bg-secondary-600',
        destructive: 'border-transparent bg-error-500 text-white hover:bg-error-600',
        success: 'border-transparent bg-success-500 text-white hover:bg-success-600',
        warning: 'border-transparent bg-warning-500 text-white hover:bg-warning-600',
        outline: 'border-gray-300 text-gray-700 hover:bg-gray-50',
        // 教科別バッジ
        math: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
        japanese: 'border-transparent bg-green-500 text-white hover:bg-green-600',
        english: 'border-transparent bg-orange-500 text-white hover:bg-orange-600',
        science: 'border-transparent bg-purple-500 text-white hover:bg-purple-600',
        social: 'border-transparent bg-red-500 text-white hover:bg-red-600',
        // 進捗状態別バッジ
        completed: 'border-transparent bg-green-100 text-green-800',
        inProgress: 'border-transparent bg-yellow-100 text-yellow-800',
        notStarted: 'border-transparent bg-gray-100 text-gray-800',
        paused: 'border-transparent bg-orange-100 text-orange-800',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
