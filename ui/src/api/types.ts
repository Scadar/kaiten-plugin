/**
 * TypeScript type definitions for Kaiten API
 */

// ============================================================================
// DTO Types (Data Transfer Objects)
// ============================================================================

export interface SpaceDto {
  id: number;
  title: string;
  archived?: boolean;
}

export interface BoardDto {
  id: number;
  title: string;
  space_id: number;
}

export interface ColumnDto {
  id: number;
  title: string;
  position: number;
}

export interface TaskMemberDto {
  id: number;
  full_name: string;
  email: string;
}

export interface TagDto {
  id: number;
  name: string;
  color: string | null;
}

export interface ExternalLinkDto {
  url: string;
  description: string | null;
}

export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  column_id: number;
  owner_id: number | null;
  members?: TaskMemberDto[];
  due_date: string | null;
}

/** Extended card DTO — returned by GET /cards/{id} */
export interface TaskDetailDto extends TaskDto {
  board_id?: number | null;
  lane_id?: number | null;
  type_id?: number | null;
  size_id?: number | null;
  created?: string | null;
  updated?: string | null;
  tags?: TagDto[];
  external_links?: ExternalLinkDto[];
  children_count?: number;
}

export interface CommentAuthorDto {
  id: number;
  full_name: string;
  email: string;
}

/** Comment DTO — item in GET /cards/{id}/comments response */
export interface CommentDto {
  id: number;
  text: string;
  author: CommentAuthorDto;
  created: string;
  updated: string;
}

export interface UserDto {
  id: number;
  full_name: string;
  email: string;
}

// ============================================================================
// Domain Types
// ============================================================================

export interface Space {
  id: number;
  name: string;
  archived: boolean;
}

export interface Board {
  id: number;
  name: string;
  spaceId: number;
}

export interface Column {
  id: number;
  name: string;
  position: number;
}

export interface TaskMember {
  id: number;
  fullName: string;
  email: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface ExternalLink {
  url: string;
  description: string | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  columnId: number;
  assigneeId: number | null;
  participants: TaskMember[];
  dueDate: string | null;
}

/** Extended task domain — includes all fields from the single-card endpoint */
export interface TaskDetail extends Task {
  boardId: number | null;
  laneId: number | null;
  typeId: number | null;
  sizeId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  tags: Tag[];
  externalLinks: ExternalLink[];
  childrenCount: number;
}

export interface CommentAuthor {
  id: number;
  fullName: string;
  email: string;
}

export interface Comment {
  id: number;
  text: string;
  author: CommentAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

// ============================================================================
// Mapper Functions (DTO → Domain)
// ============================================================================

export function spaceDtoToDomain(dto: SpaceDto): Space {
  return {
    id: dto.id,
    name: dto.title,
    archived: dto.archived ?? false,
  };
}

export function boardDtoToDomain(dto: BoardDto): Board {
  return {
    id: dto.id,
    name: dto.title,
    spaceId: dto.space_id,
  };
}

export function columnDtoToDomain(dto: ColumnDto): Column {
  return {
    id: dto.id,
    name: dto.title,
    position: dto.position,
  };
}

export function taskMemberDtoToDomain(dto: TaskMemberDto): TaskMember {
  return {
    id: dto.id,
    fullName: dto.full_name,
    email: dto.email,
  };
}

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

export function taskDetailDtoToDomain(dto: TaskDetailDto): TaskDetail {
  return {
    ...taskDtoToDomain(dto),
    boardId: dto.board_id ?? null,
    laneId: dto.lane_id ?? null,
    typeId: dto.type_id ?? null,
    sizeId: dto.size_id ?? null,
    createdAt: dto.created ?? null,
    updatedAt: dto.updated ?? null,
    tags: dto.tags?.map((t) => ({ id: t.id, name: t.name, color: t.color })) ?? [],
    externalLinks: dto.external_links ?? [],
    childrenCount: dto.children_count ?? 0,
  };
}

export function commentDtoToDomain(dto: CommentDto): Comment {
  return {
    id: dto.id,
    text: dto.text,
    author: {
      id: dto.author.id,
      fullName: dto.author.full_name,
      email: dto.author.email,
    },
    createdAt: dto.created,
    updatedAt: dto.updated,
  };
}

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

export interface KaitenSettings {
  apiToken: string;
  serverUrl: string;
  selectedSpaceId: number | null;
  selectedBoardId: number | null;
  selectedColumnIds: number[];
  filterByAssignee: boolean;
  filterByParticipant: boolean;
  filterLogic: 'AND' | 'OR';
  currentUserId: number | null;
}

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
