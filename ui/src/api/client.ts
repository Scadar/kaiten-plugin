/**
 * Kaiten API Client
 * Axios-based HTTP client for Kaiten API calls
 */

import axios from 'axios';

import { useLogStore } from '@/state/logStore';

import { createKaitenAxios } from './axiosInstance';
import {
  KaitenApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ServerError,
  NetworkError,
  TimeoutError,
} from './errors';
import {
  type SpaceDto,
  type BoardDto,
  type ColumnDto,
  type TaskDto,
  type TaskDetailDto,
  type CommentDto,
  type FileDto,
  type UserDto,
  type TagDto,
  type CardTypeDto,
  type CustomPropertyDto,
  type CustomPropertySelectValueDto,
  type Space,
  type Board,
  type Column,
  type Task,
  type TaskDetail,
  type Comment,
  type CardFile,
  type User,
  type Tag,
  type CardType,
  type CustomProperty,
  type CustomPropertySelectValue,
  spaceDtoToDomain,
  boardDtoToDomain,
  columnDtoToDomain,
  taskDtoToDomain,
  taskDetailDtoToDomain,
  commentDtoToDomain,
  fileDtoToDomain,
  userDtoToDomain,
  tagDtoToDomain,
  cardTypeDtoToDomain,
  customPropertyDtoToDomain,
  customPropertySelectValueDtoToDomain,
} from './types';

/**
 * API Configuration
 */
