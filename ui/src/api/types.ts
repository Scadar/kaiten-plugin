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

export interface LaneDto {
  id: number;
  title: string;
  board_id: number;
}

export interface BoardDto {
  id: number;
  title: string;
  space_id: number;
  lanes?: LaneDto[];
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
  username: string;
  avatar_initials_url: string;
  avatar_uploaded_url: string;
  initials: string;
  avatar_type: number; // 1-gravatar, 2-initials, 3-uploaded
  type?: number; // 1 = member, 2 = responsible
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

export interface CustomPropertyDto {
  id: number;
  type: string;
  name: string;
  colorful: boolean;
  multi_select: boolean;
  condition: string;
}

export interface CustomPropertySelectValueDto {
  id: number;
  custom_property_id: number;
  value: string;
  color: number | null;
  deleted: boolean;
  sort_order: number;
  condition: string;
}

export interface TaskDto {
  id: number;
  title: string;
  description: string | null;
  column_id: number;
  board_id?: number | null;
  lane_id?: number | null;
  owner_id: number | null;
  members?: TaskMemberDto[];
  due_date: string | null;
}

/** Extended card DTO — returned by GET /cards/{id} */
export interface TaskDetailDto extends TaskDto {
  board_id?: number | null;
  space_id?: number | null;
  lane_id?: number | null;
  type_id?: number | null;
  size_id?: number | null;
  created?: string | null;
  updated?: string | null;
  tags?: TagDto[];
  external_links?: ExternalLinkDto[];
  children_count?: number;
  children_ids?: number[];
  /** 1=active, 2=done, 3=archived */
  condition?: number | null;
  blocked?: boolean | null;
  block_reason?: string | null;
  /** 0=none, 1=low, 2=medium, 3=high, 4=critical */
  priority?: number | null;
  sort_order?: number | null;
  spent_time_minutes?: number | null;
  time_estimate_minutes?: number | null;
  parent_id?: number | null;
  properties?: Record<string, number[]> | null;
}

export interface FileDto {
  id: number;
  url: string;
  name: string;
  type: number;
  size: number;
  mime_type: string | null;
  deleted: boolean;
  card_id: number;
  external: boolean;
  author_id: number;
  comment_id: number | null;
  sort_order: number;
  card_cover: boolean;
  created: string;
  updated: string;
  uid: string;
  custom_property_id: number | null;
  thumbnail_url: string | null;
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

export interface CardTypeDto {
  id: number;
  name: string;
  color?: string | null;
}

// ============================================================================
// Domain Types
// ============================================================================

export interface Space {
  id: number;
  name: string;
  archived: boolean;
}

export interface Lane {
  id: number;
  name: string;
  boardId: number;
}

export interface Board {
  id: number;
  name: string;
  spaceId: number;
  lanes: Lane[];
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
  type: number; // 1 = member, 2 = responsible
  username: string;
  avatar_initials_url: string;
  avatar_uploaded_url: string;
  initials: string;
  avatar_type: number; // 1-gravatar, 2-initials, 3-uploaded
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

export interface CardFile {
  id: number;
  url: string;
  name: string;
  type: number;
  size: number;
  mimeType: string | null;
  deleted: boolean;
  cardId: number;
  external: boolean;
  authorId: number;
  commentId: number | null;
  sortOrder: number;
  cardCover: boolean;
  createdAt: string;
  updatedAt: string;
  uid: string;
  customPropertyId: number | null;
  thumbnailUrl: string | null;
}

export interface CustomProperty {
  id: number;
  type: string;
  name: string;
  colorful: boolean;
  multiSelect: boolean;
}

export interface CustomPropertySelectValue {
  id: number;
  customPropertyId: number;
  value: string;
  color: number | null;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  columnId: number;
  boardId: number | null;
  laneId: number | null;
  assigneeId: number | null;
  participants: TaskMember[];
  dueDate: string | null;
}

/** Extended task domain — includes all fields from the single-card endpoint */
export interface TaskDetail extends Task {
  boardId: number | null;
  spaceId: number | null;
  laneId: number | null;
  typeId: number | null;
  sizeId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  tags: Tag[];
  externalLinks: ExternalLink[];
  childrenCount: number;
  childrenIds: number[];
  /** 1=active, 2=done, 3=archived */
  condition: number | null;
  blocked: boolean;
  blockReason: string | null;
  /** 0=none, 1=low, 2=medium, 3=high, 4=critical */
  priority: number | null;
  spentTimeMinutes: number | null;
  timeEstimateMinutes: number | null;
  parentId: number | null;
  /** Custom properties: key is "id_{propertyId}", value is array of selected value IDs */
  properties: Record<string, number[]>;
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

export interface CardType {
  id: number;
  name: string;
  color: string | null;
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

export function laneDtoToDomain(dto: LaneDto): Lane {
  return {
    id: dto.id,
    name: dto.title,
    boardId: dto.board_id,
  };
}

export function boardDtoToDomain(dto: BoardDto): Board {
  return {
    id: dto.id,
    name: dto.title,
    spaceId: dto.space_id,
    lanes: dto.lanes?.map(laneDtoToDomain) ?? [],
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
    type: dto.type ?? 0,
    avatar_type: dto.avatar_type,
    avatar_initials_url: dto.avatar_initials_url,
    avatar_uploaded_url: dto.avatar_uploaded_url,
    initials: dto.initials,
    username: dto.username,
  };
}

export function taskDtoToDomain(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    columnId: dto.column_id,
    boardId: dto.board_id ?? null,
    laneId: dto.lane_id ?? null,
    assigneeId: dto.owner_id,
    participants: dto.members?.map(taskMemberDtoToDomain) ?? [],
    dueDate: dto.due_date,
  };
}

export function taskDetailDtoToDomain(dto: TaskDetailDto): TaskDetail {
  return {
    ...taskDtoToDomain(dto),
    boardId: dto.board_id ?? null,
    spaceId: dto.space_id ?? null,
    laneId: dto.lane_id ?? null,
    typeId: dto.type_id ?? null,
    sizeId: dto.size_id ?? null,
    createdAt: dto.created ?? null,
    updatedAt: dto.updated ?? null,
    tags: dto.tags?.map((t) => ({ id: t.id, name: t.name, color: t.color })) ?? [],
    externalLinks: dto.external_links ?? [],
    childrenCount: dto.children_count ?? 0,
    childrenIds: dto.children_ids ?? [],
    condition: dto.condition ?? null,
    blocked: dto.blocked ?? false,
    blockReason: dto.block_reason ?? null,
    priority: dto.priority ?? null,
    spentTimeMinutes: dto.spent_time_minutes ?? null,
    timeEstimateMinutes: dto.time_estimate_minutes ?? null,
    parentId: dto.parent_id ?? null,
    properties: dto.properties ?? {},
  };
}

export function customPropertyDtoToDomain(dto: CustomPropertyDto): CustomProperty {
  return {
    id: dto.id,
    type: dto.type,
    name: dto.name,
    colorful: dto.colorful,
    multiSelect: dto.multi_select,
  };
}

export function customPropertySelectValueDtoToDomain(
  dto: CustomPropertySelectValueDto,
): CustomPropertySelectValue {
  return {
    id: dto.id,
    customPropertyId: dto.custom_property_id,
    value: dto.value,
    color: dto.color,
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

export function fileDtoToDomain(dto: FileDto): CardFile {
  return {
    id: dto.id,
    url: dto.url,
    name: dto.name,
    type: dto.type,
    size: dto.size,
    mimeType: dto.mime_type,
    deleted: dto.deleted,
    cardId: dto.card_id,
    external: dto.external,
    authorId: dto.author_id,
    commentId: dto.comment_id,
    sortOrder: dto.sort_order,
    cardCover: dto.card_cover,
    createdAt: dto.created,
    updatedAt: dto.updated,
    uid: dto.uid,
    customPropertyId: dto.custom_property_id,
    thumbnailUrl: dto.thumbnail_url,
  };
}

export function userDtoToDomain(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.full_name,
    email: dto.email,
  };
}

export function tagDtoToDomain(dto: TagDto): Tag {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color,
  };
}

export function cardTypeDtoToDomain(dto: CardTypeDto): CardType {
  return {
    id: dto.id,
    name: dto.name,
    color: dto.color ?? null,
  };
}

// ============================================================================
// Settings & Configuration
// ============================================================================

export interface KaitenSettings {
  hasToken: boolean;
  serverUrl: string;
  selectedSpaceId: number | null;
  selectedBoardId: number | null;
  selectedColumnIds: number[];
  filterByAssignee: boolean;
  filterByParticipant: boolean;
  filterLogic: 'AND' | 'OR';
  currentUserId: number | null;
  // Filter panel state (persisted between sessions)
  selectedFilterUserId: number | null;
  filterAsMember: boolean;
  filterAsResponsible: boolean;
  // Branch patterns — {id} is a placeholder for the task identifier
  branchPatterns: string[];
  // Release page settings
  releaseSpaceId: number | null;
  releaseBoardId: number | null;
  releaseColumnIds: number[];
  activeReleaseCardId: number | null;
  // Connection verification — persisted error from the last failed check.
  // Empty string means no error (credentials are valid or not yet tested).
  lastConnectionError: string;
  // Transient flag set by the IDE while a connection check is in progress.
  // Never persisted; absent from the map when no check is running.
  isVerifyingConnection?: boolean;
  // Commit message template for the "Insert Kaiten Task Reference" toolbar button.
  // Supports {id} (task number) and {title} (card title) placeholders.
  commitMessageTemplate: string;
}

export function getDefaultSettings(): KaitenSettings {
  return {
    hasToken: false,
    serverUrl: '',
    selectedSpaceId: null,
    selectedBoardId: null,
    selectedColumnIds: [],
    filterByAssignee: true,
    filterByParticipant: false,
    filterLogic: 'AND',
    currentUserId: null,
    selectedFilterUserId: null,
    filterAsMember: true,
    filterAsResponsible: true,
    branchPatterns: ['task/ktn-{id}'],
    releaseSpaceId: null,
    releaseBoardId: null,
    releaseColumnIds: [],
    activeReleaseCardId: null,
    lastConnectionError: '',
    isVerifyingConnection: false,
    commitMessageTemplate: 'ktn-{id}: {title}',
  };
}
