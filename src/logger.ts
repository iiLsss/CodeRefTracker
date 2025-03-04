import * as vscode from 'vscode';

/**
 * 日志级别
 */
export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3
}

/**
 * 日志记录器
 */
export class Logger {
	private _outputChannel: vscode.OutputChannel;
	private _logLevel: LogLevel;

	constructor(name: string, logLevel: LogLevel = LogLevel.INFO) {
		this._outputChannel = vscode.window.createOutputChannel(name);
		this._logLevel = logLevel;
	}

	/**
	 * 设置日志级别
	 */
	public setLogLevel(level: LogLevel): void {
		this._logLevel = level;
	}

	/**
	 * 记录调试信息
	 */
	public debug(message: string): void {
		if (this._logLevel <= LogLevel.DEBUG) {
			this.log('DEBUG', message);
		}
	}

	/**
	 * 记录普通信息
	 */
	public info(message: string): void {
		if (this._logLevel <= LogLevel.INFO) {
			this.log('INFO', message);
		}
	}

	/**
	 * 记录警告信息
	 */
	public warn(message: string): void {
		if (this._logLevel <= LogLevel.WARN) {
			this.log('WARN', message);
		}
	}

	/**
	 * 记录错误信息
	 */
	public error(message: string): void {
		if (this._logLevel <= LogLevel.ERROR) {
			this.log('ERROR', message);
		}
	}

	/**
	 * 显示输出通道
	 */
	public show(): void {
		this._outputChannel.show();
	}

	/**
	 * 隐藏输出通道
	 */
	public hide(): void {
		this._outputChannel.hide();
	}

	/**
	 * 清空输出通道
	 */
	public clear(): void {
		this._outputChannel.clear();
	}

	/**
	 * 销毁输出通道
	 */
	public dispose(): void {
		this._outputChannel.dispose();
	}

	/**
	 * 记录日志
	 */
	private log(level: string, message: string): void {
		const timestamp = new Date().toISOString();
		this._outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
	}
}
