import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * Equivalent to Svelte's +error.svelte
 */
class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!, this.resetError);
      }

      // Default error UI matching Svelte's +error.svelte
      return <DefaultErrorFallback error={this.state.error} reset={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 * Matches the styling of Svelte's +error.svelte page
 */
function DefaultErrorFallback({ error }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 min-h-screen">
      <div className="flex h-full">
        <div className="m-auto my-10 dark:text-gray-300 text-3xl font-semibold">
          {error.name || 'Error'}: {error.message}
        </div>
      </div>
    </div>
  );
}

/**
 * ErrorBoundary wrapper component
 * Provides easier usage with hooks support
 */
export default function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />;
}

/**
 * Hook-based Error Boundary wrapper for functional components
 * Usage:
 * <ErrorBoundaryWithReset>
 *   <YourComponent />
 * </ErrorBoundaryWithReset>
 */
export function ErrorBoundaryWithReset({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundaryClass>
      {children}
    </ErrorBoundaryClass>
  );
}

