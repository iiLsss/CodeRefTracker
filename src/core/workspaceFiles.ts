import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import { TreeNode } from '../types';
import { buildFileTree } from '../utils/buildFileTree';

type Folders = {
	files: vscode.Uri[]
	trees: TreeNode[]
} & vscode.WorkspaceFolder;

export async function getWorkspaceFiles() {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders) {
		return [];
	}
	const folders: Folders[] = workspaceFolders.map(folder => ({
		...folder,
		files: [],
		trees: [],
	}));

	for (const folder of folders) {
		const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');
		let gitignore = '';

		try {
			gitignore = fs.readFileSync(gitignorePath, 'utf8');
		} catch (err) {
			console.log(`Failed to read .gitignore file from ${gitignorePath}.`);
		}

		const ig = ignore().add(gitignore);
		const relativePattern = new vscode.RelativePattern(folder, '**/*');
		const files = await vscode.workspace.findFiles(relativePattern);
		folder.files = files.filter(f => {
			const relativePath = path.relative(folder.uri.fsPath, f.fsPath);
			return !ig.ignores(relativePath);
		});
		folder.trees = buildFileTree(folder.files, folder.uri.fsPath);
	}
	console.log(folders);
	return folders;
}
