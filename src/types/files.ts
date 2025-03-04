import * as vscode from 'vscode';
import { FileInfo } from './references';

export interface TreeNode {
  path: string;
  name: string;
  type: vscode.FileType;
  children?: TreeNode[];
  parent?: TreeNode;
  incomingRefs: number;
  outgoingRefs: number;
  fileInfo?: FileInfo;
}