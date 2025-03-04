import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ReferenceAnalyzer } from './referenceAnalyzer';
import { Logger } from './logger';

/**
 * 管理代码引用可视化的 WebView
 */
export class CodeReferencesWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codeRefTracker.graphView';
  
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _referenceAnalyzer: ReferenceAnalyzer;
  private _logger: Logger;
  
  constructor(
    extensionUri: vscode.Uri,
    referenceAnalyzer: ReferenceAnalyzer,
    logger: Logger
  ) {
    this._extensionUri = extensionUri;
    this._referenceAnalyzer = referenceAnalyzer;
    this._logger = logger;
  }
  
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this._extensionUri
      ]
    };
    
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // 处理来自 webview 的消息
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'requestData':
          await this._sendGraphData();
          break;
        case 'refreshData':
          await this._referenceAnalyzer.analyzeWorkspace();
          await this._sendGraphData();
          break;
        case 'openFile':
          if (message.path) {
            try {
              const document = await vscode.workspace.openTextDocument(message.path);
              await vscode.window.showTextDocument(document);
            } catch (error) {
              this._logger.error(`Failed to open file: ${message.path}`, error);
            }
          }
          break;
        case 'nodeSelected':
          // 处理节点选择
          break;
        case 'exportData':
          this._exportData();
          break;
      }
    });
  }
  
  /**
   * 发送图数据到 webview
   */
  private async _sendGraphData(): Promise<void> {
    if (!this._view) {return;}
    
    try {
      const graphData = await this._prepareGraphData();
      this._view.webview.postMessage({
        type: 'graphData',
        data: graphData
      });
    } catch (error) {
      this._logger.error('Failed to send graph data', error);
      vscode.window.showErrorMessage('Failed to prepare graph data');
    }
  }
  
  /**
   * 准备图数据
   */
  private async _prepareGraphData() {
    const references = this._referenceAnalyzer.getReferences();
    const files = this._referenceAnalyzer.getFiles();
    
    // 创建节点
    const nodes = Object.keys(files).map(filePath => {
      const file = files[filePath];
      const incomingCount = (references[filePath]?.incomingReferences || []).length;
      const outgoingCount = (references[filePath]?.outgoingReferences || []).length;
      const totalCount = incomingCount + outgoingCount;
      
      // 确定引用类别
      let category: 'high' | 'medium' | 'low' = 'low';
      if (totalCount > 10) {
        category = 'high';
      } else if (totalCount > 5) {
        category = 'medium';
      }
      
      return {
        id: filePath,
        path: filePath,
        name: path.basename(filePath),
        type: path.extname(filePath).substring(1),
        incomingReferences: incomingCount,
        outgoingReferences: outgoingCount,
        totalReferences: totalCount,
        referenceCategory: category
      };
    });
    
    // 创建连接
    const links: any[] = [];
    
    Object.keys(references).forEach(filePath => {
      const fileRefs = references[filePath];
      
      // 添加传出引用
      fileRefs.outgoingReferences.forEach(targetPath => {
        links.push({
          source: filePath,
          target: targetPath,
          type: 'outgoing',
          weight: 1
        });
      });
      
      // 添加传入引用
      fileRefs.incomingReferences.forEach(sourcePath => {
        // 避免重复添加
        const existingLink = links.find(
          link => link.source === sourcePath && link.target === filePath
        );
        
        if (!existingLink) {
          links.push({
            source: sourcePath,
            target: filePath,
            type: 'incoming',
            weight: 1
          });
        }
      });
    });
    
    // 计算统计信息
    const totalFiles = nodes.length;
    const totalReferences = links.length;
    const refCounts = nodes.map(n => n.totalReferences);
    const maxReferences = Math.max(...refCounts);
    const minReferences = Math.min(...refCounts);
    const avgReferences = refCounts.reduce((sum, count) => sum + count, 0) / totalFiles;
    
    return {
      nodes,
      links,
      stats: {
        totalFiles,
        totalReferences,
        maxReferences,
        minReferences,
        avgReferences
      }
    };
  }
  
  /**
   * 导出数据
   */
  private async _exportData(): Promise<void> {
    try {
      const graphData = await this._prepareGraphData();
      
      // 显示保存对话框
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('code-references-data.json'),
        filters: {
          'JSON Files': ['json']
        }
      });
      
      if (uri) {
        fs.writeFileSync(uri.fsPath, JSON.stringify(graphData, null, 2));
        vscode.window.showInformationMessage(`Data exported to ${uri.fsPath}`);
      }
    } catch (error) {
      this._logger.error('Failed to export data', error);
      vscode.window.showErrorMessage('Failed to export data');
    }
  }
  
  /**
   * 获取 webview 的 HTML 内容
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    // 获取 bundle 文件路径
    const bundlePath = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'bundle.js')
    );
    
    // 读取 HTML 模板
    const templatePath = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'template.html');
    let html = fs.readFileSync(templatePath.fsPath, 'utf8');
    
    // 替换占位符
    html = html.replace('{{bundlePath}}', bundlePath.toString());
    
    return html;
  }
  
  /**
   * 更新 webview
   */
  public async update(): Promise<void> {
    await this._sendGraphData();
  }
} 
