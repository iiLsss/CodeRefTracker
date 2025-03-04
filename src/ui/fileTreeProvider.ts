import * as vscode from 'vscode';
import * as path from 'path';
import { FileInfo } from '../types/references';
import { TreeNode } from '../types/files';

export class FileReferenceTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private fileInfoMap: Map<string, FileInfo> = new Map();
    private rootNode: TreeNode | undefined;
    private highReferenceThreshold: number = 0;
    private veryHighReferenceThreshold: number = 0;
    
    constructor(private workspaceRoot: string) {}
    
    public updateReferences(fileInfoMap: Map<string, FileInfo>) {
        this.fileInfoMap = fileInfoMap;
        this.rootNode = this.buildFileTree();
        this.calculateThresholds();
        this._onDidChangeTreeData.fire();
    }
    
    private calculateThresholds() {
        // Calculate reference counts for all files
        const referenceCounts: number[] = [];
        this.fileInfoMap.forEach(info => {
            referenceCounts.push(info.referencedBy.length);
        });
        
        // Sort counts to determine thresholds
        referenceCounts.sort((a, b) => b - a);
        
        // Set thresholds at 10% and 5% of files
        const tenPercentIndex = Math.max(0, Math.floor(referenceCounts.length * 0.1));
        const fivePercentIndex = Math.max(0, Math.floor(referenceCounts.length * 0.05));
        
        this.highReferenceThreshold = referenceCounts[tenPercentIndex] || 5;
        this.veryHighReferenceThreshold = referenceCounts[fivePercentIndex] || 10;
    }
    
    private buildFileTree(): TreeNode {
        const root: TreeNode = {
            path: this.workspaceRoot,
            type: vscode.FileType.Directory,
            name: path.basename(this.workspaceRoot),
            children: [],
            parent: undefined,
            incomingRefs: 0,
            outgoingRefs: 0
        };
        
        // Add all files to the tree
        this.fileInfoMap.forEach((fileInfo, filePath) => {
            this.addFileToTree(root, filePath, fileInfo);
        });
        
        // Calculate reference counts for directories
        this.calculateDirectoryReferences(root);
        
        return root;
    }
    
    private addFileToTree(root: TreeNode, filePath: string, fileInfo: FileInfo): void {
        const relativePath = path.relative(this.workspaceRoot, filePath);
        const parts = relativePath.split(path.sep);
        
        let current = root;
        
        // Create directory structure
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            let child = current.children?.find(c => c.name === part);
            
            if (!child) {
                child = {
                    path: path.join(current.path, part),
                    type: vscode.FileType.Directory,
                    name: part,
                    children: [],
                    parent: current,
                    incomingRefs: 0,
                    outgoingRefs: 0
                };
                current.children?.push(child);
            }
            
            current = child;
        }
        
        // Add file
        const fileName = parts[parts.length - 1];
        const fileNode: TreeNode = {
            path: filePath,
            type: vscode.FileType.File,
            name: fileName,
            children: [],
            parent: current,
            incomingRefs: fileInfo.referencedBy.length,
            outgoingRefs: fileInfo.references.length,
            fileInfo: fileInfo
        };
        
        current.children?.push(fileNode);
    }
    
    private calculateDirectoryReferences(node: TreeNode): { incoming: number, outgoing: number } {
        if (node.type === vscode.FileType.File) {
            return { 
                incoming: node.incomingRefs || 0, 
                outgoing: node.outgoingRefs || 0 
            };
        }
        
        let incomingTotal = 0;
        let outgoingTotal = 0;
        
        if (node.children) {
            for (const child of node.children) {
                const counts = this.calculateDirectoryReferences(child);
                incomingTotal += counts.incoming;
                outgoingTotal += counts.outgoing;
            }
        }
        
        node.incomingRefs = incomingTotal;
        node.outgoingRefs = outgoingTotal;
        
        return { incoming: incomingTotal, outgoing: outgoingTotal };
    }
    
    getTreeItem(element: TreeNode): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            element.name,
            element.type === vscode.FileType.Directory 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None
        );
        
        // Set file icon
        if (element.type === vscode.FileType.File) {
            treeItem.resourceUri = vscode.Uri.file(element.path);
            treeItem.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(element.path)]
            };
        } else {
            // For directories, show total reference count
            treeItem.description = `(${element.incomingRefs})`;
        }
        
        // Add reference count badge for files
        if (element.type === vscode.FileType.File) {
            const incomingCount = element.incomingRefs || 0;
            const outgoingCount = element.outgoingRefs || 0;
            
            treeItem.description = `[${outgoingCount}↑ ${incomingCount}↓]`;
            
            // Add heat indicators
            if (incomingCount > this.veryHighReferenceThreshold) {
                treeItem.description += ' 🔥';
                treeItem.tooltip = 'Hot file (top 5% most referenced)';
                treeItem.iconPath = new vscode.ThemeIcon('flame');
            } else if (incomingCount > this.highReferenceThreshold) {
                treeItem.description += ' ⭐';
                treeItem.tooltip = 'Important file (top 10% most referenced)';
                treeItem.iconPath = new vscode.ThemeIcon('star-full');
            } else if (incomingCount === 0 && outgoingCount === 0) {
                treeItem.description += ' ⚠️';
                treeItem.tooltip = 'Isolated file (no references)';
                treeItem.iconPath = new vscode.ThemeIcon('warning');
            }
            
            // Set context value for right-click menu
            treeItem.contextValue = 'file';
        } else {
            treeItem.contextValue = 'directory';
        }
        
        return treeItem;
    }
    
    getChildren(element?: TreeNode): Thenable<TreeNode[]> {
        if (!this.rootNode) {
            return Promise.resolve([]);
        }
        
        if (!element) {
            return Promise.resolve(this.rootNode.children || []);
        }
        
        return Promise.resolve(element.children || []);
    }
    
    getParent(element: TreeNode): TreeNode | undefined {
        return element.parent;
    }
} 
