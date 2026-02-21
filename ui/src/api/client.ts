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
   * Execute HTTP request with retry logic and error handling
   */
  private async executeRequest<T>(
    url: string,
    retryCount: number = 0
  ): Promise<T> {
    const startTime = Date.now();
    console.log(`[Kaiten API] --> GET ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Handle different response status codes
      switch (response.status) {
        case 200: {
          console.log(`[Kaiten API] <-- GET ${url} ${response.status} OK (${duration}ms)`);
          const body = await response.text();
          if (!body) {
            throw new ServerError('Empty response body');
          }
          return JSON.parse(body) as T;
        }

        case 401: {
          console.warn(`[Kaiten API] <-- GET ${url} ${response.status} Unauthorized (${duration}ms)`);
          throw new UnauthorizedError();
        }

        case 403: {
          console.warn(`[Kaiten API] <-- GET ${url} ${response.status} Forbidden (${duration}ms)`);
          throw new ForbiddenError();
        }

        case 404: {
          console.warn(`[Kaiten API] <-- GET ${url} ${response.status} Not Found (${duration}ms)`);
          throw new NotFoundError();
        }

        default: {
          // Handle 5xx server errors with retry logic
          if (response.status >= 500 && response.status <= 599) {
            console.warn(
              `[Kaiten API] <-- GET ${url} ${response.status} Server Error (${duration}ms), retry=${retryCount}`
            );
            if (retryCount < this.maxRetries) {
              const delay = this.retryDelayMs * (retryCount + 1);
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.executeRequest<T>(url, retryCount + 1);
            } else {
              throw new ServerError(`Server error: ${response.status}`);
            }
          }

          // Unexpected error
          console.warn(`[Kaiten API] <-- GET ${url} ${response.status} Unexpected (${duration}ms)`);
          throw new ServerError(`Unexpected error: ${response.status}`);
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle AbortController timeout
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Kaiten API] <-- GET ${url} TIMEOUT (${duration}ms), retry=${retryCount}`);
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelayMs * (retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeRequest<T>(url, retryCount + 1);
        } else {
          throw new TimeoutError();
        }
      }

      // Handle network errors
      if (error instanceof TypeError) {
        console.warn(`[Kaiten API] <-- GET ${url} NETWORK_ERROR (${duration}ms): ${error.message}`);
        throw new NetworkError(error.message);
      }

      // Re-throw KaitenApiError instances
      if (error instanceof KaitenApiError) {
        throw error;
      }

      // Unexpected error
      console.error(`[Kaiten API] <-- GET ${url} ERROR (${duration}ms):`, error);
      throw new ServerError(error instanceof Error ? error.message : 'Unknown error');
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
