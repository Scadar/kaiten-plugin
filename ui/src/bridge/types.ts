/**
 * TypeScript type definitions for JCEF Bridge communication
 * These types are shared between React and IDE (Kotlin) for type-safe messaging
 */

// ============================================================================
// Base Message Types
// ============================================================================

/**
 * Base structure for all messages passed through the bridge
 */
export interface BaseMessage {
  type: string;
  timestamp: number;
}

/**
 * Message types for different communication patterns
 */
export type MessageType =
  | 'rpc_request'
  | 'rpc_response'
  | 'rpc_error'
  | 'event'
  | 'state:update'
  | 'state:sync'
  | 'error:report'
  | 'bridge:ready'
  | 'bridge:ping'
  | 'bridge:pong';

// ============================================================================
// RPC (Request/Response) Pattern
// ============================================================================

/**
 * RPC request from React to IDE
 */
export interface RPCRequest extends BaseMessage {
  type: 'rpc_request';
  id: string; // UUID for matching request/response
  method: string;
  params: unknown;
}

/**
 * RPC successful response from IDE to React
 */
export interface RPCResponse<T = unknown> extends BaseMessage {
  type: 'rpc_response';
  id: string; // Matches request ID
  result: T;
}

/**
 * RPC error response from IDE to React
 */
export interface RPCError extends BaseMessage {
  type: 'rpc_error';
  id: string; // Matches request ID
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Union type for all RPC messages
 */
export type RPCMessage = RPCRequest | RPCResponse | RPCError;

// ============================================================================
// Event Bus Pattern
// ============================================================================

/**
 * Event message for pub/sub pattern (IDE → React)
 */
export interface EventMessage<T = unknown> extends BaseMessage {
  type: 'event';
  event: string; // Event name (e.g., 'task:updated', 'settings:changed')
  payload: T;
}

// ============================================================================
// State Synchronization Pattern
// ============================================================================

/**
 * Application state structure
 */
export interface AppState {
  projectPath: string | null;
  selectedFile: string | null;
  settings: Record<string, unknown>;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
  tasks: unknown[];
  filters: Record<string, unknown>;
}

/**
 * State update message from IDE to React
 */
export interface StateUpdateMessage extends BaseMessage {
  type: 'state:update';
  updates: Partial<AppState>;
}

/**
 * State sync message from React to IDE
 */
export interface StateSyncMessage extends BaseMessage {
  type: 'state:sync';
  changes: Partial<AppState>;
}

// ============================================================================
// Error Reporting Pattern
// ============================================================================

/**
 * Error report message from React to IDE
 */
export interface ErrorReportMessage extends BaseMessage {
  type: 'error:report';
  error: {
    message: string;
    stack?: string;
    componentStack?: string;
    errorBoundary?: string;
    severity: 'fatal' | 'error' | 'warning' | 'info';
    context?: Record<string, unknown>;
  };
}

// ============================================================================
// Bridge Lifecycle Messages
// ============================================================================

/**
 * Bridge ready handshake message
 */
export interface BridgeReadyMessage extends BaseMessage {
  type: 'bridge:ready';
  source: 'ide' | 'react';
  version: string;
}

/**
 * Bridge ping message for connection health check
 */
export interface BridgePingMessage extends BaseMessage {
  type: 'bridge:ping';
  id: string;
}

/**
 * Bridge pong response message
 */
export interface BridgePongMessage extends BaseMessage {
  type: 'bridge:pong';
  id: string;
  latency?: number;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union of all possible message types
 */
export type BridgeMessage =
  | RPCRequest
  | RPCResponse
  | RPCError
  | EventMessage
  | StateUpdateMessage
  | StateSyncMessage
  | ErrorReportMessage
  | BridgeReadyMessage
  | BridgePingMessage
  | BridgePongMessage;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard to check if message is an RPC request
 */
export function isRPCRequest(message: BridgeMessage): message is RPCRequest {
  return message.type === 'rpc_request';
}

/**
 * Type guard to check if message is an RPC response
 */
export function isRPCResponse(message: BridgeMessage): message is RPCResponse {
  return message.type === 'rpc_response';
}

/**
 * Type guard to check if message is an RPC error
 */
export function isRPCError(message: BridgeMessage): message is RPCError {
  return message.type === 'rpc_error';
}

/**
 * Type guard to check if message is an event
 */
export function isEventMessage(message: BridgeMessage): message is EventMessage {
  return message.type === 'event';
}

/**
 * Type guard to check if message is a state update
 */
export function isStateUpdate(message: BridgeMessage): message is StateUpdateMessage {
  return message.type === 'state:update';
}

/**
 * Type guard to check if message is a state sync
 */
export function isStateSync(message: BridgeMessage): message is StateSyncMessage {
  return message.type === 'state:sync';
}

/**
 * Type guard to check if message is an error report
 */
export function isErrorReport(message: BridgeMessage): message is ErrorReportMessage {
  return message.type === 'error:report';
}

/**
 * Type guard to check if message is a bridge ready message
 */
export function isBridgeReady(message: BridgeMessage): message is BridgeReadyMessage {
  return message.type === 'bridge:ready';
}

// ============================================================================
// RPC Method Definitions
// ============================================================================

/**
 * Available RPC methods that can be called from React
 */
export interface RPCMethods {
  // Project operations
  getProjectPath: {
    params: void;
    result: string | null;
  };
  getSelectedFile: {
    params: void;
    result: string | null;
  };

  // State operations
  getState: {
    params: void;
    result: AppState;
  };

  // Settings operations
  getSetting: {
    params: { key: string };
    result: unknown;
  };
  setSetting: {
    params: { key: string; value: unknown };
    result: void;
  };

  // Task operations
  getTasks: {
    params: { filters?: Record<string, unknown> };
    result: unknown[];
  };
  getTask: {
    params: { id: string };
    result: unknown;
  };

  // User operations
  getCurrentUser: {
    params: void;
    result: { id: string; name: string; email: string } | null;
  };
}

/**
 * Type-safe RPC method names
 */
export type RPCMethodName = keyof RPCMethods;

/**
 * Extract params type for a given RPC method
 */
export type RPCParams<M extends RPCMethodName> = RPCMethods[M]['params'];

/**
 * Extract result type for a given RPC method
 */
export type RPCResult<M extends RPCMethodName> = RPCMethods[M]['result'];

// ============================================================================
// Event Definitions
// ============================================================================

/**
 * Available event types that can be emitted from IDE to React
 */
export interface EventTypes {
  'task:created': { taskId: string; task: unknown };
  'task:updated': { taskId: string; task: unknown };
  'task:deleted': { taskId: string };
  'settings:changed': { key: string; value: unknown };
  'user:login': { userId: string; userName: string };
  'user:logout': void;
  'project:opened': { projectPath: string };
  'project:closed': void;
  'file:selected': { filePath: string };
  'state:update': Partial<AppState>;
}

/**
 * Type-safe event names
 */
export type EventName = keyof EventTypes;

/**
 * Extract payload type for a given event
 */
export type EventPayload<E extends EventName> = EventTypes[E];
