/**
 * ErrorBoundary Example Component
 * 
 * This file demonstrates how to use the ErrorBoundary component.
 * It's for testing purposes and should not be imported in production code.
 * 
 * To test:
 * 1. Import this component in your route
 * 2. Click the button to trigger an error
 * 3. See the ErrorBoundary catch and display it
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/ErrorBoundary';

// Component that throws an error when triggered
function ErrorThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error from ErrorBoundaryExample');
  }

  return (
    <div className="p-4 border rounded-lg">
      <p className="text-green-600 font-semibold">✓ Component is working normally</p>
      <p className="text-sm text-muted-foreground mt-2">
        This component will throw an error when the button is clicked.
      </p>
    </div>
  );
}

/**
 * Example 1: Basic ErrorBoundary usage
 */
export function BasicErrorBoundaryExample() {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">ErrorBoundary Example</h2>
        <p className="text-muted-foreground mb-4">
          Click the button to trigger an error and see the ErrorBoundary in action.
        </p>
      </div>

      <ErrorBoundary>
        <div className="space-y-4">
          <Button
            onClick={() => setThrowError(true)}
            variant="destructive"
          >
            Trigger Error
          </Button>
          
          <ErrorThrowingComponent shouldThrow={throwError} />
        </div>
      </ErrorBoundary>
    </div>
  );
}

/**
 * Example 2: ErrorBoundary with custom fallback
 */
export function CustomFallbackExample() {
  const [throwError, setThrowError] = useState(false);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Custom Fallback Example</h2>
        <p className="text-muted-foreground mb-4">
          This example uses a custom error fallback UI.
        </p>
      </div>

      <ErrorBoundary
        fallback={(error, errorInfo, reset) => (
          <div className="p-6 border-2 border-destructive rounded-lg bg-destructive/10">
            <h3 className="text-xl font-semibold text-destructive mb-2">
              Custom Error Handler
            </h3>
            <p className="text-sm mb-4">
              <strong>Error:</strong> {error.message}
            </p>
            <Button onClick={reset} variant="outline">
              Reset Error Boundary
            </Button>
          </div>
        )}
      >
        <div className="space-y-4">
          <Button
            onClick={() => setThrowError(true)}
            variant="destructive"
          >
            Trigger Error (Custom Fallback)
          </Button>
          
          <ErrorThrowingComponent shouldThrow={throwError} />
        </div>
      </ErrorBoundary>
    </div>
  );
}

/**
 * Example 3: Nested ErrorBoundaries
 * This shows how different parts of the app can have their own error handling
 */
export function NestedErrorBoundariesExample() {
  const [throwError1, setThrowError1] = useState(false);
  const [throwError2, setThrowError2] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Nested ErrorBoundaries Example</h2>
        <p className="text-muted-foreground mb-4">
          Different sections have independent error boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First boundary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Section 1</h3>
          <ErrorBoundary>
            <div className="space-y-3">
              <Button
                onClick={() => setThrowError1(true)}
                variant="destructive"
                size="sm"
              >
                Trigger Error in Section 1
              </Button>
              <ErrorThrowingComponent shouldThrow={throwError1} />
            </div>
          </ErrorBoundary>
        </div>

        {/* Second boundary */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Section 2</h3>
          <ErrorBoundary>
            <div className="space-y-3">
              <Button
                onClick={() => setThrowError2(true)}
                variant="destructive"
                size="sm"
              >
                Trigger Error in Section 2
              </Button>
              <ErrorThrowingComponent shouldThrow={throwError2} />
            </div>
          </ErrorBoundary>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Notice how triggering an error in one section doesn't affect the other section.
      </p>
    </div>
  );
}

/**
 * Example 4: Async Error Handling
 * ErrorBoundary only catches synchronous errors in render.
 * For async errors, use try-catch in event handlers.
 */
export function AsyncErrorExample() {
  const [error, setError] = useState<string | null>(null);

  const triggerAsyncError = async () => {
    try {
      // Simulate an async operation that fails
      await new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Async operation failed')), 1000)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Async Error Handling</h2>
        <p className="text-muted-foreground mb-4">
          ErrorBoundary doesn't catch async errors. Use try-catch instead.
        </p>
      </div>

      <div className="space-y-4">
        <Button onClick={triggerAsyncError} variant="outline">
          Trigger Async Error
        </Button>

        {error && (
          <div className="p-4 border-2 border-destructive rounded-lg bg-destructive/10">
            <p className="text-sm text-destructive">
              <strong>Async Error Caught:</strong> {error}
            </p>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Clear Error
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * All Examples Component
 * Renders all examples in a single page for testing
 */
export default function AllErrorBoundaryExamples() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">ErrorBoundary Examples</h1>
        <p className="text-muted-foreground">
          Testing error handling in React frontend (matching Svelte behavior)
        </p>
      </div>

      <div className="space-y-12 divide-y">
        <BasicErrorBoundaryExample />
        <div className="pt-12">
          <CustomFallbackExample />
        </div>
        <div className="pt-12">
          <NestedErrorBoundariesExample />
        </div>
        <div className="pt-12">
          <AsyncErrorExample />
        </div>
      </div>
    </div>
  );
}

