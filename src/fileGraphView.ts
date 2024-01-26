import * as path from 'path'
import * as vscode from 'vscode'

import { Logger } from './logger'
import { Disposable, toDisposable } from './utils/disposable'

/**
 * 管理File Graph
 */
export class FileGraphView extends Disposable {
	public static currentPanel: FileGraphView | undefined

	private readonly panel: vscode.WebviewPanel
	private readonly logger: Logger

	public static show(extensionPath: string, logger: Logger) {
		if (FileGraphView.currentPanel) {
			// 如果 File Graph 面板存在
		} else {
			// 如果 File Graph 面板不存在
			FileGraphView.currentPanel = new FileGraphView(extensionPath, logger)
		}
	}

	private constructor(extensionPath: string, logger: Logger) {
		super()
		this.logger = logger
		this.panel = vscode.window.createWebviewPanel(
			'file-graph', // 视图标识符
			'File Graph', // 视图标题
			vscode.ViewColumn.One, // 显示在编辑器的哪个部位
			{
				// 允许webview运行JavaScript
				enableScripts: true,
				// 限制webview可以链接的资源
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))],
			}
		)
		this.update()
	}

	/**
	 * 更新 Webview 中加载的 HTML 文档。
	 */
	private update() {
		this.panel.webview.html = this.getHtmlForWebview()
	}

	/**
	 * 获取webview展示的html
	 * @returns html
	 */
	private getHtmlForWebview() {
		let body = `
      <div>12313</div>
    `

		return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Git Graph</title>
          <style></style>
        </head>
        ${body}
      </html>
      `
		// <link rel="stylesheet" type="text/css" href="${this.getMediaUri('out.min.css')}">
	}
}
