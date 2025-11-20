import * as vscode from 'vscode';
import * as path from 'path';
import { ReferenceAnalyzer, FileReferences } from './referenceAnalyzer';

export type SortMode = 'name' | 'incoming' | 'outgoing';
export type FilterMode = 'all' | 'orphans';

// Folder interface
export interface Folder {
  name: string;
  path: string;
  children: (Folder | FileItem)[];
  incomingCount: number;
  outgoingCount: number;
}

// File interface
export interface FileItem {
  name: string;
  path: string;
  incomingReferences: string[];
  outgoingReferences: string[];
}

// Tree Item
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
    
    this.tooltip = `${path}\nIncoming: ${incomingCount}, Outgoing: ${outgoingCount}`;
    this.description = `${incomingCount} ⬇️  ${outgoingCount} ⬆️`;
    
    if (contextValue === 'file') {
      this.resourceUri = vscode.Uri.file(path);
      
      if (incomingCount === 0 && outgoingCount === 0) {
        this.iconPath = new vscode.ThemeIcon('circle-outline'); // Orphan
        this.description += ' (Orphan)';
      } else if (incomingCount > 10) {
        this.iconPath = new vscode.ThemeIcon('flame'); // Hot
      } else {
        this.iconPath = vscode.ThemeIcon.File;
      }

      this.command = {
        command: 'vscode.open',
        arguments: [vscode.Uri.file(path)],
        title: 'Open File'
      };
    } else {
      this.iconPath = vscode.ThemeIcon.Folder;
    }
  }
}

export class FileReferenceTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
  
  private _referenceAnalyzer: ReferenceAnalyzer;
  private _rootFolders: Folder[] = [];
  private _sortMode: SortMode = 'name';
  private _filterMode: FilterMode = 'all';
  
  constructor(referenceAnalyzer: ReferenceAnalyzer) {
    this._referenceAnalyzer = referenceAnalyzer;
  }
  
  public refresh(): void {
    this._rootFolders = [];
    this._onDidChangeTreeData.fire();
  }

  public setSortMode(mode: SortMode) {
    this._sortMode = mode;
    this.refresh();
  }

  public setFilterMode(mode: FilterMode) {
    this._filterMode = mode;
    this.refresh();
  }
  
  public getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }
  
  public getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      return this.getRootItems();
    }
    
    const folder = this.findFolder(this._rootFolders, element.path);
    if (folder) {
      let children = folder.children;

      // Filter
      if (this._filterMode === 'orphans') {
        children = children.filter(child => {
          if ('children' in child) return true; // Keep folders
          return child.incomingReferences.length === 0 && child.outgoingReferences.length === 0;
        });
      }

      // Sort
      children.sort((a, b) => {
        if ('children' in a && !('children' in b)) return -1; // Folders first
        if (!('children' in a) && 'children' in b) return 1;

        if (this._sortMode === 'name') {
          return a.name.localeCompare(b.name);
        } else if (this._sortMode === 'incoming') {
          const countA = 'children' in a ? a.incomingCount : a.incomingReferences.length;
          const countB = 'children' in b ? b.incomingCount : b.incomingReferences.length;
          return countB - countA;
        } else if (this._sortMode === 'outgoing') {
          const countA = 'children' in a ? a.outgoingCount : a.outgoingReferences.length;
          const countB = 'children' in b ? b.outgoingCount : b.outgoingReferences.length;
          return countB - countA;
        }
        return 0;
      });

      return Promise.resolve(
        children.map(child => {
          if ('children' in child) {
            return new TreeItem(
              child.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              'folder',
              child.path,
              child.incomingCount,
              child.outgoingCount
            );
          } else {
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
  
  private async getRootItems(): Promise<TreeItem[]> {
    if (this._rootFolders.length === 0) {
      await this.buildFileTree();
    }
    
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
  
  private async buildFileTree(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    
    const references = this._referenceAnalyzer.getReferences();
    
    for (const folder of workspaceFolders) {
      const rootFolder: Folder = {
        name: folder.name,
        path: folder.uri.fsPath,
        children: [],
        incomingCount: 0,
        outgoingCount: 0
      };
      
      for (const [filePath, fileRef] of Object.entries(references)) {
        if (filePath.startsWith(rootFolder.path)) {
          this.addFileToTree(rootFolder, filePath, fileRef);
        }
      }
      
      this.calculateFolderReferenceCounts(rootFolder);
      this._rootFolders.push(rootFolder);
    }
  }
  
  private addFileToTree(rootFolder: Folder, filePath: string, fileRef: FileReferences): void {
    const relativePath = filePath.substring(rootFolder.path.length + 1);
    const pathParts = relativePath.split(path.sep);
    
    let currentFolder = rootFolder;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      const folderPath = path.join(currentFolder.path, folderName);
      
      let childFolder = currentFolder.children.find(
        child => 'children' in child && child.path === folderPath
      ) as Folder | undefined;
      
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
      
      currentFolder = childFolder;
    }
    
    const fileName = pathParts[pathParts.length - 1];
    const fileItem: FileItem = {
      name: fileName,
      path: filePath,
      incomingReferences: fileRef.incomingReferences,
      outgoingReferences: fileRef.outgoingReferences
    };
    
    currentFolder.children.push(fileItem);
  }
  
  private calculateFolderReferenceCounts(folder: Folder): { incomingCount: number, outgoingCount: number } {
    let incomingCount = 0;
    let outgoingCount = 0;
    
    for (const child of folder.children) {
      if ('children' in child) {
        const counts = this.calculateFolderReferenceCounts(child);
        incomingCount += counts.incomingCount;
        outgoingCount += counts.outgoingCount;
      } else {
        incomingCount += child.incomingReferences.length;
        outgoingCount += child.outgoingReferences.length;
      }
    }
    
    folder.incomingCount = incomingCount;
    folder.outgoingCount = outgoingCount;
    
    return { incomingCount, outgoingCount };
  }
  
  private findFolder(folders: Folder[], path: string): Folder | null {
    for (const folder of folders) {
      if (folder.path === path) return folder;
      
      for (const child of folder.children) {
        if ('children' in child) {
          const found = this.findFolder([child], path);
          if (found) return found;
        }
      }
    }
    return null;
  }
}
