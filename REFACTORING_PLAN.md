# План рефакторинга React-фронтенда — Kaiten JetBrains Plugin

**Дата:** 2026-03-02
**Область:** `ui/` (React 19, TypeScript strict, TanStack Query/Router, Zustand, shadcn/ui, Tailwind 4)
**Цель покрытия тестами:** 70%+ после завершения всех фаз

---

## Контекст

Фронтенд архитектурно грамотен в части API-слоя (DTO-маппинг, bridge-адаптер, query key factories), но накопил технический долг в трёх ключевых зонах:

1. **Дублирование стейт-менеджмента** — два почти идентичных Zustand-стора для фильтров
2. **Монолитный файл хуков** — 30+ query-хуков в одном файле без доменного разделения
3. **Нулевое тестовое покрытие** — только 1 тестовый файл на весь фронтенд

Рефакторинг не меняет бизнес-логику и архитектурные ограничения (JCEF bridge, одиночный HTML-бандл, hash-роутинг).

---

## Ограничения, которые нельзя нарушать

| Ограничение | Причина |
|-------------|---------|
| `createHashHistory()` в роутинге | Обязательно для `file://` протокола в JCEF |
| `enabled: !!client` в каждом `useQuery` | Запросы не должны уходить до загрузки настроек |
| `bridge` — единственный синглтон | Повторная регистрация `window.__jcef_receive__` сломает мост |
| Только статические импорты (без `import()`) | `vite-plugin-singlefile` требует единый бандл |
| Алиас `@/` для всех новых файлов | Соответствие существующим конвенциям |

---

## Фаза 0: Тестовая инфраструктура (P0 — обязательный prerequisites)

> Все последующие фазы невалидируемы без тестов. Эта фаза — только новые файлы, нулевой риск регрессий.

### 0.1 — Настройка порогов покрытия

**Файлы:** `ui/vite.config.ts`, `ui/src/test/setup.ts`

В `vite.config.ts` добавить блок coverage:
```typescript
coverage: {
  provider: 'v8',
  thresholds: { lines: 70, functions: 70, branches: 65, statements: 70 },
  exclude: [
    'src/components/ui/**',     // vendor-код shadcn
    'src/routeTree.gen.ts',     // авто-генерация TanStack Router
  ],
}
```

В `setup.ts` добавить:
```typescript
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
```

---

### 0.2 — Bridge Mock Factory

**Новый файл:** `ui/src/test/bridgeMock.ts`

```typescript
export function createMockBridge() {
  return {
    call: vi.fn(),
    on: vi.fn().mockReturnValue(() => {}),
    once: vi.fn().mockReturnValue(() => {}),
    emit: vi.fn(),
    ready: vi.fn().mockResolvedValue(undefined),
    reportError: vi.fn(),
    dispose: vi.fn(),
  };
}
```

Паттерн использования в тестах:
```typescript
vi.mock('@/bridge/JCEFBridge', () => ({ bridge: createMockBridge() }));
```

---

### 0.3 — API Client Mock и тестовые фикстуры

**Новые файлы:**
- `ui/src/test/apiClientMock.ts` — `createMockApiClient()`, возвращает `vi.fn()` для каждого метода `KaitenApiClient`
- `ui/src/test/queryClientWrapper.tsx` — `createTestQueryClient()` + `renderWithProviders()` с `QueryClientProvider`
- `ui/src/test/fixtures.ts` — типизированные builder-функции для `Task`, `Board`, `Column`, `Space`, `User`

---

### 0.4 — Тесты существующих утилит (покрыть прямо сейчас)

**Новые тест-файлы:**
- `ui/src/lib/advancedFilters.test.ts` — `encodeFilter`, `normalizeGroup`, `serializeNode`
- `ui/src/lib/format.test.ts` — `formatDuration`, `buildKaitenUrl`, `aggregateDailySeconds`

---

## Фаза 1: Консолидация стейт-сторов (P1)

### 1.1 — Generic Filter Store Factory

**Проблема:** `filterStore.ts` и `releaseFilterStore.ts` — почти идентичные Zustand-сторы. Единственные различия:
- `filterStore` имеет `selectedSpaceId` и `initializeFromSettings`
- `releaseFilterStore.addSavedFilter` автоактивирует новый фильтр
- Разные `localStorage` ключи

**Решение:** Вынести общую логику в `ui/src/state/filterStorePersistence.ts`:

```typescript
// Чистые функции, не Zustand-специфичные
export function createFilterPersistence(storageKey: string) {
  return {
    load(): PersistedFilterState { ... },
    persist(state: PersistedFilterState): void { ... },
  };
}

export function createFilterActions(
  getState, setState, persistence,
  opts: { autoActivateOnAdd?: boolean } = {},
) {
  return {
    addSavedFilter(filter: SavedFilter) { ... },
    updateSavedFilter(filter: SavedFilter) { ... },
    deleteSavedFilter(id: string) { ... },
    setActiveFilter(id: string | null) { ... },
  };
}
```