export interface ApiConfig {
  serverUrl: string;
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
    retryCount = 0,
  ): Promise<T> {
    const url = `${this.config.serverUrl.replace(/\/$/, '')}/${path}`;
    const startTime = Date.now();
    const log = useLogStore.getState().addEntry;

    if (retryCount === 0) {
      log({ type: 'request', url, message: `GET ${url}`, params });
    }

    try {
      const response = await this.axiosInstance.get<T>(path, { params });
      const duration = Date.now() - startTime;

      log({ type: 'success', url, status: response.status, duration, message: '200 OK', params });

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

          if (status === 401) {
            log({ type: 'error', url, status, duration, message: '401 Unauthorized', params });
            throw new UnauthorizedError();
          }
          if (status === 403) {
            log({ type: 'error', url, status, duration, message: '403 Forbidden', params });
            throw new ForbiddenError();
          }
          if (status === 404) {
            log({ type: 'warning', url, status, duration, message: '404 Not Found', params });
            throw new NotFoundError();
          }
          if (status >= 500 && status <= 599) {
            if (retryCount < this.maxRetries) {
              log({
                type: 'warning',
                url,
                status,
                duration,
                retryCount,
                message: `${status} Server Error — retry ${retryCount + 1}/${this.maxRetries}`,
                params,
              });
              await new Promise((resolve) =>
                setTimeout(resolve, this.retryDelayMs * (retryCount + 1)),
              );
              return this.executeRequest<T>(path, params, retryCount + 1);
            }
            log({
              type: 'error',
              url,
              status,
              duration,
              message: `${status} Server Error (max retries exceeded)`,
              params,
            });
            throw new ServerError(`Server error: ${status}`);
          }

          const message = error.message || `HTTP ${status}`;
          log({
            type: 'error',
            url,
            status,
            duration,
            message: `${status} Unexpected error: ${message}`,
            params,
          });
          throw new ServerError(`Unexpected error: ${status}`);
        }

        // Timeout (axios sets code = 'ECONNABORTED' or 'ERR_CANCELED' for timeouts)
        if (error.code === 'ECONNABORTED' || error.code === 'ERR_CANCELED') {
          if (retryCount < this.maxRetries) {
            log({
              type: 'warning',
              url,
              duration,
              retryCount,
              message: `Timeout — retry ${retryCount + 1}/${this.maxRetries}`,
              params,
            });
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryDelayMs * (retryCount + 1)),
            );
            return this.executeRequest<T>(path, params, retryCount + 1);
          }
          log({ type: 'error', url, duration, message: 'Timeout (max retries exceeded)', params });
          throw new TimeoutError();
        }

        // Network error (no response, not a timeout)
        const message = error.message || 'Network error';
        if (import.meta.env.DEV)
          console.error(`[Kaiten API] NETWORK_ERROR ${url} (${duration}ms):`, error);
        log({ type: 'error', url, duration, message: `Network error: ${message}`, params });
        throw new NetworkError(message);
      }

      // Unexpected non-axios error
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      if (import.meta.env.DEV) console.error(`[Kaiten API] ERROR ${url} (${duration}ms):`, error);
      log({ type: 'error', url, duration, message: `Error: ${message}`, stack, params });
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
   * Get all cards in a board, optionally filtered by search text and member ID.
   *
   * @param boardId - Board to fetch cards from
   * @param searchText - Optional server-side text search
   * @param memberId - Optional user ID to filter cards by (member_ids API param)
   */
  async getCards(boardId: number, searchText?: string, memberId?: number | null): Promise<Task[]> {
    const params: Record<string, unknown> = { board_id: boardId };

    if (searchText?.trim()) {
      params.query = searchText.trim();
    }

    if (memberId !== null && memberId !== undefined) {
      params.member_ids = memberId;
    }

    params.condition = 1;

    const dtos = await this.executeRequest<TaskDto[]>('cards', params);
    return dtos.map(taskDtoToDomain);
  }

  /**
   * Get cards by space, with an optional base64-encoded advanced filter.
   *
   * @param spaceId     - Space to fetch cards from
   * @param filter      - Optional base64-encoded filter (Kaiten filter param)
   * @param boardId     - Optional board scope (client-side filter)
   * @param searchText  - Optional server-side text search
   * @param columnIds   - Optional column IDs to restrict results (server-side filter)
   */
  async getCardsBySpace(
    spaceId: number,
    filter?: string | null,
    boardId?: number | null,
    searchText?: string,
    columnIds?: number[] | null,
  ): Promise<Task[]> {
    const params: Record<string, unknown> = { space_id: spaceId };

    // board_id and filter params conflict on the API side — omit board_id from
    // the request and apply it as a client-side filter after the response.
    if (filter) {
      params.filter = filter;
    }

    if (searchText?.trim()) {
      params.query = searchText.trim();
    }

    if (columnIds !== null && columnIds !== undefined && columnIds.length > 0) {
      params.column_ids = columnIds.join(',');
    }

    params.condition = 1;

    const dtos = await this.executeRequest<TaskDto[]>('cards', params);
    let tasks = dtos.map(taskDtoToDomain);

    if (boardId !== null && boardId !== undefined) {
      tasks = tasks.filter((t) => t.boardId === boardId);
    }

    return tasks;
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
   * Get files attached to a card
   */
  async getCardFiles(cardId: number): Promise<CardFile[]> {
    const dtos = await this.executeRequest<FileDto[]>(`cards/${cardId}/files`);
    return dtos.filter((f) => !f.deleted).map(fileDtoToDomain);
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

  /**
   * Get all tags, optionally scoped to a space.
   */
  async getTags(spaceId?: number | null): Promise<Tag[]> {
    const params: Record<string, unknown> = {};
    if (spaceId !== null && spaceId !== undefined) params.space_id = spaceId;
    const dtos = await this.executeRequest<TagDto[]>('tags', params);
    return dtos.map(tagDtoToDomain);
  }

  /**
   * Get all card types, optionally scoped to a space.
   */
  async getCardTypes(spaceId?: number | null): Promise<CardType[]> {
    const params: Record<string, unknown> = {};
    if (spaceId !== null && spaceId !== undefined) params.space_id = spaceId;
    const dtos = await this.executeRequest<CardTypeDto[]>('card-types', params);
    return dtos.map(cardTypeDtoToDomain);
  }

  /**
   * List all custom properties for the company
   */
  async getCustomProperties(): Promise<CustomProperty[]> {
    const dtos = await this.executeRequest<CustomPropertyDto[]>('company/custom-properties');
    return dtos.map(customPropertyDtoToDomain);
  }

  /**
   * Get a custom property definition
   */
  async getCustomProperty(id: number): Promise<CustomProperty> {
    const dto = await this.executeRequest<CustomPropertyDto>(`company/custom-properties/${id}`);
    return customPropertyDtoToDomain(dto);
  }

  /**
   * Get select values for a custom property of type=select
   */
  async getCustomPropertySelectValues(id: number): Promise<CustomPropertySelectValue[]> {
    const dtos = await this.executeRequest<CustomPropertySelectValueDto[]>(
      `company/custom-properties/${id}/select-values`,
    );
    return dtos.map(customPropertySelectValueDtoToDomain);
  }

  async getCardsByFilter(filter: string): Promise<Task[]> {
    const params: Record<string, unknown> = {};

    if (filter) {
      params.filter = filter;
    }

    params.condition = 1;

    const dtos = await this.executeRequest<TaskDto[]>('cards', params);
    return dtos.map(taskDtoToDomain);
  }
}
