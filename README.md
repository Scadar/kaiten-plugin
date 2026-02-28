# Kaiten JetBrains Plugin

![Build](https://github.com/Scadar/kaiten-plugin/workflows/Build/badge.svg)
![VirusTotal Scan](https://github.com/Scadar/kaiten-plugin/actions/workflows/virustotal.yml/badge.svg)
[![Version](https://img.shields.io/jetbrains/plugin/v/MARKETPLACE_ID.svg)](https://plugins.jetbrains.com/plugin/MARKETPLACE_ID)
[![Downloads](https://img.shields.io/jetbrains/plugin/d/MARKETPLACE_ID.svg)](https://plugins.jetbrains.com/plugin/MARKETPLACE_ID)

<!-- Plugin description -->
JetBrains IDE integration with [Kaiten](https://kaiten.ru) project management system. Browse tasks, track progress across boards, and automatically record time spent — all without leaving your IDE.

## Features

- **Task management** — view and filter tasks from Kaiten boards
- **Multiple views** — list, kanban board, and time statistics
- **Automatic time tracking** — tracks time when working in branches matching `*/ktn-{id}`
- **Advanced filtering** — by assignee, member, spaces, boards, and columns
- **Persistent state** — settings and accumulated time are saved between sessions
<!-- Plugin description end -->

## Requirements

- JetBrains IDE 2025.2+ (platform 252+)
- Kaiten account with an API token
- Git4Idea plugin (bundled with IDE)

## Installation

**From Marketplace:** Settings → Plugins → Marketplace → search "Kaiten" → Install

**Manually:** download the [latest release](https://github.com/Scadar/kaiten-plugin/releases/latest), then Settings → Plugins → ⚙️ → Install Plugin from Disk

## Configuration

1. Go to **Settings → Tools → Kaiten**
2. Set the **Server URL** (e.g. `https://your-company.kaiten.ru/api/latest`)
3. Paste your **API token** (generate it in Kaiten profile → API Tokens)
4. Click **Test Connection** → **OK**

## Time Tracking

Time is recorded automatically when:
- The IDE window is focused
- The current Git branch matches `*/ktn-{number}` (e.g. `task/ktn-1234`, `feature/ktn-5678`)

Tracking pauses when the IDE loses focus and resumes when it regains it.

## Support

- Bug reports: [GitHub Issues](https://github.com/Scadar/kaiten-plugin/issues)
- Kaiten API docs: [developers.kaiten.ru](https://developers.kaiten.ru/)

## License

Distributed under the terms specified in the LICENSE file.
