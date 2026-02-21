/**
 * TypeScript type definitions for Kaiten API
 * These types mirror the Kotlin DTOs and domain models for type-safe API communication
 */

// ============================================================================
// DTO Types (Data Transfer Objects)
// ============================================================================

/**
 * Space DTO - matches Kotlin SpaceDto
 */
export interface SpaceDto {
  id: number;
  title: string;
  archived?: boolean;
}

/**
 * Board DTO - matches Kotlin BoardDto
 */
export interface BoardDto {
  id: number;
  title: string;
  space_id: number;
}

/**
 * Column DTO - matches Kotlin ColumnDto
 */
export interface ColumnDto {
  id: number;
  title: string;
  position: number;
}

/**
 * Task Member DTO - matches Kotlin TaskMemberDto
 */
export interface TaskMemberDto {
  id: number;
  full_name: string;
  email: string;
}

/**
 * Task DTO - matches Kotlin TaskDto
 */
export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  column_id: number;
  owner_id: number | null;
  members?: TaskMemberDto[];
  due_date: string | null;
}

/**
 * User DTO - matches Kotlin UserDto
 */
export interface UserDto {
  id: number;
  full_name: string;
  email: string;
}

// ============================================================================
// Domain Types
// ============================================================================

/**
 * Space domain model - matches Kotlin Space
 */
export interface Space {
  id: number;
  name: string;
  archived: boolean;
}

/**
 * Board domain model - matches Kotlin Board
 */
export interface Board {
  id: number;
  name: string;
  spaceId: number;
}

/**
 * Column domain model - matches Kotlin Column
 */
export interface Column {
  id: number;
  name: string;
  position: number;
}

/**
 * Task Member domain model - matches Kotlin TaskMember
 */
export interface TaskMember {
  id: number;
  fullName: string;
  email: string;
}

/**
 * Task domain model - matches Kotlin Task
 */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  columnId: number;
  assigneeId: number | null;
  participants: TaskMember[];
  dueDate: string | null;
}

/**
 * User domain model - matches Kotlin User
 */
export interface User {
  id: number;
  name: string;
  email: string;
}

// ============================================================================
// Mapper Functions (DTO → Domain)
// ============================================================================

/**
 * Convert SpaceDto to Space domain model
 */
export function spaceDtoToDomain(dto: SpaceDto): Space {
  return {
    id: dto.id,
    name: dto.title,
    archived: dto.archived ?? false,
  };
}

/**
 * Convert BoardDto to Board domain model
 */
export function boardDtoToDomain(dto: BoardDto): Board {
  return {
    id: dto.id,
    name: dto.title,
    spaceId: dto.space_id,
  };
}

/**
 * Convert ColumnDto to Column domain model
 */
export function columnDtoToDomain(dto: ColumnDto): Column {
  return {
    id: dto.id,
    name: dto.title,
    position: dto.position,
  };
}

/**
 * Convert TaskMemberDto to TaskMember domain model
 */
export function taskMemberDtoToDomain(dto: TaskMemberDto): TaskMember {
  return {
    id: dto.id,
    fullName: dto.full_name,
    email: dto.email,
  };
}

/**
 * Convert TaskDto to Task domain model
 */
export function taskDtoToDomain(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    columnId: dto.column_id,
    assigneeId: dto.owner_id,
    participants: dto.members?.map(taskMemberDtoToDomain) ?? [],
    dueDate: dto.due_date,
  };
}

/**
 * Convert UserDto to User domain model
 */
export function userDtoToDomain(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.full_name,
    email: dto.email,
  };
}

// ============================================================================
// Settings & Configuration
// ============================================================================

/**
 * Kaiten plugin settings (accessed via RPC from IDE)
 * These settings are stored in the IDE plugin settings and accessed via bridge RPC
 */
export interface KaitenSettings {
  /**
   * Kaiten API token for authentication
   */
  apiToken: string;

  /**
   * Kaiten server URL (e.g., https://yourcompany.kaiten.ru)
   */
  serverUrl: string;

  /**
   * Currently selected space ID
   */
  selectedSpaceId: number | null;

  /**
   * Currently selected board ID
   */
  selectedBoardId: number | null;

  /**
   * Currently selected column IDs for filtering
   */
  selectedColumnIds: number[];

  /**
   * Filter tasks by assignee (owner)
   */
  filterByAssignee: boolean;

  /**
   * Filter tasks by participant (member)
   */
  filterByParticipant: boolean;

  /**
   * Filter logic: AND (both conditions must match) or OR (either condition matches)
   */
  filterLogic: 'AND' | 'OR';

  /**
   * Current user ID (for filtering assigned/participant tasks)
   */
  currentUserId: number | null;
}

/**
 * Default settings used as fallback when settings are unavailable
 */
export function getDefaultSettings(): KaitenSettings {
  return {
    apiToken: '',
    serverUrl: '',
    selectedSpaceId: null,
    selectedBoardId: null,
    selectedColumnIds: [],
    filterByAssignee: true,
    filterByParticipant: false,
    filterLogic: 'AND',
    currentUserId: null,
  };
}
