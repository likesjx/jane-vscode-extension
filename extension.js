const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "jane-vscode-extension" is now active!');

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
