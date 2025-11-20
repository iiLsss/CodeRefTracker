import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './logger';
import { ReferenceAnalyzer, FileReferences } from './referenceAnalyzer';
import { FileReferenceTreeProvider } from './fileReferenceTreeProvider';
import { WebviewProvider } from './webviewProvider';

/**
 * 注册命令
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  logger: Logger,
  referenceAnalyzer: ReferenceAnalyzer,
  treeProvider: FileReferenceTreeProvider,
  webviewProvider: WebviewProvider,
  statusBarItem: vscode.StatusBarItem
): void {
  // 显示图表
  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.showGraph', async () => {
      logger.info('Showing code reference graph');
      
      try {
        // 准备图表数据
        const graphData = prepareGraphData(referenceAnalyzer);
        
        // 发送数据到 Webview
        webviewProvider.sendGraphData(graphData);
      } catch (error) {
        logger.error(`Error showing graph: ${error}`);
        vscode.window.showErrorMessage('Failed to show code reference graph');
      }
    })
  );
  
  // 刷新引用
  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.refreshReferences', async () => {
      logger.info('Refreshing code references');
      
      try {
        // 显示进度
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing code references',
            cancellable: false
          },
          async (progress) => {
            progress.report({ increment: 0, message: 'Starting analysis...' });
            
            // 分析工作区
            await referenceAnalyzer.analyzeWorkspace();
            
            progress.report({ increment: 50, message: 'Updating reference tree...' });
            
            // 刷新树视图
            treeProvider.refresh();
            
            // 更新状态栏
            const files = referenceAnalyzer.getFiles();
            const fileCount = Object.keys(files).length;
            statusBarItem.text = `$(references) ${fileCount} files analyzed`;
            statusBarItem.show();
            
            progress.report({ increment: 50, message: 'Done' });
          }
        );
        
        vscode.window.showInformationMessage('Code references refreshed');
      } catch (error) {
        logger.error(`Error refreshing references: ${error}`);
        vscode.window.showErrorMessage('Failed to refresh code references');
      }
    })
  );
  
  // 打开文件
  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.openFile', async (filePath: string) => {
      logger.info(`Opening file: ${filePath}`);
      
      try {
        const uri = vscode.Uri.file(filePath);
        await vscode.window.showTextDocument(uri);
      } catch (error) {
        logger.error(`Error opening file: ${error}`);
        vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
      }
    })
  );
  
  // 查找引用
  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.findReferences', async (filePath: string) => {
      logger.info(`Finding references for: ${filePath}`);
      
      try {
        // 执行显示图表命令
        await vscode.commands.executeCommand('codeRefTracker.showGraph');
      } catch (error) {
        logger.error(`Error finding references: ${error}`);
        vscode.window.showErrorMessage(`Failed to find references for: ${filePath}`);
      }
    })
  );
  // Sort commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.sortByName', () => {
      treeProvider.setSortMode('name');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.sortByIncoming', () => {
      treeProvider.setSortMode('incoming');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.sortByOutgoing', () => {
      treeProvider.setSortMode('outgoing');
    })
  );

  // Filter commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.filterOrphans', () => {
      treeProvider.setFilterMode('orphans');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codeRefTracker.resetFilter', () => {
      treeProvider.setFilterMode('all');
    })
  );
}

/**
 * 准备图表数据
 */
function prepareGraphData(referenceAnalyzer: ReferenceAnalyzer): any {
  const references = referenceAnalyzer.getReferences();
  const files = referenceAnalyzer.getFiles();
  
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
    const typedFileRef = fileRef as FileReferences;
    for (const outgoing of typedFileRef.outgoingReferences) {
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
} 
