import * as vscode from 'vscode';
import { Logger, LogLevel } from './logger';
import { ReferenceAnalyzer } from './referenceAnalyzer';
import { FileReferenceTreeProvider } from './fileReferenceTreeProvider';
import { WebviewProvider } from './webviewProvider';
import { registerCommands } from './commands';

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
	// 创建日志记录器
	const logger = new Logger('CodeRefTracker', LogLevel.INFO);
	logger.info('Activating CodeRefTracker extension');
	
	// 创建引用分析器
	const referenceAnalyzer = new ReferenceAnalyzer(logger);
	
	// 创建文件引用树提供者
	const treeProvider = new FileReferenceTreeProvider(referenceAnalyzer);
	
	// 注册树视图
	const treeView = vscode.window.createTreeView('codeReferencesExplorer', {
		treeDataProvider: treeProvider,
		showCollapseAll: true
	});
	
	// 创建 Webview 提供者
	const webviewProvider = new WebviewProvider(
		context.extensionUri,
		logger,
		referenceAnalyzer
	);
	
	// 注册 Webview 视图
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			WebviewProvider.viewType,
			webviewProvider
		)
	);
	
	// 注册命令
	registerCommands(
		context,
		logger,
		referenceAnalyzer,
		treeProvider,
		webviewProvider
	);
	
	// 监听文件变化
	const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,vue,css,scss,less,html}');
	
	// 文件创建
	fileWatcher.onDidCreate(async (uri) => {
		logger.debug(`File created: ${uri.fsPath}`);
		await referenceAnalyzer.analyzeFile(uri.fsPath);
		treeProvider.refresh();
	});
	
	// 文件修改
	fileWatcher.onDidChange(async (uri) => {
		logger.debug(`File changed: ${uri.fsPath}`);
		await referenceAnalyzer.analyzeFile(uri.fsPath);
		treeProvider.refresh();
	});
	
	// 文件删除
	fileWatcher.onDidDelete((uri) => {
		logger.debug(`File deleted: ${uri.fsPath}`);
		referenceAnalyzer.removeFile(uri.fsPath);
		treeProvider.refresh();
	});
	
	// 添加到订阅
	context.subscriptions.push(fileWatcher);
	context.subscriptions.push(treeView);
	
	// 初始分析
	vscode.commands.executeCommand('codeRefTracker.refreshReferences');
	
	logger.info('CodeRefTracker extension activated');
}

// 停用扩展
export function deactivate() {
	// 清理资源
}