**Затронутые файлы:**
- Новый: `ui/src/state/filterStorePersistence.ts`
- Изменён: `ui/src/state/filterStore.ts`
- Изменён: `ui/src/state/releaseFilterStore.ts`

**Новые тесты:**
- `ui/src/state/filterStorePersistence.test.ts` — load с пустым хранилищем, persist при ошибке записи
- `ui/src/state/filterStore.test.ts` — все actions, `initializeFromSettings`, round-trip в localStorage, удаление активного фильтра
- `ui/src/state/releaseFilterStore.test.ts` — авто-активация при `addSavedFilter`

---

### 1.2 — Логирование ошибок в App.tsx

**Проблема:** Блоки `try/catch` в `App.tsx` для localStorage молча игнорируют ошибки.

**Решение:** Заменить `/* ignore */` на:
```typescript
} catch (e) {
  if (import.meta.env.DEV) console.warn('[App] localStorage error:', e);
}
```

**Затронутые файлы:** `ui/src/App.tsx`
**Сложность:** Тривиальная

---

## Фаза 2: Декомпозиция хуков (P1)

### 2.1 — Разбивка useKaitenQuery.ts по доменам

**Проблема:** 379 строк с 17+ экспортированными хуками из 6 доменов в одном файле. Сложно добавлять, искать и тестировать.

**Решение:** Разбить на доменные файлы, сохранив публичный API через barrel:

```
ui/src/hooks/queries/
  index.ts                      ← re-export всего (нет изменений в импортах)
  useSpaceQueries.ts            ← useSpaces
  useBoardQueries.ts            ← useBoards, useColumns, useColumnsByBoards
  useTaskQueries.ts             ← useTasks, useTasksBySpace, useTask, useCardDetail,
                                   useCardComments, useCardFiles, useChildCards
  useUserQueries.ts             ← useUsers, useCurrentUser
  useTagQueries.ts              ← useTags, useCardTypes
  useCustomPropertyQueries.ts   ← useCustomProperties, useCustomPropertiesWithValues,
                                   useCardCustomProperties
  useGitQueries.ts              ← useCheckBranchesMerged
```

`useKaitenQuery.ts` превращается в barrel: `export * from './queries/index'` — **ни один существующий импорт не меняется**.

**Затронутые файлы:**
- Изменён: `ui/src/hooks/useKaitenQuery.ts` → barrel
- Новые: 8 файлов в `ui/src/hooks/queries/`

**Новые тесты** (`renderHook` + `createMockApiClient`):
```typescript
// useSpaceQueries.test.ts — паттерн для всех
it('не вызывает API когда client === null', () => { ... });
it('вызывает client.getSpaces() когда client доступен', async () => { ... });
it('используется правильный queryKey для кэша', () => { ... });
```

---

### 2.2 — Хук useAccordionState

**Проблема:** `TaskList.tsx` содержит `computeOpenItems` и `deriveNewClosed` — inline-функции, которые нельзя тестировать без рендеринга. Паттерн "открыто по умолчанию, закрыто по исключению" повторяется на трёх уровнях вложенности.

**Решение:** Вынести в `ui/src/hooks/useAccordionState.ts`:

```typescript
export function useAccordionState({ allIds, closedIds, onClosedIdsChange }) {
  const openIds = computeOpenItems(allIds, closedIds);
  const handleChange = useCallback(
    (newOpen: string[]) => onClosedIdsChange(deriveNewClosed(allIds, newOpen, closedIds)),
    [allIds, closedIds, onClosedIdsChange],
  );
  return { openIds, handleChange };
}
```

**Затронутые файлы:**
- Новый: `ui/src/hooks/useAccordionState.ts`
- Изменён: `ui/src/components/TaskList.tsx`

**Новые тесты:** `useAccordionState.test.ts` — 4+ случая для логики open/close

---

## Фаза 3: Декомпозиция компонентов (P2)

### 3.1 — Вынести логику группировки задач

**Проблема:** `groupTasks`, `computeOpenItems`, `deriveNewClosed` в `TaskList.tsx` — чистые функции (~80 строк), которые нельзя тестировать изолированно.

**Решение:** Переместить в `ui/src/lib/taskGrouping.ts`.

**Затронутые файлы:**
- Новый: `ui/src/lib/taskGrouping.ts`
- Изменён: `ui/src/components/TaskList.tsx`

**Новые тесты:** `taskGrouping.test.ts` — группировка board→lane→column, задачи без boardId, несуществующие columnId

---

### 3.2 — Вынести определения колонок таблицы

**Проблема:** `actionsColumn`, `activeStarColumn`, `branchStatusColumn` определяются inline в `releases.tsx` и дублируются.

**Решение:** Создать `ui/src/components/tasks/columnDefs.tsx` с factory-функциями:

