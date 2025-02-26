import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';
import { FileReference, FileInfo, ReferenceType } from '../types/references';

export class ReferenceAnalyzer {
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Analyzes a workspace to find references between files
	 */
	public async analyzeWorkspace(files: string[]): Promise<Map<string, FileInfo>> {
		const fileInfoMap = new Map<string, FileInfo>();

		// Initialize file info objects
		for (const file of files) {
			fileInfoMap.set(file, {
				path: file,
				references: [],
				referencedBy: [],
			});
		}

		// Find references across files
		for (const file of files) {
			try {
				const content = fs.readFileSync(file, 'utf8');

				// Find outgoing references in this file
				const outgoingRefs = await this.findReferencesInFile(file, content, files);

				if (outgoingRefs.length > 0) {
					const fileInfo = fileInfoMap.get(file)!;
					fileInfo.references = outgoingRefs;

					// Add incoming references to target files
					for (const ref of outgoingRefs) {
						const targetFile = fileInfoMap.get(ref.target);
						if (targetFile) {
							targetFile.referencedBy.push({
								source: file,
								target: ref.target, // 添加缺少的 target 属性
								line: ref.line,
								type: ref.type,
							});
						}
					}
				}
			} catch (error) {
				this.logger.error(`Error analyzing file ${file}: ${error}`);
			}
		}

		return fileInfoMap;
	}

	/**
	 * Finds references to other files within a single file
	 */
	private async findReferencesInFile(
		sourcePath: string,
		content: string,
		allFiles: string[]
	): Promise<FileReference[]> {
		const references: FileReference[] = [];
		const lines = content.split('\n');

		// Common import patterns with explicit typing
		const importPatterns: Array<{ regex: RegExp; type: ReferenceType }> = [
			{ regex: /import\s+.*?from\s+['"]([^'"]+)['"]/g, type: 'import' },
			{ regex: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g, type: 'require' },
			{ regex: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g, type: 'dynamic import' },
			{ regex: /@import\s+['"]([^'"]+)['"]/g, type: 'css import' },
			{ regex: /<script[^>]*src=["']([^"']+)["']/g, type: 'script src' },
			{ regex: /<link[^>]*href=["']([^"']+)["']/g, type: 'link href' },
		];

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (!workspaceFolder) {
			return references;
		}

		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex];

			for (const pattern of importPatterns) {
				let match;
				while ((match = pattern.regex.exec(line)) !== null) {
					const importPath = match[1];

					// Resolve the path to an absolute path
					const resolvedPath = this.resolveImportPath(importPath, sourcePath, workspaceFolder);
					if (resolvedPath && allFiles.includes(resolvedPath)) {
						references.push({
							source: sourcePath,
							target: resolvedPath,
							line: lineIndex + 1,
							type: pattern.type,
						});
					}
				}
			}
		}

		return references;
	}

	/**
	 * Resolves a relative import path to an absolute file path
	 */
	private resolveImportPath(
		importPath: string,
		sourcePath: string,
		workspaceFolder: string
	): string | null {
		try {
			// Handle node_modules imports
			if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
				return null; // Skip node_modules imports
			}

			// Handle relative paths
			const sourceDir = path.dirname(sourcePath);
			let fullPath = '';

			if (importPath.startsWith('.')) {
				fullPath = path.resolve(sourceDir, importPath);
			} else if (importPath.startsWith('/')) {
				fullPath = path.join(workspaceFolder, importPath);
			}

			// Handle if extension is omitted
			if (!path.extname(fullPath)) {
				const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
				for (const ext of extensions) {
					if (fs.existsSync(fullPath + ext)) {
						return fullPath + ext;
					}
				}

				// Handle index files
				for (const ext of extensions) {
					if (fs.existsSync(path.join(fullPath, `index${ext}`))) {
						return path.join(fullPath, `index${ext}`);
					}
				}

				return null;
			}

			return fs.existsSync(fullPath) ? fullPath : null;
		} catch (error) {
			return null;
		}
	}
}
