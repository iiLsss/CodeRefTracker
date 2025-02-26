import * as vscode from 'vscode';

export class Logger {
	private outputChannel: vscode.OutputChannel;

	constructor() {
		this.outputChannel = vscode.window.createOutputChannel('CodeRefTracker');
	}

	public log(message: string): void {
		const timestamp = new Date().toISOString();
		this.outputChannel.appendLine(`[${timestamp}] [INFO] ${message}`);
	}

	public error(message: string): void {
		const timestamp = new Date().toISOString();
		this.outputChannel.appendLine(`[${timestamp}] [ERROR] ${message}`);
		// 可选：在状态栏或通知中显示错误
		vscode.window.showErrorMessage(`CodeRefTracker: ${message}`);
	}

	public warn(message: string): void {
		const timestamp = new Date().toISOString();
		this.outputChannel.appendLine(`[${timestamp}] [WARN] ${message}`);
	}

	public debug(message: string): void {
		const timestamp = new Date().toISOString();
		this.outputChannel.appendLine(`[${timestamp}] [DEBUG] ${message}`);
	}

	public show(): void {
		this.outputChannel.show();
	}

	public dispose(): void {
		this.outputChannel.dispose();
	}
}
