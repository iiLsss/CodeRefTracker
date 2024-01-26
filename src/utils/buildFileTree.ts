import * as vscode from 'vscode'
import * as path from 'path'

type TreeNode = {
	name: string
	path: string
	children?: TreeNode[]
}

export function buildFileTree(files: vscode.Uri[], base: string): TreeNode[] {
	const tree: TreeNode[] = []

	const folders: { [key: string]: vscode.Uri[] } = {}

	for (const file of files) {
		const relativePath = path.relative(base, file.fsPath)
		const parts = relativePath.split(path.sep)

		if (parts.length === 1) {
			tree.push({
				name: parts[0],
				path: file.fsPath,
			})
		} else {
			const folder = parts[0]
			if (!folders[folder]) {
				folders[folder] = []
			}
			folders[folder].push(file)
		}
	}

	for (const folder in folders) {
		tree.push({
			name: folder,
			path: path.join(base, folder),
			children: buildFileTree(folders[folder], path.join(base, folder)),
		})
	}

	return tree
}
