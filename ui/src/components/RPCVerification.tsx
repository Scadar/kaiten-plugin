/**
 * RPCVerification component - Demonstrates and tests RPC call flow from React to IDE
 *
 * This component verifies the end-to-end RPC communication:
 * 1. React calls bridge.call(method, params)
 * 2. IDE receives RPC request via JBCefJSQuery
 * 3. IDE executes handler and returns result
 * 4. React receives response and updates UI
 */

import { useState } from 'react';
import { bridge } from '@/bridge/JCEFBridge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Play } from 'lucide-react';

interface RPCTest {
  id: string;
  name: string;
  method: string;
  params: unknown;
  description: string;
}

interface RPCTestResult {
  testId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  duration?: number;
}

/**
 * RPC tests to run
 */
const RPC_TESTS: RPCTest[] = [
  {
    id: 'test-getProjectPath',
    name: 'Get Project Path',
    method: 'getProjectPath',
    params: undefined,
    description: 'Fetch the current project path from IDE',
  },
  {
    id: 'test-getProjectName',
    name: 'Get Project Name',
    method: 'getProjectName',
    params: undefined,
    description: 'Fetch the current project name from IDE',
  },
  {
    id: 'test-getState',
    name: 'Get Full State',
    method: 'getState',
    params: undefined,
    description: 'Fetch the complete application state from IDE',
  },
];

/**
 * RPCVerification component
 */
export function RPCVerification() {
  const [results, setResults] = useState<Map<string, RPCTestResult>>(
    new Map(RPC_TESTS.map((test) => [test.id, { testId: test.id, status: 'pending' }]))
  );
  const [isRunning, setIsRunning] = useState(false);

  /**
   * Run a single RPC test
   */
  const runTest = async (test: RPCTest): Promise<void> => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(test.id, { testId: test.id, status: 'running' });
      return next;
    });

    const startTime = performance.now();

    try {
      // Make RPC call to IDE
      const result = await bridge.call(test.method as any, test.params as any);
      const duration = performance.now() - startTime;

      setResults((prev) => {
        const next = new Map(prev);
        next.set(test.id, {
          testId: test.id,
          status: 'success',
          result,
          duration,
        });
        return next;
      });
    } catch (error) {
      const duration = performance.now() - startTime;

      setResults((prev) => {
        const next = new Map(prev);
        next.set(test.id, {
          testId: test.id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          duration,
        });
        return next;
      });
    }
  };

  /**
   * Run all RPC tests
   */
  const runAllTests = async (): Promise<void> => {
    setIsRunning(true);

    try {
      // Wait for bridge to be ready
      await bridge.ready();

      // Run tests sequentially
      for (const test of RPC_TESTS) {
        await runTest(test);
      }
    } catch (error) {
      console.error('Error running RPC tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Reset all test results
   */
  const resetTests = (): void => {
    setResults(
      new Map(RPC_TESTS.map((test) => [test.id, { testId: test.id, status: 'pending' }]))
    );
  };

  /**
   * Get status badge for a test result
   */
  const getStatusBadge = (result: RPCTestResult) => {
    switch (result.status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'running':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case 'success':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RPC Call Flow Verification</CardTitle>
        <CardDescription>
          Test end-to-end RPC communication from React to IDE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button onClick={runAllTests} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
          <Button variant="outline" onClick={resetTests} disabled={isRunning}>
            Reset
          </Button>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {RPC_TESTS.map((test) => {
            const result = results.get(test.id)!;

            return (
              <Card key={test.id} className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{test.name}</span>
                        {getStatusBadge(result)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {test.description}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        Method: <code>{test.method}</code>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runTest(test)}
                      disabled={isRunning}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Result Display */}
                  {result.status === 'success' && (
                    <div className="mt-3 p-3 bg-background rounded border border-green-600/20">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-green-600">Result:</span>
                        {result.duration !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration.toFixed(2)}ms
                          </span>
                        )}
                      </div>
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}

                  {result.status === 'error' && (
                    <div className="mt-3 p-3 bg-background rounded border border-destructive/20">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-destructive">Error:</span>
                        {result.duration !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration.toFixed(2)}ms
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-destructive">{result.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> Each test makes an RPC call to the IDE using{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              bridge.call(method, params)
            </code>
            . The IDE receives the request via JBCefJSQuery, executes the registered handler,
            and returns the result via executeJavaScript. React receives the response and
            updates the UI.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
