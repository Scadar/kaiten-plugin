# Техническое задание 2.0 (Enterprise)

# Плагин интеграции JetBrains IDE с Kaiten

Версия: 2.0\
Тип документа: Полное архитектурное ТЗ\
Цель: Production-ready плагин корпоративного уровня

------------------------------------------------------------------------

# 1. Цели и задачи

Разработать production-ready плагин для JetBrains IDE, обеспечивающий:

-   Полноценную интеграцию с Kaiten API (https://developers.kaiten.ru/)
-   Гибкую систему фильтрации
-   Несколько режимов отображения
-   Локальный time tracking
-   Расширяемую архитектуру
-   Поддержку масштабирования

------------------------------------------------------------------------

# 2. Архитектура (Clean Architecture)

## 2.1 Слои

### UI Layer

-   ToolWindowFactory
-   Panels
-   ViewSwitchController
-   StatisticsView

### Application Layer

-   TaskService
-   FilterService
-   TimeTrackingService
-   SettingsService

### Domain Layer

-   Task
-   Space
-   Board
-   Column
-   User
-   TaskTimeEntry

### Infrastructure Layer

-   KaitenApiClient
-   HttpClientProvider
-   PersistenceManager
-   GitBranchListener
-   FocusListener

------------------------------------------------------------------------

# 3. API Интеграция

Базовый URL: https://kaiten.comagic.dev/api/latest/

Авторизация: Authorization: Bearer `<token>`

## 3.1 Spaces

GET /spaces

Response Model: Space: - id: Long - name: String - archived: Boolean

## 3.2 Boards

GET /spaces/{spaceId}/boards

Board: - id - name - spaceId

## 3.3 Columns

GET /boards/{boardId}/columns

Column: - id - name - position

## 3.4 Cards

GET /boards/{boardId}/cards GET /cards/{cardId}

Card: - id - title - description - columnId - assigneeId -
participants\[\] - dueDate - tags\[\]

## 3.5 Users

GET /users

User: - id - name - email

------------------------------------------------------------------------

# 4. Фильтрация

## 4.1 По пользователю

-   Ответственный
-   Участник
-   Логика AND / OR

## 4.2 По Space

Multi-select

## 4.3 По Board

Multi-select (зависит от Space)

## 4.4 По колонкам

Multi-checkbox

Фильтрация реализуется в Application Layer.

------------------------------------------------------------------------

# 5. UI Архитектура

## 5.1 Tool Window Layout

  ----------------------------------
  \| Filters Panel \|
  ----------------------------------
  \| View Switch (List \| Cards) \|

  ----------------------------------

## \| Task Content Area \|

## \| Statistics Tab \|

## 5.2 Режимы отображения

1.  List View (Grouped by Column)
2.  Kanban Card View

ViewSwitchController управляет состоянием.

------------------------------------------------------------------------

# 6. Time Tracking Engine

## 6.1 Условия

IDE в фокусе\
Git branch = task/ktn-{id}

## 6.2 Sequence Diagram

IDE Focus -\> Branch Check -\> Start Timer\
Branch Change -\> Stop Timer\
Focus Lost -\> Pause Timer

## 6.3 Storage Model

TaskTimeEntry: - taskId - date - durationSeconds

Группировка: Map\<TaskId, List`<TaskTimeEntry>`{=html}\>

------------------------------------------------------------------------

# 7. Persistence

Используется PersistentStateComponent.

Храним: - URL - Token - Filters - ViewMode - TimeEntries

------------------------------------------------------------------------

# 8. Кэширование

-   In-memory cache (ConcurrentHashMap)
-   TTL обновление 5 минут
-   Manual refresh

------------------------------------------------------------------------

# 9. Error Handling Strategy

401 → invalidate token\
403 → show permission warning\
404 → show empty state\
500 → retry with backoff\
Timeout → retry 3 раза

------------------------------------------------------------------------

# 10. Производительность

-   Асинхронные запросы (coroutines)
-   Debounce фильтров
-   Lazy loading карточек
-   Non-blocking UI

------------------------------------------------------------------------

# 11. Безопасность

-   Token хранится в IDE secure storage
-   Логи без токена
-   SSL only

------------------------------------------------------------------------

# 12. Тестирование

## 12.1 Unit Tests

-   TaskService
-   FilterService
-   TimeTrackingService

## 12.2 Integration Tests

-   Mock Kaiten API

## 12.3 UI Tests

-   ToolWindow rendering

------------------------------------------------------------------------

# 13. Структура проекта

src/main/kotlin/ ├── api/ ├── domain/ ├── application/ ├──
infrastructure/ ├── ui/ ├── timetracker/ ├── settings/

------------------------------------------------------------------------

# 14. Будущие расширения

-   Создание задач
-   Комментарии
-   Перемещение карточек
-   Webhook integration
-   Sync time tracking with Kaiten
-   Notifications

------------------------------------------------------------------------

# 15. MVP Definition

1.  Авторизация
2.  Загрузка Spaces/Boards
3.  Отображение задач
4.  Группировка по колонкам
5.  Time tracking
6.  Persistence

------------------------------------------------------------------------

# 16. Enterprise Requirements

-   Расширяемость
-   Чистая архитектура
-   Тестируемость
-   Логирование
-   Масштабируемость
