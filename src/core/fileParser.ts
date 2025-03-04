import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';

export interface FileReference {
	filePath: string
	referenceCount: number
}

export class FileParser {
	private workspaceDir: string;

	constructor(workspaceDir: string) {
		this.workspaceDir = workspaceDir;
	}

	public parseFiles(): Promise<FileReference[]> {
		return new Promise((resolve, reject) => {
			glob('**/*.{ts,js}', { cwd: this.workspaceDir }, (err: Error | null, files: string[]) => {
				if (err) {
					reject(err);
				} else {
					const references: FileReference[] = files.map((file: string) => {
						const content = fs.readFileSync(path.join(this.workspaceDir, file), 'utf-8');
						const referenceCount = this.countReferences(content);
						return { filePath: file, referenceCount };
					});
					resolve(references);
				}
			});
		});
	}

	private countReferences(content: string): number {
		// TODO: Implement the logic to count references
		// This will depend on your specific use case
		return 0;
	}
}
