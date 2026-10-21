import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { logger } from '@/services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    logger.fatal('AppErrorBoundary', error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>AudioInk Encountered an Error</Text>
            <Text style={styles.subtitle}>
              A render or component crash occurred. Diagnostic logs have been captured.
            </Text>
          </View>

          <ScrollView style={styles.detailsBox} contentContainerStyle={{ padding: 12 }}>
            <Text style={styles.errorName}>{this.state.error?.name}: {this.state.error?.message}</Text>
            {this.state.error?.stack && (
              <Text style={styles.stackTrace}>{this.state.error.stack}</Text>
            )}
            {this.state.errorInfo?.componentStack && (
              <Text style={styles.componentStack}>{this.state.errorInfo.componentStack}</Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={this.handleRestart}>
              <Text style={styles.primaryButtonText}>Recover & Restart Screen</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121316',
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#918fa1',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  detailsBox: {
    flex: 1,
    backgroundColor: '#1f1f23',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#343538',
    marginBottom: 20,
  },
  errorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffb4ab',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  stackTrace: {
    fontSize: 11,
    color: '#c7c4d8',
    fontFamily: 'monospace',
    lineHeight: 16,
    marginBottom: 12,
  },
  componentStack: {
    fontSize: 10,
    color: '#918fa1',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  actions: {
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

