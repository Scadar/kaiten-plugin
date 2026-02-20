# Kaiten Plugin for JetBrains IDEs

![Build](https://github.com/Scadar/kaiten-plugin/workflows/Build/badge.svg)
[![Version](https://img.shields.io/jetbrains/plugin/v/MARKETPLACE_ID.svg)](https://plugins.jetbrains.com/plugin/MARKETPLACE_ID)
[![Downloads](https://img.shields.io/jetbrains/plugin/d/MARKETPLACE_ID.svg)](https://plugins.jetbrains.com/plugin/MARKETPLACE_ID)

<!-- Plugin description -->
A powerful integration plugin for JetBrains IDEs that brings Kaiten project management directly into your development environment. Track tasks, manage workflows, and automatically log time spent on tasks based on your Git branches.

## Features

- **Task Management**: View and filter tasks from your Kaiten boards directly in the IDE
- **Multiple View Modes**: Switch between List, Kanban, and Statistics views
- **Automatic Time Tracking**: Automatically track time when working on branches named `task/ktn-{id}` or `feature/ktn-{id}`
- **Advanced Filtering**: Filter tasks by assignee, participant, spaces, boards, and columns
- **Real-time Sync**: Manual refresh to sync latest data from Kaiten
- **Persistent Settings**: All preferences and tracked time are saved locally
<!-- Plugin description end -->

## Requirements

- **JetBrains IDE**: IntelliJ IDEA 2025.2+ (or other JetBrains IDEs with platform version 252+)
- **Kaiten Account**: Access to a Kaiten instance with API token
- **Git**: Git4Idea plugin (bundled with IDE)

## Installation

### From JetBrains Marketplace (Recommended)

1. Open your JetBrains IDE
2. Go to **Settings/Preferences** → **Plugins** → **Marketplace**
3. Search for "Kaiten"
4. Click **Install** and restart the IDE

### Manual Installation

1. Download the [latest release](https://github.com/Scadar/kaiten-plugin/releases/latest)
2. Open your IDE and go to **Settings/Preferences** → **Plugins** → **⚙️** → **Install Plugin from Disk...**
3. Select the downloaded file and restart the IDE

## Configuration

### Getting Your API Token

1. Log in to your Kaiten instance
2. Go to your profile settings
3. Navigate to **API Tokens** section
4. Click **Generate New Token** and give it a descriptive name
5. **Copy the token** (you won't be able to see it again!)

### Configuring the Plugin

1. Open **Settings/Preferences** → **Tools** → **Kaiten**
2. Enter your **Server URL** (e.g., `https://your-company.kaiten.ru/api/latest`)
3. Paste your **API Token**
4. Click **Test Connection** to verify the settings
5. Click **OK** to save

## Usage

### Opening the Tool Window

- Click on the **Kaiten** tool window button (usually on the right side panel)
- Or use **View** → **Tool Windows** → **Kaiten**

### Filtering Tasks

1. **User Filters**:
   - **Filter by Assignee**: Show only tasks assigned to you
   - **Filter by Participant**: Show tasks where you're a participant
   - **Logic (AND/OR)**: Choose whether both conditions must be met or just one

2. **Space/Board/Column Filters**:
   - Select one or more **Spaces** to load their boards
   - Select **Boards** to view their columns and tasks
   - Choose specific **Columns** to filter tasks by workflow stage

### View Modes

#### List View
- Tasks grouped by columns
- Compact display showing task ID and title
- Easy scanning of large task lists

#### Kanban View
- Visual board layout with columns
- Drag-and-drop style interface (display only)
- Card-based task representation

#### Statistics
- Time tracking statistics per task
- Total hours and seconds spent
- Includes both completed and active tracking sessions

### Time Tracking

The plugin automatically tracks time when:
1. Your IDE is in focus
2. You're on a Git branch following the pattern: `task/ktn-{id}` or `feature/ktn-{id}`

#### Example Branch Names
- ✅ `task/ktn-1234` - Will track time for task #1234
- ✅ `feature/ktn-5678` - Will track time for task #5678
- ✅ `bugfix/ktn-999` - Will track time for task #999
- ❌ `main` - No tracking
- ❌ `feature/new-ui` - No tracking (no ktn-{id})

#### How It Works
- **Start**: Tracking starts when you switch to a matching branch with IDE in focus
- **Pause**: Tracking pauses when IDE loses focus
- **Resume**: Tracking resumes when IDE regains focus
- **Stop**: Tracking stops when you switch to a different branch

### Refreshing Data

- Click the **Refresh** button (🔄) in the toolbar to update data from Kaiten
- This invalidates cache and fetches the latest information
- A notification will confirm when refresh is complete

### Opening Settings

- Click the **Settings** button (⚙️) in the toolbar
- Or use **Settings/Preferences** → **Tools** → **Kaiten**

## Troubleshooting

### "Configuration Required" Warning

**Problem**: Plugin shows "Please configure Kaiten API token"

**Solution**:
1. Go to **Settings** → **Tools** → **Kaiten**
2. Enter your Server URL and API Token
3. Click **Test Connection** to verify

### "Authentication Failed" Error

**Problem**: API token is invalid or expired

**Solution**:
1. Generate a new API token in Kaiten
2. Update the token in plugin settings
3. Test the connection

### "No Spaces Found"

**Problem**: API connection works but no data is displayed

**Possible Causes**:
- You don't have access to any spaces in Kaiten
- Your API token has insufficient permissions
- Network connectivity issues

**Solution**:
1. Verify your Kaiten account has access to spaces
2. Check API token permissions
3. Contact your Kaiten administrator if needed

### Time Tracking Not Working

**Problem**: Time is not being tracked for your branch

**Checklist**:
- ✅ Branch name matches pattern: `*/ktn-{number}`
- ✅ IDE is in focus (not minimized)
- ✅ Git repository is properly initialized
- ✅ Task ID exists in Kaiten

### Plugin Doesn't Load

**Problem**: Plugin installed but not appearing

**Solution**:
1. Restart the IDE
2. Check IDE version compatibility (2025.2+)
3. Verify Git4Idea plugin is enabled
4. Check IDE logs for errors: **Help** → **Show Log**

## Architecture

The plugin follows **Clean Architecture** principles:

- **Domain Layer**: Core business entities (Task, Space, Board, User, etc.)
- **Application Layer**: Services (TaskService, FilterService, UserService, TimeTrackingService)
- **Infrastructure Layer**: External integrations (Kaiten API, Cache, Persistence, Notifications)
- **UI Layer**: Swing-based interface (Tool Window, Settings, Views)

## Development

Built using:
- **Kotlin** - Primary language
- **IntelliJ Platform SDK** - Plugin framework
- **Kotlin Coroutines** - Asynchronous operations
- **OkHttp** - HTTP client
- **Gson** - JSON serialization

## Privacy & Data

- **API Token**: Stored securely in IDE's credential store
- **Time Tracking**: Stored locally, never sent to Kaiten automatically
- **Cache**: In-memory only, cleared on IDE restart
- **No Telemetry**: Plugin doesn't collect or send usage data

## Support

- **Issues**: [GitHub Issues](https://github.com/Scadar/kaiten-plugin/issues)
- **Documentation**: [Plugin Wiki](https://github.com/Scadar/kaiten-plugin/wiki)
- **Kaiten API**: [API Documentation](https://developers.kaiten.ru/)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the terms specified in the LICENSE file.

---

Plugin based on the [IntelliJ Platform Plugin Template](https://github.com/JetBrains/intellij-platform-plugin-template).
