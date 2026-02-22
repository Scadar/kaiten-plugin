/**
 * Kaiten API Client
 * Axios-based HTTP client for Kaiten API calls
 */

import axios from 'axios';
import {
  SpaceDto,
  BoardDto,
  ColumnDto,
  TaskDto,
  TaskDetailDto,
  CommentDto,
  UserDto,
  Space,
  Board,
  Column,
  Task,
  TaskDetail,
  Comment,
  User,
  spaceDtoToDomain,
  boardDtoToDomain,
  columnDtoToDomain,
  taskDtoToDomain,
  taskDetailDtoToDomain,
  commentDtoToDomain,
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
import { createKaitenAxios } from './axiosInstance';

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
  private readonly axiosInstance;

  constructor(private readonly config: ApiConfig) {
    this.axiosInstance = createKaitenAxios(config);
  }

  /**
   * Execute HTTP GET request via axios directly to the Kaiten API.
   *
   * @param path - Relative API path (no leading slash), e.g. "spaces" or "cards"
   * @param params - Optional query parameters
   * @param retryCount - Internal retry counter
   */
  private async executeRequest<T>(
    path: string,
    params?: Record<string, unknown>,
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.config.serverUrl.replace(/\/$/, '')}/${path}`;
    const startTime = Date.now();
    const log = useLogStore.getState().addEntry;

    if (retryCount === 0) {
      log({ type: 'request', url, message: `GET ${url}` });
    }
    console.log(`[Kaiten API] --> GET ${url}`);

    try {
      const response = await this.axiosInstance.get<T>(path, { params });
      const duration = Date.now() - startTime;

      console.log(`[Kaiten API] <-- GET ${url} ${response.status} OK (${duration}ms)`);
      log({ type: 'success', url, status: response.status, duration, message: '200 OK' });

      return response.data;

    } catch (error) {
      const duration = Date.now() - startTime;

      // Already-typed API errors — rethrow without extra logging
      if (error instanceof KaitenApiError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        // HTTP error response (4xx / 5xx)
        if (error.response) {
          const { status } = error.response;
          console.warn(`[Kaiten API] <-- GET ${url} ${status} (${duration}ms)`);

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
              return this.executeRequest<T>(path, params, retryCount + 1);
            }
            log({ type: 'error', url, status, duration, message: `${status} Server Error (max retries exceeded)` });
            throw new ServerError(`Server error: ${status}`);
          }

          const message = error.message || `HTTP ${status}`;
          log({ type: 'error', url, status, duration, message: `${status} Unexpected error: ${message}` });
          throw new ServerError(`Unexpected error: ${status}`);
        }

        // Timeout (axios sets code = 'ECONNABORTED' or 'ERR_CANCELED' for timeouts)
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
          if (retryCount < this.maxRetries) {
            log({ type: 'warning', url, duration, retryCount, message: `Timeout — retry ${retryCount + 1}/${this.maxRetries}` });
            await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * (retryCount + 1)));
            return this.executeRequest<T>(path, params, retryCount + 1);
          }
          log({ type: 'error', url, duration, message: 'Timeout (max retries exceeded)' });
          throw new TimeoutError();
        }

        // Network error (no response, not a timeout)
        const message = error.message || 'Network error';
        console.error(`[Kaiten API] <-- GET ${url} NETWORK_ERROR (${duration}ms):`, error);
        log({ type: 'error', url, duration, message: `Network error: ${message}` });
        throw new NetworkError(message);
      }

      // Unexpected non-axios error
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`[Kaiten API] <-- GET ${url} ERROR (${duration}ms):`, error);
      log({ type: 'error', url, duration, message: `Error: ${message}`, stack });
      throw new NetworkError(message);
    }
  }

  /**
   * Get all spaces
   */
  async getSpaces(): Promise<Space[]> {
    const dtos = await this.executeRequest<SpaceDto[]>('spaces');
    return dtos.map(spaceDtoToDomain);
  }

  /**
   * Get all boards in a space
   */
  async getBoards(spaceId: number): Promise<Board[]> {
    const dtos = await this.executeRequest<BoardDto[]>(`spaces/${spaceId}/boards`);
    return dtos.map(boardDtoToDomain);
  }

  /**
   * Get all columns in a board
   */
  async getColumns(boardId: number): Promise<Column[]> {
    const dtos = await this.executeRequest<ColumnDto[]>(`boards/${boardId}/columns`);
    return dtos.map(columnDtoToDomain);
  }

  /**
   * Get all cards in a board, optionally filtered by search text
   */
  async getCards(boardId: number, searchText?: string): Promise<Task[]> {
    const params: Record<string, unknown> = { board_id: boardId };

    if (searchText?.trim()) {
      console.log(`[Kaiten API] getCards with search query: "${searchText}"`);
      params.query = searchText.trim();
    }

    const dtos = await this.executeRequest<TaskDto[]>('cards', params);
    return dtos.map(taskDtoToDomain);
  }

  /**
   * Get a single card by ID (basic fields)
   */
  async getCard(cardId: number): Promise<Task> {
    const dto = await this.executeRequest<TaskDto>(`cards/${cardId}`);
    return taskDtoToDomain(dto);
  }

  /**
   * Get a single card with extended detail fields
   */
  async getCardDetail(cardId: number): Promise<TaskDetail> {
    const dto = await this.executeRequest<TaskDetailDto>(`cards/${cardId}`);
    return taskDetailDtoToDomain(dto);
  }

  /**
   * Get comments for a card
   */
  async getCardComments(cardId: number): Promise<Comment[]> {
    const dtos = await this.executeRequest<CommentDto[]>(`cards/${cardId}/comments`);
    return dtos.map(commentDtoToDomain);
  }

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    const dtos = await this.executeRequest<UserDto[]>('users');
    return dtos.map(userDtoToDomain);
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User> {
    const dto = await this.executeRequest<UserDto>('users/current');
    return userDtoToDomain(dto);
  }
}
