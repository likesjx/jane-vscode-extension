# Jane VS Code Extension

Jane - The jewel in your ear for VS Code. An AI assistant extension that connects to the Ansible brain service.

## Features

- **Ansible Link Status**: Real-time WebSocket connection indicator in the sidebar
- **Auto-reconnect**: Automatic reconnection with configurable retry attempts
- **Connection Logging**: View connection events and messages in the sidebar panel

## Quick Start

1. Install the extension
2. Open the Jane sidebar panel from the activity bar
3. The extension auto-connects to `wss://brain.jaredlikes.com`
4. Status indicator shows connection state:
   - Green: Connected (Ansible Link Active)
   - Orange: Connecting
   - Red: Disconnected

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.90.0+

### Running Locally

```bash
# Install dependencies
npm install

# Open in VS Code and press F5 to launch Extension Development Host
code .
```

### Project Structure

```
jane-vscode-extension/
├── extension.js      # Main extension entry point with WebviewViewProvider
├── package.json      # Extension manifest
├── assets/
│   └── icon.svg      # Activity bar icon
└── README.md         # This file
```

## Architecture

### WebviewViewProvider

The `JaneChatViewProvider` class implements `vscode.WebviewViewProvider` to render a sidebar panel with:

- WebSocket connection to `wss://brain.jaredlikes.com`
- Visual status indicator (connected/connecting/disconnected)
- Connect/Disconnect button
- Message log showing connection events

### Message Protocol

The webview communicates with the extension host via `postMessage`:

| Type | Direction | Description |
|------|-----------|-------------|
| `status` | webview → extension | Connection state changes |
| `error` | webview → extension | Connection errors |

## Commands

| Command | Description |
|---------|-------------|
| `jane.helloWorld` | Display greeting message |

## License

MIT
