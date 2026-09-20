import React from 'react';
import PropTypes from 'prop-types';
import { CircleAlert, RotateCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import logger from '../utils/logger.js';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(_error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log error details
    logger.error('Error Boundary caught an error:', {
      error: _error?.message,
      stack: _error?.stack,
      componentStack: errorInfo.componentStack,
      errorId
    });

    // Update state with error details
    this.setState({
      error: _error,
      errorInfo,
      errorId
    });

    // Report to external error tracking service if available
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: _error?.message,
        fatal: false,
        custom_map: {
          error_id: errorId
        }
      });
    }
  }

  handleRetry = () => {
    // Reset error state to allow retry
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    // Reload the entire page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="flex justify-center items-center min-h-screen p-6 bg-background">
          <Card className="p-8 max-w-xl w-full text-center">
            <CircleAlert className="size-16 text-destructive mx-auto mb-4" />

            <h4 className="font-display text-2xl font-bold text-destructive mb-2">
              Something went wrong
            </h4>

            <p className="text-muted-foreground mb-5">
              We&apos;re sorry, but something unexpected happened. This has been logged and we&apos;ll look into it.
            </p>

            {this.state.errorId && (
              <Alert variant="info" className="mb-5 text-left">
                <AlertDescription>Error ID: {this.state.errorId}</AlertDescription>
              </Alert>
            )}

            {import.meta.env && import.meta.env.DEV && this.state.error && (
              <Alert variant="destructive" className="mb-5 text-left">
                <AlertTitle>Development Error Details:</AlertTitle>
                <AlertDescription>
                  <pre className="text-xs whitespace-pre-wrap">{this.state.error.message}</pre>
                  {this.state.error.stack && (
                    <pre className="text-xs whitespace-pre-wrap mt-2">{this.state.error.stack}</pre>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} className="min-w-[120px]">
                <RotateCw />
                Try Again
              </Button>

              <Button variant="outline" onClick={this.handleReload} className="min-w-[120px]">
                Reload Page
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-5">
              If this problem persists, please contact support with the Error ID above.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// PropTypes validation
ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func
};

export default ErrorBoundary;
