// src/renderer/src/components/ui/error-display.tsx

import React from 'react';
import { AlertTriangle, AlertCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { cn } from '@renderer/lib/utils';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  severity?: ErrorSeverity;
  retryable?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

const severityConfig = {
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200',
    bgColor: 'bg-blue-50',
    badgeVariant: 'secondary' as const
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-200',
    bgColor: 'bg-yellow-50',
    badgeVariant: 'secondary' as const
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-500',
    borderColor: 'border-red-200',
    bgColor: 'bg-red-50',
    badgeVariant: 'destructive' as const
  },
  critical: {
    icon: XCircle,
    iconColor: 'text-red-600',
    borderColor: 'border-red-300',
    bgColor: 'bg-red-100',
    badgeVariant: 'destructive' as const
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  details,
  severity = 'error',
  retryable = false,
  onRetry,
  onDismiss,
  className,
  compact = false
}) => {
  const config = severityConfig[severity];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-2 rounded border',
        config.borderColor,
        config.bgColor,
        className
      )}>
        <Icon className={cn('h-4 w-4 flex-shrink-0', config.iconColor)} />
        <span className="text-sm flex-1">{message}</span>
        {retryable && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      'border',
      config.borderColor,
      config.bgColor,
      className
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {title && (
                <h4 className="text-sm font-medium">{title}</h4>
              )}
              <Badge variant={config.badgeVariant} className="text-xs">
                {severity.toUpperCase()}
              </Badge>
            </div>
            
            <p className="text-sm text-foreground mb-2">{message}</p>
            
            {details && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded overflow-auto whitespace-pre-wrap">
                  {details}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-2">
            {retryable && onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                ×
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface ErrorListProps {
  errors: Array<{
    id: string;
    title?: string;
    message: string;
    details?: string;
    severity?: ErrorSeverity;
    retryable?: boolean;
    timestamp?: string;
  }>;
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export const ErrorList: React.FC<ErrorListProps> = ({
  errors,
  onRetry,
  onDismiss,
  onClearAll,
  className
}) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {errors.length} Error{errors.length > 1 ? 's' : ''}
        </h3>
        {onClearAll && errors.length > 1 && (
          <Button size="sm" variant="ghost" onClick={onClearAll}>
            Clear All
          </Button>
        )}
      </div>
      
      {errors.map((error) => (
        <ErrorDisplay
          key={error.id}
          title={error.title}
          message={error.message}
          details={error.details}
          severity={error.severity}
          retryable={error.retryable}
          onRetry={onRetry ? () => onRetry(error.id) : undefined}
          onDismiss={onDismiss ? () => onDismiss(error.id) : undefined}
          compact
        />
      ))}
    </div>
  );
};