import * as vscode from 'vscode';
import { Disposable } from './utils/disposable';

const DOUBLE_QUOTE_REGEXP = /"/g;

/**
 * 管理File Graph日志记录器，将日志信息写入File Graph输出频道。
 */
export class Logger extends Disposable {
	private readonly channel: vscode.OutputChannel;

	/**
	 * 创建File Graph日志记录器
	 */
	constructor() {
		super();
		this.channel = vscode.window.createOutputChannel('File Graph');
		this.registerDisposable(this.channel);
	}

	/**
	 * 将消息记录到输出频道
	 * @param message 输出的字符串
	 */
	public log(message: string) {
		const date = new Date();
		const timestamp = date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds()) + '.' + pad3(date.getMilliseconds());
		this.channel.appendLine('[' + timestamp + '] ' + message);
	}

	/**
	 * 将生成的命令的执行记录到输出频道
	 * @param cmd 被生成的命令
	 * @param args 传递给命令的参数
	 */
	public logCmd(cmd: string, args: string[]) {
		this.log('> ' + cmd + ' ' + args.map((arg) => arg === ''
			? '""'
			: arg.startsWith('--format=')
				? '--format=...'
				: arg.includes(' ')
					? '"' + arg.replace(DOUBLE_QUOTE_REGEXP, '\\"') + '"'
					: arg
		).join(' '));
	}

	/**
	 * 将错误消息记录到输出频道
	 * @param message 输出的字符串
	 */
	public logError(message: string) {
		this.log('ERROR: ' + message);
	}
}

/**
 * 如果数字小于两位，则用前导零填充
 * @param n 要填充的数字
 * @returns 填充后的数字
 */
function pad2(n: number) {
	return (n > 9 ? '' : '0') + n;
}

/**
 * 如果数字小于三位，则用前导零填充
 * @param n 要填充的数字
 * @returns 填充后的数字
 */
function pad3(n: number) {
	return (n > 99 ? '' : n > 9 ? '0' : '00') + n;
}