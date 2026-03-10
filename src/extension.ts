import * as vscode from 'vscode';
import { GraphWebviewProvider } from './providers/webviewProvider';

export function activate(context: vscode.ExtensionContext) {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) return;

  const provider = new GraphWebviewProvider(context, root);

  context.subscriptions.push(
    vscode.commands.registerCommand('refmap.openGraph', () => {
      provider.openGraph();
    }),
    vscode.commands.registerCommand('refmap.showInGraph', (uri: vscode.Uri) => {
      const rel = vscode.workspace.asRelativePath(uri).replace(/\\/g, '/');
      provider.openGraph(rel);
    }),
    vscode.commands.registerCommand('refmap.refresh', () => {
      provider.refresh();
    }),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx,vue,css,scss}');
  const debounceRefresh = debounce(() => provider.refresh(), 2000);
  watcher.onDidChange(debounceRefresh);
  watcher.onDidCreate(debounceRefresh);
  watcher.onDidDelete(debounceRefresh);
  context.subscriptions.push(watcher);
}

export function deactivate() {}

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
