import * as vscode from 'vscode';
import * as path from 'path';
import { DependencyGraph } from '../core/dependencyGraph';
import { GraphData, WebviewMessage } from '../types';

export class GraphWebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private graphData: GraphData | undefined;
  private pendingFocus: string | undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private workspaceRoot: string,
  ) {}

  async openGraph(focusNodeId?: string) {
    if (this.panel) {
      this.panel.reveal();
      if (focusNodeId) {
        this.panel.webview.postMessage({ type: 'focusNode', nodeId: focusNodeId });
      }
      return;
    }

    this.pendingFocus = focusNodeId;

    this.panel = vscode.window.createWebviewPanel(
      'refmap',
      'RefMap',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'dist')),
        ],
      },
    );

    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      async (msg: WebviewMessage) => {
        switch (msg.type) {
          case 'ready':
          case 'requestData':
            await this.sendGraphData();
            if (this.pendingFocus) {
              this.panel?.webview.postMessage({ type: 'focusNode', nodeId: this.pendingFocus });
              this.pendingFocus = undefined;
            }
            break;
          case 'openFile':
            this.openFile(msg.path);
            break;
          case 'refresh':
            await this.sendGraphData();
            break;
        }
      },
      undefined,
      this.context.subscriptions,
    );

    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  async refresh() {
    if (this.panel) {
      await this.sendGraphData();
    }
  }

  private async sendGraphData() {
    try {
      const graph = new DependencyGraph(this.workspaceRoot);
      this.graphData = await graph.build();
      this.panel?.webview.postMessage({ type: 'graphData', data: this.graphData });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build graph';
      this.panel?.webview.postMessage({ type: 'error', message });
    }
  }

  private openFile(relativePath: string) {
    const abs = path.join(this.workspaceRoot, relativePath);
    vscode.workspace.openTextDocument(abs).then(
      doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
      () => vscode.window.showErrorMessage(`Cannot open file: ${relativePath}`),
    );
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview.js')),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'dist', 'webview.css')),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <link href="${styleUri}" rel="stylesheet">
  <title>RefMap</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
