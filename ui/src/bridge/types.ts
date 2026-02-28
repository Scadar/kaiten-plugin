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
 *
 * IDE-SPECIFIC STATE - Only IDE context, not application data
 * Application data (tasks, users, boards, etc.) managed in React via React Query
 */
export interface AppState {
  // IDE project context
  projectPath: string | null;
  selectedFile: string | null;

  // IDE settings (for synchronization)
  settings: Record<string, unknown>;
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
// IDE Theme
// ============================================================================

/**
 * Colors and font resolved from the IDE's current Look-and-Feel.
 * All color values are CSS hex strings (e.g. "#2b2d30").
 */
export interface IdeTheme {
  isDark: boolean;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  inputForeground: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  radius: string;
  fontSize: string;
  fontSizeSm: string;
  fontSizeXs: string;
  fontFamily: string;
}

// ============================================================================
// RPC Method Definitions
// ============================================================================

/**
 * Available RPC methods that can be called from React
 *
 * MINIMAL API - Only IDE-specific operations
 * Data fetching moved to React API client (see ui/src/api/client.ts)
 */
export interface RPCMethods {
  // IDE theme
  getIdeTheme: {
    params: undefined;
    result: IdeTheme;
  };

  // Settings operations (IDE configuration)
  getSettings: {
    params: undefined;
    result: unknown; // Will be cast to KaitenSettings in useSettings hook
  };
  updateSettings: {
    params: { settings: unknown }; // Will be KaitenSettings
    result: undefined;
  };
  openSettings: {
    params: undefined;
    result: undefined;
  };

  // File operations (IDE integration)
  openFile: {
    params: { path: string; line?: number };
    result: undefined;
  };

  // Open a URL in the system default browser
  openUrl: {
    params: { url: string };
    result: undefined;
  };

  // Notification operations (IDE notifications)
  showNotification: {
    params: {
      message: string;
      type?: 'info' | 'warning' | 'error';
      title?: string;
    };
    result: undefined;
  };

  // Project operations (IDE context)
  getProjectPath: {
    params: undefined;
    result: string | null;
  };
  getSelectedFile: {
    params: undefined;
    result: string | null;
  };

  // HTTP proxy — routes fetch through Kotlin/OkHttp to bypass JCEF CORS restrictions
  apiRequest: {
    params: { url: string };
    result:
      | { ok: true; status: number; body: unknown }
      | { ok: false; status: number; message: string };
  };

  // Branch time tracking
  getBranchTimeEntries: {
    params: undefined;
    result: Record<string, BranchTimeData>;
  };
  getCurrentBranch: {
    params: undefined;
    result: { branch: string | null; isTracking: boolean; accumulatedSeconds: number };
  };
  clearBranchEntries: {
    params: string;
    result: boolean;
  };

  // Git branch checks — only the requested branches are examined
  checkBranchesMerged: {
    params: { releaseBranch: string; branches: string[] };
    result: { results: Record<string, boolean> } | { error: string };
  };

  // Git commit log
  getGitLog: {
    params: { branchName?: string; maxCount?: number };
    result: GitCommit[];
  };
}

export interface GitCommit {
  hash: string;
  fullHash: string;
  author: string;
  email: string;
  timestamp: number; // Unix ms
  message: string;
}

export interface BranchTimeData {
  total: number;
  daily: { date: string; seconds: number }[];
  isActive: boolean;
  lastActive: string | null;
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
 *
 * Mirrors Kotlin EventNames — only events defined there are valid here.
 * State updates arrive via StateUpdateMessage (type: 'state:update'), which the
 * bridge re-emits on the EventBus under the 'state:update' key.
 */
export interface EventTypes {
  // IDE theme change — fired when the user switches the IDE Look-and-Feel
  // Kotlin: EventNames.THEME_CHANGED = "theme:changed"
  'theme:changed': IdeTheme;

  // State synchronisation — emitted by JCEFBridge when a StateUpdateMessage arrives
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
