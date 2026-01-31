const vscode = require('vscode');

/**
 * WebviewViewProvider for Jane sidebar panel
 * Connects to the Ansible brain service via WebSocket
 */
class JaneChatViewProvider {
	static viewType = 'jane-chat';

	constructor(extensionUri) {
		this._extensionUri = extensionUri;
	}

	/**
	 * @param {vscode.WebviewView} webviewView
	 */
	resolveWebviewView(webviewView) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(message => {
			switch (message.type) {
				case 'status':
					if (message.connected) {
						vscode.window.setStatusBarMessage('Jane: Ansible link active', 3000);
					}
					break;
				case 'error':
					vscode.window.showErrorMessage(`Jane: ${message.text}`);
					break;
			}
		});
	}

	/**
	 * Generate HTML content for the webview
	 * @param {vscode.Webview} webview
	 */
	_getHtmlForWebview(webview) {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src wss://brain.jaredlikes.com; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
	<title>Jane Chat</title>
	<style>
		body {
			padding: 10px;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-sideBar-background);
		}
		.status-container {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 12px;
			border-radius: 4px;
			background-color: var(--vscode-input-background);
			margin-bottom: 12px;
		}
		.status-indicator {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			transition: background-color 0.3s ease;
		}
		.status-indicator.disconnected {
			background-color: #f44336;
			box-shadow: 0 0 4px #f44336;
		}
		.status-indicator.connecting {
			background-color: #ff9800;
			box-shadow: 0 0 4px #ff9800;
			animation: pulse 1s infinite;
		}
		.status-indicator.connected {
			background-color: #4caf50;
			box-shadow: 0 0 4px #4caf50;
		}
		@keyframes pulse {
			0%, 100% { opacity: 1; }
			50% { opacity: 0.5; }
		}
		.status-text {
			font-size: 12px;
			font-weight: 500;
		}
		.reconnect-btn {
			margin-top: 8px;
			padding: 6px 12px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
		}
		.reconnect-btn:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		.reconnect-btn:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.message-log {
			margin-top: 12px;
			padding: 8px;
			background-color: var(--vscode-input-background);
			border-radius: 4px;
			font-size: 11px;
			max-height: 150px;
			overflow-y: auto;
		}
		.log-entry {
			padding: 2px 0;
			border-bottom: 1px solid var(--vscode-widget-border);
		}
		.log-entry:last-child {
			border-bottom: none;
		}
		.log-time {
			color: var(--vscode-descriptionForeground);
			margin-right: 8px;
		}
	</style>
</head>
<body>
	<div class="status-container">
		<div id="status-indicator" class="status-indicator disconnected"></div>
		<span id="status-text" class="status-text">Disconnected</span>
	</div>
	<button id="reconnect-btn" class="reconnect-btn">Connect</button>
	<div id="message-log" class="message-log">
		<div class="log-entry"><span class="log-time">--:--:--</span>Waiting for connection...</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const WS_URL = 'wss://brain.jaredlikes.com';

		let ws = null;
		let reconnectAttempts = 0;
		const MAX_RECONNECT_ATTEMPTS = 5;
		const RECONNECT_DELAY = 3000;

		const statusIndicator = document.getElementById('status-indicator');
		const statusText = document.getElementById('status-text');
		const reconnectBtn = document.getElementById('reconnect-btn');
		const messageLog = document.getElementById('message-log');

		function getTimeString() {
			const now = new Date();
			return now.toTimeString().split(' ')[0];
		}

		function addLogEntry(message) {
			const entry = document.createElement('div');
			entry.className = 'log-entry';
			entry.innerHTML = '<span class="log-time">' + getTimeString() + '</span>' + message;
			messageLog.appendChild(entry);
			messageLog.scrollTop = messageLog.scrollHeight;

			// Keep only last 20 entries
			while (messageLog.children.length > 20) {
				messageLog.removeChild(messageLog.firstChild);
			}
		}

		function setStatus(status) {
			statusIndicator.className = 'status-indicator ' + status;
			switch (status) {
				case 'connected':
					statusText.textContent = 'Ansible Link Active';
					reconnectBtn.textContent = 'Disconnect';
					reconnectBtn.disabled = false;
					break;
				case 'connecting':
					statusText.textContent = 'Connecting...';
					reconnectBtn.textContent = 'Connecting...';
					reconnectBtn.disabled = true;
					break;
				case 'disconnected':
					statusText.textContent = 'Disconnected';
					reconnectBtn.textContent = 'Connect';
					reconnectBtn.disabled = false;
					break;
			}
		}

		function connect() {
			if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
				return;
			}

			setStatus('connecting');
			addLogEntry('Connecting to Ansible...');

			try {
				ws = new WebSocket(WS_URL);

				ws.onopen = () => {
					reconnectAttempts = 0;
					setStatus('connected');
					addLogEntry('Connected to Ansible brain');
					vscode.postMessage({ type: 'status', connected: true });
				};

				ws.onclose = (event) => {
					setStatus('disconnected');
					addLogEntry('Connection closed (code: ' + event.code + ')');
					vscode.postMessage({ type: 'status', connected: false });

					// Auto-reconnect if not a clean close
					if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
						reconnectAttempts++;
						addLogEntry('Reconnecting in ' + (RECONNECT_DELAY / 1000) + 's (attempt ' + reconnectAttempts + '/' + MAX_RECONNECT_ATTEMPTS + ')');
						setTimeout(connect, RECONNECT_DELAY);
					}
				};

				ws.onerror = (error) => {
					addLogEntry('Connection error');
					vscode.postMessage({ type: 'error', text: 'WebSocket connection error' });
				};

				ws.onmessage = (event) => {
					addLogEntry('Received: ' + (event.data.length > 50 ? event.data.substring(0, 50) + '...' : event.data));
				};

			} catch (error) {
				setStatus('disconnected');
				addLogEntry('Failed to connect: ' + error.message);
				vscode.postMessage({ type: 'error', text: error.message });
			}
		}

		function disconnect() {
			reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
			if (ws) {
				ws.close(1000, 'User disconnected');
				ws = null;
			}
			setStatus('disconnected');
			addLogEntry('Disconnected by user');
		}

		reconnectBtn.addEventListener('click', () => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				disconnect();
			} else {
				reconnectAttempts = 0;
				connect();
			}
		});

		// Auto-connect on load
		connect();
	</script>
</body>
</html>`;
	}
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Jane extension is now active');

	// Register the webview provider
	const provider = new JaneChatViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(JaneChatViewProvider.viewType, provider)
	);

	// Register hello world command
	let disposable = vscode.commands.registerCommand('jane.helloWorld', function () {
		vscode.window.showInformationMessage('Jane is here. Your jewel in the ear.');
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
