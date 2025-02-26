import * as os from 'os';
import * as vscode from 'vscode';
import { Disposable } from './utils/disposable';
import { Logger } from './logger';
import { FileGraphView } from './ui/fileGraphView';
import { getWorkspaceFiles } from './core/workspaceFiles';
import { ReferenceAnalyzer } from './core/referenceAnalyzer';

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
			// 获取工作区文件
			const workspaceFolders = await getWorkspaceFiles();
			if (!workspaceFolders.length) {
				this.logger.warn('No workspace folders found');
				vscode.window.showInformationMessage('Please open a workspace first');
				return;
			}

			// 创建视图实例
			const instance = FileGraphView.createOrShow(this.context.extensionPath, this.logger);

			// 对每个工作区文件夹进行分析
			for (const folder of workspaceFolders) {
				const analyzer = new ReferenceAnalyzer(this.logger);
				const files = folder.files.map(f => f.fsPath);
				
				// 分析文件引用关系
				const fileInfoMap = await analyzer.analyzeWorkspace(files);
				
				// 更新视图内容
				const addTypeToTree = (tree: any): any => ({
					...tree,
					type: 'directory',
					children: tree.children?.map(addTypeToTree)
				});
				const treeWithType = addTypeToTree(folder.trees[0]);
				instance.updateContent(treeWithType, fileInfoMap);
			}

			this.logger.log('Graph view updated successfully');
		} catch (error) {
			this.logger.error(`Error updating graph view: ${error}`);
			vscode.window.showErrorMessage('Failed to update graph view');
		}
	}
}
