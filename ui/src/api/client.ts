/**
 * Kaiten API Client
 * Fetch-based HTTP client for Kaiten API calls
 * Mirrors the functionality of KaitenApiClient.kt
 */

import {
  SpaceDto,
  BoardDto,
  ColumnDto,
  TaskDto,
  UserDto,
  Space,
  Board,
  Column,
  Task,
  User,
  spaceDtoToDomain,
  boardDtoToDomain,
  columnDtoToDomain,
  taskDtoToDomain,
  userDtoToDomain,
} from './types';
import {
  KaitenApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  NetworkError,
  TimeoutError,
} from './errors';
import { useLogStore } from '@/state/logStore';
import { bridge } from '@/bridge/JCEFBridge';

type ApiRequestResult<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; message: string };

/**
 * API Configuration
 */
export interface ApiConfig {
  serverUrl: string;
  apiToken: string;
}

/**
 * Kaiten API Client
 */
export class KaitenApiClient {
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor(private readonly config: ApiConfig) {}

  /**
   * Execute HTTP request via Kotlin bridge (OkHttp) to bypass JCEF CORS restrictions.
   * Direct fetch() from file:// origin is blocked by Chromium CORS policy.
   */
  private async executeRequest<T>(
    url: string,
    retryCount: number = 0
  ): Promise<T> {
    const startTime = Date.now();
    const log = useLogStore.getState().addEntry;

    if (retryCount === 0) {
      log({ type: 'request', url, message: `GET ${url}` });
    }
    console.log(`[Kaiten API] --> GET ${url}`);

    try {
      const result = await bridge.call('apiRequest', { url }) as ApiRequestResult<T>;
      const duration = Date.now() - startTime;

      if (result.ok) {
        console.log(`[Kaiten API] <-- GET ${url} ${result.status} OK (${duration}ms)`);
        log({ type: 'success', url, status: result.status, duration, message: '200 OK' });
        return result.body;
      }

      // HTTP error response from Kotlin
      const { status, message } = result;
      console.warn(`[Kaiten API] <-- GET ${url} ${status} (${duration}ms): ${message}`);

      if (status === 401) {
        log({ type: 'error', url, status, duration, message: '401 Unauthorized' });
        throw new UnauthorizedError();
      }
      if (status === 403) {
        log({ type: 'error', url, status, duration, message: '403 Forbidden' });
        throw new ForbiddenError();
      }
      if (status === 404) {
        log({ type: 'warning', url, status, duration, message: '404 Not Found' });
        throw new NotFoundError();
      }
      if (status >= 500 && status <= 599) {
        if (retryCount < this.maxRetries) {
          log({ type: 'warning', url, status, duration, retryCount, message: `${status} Server Error — retry ${retryCount + 1}/${this.maxRetries}` });
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * (retryCount + 1)));
          return this.executeRequest<T>(url, retryCount + 1);
        }
        log({ type: 'error', url, status, duration, message: `${status} Server Error (max retries exceeded)` });
        throw new ServerError(`Server error: ${status}`);
      }
      if (status === 0) {
        // Network-level error (no HTTP response): timeout or connection failure
        const isTimeout = message.startsWith('Timeout');
        if (isTimeout) {
          if (retryCount < this.maxRetries) {
            log({ type: 'warning', url, duration, retryCount, message: `Timeout — retry ${retryCount + 1}/${this.maxRetries}` });
            await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * (retryCount + 1)));
            return this.executeRequest<T>(url, retryCount + 1);
          }
          log({ type: 'error', url, duration, message: 'Timeout (max retries exceeded)' });
          throw new TimeoutError();
        }
        log({ type: 'error', url, duration, message });
        throw new NetworkError(message);
      }

      log({ type: 'error', url, status, duration, message: `${status} Unexpected error: ${message}` });
      throw new ServerError(`Unexpected error: ${status}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const stack = error instanceof Error ? error.stack : undefined;

      // Already-typed API errors — rethrow without extra logging
      if (error instanceof KaitenApiError) {
        throw error;
      }

      // Bridge/RPC failure (e.g. bridge not ready, handler not found)
      console.error(`[Kaiten API] <-- GET ${url} BRIDGE_ERROR (${duration}ms):`, error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      log({ type: 'error', url, duration, message: `Bridge error: ${message}`, stack });
      throw new NetworkError(message);
    }
  }

  /**
   * Get all spaces
   */
  async getSpaces(): Promise<Space[]> {
    const dtos = await this.executeRequest<SpaceDto[]>(`${this.config.serverUrl}/spaces`);
    return dtos.map(spaceDtoToDomain);
  }

  /**
   * Get all boards in a space
   */
  async getBoards(spaceId: number): Promise<Board[]> {
    const dtos = await this.executeRequest<BoardDto[]>(
      `${this.config.serverUrl}/spaces/${spaceId}/boards`
    );
    return dtos.map(boardDtoToDomain);
  }

  /**
   * Get all columns in a board
   */
  async getColumns(boardId: number): Promise<Column[]> {
    const dtos = await this.executeRequest<ColumnDto[]>(
      `${this.config.serverUrl}/boards/${boardId}/columns`
    );
    return dtos.map(columnDtoToDomain);
  }

  /**
   * Get all cards in a board, optionally filtered by search text
   */
  async getCards(boardId: number, searchText?: string): Promise<Task[]> {
    let url = `${this.config.serverUrl}/cards?board_id=${boardId}`;

    if (searchText && searchText.trim()) {
      const encoded = encodeURIComponent(searchText);
      console.log(`[Kaiten API] getCards with search query: "${searchText}"`);
      url += `&query=${encoded}`;
    }

    const dtos = await this.executeRequest<TaskDto[]>(url);
    return dtos.map(taskDtoToDomain);
  }

  /**
   * Get a single card by ID
   */
  async getCard(cardId: number): Promise<Task> {
    const dto = await this.executeRequest<TaskDto>(`${this.config.serverUrl}/cards/${cardId}`);
    return taskDtoToDomain(dto);
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    const dtos = await this.executeRequest<UserDto[]>(`${this.config.serverUrl}/users`);
    return dtos.map(userDtoToDomain);
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User> {
    const dto = await this.executeRequest<UserDto>(`${this.config.serverUrl}/users/current`);
    return userDtoToDomain(dto);
  }
}
