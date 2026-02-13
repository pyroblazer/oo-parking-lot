import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Store error info in state for display
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <Text style={styles.title}>⚠️ Something went wrong</Text>
            <Text style={styles.message}>
              An error occurred while rendering this component.
            </Text>
            
            {this.state.error && (
              <View style={styles.details}>
                <Text style={styles.detailsTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={this.handleReset}
            >
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  details: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  resetButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 150,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
