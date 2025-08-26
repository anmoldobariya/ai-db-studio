// src/renderer/src/components/ui/loading.tsx

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
};

interface LoadingOverlayProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading...', 
  size = 'md',
  className 
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3 p-8',
      className
    )}>
      <LoadingSpinner size={size} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  message = 'Loading...', 
  size = 'sm',
  className 
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
};

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};