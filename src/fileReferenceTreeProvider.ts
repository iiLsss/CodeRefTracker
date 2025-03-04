import * as vscode from 'vscode';
import * as path from 'path';
import { ReferenceAnalyzer, FileReferences } from './referenceAnalyzer';

// 文件夹类型
export interface Folder {
  name: string;
  path: string;
  children: (Folder | FileItem)[];
  incomingCount: number;
  outgoingCount: number;
}

// 文件类型
export interface FileItem {
  name: string;
  path: string;
  incomingReferences: string[];
  outgoingReferences: string[];
}

// 树节点类型
export class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly path: string,
    public readonly incomingCount: number = 0,
    public readonly outgoingCount: number = 0
  ) {
    super(label, collapsibleState);
    
    // 设置工具提示
    this.tooltip = `${path}\nIncoming: ${incomingCount}, Outgoing: ${outgoingCount}`;
    
    // 设置描述
    this.description = `${incomingCount} in, ${outgoingCount} out`;
    
    // 设置图标
    if (contextValue === 'file') {
      // 根据引用数量设置不同的图标
      if (incomingCount === 0 && outgoingCount === 0) {
        this.iconPath = new vscode.ThemeIcon('file');
      } else if (incomingCount > 5 || outgoingCount > 5) {
        this.iconPath = new vscode.ThemeIcon('flame');
      } else if (incomingCount === 0 && outgoingCount > 0) {
        this.iconPath = new vscode.ThemeIcon('arrow-right');
      } else if (incomingCount > 0 && outgoingCount === 0) {
        this.iconPath = new vscode.ThemeIcon('arrow-left');
      } else {
        this.iconPath = new vscode.ThemeIcon('references');
      }
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
    }
    
    // 设置命令
    if (contextValue === 'file') {
      this.command = {
        command: 'vscode.open',
        arguments: [vscode.Uri.file(path)],
        title: 'Open File'
      };
    }
  }
}

// 文件引用树提供者
export class FileReferenceTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private _referenceAnalyzer: ReferenceAnalyzer;
  private _rootFolders: Folder[] = [];
  
  constructor(referenceAnalyzer: ReferenceAnalyzer) {
    this._referenceAnalyzer = referenceAnalyzer;
  }
  
  /**
   * 刷新树视图
   */
  public refresh(): void {
    this._rootFolders = [];
    this._onDidChangeTreeData.fire();
  }
  
  /**
   * 获取树项
   */
  public getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }
  
  /**
   * 获取子项
   */
  public getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      // 根节点
      return this.getRootItems();
    }
    
    // 查找文件夹
    const folder = this.findFolder(this._rootFolders, element.path);
    if (folder) {
      return Promise.resolve(
        folder.children.map(child => {
          if ('children' in child) {
            // 文件夹
            return new TreeItem(
              child.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              'folder',
              child.path,
              child.incomingCount,
              child.outgoingCount
            );
          } else {
            // 文件
            return new TreeItem(
              child.name,
              vscode.TreeItemCollapsibleState.None,
              'file',
              child.path,
              child.incomingReferences.length,
              child.outgoingReferences.length
            );
          }
        })
      );
    }
    
    return Promise.resolve([]);
  }
  
  /**
   * 获取根项
   */
  private async getRootItems(): Promise<TreeItem[]> {
    // 如果根文件夹为空，则构建文件树
    if (this._rootFolders.length === 0) {
      await this.buildFileTree();
    }
    
    // 返回根文件夹
    return this._rootFolders.map(folder => {
      return new TreeItem(
        folder.name,
        vscode.TreeItemCollapsibleState.Collapsed,
        'folder',
        folder.path,
        folder.incomingCount,
        folder.outgoingCount
      );
    });
  }
  
  /**
   * 构建文件树
   */
  private async buildFileTree(): Promise<void> {
    // 获取工作区文件夹
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }
    
    // 获取引用信息
    const references = this._referenceAnalyzer.getReferences();
    
    // 创建根文件夹
    for (const folder of workspaceFolders) {
      const rootFolder: Folder = {
        name: folder.name,
        path: folder.uri.fsPath,
        children: [],
        incomingCount: 0,
        outgoingCount: 0
      };
      
      // 添加文件
      for (const [filePath, fileRef] of Object.entries(references)) {
        // 检查文件是否在当前工作区
        if (filePath.startsWith(rootFolder.path)) {
          // 添加文件到树
          this.addFileToTree(rootFolder, filePath, fileRef);
        }
      }
      
      // 计算文件夹引用计数
      this.calculateFolderReferenceCounts(rootFolder);
      
      // 添加到根文件夹
      this._rootFolders.push(rootFolder);
    }
  }
  
  /**
   * 添加文件到树
   */
  private addFileToTree(rootFolder: Folder, filePath: string, fileRef: FileReferences): void {
    // 获取相对路径
    const relativePath = filePath.substring(rootFolder.path.length + 1);
    const pathParts = relativePath.split(path.sep);
    
    // 当前文件夹
    let currentFolder = rootFolder;
    
    // 遍历路径
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      const folderPath = path.join(currentFolder.path, folderName);
      
      // 查找子文件夹
      let childFolder = currentFolder.children.find(
        child => 'children' in child && child.path === folderPath
      ) as Folder | undefined;
      
      // 如果子文件夹不存在，则创建
      if (!childFolder) {
        childFolder = {
          name: folderName,
          path: folderPath,
          children: [],
          incomingCount: 0,
          outgoingCount: 0
        };
        currentFolder.children.push(childFolder);
      }
      
      // 更新当前文件夹
      currentFolder = childFolder;
    }
    
    // 添加文件
    const fileName = pathParts[pathParts.length - 1];
    const fileItem: FileItem = {
      name: fileName,
      path: filePath,
      incomingReferences: fileRef.incomingReferences,
      outgoingReferences: fileRef.outgoingReferences
    };
    
    // 添加到当前文件夹
    currentFolder.children.push(fileItem);
  }
  
  /**
   * 计算文件夹引用计数
   */
  private calculateFolderReferenceCounts(folder: Folder): { incomingCount: number, outgoingCount: number } {
    let incomingCount = 0;
    let outgoingCount = 0;
    
    // 遍历子项
    for (const child of folder.children) {
      if ('children' in child) {
        // 子文件夹
        const counts = this.calculateFolderReferenceCounts(child);
        incomingCount += counts.incomingCount;
        outgoingCount += counts.outgoingCount;
      } else {
        // 文件
        incomingCount += child.incomingReferences.length;
        outgoingCount += child.outgoingReferences.length;
      }
    }
    
    // 更新文件夹计数
    folder.incomingCount = incomingCount;
    folder.outgoingCount = outgoingCount;
    
    return { incomingCount, outgoingCount };
  }
  
  /**
   * 查找文件夹
   */
  private findFolder(folders: Folder[], path: string): Folder | null {
    for (const folder of folders) {
      if (folder.path === path) {
        return folder;
      }
      
      // 递归查找子文件夹
      for (const child of folder.children) {
        if ('children' in child) {
          const found = this.findFolder([child], path);
          if (found) {
            return found;
          }
        }
      }
    }
    
    return null;
  }
} 
