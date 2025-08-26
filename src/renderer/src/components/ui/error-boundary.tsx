// src/renderer/src/components/ui/error-boundary.tsx

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-6 m-4 border-destructive">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mt-1">
                An unexpected error occurred. Please try refreshing the component.
              </p>
              {this.state.error && (
                <details className="mt-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Error details
                  </summary>
                  <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <Button onClick={this.handleReset} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}