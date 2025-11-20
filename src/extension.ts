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
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
	const storagePath = context.storageUri?.fsPath;
	const referenceAnalyzer = new ReferenceAnalyzer(logger, workspaceRoot, storagePath);
	
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
	
	// 创建状态栏项
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'codeRefTracker.showGraph';
	context.subscriptions.push(statusBarItem);

	// 注册命令
	registerCommands(
		context,
		logger,
		referenceAnalyzer,
		treeProvider,
		webviewProvider,
		statusBarItem
	);
	
	// 更新状态栏函数
	const updateStatusBar = () => {
		const files = referenceAnalyzer.getFiles();
		const fileCount = Object.keys(files).length;
		statusBarItem.text = `$(references) ${fileCount} files analyzed`;
		statusBarItem.show();
	};

	// 监听文件变化
	const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,vue,css,scss,less,html}');
	
	// 文件创建
	fileWatcher.onDidCreate(async (uri) => {
		logger.debug(`File created: ${uri.fsPath}`);
		await referenceAnalyzer.analyzeFile(uri.fsPath);
		treeProvider.refresh();
		updateStatusBar();
	});
	
	// 文件修改
	fileWatcher.onDidChange(async (uri) => {
		logger.debug(`File changed: ${uri.fsPath}`);
		await referenceAnalyzer.analyzeFile(uri.fsPath);
		treeProvider.refresh();
		updateStatusBar();
	});
	
	// 文件删除
	fileWatcher.onDidDelete((uri) => {
		logger.debug(`File deleted: ${uri.fsPath}`);
		referenceAnalyzer.removeFile(uri.fsPath);
		treeProvider.refresh();
		updateStatusBar();
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
