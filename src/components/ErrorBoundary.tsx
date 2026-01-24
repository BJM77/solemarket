'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    ErrorBoundaryState
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);

        // Log to error tracking service (in production)
        if (typeof window !== 'undefined') {
            try {
                // Will implement error logging service
                fetch('/api/log-error', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: error.message,
                        stack: error.stack,
                        componentStack: errorInfo.componentStack,
                        url: window.location.href,
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString(),
                    }),
                }).catch(console.error);
            } catch (e) {
                console.error('Failed to log error:', e);
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                    <div className="text-center max-w-md">
                        <div className="flex justify-center mb-4">
                            <AlertTriangle className="h-16 w-16 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Oops! Something went wrong
                        </h1>
                        <p className="text-gray-600 mb-6">
                            We've encountered an unexpected error. Don't worry, our team has been notified and we're working to fix it.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button
                                onClick={() => {
                                    this.setState({ hasError: false, error: undefined });
                                    window.location.href = '/';
                                }}
                                variant="default"
                            >
                                Return Home
                            </Button>
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                            >
                                Reload Page
                            </Button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    Error Details (Dev Only)
                                </summary>
                                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
