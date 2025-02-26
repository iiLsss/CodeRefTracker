import * as vscode from 'vscode'
import { Logger } from './logger'
import { CommandManager } from './commands'
import { StatusBarItem } from './ui/statusBarItem'

export function activate(context: vscode.ExtensionContext) {
	const logger = new Logger()

	logger.log('Starting File Graph')

	const commandManager = new CommandManager(context, logger)
	const statusBarItem = new StatusBarItem(logger)

	context.subscriptions.push(commandManager, statusBarItem, logger)
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('===>')
}
