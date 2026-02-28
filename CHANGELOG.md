<!-- Keep a Changelog guide -> https://keepachangelog.com -->

# Kaiten Integration Changelog

## [Unreleased]

## [1.0.0] - 2026-02-27

### Added
- Integration with Kaiten project management platform via REST API
- Tool window embedded into JetBrains IDE using JCEF (Chromium-based browser)
- Bidirectional RPC bridge between Kotlin/IDE and the React frontend
- **Task management**: view tasks from Kaiten boards filtered by spaces, boards, and columns
- **List view**: tasks grouped by column with compact card representation
- **Kanban view**: visual board layout with column-based card display
- **Statistics view**: time tracking data per branch with daily breakdown and heatmap
- **Releases view**: release management with branch merge-status checking via `git merge-base`
- **Logs view**: activity log for all API requests made during the session
- **Advanced filtering**: filter tasks by assignee, participant, user role (responsible/member), with AND/OR logic
- **Automatic time tracking**: time is recorded when IDE window is in focus and active Git branch matches configurable patterns (default: `task/ktn-{id}`)
- **Branch time tracking**: per-branch time accumulation with daily breakdown, persisted between IDE restarts
- **Git integration**: reads current branch via Git4Idea, monitors branch switches in real-time
- **IDE focus tracking**: automatically pauses/resumes time tracking when IDE loses or gains focus
- **Theme synchronization**: React UI adopts the IDE color scheme (light/dark) including fonts, colors, and border radius
- **Persistent settings**: server URL, selected spaces/boards/columns, filter state, branch patterns, and release settings are saved between sessions
- **Secure token storage**: API token stored in OS credential store (PasswordSafe), never written to disk in plain text
- **Settings UI**: configurable via **Settings → Tools → Kaiten Integration** with connection test button
- **In-app settings page**: settings accessible from within the tool window
- **Notification system**: IDE balloon notifications for errors, warnings, and informational messages
- **URL validation**: external links opened via `BrowserUtil` with scheme check (http/https only)
- **Origin validation**: API proxy restricted to the configured Kaiten server origin

[Unreleased]: https://github.com/Scadar/kaiten-integration/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Scadar/kaiten-integration/commits/v1.0.0
