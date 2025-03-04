import * as vscode from 'vscode';
import { Logger } from './logger';
import { ReferenceAnalyzer } from './referenceAnalyzer';
import { FileReferenceTreeProvider } from './fileReferenceTreeProvider';
import { registerCommands } from './commands';
import { CodeReferencesWebviewProvider } from './webviewProvider';

export async function activate(context: vscode.ExtensionContext) {
	// Initialize logger
	const logger = new Logger('CodeRefTracker');
	logger.info('Activating Code Reference Tracker extension');

	try {
		// Initialize reference analyzer
		const referenceAnalyzer = new ReferenceAnalyzer(logger);
		
		// Initialize file tree provider
		const fileTreeProvider = new FileReferenceTreeProvider(referenceAnalyzer, logger);
		
		// Register tree view
		const treeView = vscode.window.createTreeView('codeRefTrackerExplorer', {
			treeDataProvider: fileTreeProvider,
			showCollapseAll: true
		});
		
		// Register WebView provider
		const webviewProvider = new CodeReferencesWebviewProvider(
			context.extensionUri,
			referenceAnalyzer,
			logger
		);
		
		// Register WebView view
		const webviewView = vscode.window.registerWebviewViewProvider(
			CodeReferencesWebviewProvider.viewType,
			webviewProvider
		);
		
		// Register commands
		registerCommands(context, referenceAnalyzer, fileTreeProvider, webviewProvider, logger);
		
		// Initial analysis
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Analyzing code references...',
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });
			await referenceAnalyzer.analyzeWorkspace();
			fileTreeProvider.refresh();
			webviewProvider.update();
			progress.report({ increment: 100 });
		});
		
		// Watch for file changes
		const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{js,jsx,ts,tsx,vue,html,css,scss,less}');
		
		// File created
		fileWatcher.onDidCreate(async (uri) => {
			await referenceAnalyzer.analyzeFile(uri.fsPath);
			fileTreeProvider.refresh();
			webviewProvider.update();
		});
		
		// File changed
		fileWatcher.onDidChange(async (uri) => {
			await referenceAnalyzer.analyzeFile(uri.fsPath);
			fileTreeProvider.refresh();
			webviewProvider.update();
		});
		
		// File deleted
		fileWatcher.onDidDelete((uri) => {
			referenceAnalyzer.removeFile(uri.fsPath);
			fileTreeProvider.refresh();
			webviewProvider.update();
		});
		
		// Add to subscriptions
		context.subscriptions.push(
			treeView,
			webviewView,
			fileWatcher
		);
		
		logger.info('Code Reference Tracker extension activated successfully');
	} catch (error) {
		logger.error('Failed to activate extension', error);
		vscode.window.showErrorMessage('Failed to activate Code Reference Tracker extension');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Clean up resources
	console.log('===>');
}
