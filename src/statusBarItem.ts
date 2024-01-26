import * as vscode from 'vscode'
import { Disposable } from './utils/disposable'
import { Logger } from './logger'

export class StatusBarItem extends Disposable {
	private readonly logger: Logger
	private readonly statusBarItem: vscode.StatusBarItem

	constructor(logger: Logger) {
		super()
		this.logger = logger

		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1)
		this.statusBarItem.command = 'codereftracker.showGraph'
		this.statusBarItem.text = 'File Graph'
		this.statusBarItem.tooltip = 'View File Graph'
		this.statusBarItem.show()
	}
}
