import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ReferenceAnalyzer } from './referenceAnalyzer';
import { Logger } from './logger';

/**
 * Webview 提供者
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeRefTracker.graphView';
  
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _logger: Logger;
  private _referenceAnalyzer: ReferenceAnalyzer;
  
  constructor(
    extensionUri: vscode.Uri,
    logger: Logger,
    referenceAnalyzer: ReferenceAnalyzer
  ) {
    this._extensionUri = extensionUri;
    this._logger = logger;
    this._referenceAnalyzer = referenceAnalyzer;
  }
  
  /**
   * 解析 Webview 视图
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    // 设置 Webview 选项
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };
    
    // 设置 HTML 内容
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // 处理消息
    this._setWebviewMessageListener(webviewView.webview);
  }
  
  /**
   * 发送图表数据
   */
  public sendGraphData(data: any): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'graphData',
        data
      });
    }
  }
  
  /**
   * 获取 Webview 的 HTML 内容
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // 获取资源路径
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'bundle.js')
    );
    
    // 使用 nonce 提高安全性
    const nonce = this._getNonce();
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:;">
      <title>Code Reference Tracker</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
  }
  
  /**
   * 设置 Webview 消息监听器
   */
  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'getGraphData':
            // 获取图表数据
            const graphData = this._prepareGraphData();
            this.sendGraphData(graphData);
            break;
            
          case 'openFile':
            // 打开文件
            if (message.filePath) {
              const uri = vscode.Uri.file(message.filePath);
              vscode.window.showTextDocument(uri);
            }
            break;
            
          case 'exportData':
            // 导出数据
            if (message.format === 'json') {
              this._exportDataAsJson();
            } else if (message.format === 'csv') {
              this._exportDataAsCsv();
            }
            break;
            
          case 'refreshData':
            // 刷新数据
            await this._refreshData();
            const refreshedData = this._prepareGraphData();
            this.sendGraphData(refreshedData);
            break;
        }
      },
      undefined,
      []
    );
  }
  
  /**
   * 准备图表数据
   */
  private _prepareGraphData(): any {
    try {
      const references = this._referenceAnalyzer.getReferences();
      const files = this._referenceAnalyzer.getFiles();
      
      // 创建节点
      const nodes = Object.keys(references).map(filePath => {
        const file = files[filePath];
        const fileName = path.basename(filePath);
        const incomingCount = references[filePath].incomingReferences.length;
        const outgoingCount = references[filePath].outgoingReferences.length;
        
        return {
          id: filePath,
          name: fileName,
          fullPath: filePath,
          incomingCount,
          outgoingCount,
          lastModified: file?.lastModified
        };
      });
      
      // 创建边
      const links: Array<{ source: string; target: string }> = [];
      
      for (const [filePath, fileRef] of Object.entries(references)) {
        for (const outgoing of fileRef.outgoingReferences) {
          links.push({
            source: filePath,
            target: outgoing
          });
        }
      }
      
      return {
        nodes,
        links
      };
    } catch (error) {
      this._logger.error(`Error preparing graph data: ${error}`);
      return { nodes: [], links: [] };
    }
  }
  
  /**
   * 刷新数据
   */
  private async _refreshData(): Promise<void> {
    try {
      await this._referenceAnalyzer.analyzeWorkspace();
      this._logger.info('Reference data refreshed');
    } catch (error) {
      this._logger.error(`Error refreshing data: ${error}`);
    }
  }
  
  /**
   * 导出数据为 JSON
   */
  private _exportDataAsJson(): void {
    try {
      const data = this._prepareGraphData();
      
      // 显示保存对话框
      vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('code-references.json'),
        filters: {
          'JSON Files': ['json']
        }
      }).then(uri => {
        if (uri) {
          // 写入文件
          fs.writeFileSync(uri.fsPath, JSON.stringify(data, null, 2));
          vscode.window.showInformationMessage(`Data exported to ${uri.fsPath}`);
        }
      });
    } catch (error) {
      this._logger.error(`Error exporting data as JSON: ${error}`);
      vscode.window.showErrorMessage('Failed to export data as JSON');
    }
  }
  
  /**
   * 导出数据为 CSV
   */
  private _exportDataAsCsv(): void {
    try {
      const references = this._referenceAnalyzer.getReferences();
      
      // 创建 CSV 内容
      let csvContent = 'File,Incoming References,Outgoing References\n';
      
      for (const [filePath, fileRef] of Object.entries(references)) {
        const fileName = path.basename(filePath);
        const incomingCount = fileRef.incomingReferences.length;
        const outgoingCount = fileRef.outgoingReferences.length;
        
        csvContent += `"${fileName}",${incomingCount},${outgoingCount}\n`;
      }
      
      // 显示保存对话框
      vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('code-references.csv'),
        filters: {
          'CSV Files': ['csv']
        }
      }).then(uri => {
        if (uri) {
          // 写入文件
          fs.writeFileSync(uri.fsPath, csvContent);
          vscode.window.showInformationMessage(`Data exported to ${uri.fsPath}`);
        }
      });
    } catch (error) {
      this._logger.error(`Error exporting data as CSV: ${error}`);
      vscode.window.showErrorMessage('Failed to export data as CSV');
    }
  }
  
  /**
   * 生成随机 nonce
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
} 
