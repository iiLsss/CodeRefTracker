import * as os from 'os'
import * as vscode from 'vscode'
import { Disposable } from './utils/disposable'
import { Logger } from './logger'
import { FileGraphView } from './fileGraphView'

export class CommandManager extends Disposable {
	private readonly context: vscode.ExtensionContext
	private readonly logger: Logger

	constructor(context: vscode.ExtensionContext, logger: Logger) {
		super()
		this.context = context
		this.logger = logger

		this.registerCommand('codereftracker.showGraph', arg => this.view(arg))
	}
	/**
	 *
	 * @param command
	 * @param callback
	 */
	private registerCommand(command: string, callback: (...args: any[]) => any) {
		this.registerDisposable(
			vscode.commands.registerCommand(command, (...args: any[]) => {
				this.logger.log('Command Invoked:' + command)
				callback(...args)
			})
		)
	}
	/**
	 * 该方法在调用 `codereftracker.showGraph` 命令时运行。
	 * @param arg 传递给命令的可选参数
	 */
	private async view(arg: any) {
		FileGraphView.show(this.context.extensionPath, this.logger)
	}
}
