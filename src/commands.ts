import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Disposable } from './utils/disposable';
import { Logger } from './logger';
import { FileGraphView } from './ui/fileGraphView';
import { getWorkspaceFiles } from './core/workspaceFiles';
import { ReferenceAnalyzer } from './core/referenceAnalyzer';
import { FileReferenceTreeProvider } from './ui/fileTreeProvider';

export class CommandManager extends Disposable {
	private readonly context: vscode.ExtensionContext;
	private readonly logger: Logger;

	constructor(context: vscode.ExtensionContext, logger: Logger) {
		super();
		this.context = context;
		this.logger = logger;

		this.registerCommand('codereftracker.showGraph', arg => this.view(arg));
	}
	/**
	 *
	 * @param command
	 * @param callback
	 */
	private registerCommand(command: string, callback: (...args: any[]) => any) {
		this.registerDisposable(
			vscode.commands.registerCommand(command, (...args: any[]) => {
				this.logger.log('Command Invoked:' + command);
				callback(...args);
			})
		);
	}
	/**
	 * 该方法在调用 `codereftracker.showGraph` 命令时运行。
	 * @param arg 传递给命令的可选参数
	 */
	private async view(arg: any) {
		try {
			const workspaceFolders = await getWorkspaceFiles();
			if (!workspaceFolders.length) {
				this.logger.warn('No workspace folders found');
				vscode.window.showInformationMessage('Please open a workspace first');
				return;
			}

			const instance = FileGraphView.createOrShow(this.context.extensionPath, this.logger);

			for (const folder of workspaceFolders) {
				const analyzer = new ReferenceAnalyzer(this.logger);
				const files = folder.files.map(f => f.fsPath);
				
				const fileInfoMap = await analyzer.analyzeWorkspace(files);
				
				interface GraphNode {
					id: string;
					name: string;
					type: string;
					path: string;
				}
				
				const graphData = {
					tree: folder.trees[0],  // 文件树结构
					nodes: [] as GraphNode[],
					links: [] as Array<{source: string, target: string, type: string}>
				};

				// 添加文件引用关系
				fileInfoMap.forEach((info, filePath) => {
					graphData.nodes.push({
						id: filePath,
						name: path.basename(filePath),
						type: 'file',
						path: filePath
					});

				 // 修改这里：使用 references 而不是 dependencies
					info.references.forEach(ref => {
						graphData.links.push({
							source: filePath,
							target: ref.target,
							type: ref.type
						});
					});
				});
				console.log( graphData);
				instance.updateContent(graphData);
			}

			this.logger.log('Graph view updated successfully');
		} catch (error) {
			this.logger.error(`Error updating graph view: ${error}`);
			vscode.window.showErrorMessage('Failed to update graph view');
		}
	}
}

export function registerCommands(
	context: vscode.ExtensionContext,
	referenceAnalyzer: ReferenceAnalyzer,
	fileTreeProvider: FileReferenceTreeProvider,
	logger: Logger
) {
	// Register show graph command
	const showGraphCommand = vscode.commands.registerCommand('codereftracker.showGraph', async () => {
		try {
			logger.log('Showing code references graph');
			
			const graphView = FileGraphView.createOrShow(context.extensionPath, logger);
			
			// Prepare graph data
			const files = await getWorkspaceFiles();
			const fileInfoMap = await referenceAnalyzer.analyzeWorkspace(files);
			
			// Convert to graph data format
			const graphData = prepareGraphData(fileInfoMap);
			
			// Update graph view
			graphView.updateContent(graphData);
		} catch (error) {
			logger.error(`Error showing graph: ${error}`);
			vscode.window.showErrorMessage('Failed to show code references graph');
		}
	});
	
	// Register refresh references command
	const refreshReferencesCommand = vscode.commands.registerCommand('codereftracker.refreshReferences', async () => {
		try {
			logger.log('Refreshing code references');
			
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Refreshing code references...",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0 });
				
				const files = await getWorkspaceFiles();
				progress.report({ increment: 30, message: `Found ${files.length} files` });
				
				const fileInfoMap = await referenceAnalyzer.analyzeWorkspace(files);
				progress.report({ increment: 70, message: "Building reference tree" });
				
				fileTreeProvider.updateReferences(fileInfoMap);
				
				return true;
			});
		} catch (error) {
			logger.error(`Error refreshing references: ${error}`);
			vscode.window.showErrorMessage('Failed to refresh code references');
		}
	});
	
	// Register context menu commands for files
	const openFileCommand = vscode.commands.registerCommand('codereftracker.openFile', (filePath: string) => {
		try {
			vscode.workspace.openTextDocument(filePath).then(doc => {
				vscode.window.showTextDocument(doc);
			});
		} catch (error) {
			logger.error(`Error opening file: ${error}`);
			vscode.window.showErrorMessage('Failed to open file');
		}
	});
	
	const findReferencesCommand = vscode.commands.registerCommand('codereftracker.findReferences', (filePath: string) => {
		try {
			// Show references in the graph view
			vscode.commands.executeCommand('codereftracker.showGraph').then(() => {
				// TODO: Highlight the selected file and its references
			});
		} catch (error) {
			logger.error(`Error finding references: ${error}`);
			vscode.window.showErrorMessage('Failed to find references');
		}
	});
	
	context.subscriptions.push(
		showGraphCommand,
		refreshReferencesCommand,
		openFileCommand,
		findReferencesCommand
	);
}

// Helper function to prepare graph data
function prepareGraphData(fileInfoMap: Map<string, any>) {
	const nodes: any[] = [];
	const links: any[] = [];
	
	// Create nodes
	fileInfoMap.forEach((fileInfo, filePath) => {
		const fileName = filePath.split('/').pop() || '';
		
		nodes.push({
			id: filePath,
			name: fileName,
			path: filePath,
			incomingCount: fileInfo.referencedBy.length,
			outgoingCount: fileInfo.references.length,
			incomingRefs: fileInfo.referencedBy.map((ref: any) => ({
				name: ref.source.split('/').pop() || '',
				path: ref.source.split('/').slice(0, -1).join('/'),
				fullPath: ref.source,
				type: ref.type,
				line: ref.line
			})),
			outgoingRefs: fileInfo.references.map((ref: any) => ({
				name: ref.target.split('/').pop() || '',
				path: ref.target.split('/').slice(0, -1).join('/'),
				fullPath: ref.target,
				type: ref.type,
				line: ref.line
			}))
		});
	});
	
	// Create links
	fileInfoMap.forEach((fileInfo, filePath) => {
		fileInfo.references.forEach((ref: any) => {
			links.push({
				source: filePath,
				target: ref.target,
				type: ref.type
			});
		});
	});
	
	return {
		nodes,
		links,
		tree: null // Tree data will be built in the view
	};
}