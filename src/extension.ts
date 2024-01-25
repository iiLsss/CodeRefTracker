import * as vscode from 'vscode';
import { Logger } from './logger';

import { FileParser, FileReference } from './fileParser';

function getWebviewContent() {
  // 在这里编写你的HTML和JavaScript代码
  // 例如，你可以使用D3.js来创建一个图形
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Graph View</title>
    </head>
    <body>
        <div id="d3-container">
				阿基德金娃来得及
				</div>
    </body>
    </html>`;
}

let myStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {

	const logger = new Logger();

	logger.log('Starting File Graph');

	let disposable = vscode.commands.registerCommand('codereftracker.showGraph', function () {
    // 创建webview
    const panel = vscode.window.createWebviewPanel(
      'graphView', // 视图标识符
      'Graph View', // 视图标题
      vscode.ViewColumn.One, // 显示在编辑器的哪个部位
      {
        // 允许webview运行JavaScript
        enableScripts: true,
        // 限制webview可以链接的资源
        localResourceRoots: [vscode.Uri.file(context.extensionPath)]
      }
    );
	  logger.log('Starting File Graph');

    // 设置webview的HTML内容
    panel.webview.html = getWebviewContent();
  });
  context.subscriptions.push(disposable);

	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	myStatusBarItem.command = 'codereftracker.showGraph';
	myStatusBarItem.text = 'File Graph';
	myStatusBarItem.tooltip = 'View File Graph';
	myStatusBarItem.show();
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('===>');
}
