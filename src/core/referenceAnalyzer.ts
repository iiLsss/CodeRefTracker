import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';
import { FileReference, FileInfo, ReferenceType } from '../types/references';

export class ReferenceAnalyzer {
	private logger: Logger;
	private fileInfoCache = new Map<string, FileInfo>();
	private fileTimestamps = new Map<string, number>();
	private analyzing = false;
	private pendingAnalysis = false;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Analyzes a workspace to find references between files
	 */
	public async analyzeWorkspace(files: string[]): Promise<Map<string, FileInfo>> {
		const fileInfoMap = new Map<string, FileInfo>();
		const filesToAnalyze: string[] = [];
		
		// Check which files need to be re-analyzed
		for (const file of files) {
			try {
				const stats = fs.statSync(file);
				const lastModified = stats.mtimeMs;
				
				if (!this.fileTimestamps.has(file) || this.fileTimestamps.get(file) !== lastModified) {
					// File is new or modified, needs re-analysis
					filesToAnalyze.push(file);
					this.fileTimestamps.set(file, lastModified);
				} else {
					// Use cached result
					const cachedInfo = this.fileInfoCache.get(file);
					if (cachedInfo) {
						fileInfoMap.set(file, {...cachedInfo, references: [], referencedBy: []});
					} else {
						filesToAnalyze.push(file);
					}
				}
			} catch (error) {
				this.logger.error(`Error checking file stats for ${file}: ${error}`);
				filesToAnalyze.push(file);
			}
		}

		// Initialize file info objects for all files
		for (const file of files) {
			if (!fileInfoMap.has(file)) {
				fileInfoMap.set(file, {
					path: file,
					references: [],
					referencedBy: [],
				});
			}
		}

		// Find references for files that need analysis
		for (const file of filesToAnalyze) {
			try {
				const content = fs.readFileSync(file, 'utf8');

				// Find outgoing references in this file
				const outgoingRefs = await this.findReferencesInFile(file, content, files);

				if (outgoingRefs.length > 0) {
					const fileInfo = fileInfoMap.get(file)!;
					fileInfo.references = outgoingRefs;
				}
			} catch (error) {
				this.logger.error(`Error analyzing file ${file}: ${error}`);
			}
		}

		// Process all references to build the complete reference map
		for (const [filePath, fileInfo] of fileInfoMap.entries()) {
			// Add incoming references to target files
			for (const ref of fileInfo.references) {
				const targetFile = fileInfoMap.get(ref.target);
				if (targetFile) {
					targetFile.referencedBy.push({
						source: filePath,
						target: ref.target,
						line: ref.line,
						type: ref.type,
					});
				}
			}
		}

		// Update cache with new results
		for (const [file, info] of fileInfoMap.entries()) {
			this.fileInfoCache.set(file, {...info});
		}

		return fileInfoMap;
	}

	/**
	 * Schedule analysis in the background
	 */
	public async scheduleAnalysis(files: string[]): Promise<Map<string, FileInfo> | null> {
		if (this.analyzing) {
			this.pendingAnalysis = true;
			return null;
		}
		
		this.analyzing = true;
		
		try {
			const results = await this.analyzeWorkspace(files);
			return results;
		} finally {
			this.analyzing = false;
			
			if (this.pendingAnalysis) {
				this.pendingAnalysis = false;
				// Return null to indicate that another analysis is scheduled
				return null;
			}
		}
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