```typescript
export function makeExternalLinkColumn(opts: { serverUrl: string; spaceId: number | null }): ColumnDef<Task>
export function makeActiveStarColumn(opts: { activeCardId: number | null; onSetActive: (id: number) => void }): ColumnDef<Task>
export function makeBranchStatusColumn(opts: { releaseBranch: string | null; branchPatterns: string[]; branchResults: Record<string, boolean> | undefined; isLoading: boolean; error: Error | null }): ColumnDef<Task>
```

**Затронутые файлы:**
- Новый: `ui/src/components/tasks/columnDefs.tsx`
- Изменён: `ui/src/routes/releases.tsx`

**Новые тесты:** `columnDefs.test.tsx` — рендер каждого варианта колонки через RTL

---

### 3.3 — Декомпозиция ActiveReleaseContent

**Проблема:** `ActiveReleaseContent` в `releases.tsx` — 172 строки, три независимых UI-блока без компонентных границ.

**Решение:** Создать директорию `ui/src/components/releases/`:

| Новый компонент | Ответственность |
|----------------|-----------------|
| `ReleaseCardSummary.tsx` | Заголовок карточки: бейджи, теги, внешняя ссылка |
| `ReleaseBranchChecker.tsx` | Input + кнопка Check + результаты + ошибки |
| `ReleaseChildCards.tsx` | Поиск + таблица дочерних задач со статусом веток |

`ActiveReleaseContent` становится тонким оркестратором, который передаёт пропсы этим трём компонентам.

**Затронутые файлы:**
- Новые: 3 компонента в `ui/src/components/releases/`
- Изменён: `ui/src/routes/releases.tsx`

**Новые тесты:** По 3–5 кейсов на каждый компонент (RTL)

---

## Фаза 4: Отмена запросов (P2)

### 4.1 — AbortSignal в RPC и bridge-адаптере

**Проблема:** TanStack Query передаёт `signal` в `queryFn`, но `RPCHandler.call()` его игнорирует. При смене роута незавершённые RPC-вызовы висят 30 секунд.

**Решение в двух шагах:**

**Шаг 4.1a** — добавить `signal?: AbortSignal` в `RPCCallOptions` (`ui/src/bridge/RPC.ts`):
```typescript
if (signal) {
  signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
    this.pendingRequests.delete(id);
    reject(new DOMException('AbortError', 'AbortError'));
  }, { once: true });
}
```

**Шаг 4.1b** — пробросить `config.signal` в bridge-адаптере (`ui/src/api/axiosInstance.ts`):
```typescript
result = await bridge.call('apiRequest', { url }, { signal: config.signal });
// При AbortError → throw new axios.CanceledError(...)
```

> **Примечание:** Kotlin-сторона (OkHttp) не получает отмену — это задокументированное ограничение. JS-сторона чистится корректно.

**Затронутые файлы:**
- Изменён: `ui/src/bridge/RPC.ts`
- Изменён: `ui/src/api/axiosInstance.ts`

**Новые тесты:** `RPC.test.ts` — signal уже отменён, signal отменяется mid-flight, таймаут 30s с `vi.useFakeTimers()`

---

## Целевое покрытие по модулям

| Модуль | Сейчас | Цель |
|--------|--------|------|
| `lib/filters.ts` | ~90% | 90%+ |
| `lib/advancedFilters.ts` | 0% | 80% |
| `lib/taskGrouping.ts` | 0% | 90% |
| `lib/format.ts` | 0% | 80% |
| `state/*.ts` | 0% | 85% |
| `bridge/RPC.ts` | 0% | 80% |
| `bridge/EventBus.ts` | 0% | 70% |
| `hooks/queries/*.ts` | 0% | 70% |
| `hooks/useAccordionState.ts` | 0% | 95% |
| `hooks/useSettings.ts` | 0% | 70% |
| `api/client.ts` | 0% | 60% |
| `components/releases/*.tsx` | 0% | 70% |
| `components/tasks/columnDefs.tsx` | 0% | 85% |

---

## Порядок выполнения

```
Фаза 0  → Фаза 1 → Фаза 2 → Фаза 3 → Фаза 4
(инфра)   (стор)   (хуки)  (компон)  (отмена)
```

Каждая фаза независима и может быть смержена отдельным PR. Единственное жёсткое требование — Фаза 0 завершается первой.

---

## Реестр рисков

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Регрессия в localStorage-миграции (Фаза 1.1) | Средняя | Тест для старого формата массива |
| Циклические импорты при разбивке хуков (Фаза 2.1) | Низкая | `tsc --noEmit` после каждого перемещения файла |
| `DOMException` в happy-dom vs браузере (Фаза 4) | Низкая | Проверка по `error.name === 'AbortError'` |
| Prop drilling при декомпозиции releases (Фаза 3.3) | Средняя | Если пропсов > 6 — ввести `ReleaseContext` |
