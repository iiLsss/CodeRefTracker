import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileInfo } from '../types/references';
import { Logger } from '../logger';
import { TreeNode } from '../types/files';

export class FileGraphView {
	public static currentPanel: FileGraphView | undefined;

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private readonly _logger: Logger;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionPath: string, logger: Logger) {
		this._panel = panel;
		this._extensionPath = extensionPath;
		this._logger = logger;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.type) {
					case 'ready':
						this._logger.info('WebView is ready');
						break;
					case 'selectFile':
						vscode.workspace
							.openTextDocument(message.path)
							.then(doc => vscode.window.showTextDocument(doc));
						break;
				}
			},
			null,
			this._disposables
		);
	}

	public static createOrShow(extensionPath: string, logger: Logger): FileGraphView {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (FileGraphView.currentPanel) {
			FileGraphView.currentPanel._panel.reveal(column);
			return FileGraphView.currentPanel;
		}

		const panel = vscode.window.createWebviewPanel(
			'codeReferencesGraph',
			'Code References Graph',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'out'))],
			}
		);

		FileGraphView.currentPanel = new FileGraphView(panel, extensionPath, logger);
		return FileGraphView.currentPanel;
	}

	public updateContent(graphData: any) {
		if (this._panel.webview) {
			// Update the webview content
			this._panel.webview.html = this.getWebviewContent();

			// Send data directly to the webview since it's already in the correct format
			this._panel.webview.postMessage({
				type: 'update',
				data: {
					tree: graphData.tree,
					nodes: graphData.nodes,
					links: graphData.links,
				},
			});
		}
	}

	// Remove or comment out the old prepareGraphData and traverseTree methods as they're no longer needed
	/*
    private prepareGraphData(fileTree: TreeNode, fileInfoMap: Map<string, FileInfo>) {
        // ... old code ...
    }

    private traverseTree(node: TreeNode, nodes: any[]) {
        // ... old code ...
    }
    */

	private getWebviewContent(): string {
		const htmlPath = path.join(this._extensionPath, 'src', 'ui', 'views', 'graph.html');
		try {
			return fs.readFileSync(htmlPath, 'utf8');
		} catch (error) {
			this._logger.error(`Failed to load HTML template: ${error}`);
			return this.getDefaultHtml();
		}
	}

	private getDefaultHtml(): string {
		return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code References Graph</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                .error { color: red; }
            </style>
        </head>
        <body>
            <h1>Code References Graph</h1>
            <p class="error">Failed to load graph visualization.</p>
        </body>
        </html>
        `;
	}

	public dispose() {
		FileGraphView.currentPanel = undefined;

		// Clean up resources
		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
