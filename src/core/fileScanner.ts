import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const SUPPORTED_EXTENSIONS = [
  'ts', 'tsx', 'js', 'jsx', 'vue',
  'css', 'scss', 'sass', 'less',
];

const BUILTIN_EXCLUDES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/coverage/**',
  '**/*.d.ts',
  '**/*.min.js',
  '**/*.min.css',
  '**/*.map',
];

export class FileScanner {
  constructor(private workspaceRoot: string) {}

  async scan(): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('refmap');
    const userExcludes: string[] = config.get('exclude', []);
    const useGitignore: boolean = config.get('useGitignore', true);

    const allExcludes = [
      ...BUILTIN_EXCLUDES,
      ...userExcludes,
    ];

    if (useGitignore) {
      const gitignorePatterns = this.parseGitignore();
      allExcludes.push(...gitignorePatterns);
    }

    const excludePattern = `{${allExcludes.join(',')}}`;
    const include = `**/*.{${SUPPORTED_EXTENSIONS.join(',')}}`;
    const uris = await vscode.workspace.findFiles(include, excludePattern);

    return uris
      .map(uri => path.relative(this.workspaceRoot, uri.fsPath).replace(/\\/g, '/'))
      .sort();
  }

  private parseGitignore(): string[] {
    const patterns: string[] = [];
    const gitignorePath = path.join(this.workspaceRoot, '.gitignore');

    if (!fs.existsSync(gitignorePath)) return patterns;

    let content: string;
    try {
      content = fs.readFileSync(gitignorePath, 'utf-8');
    } catch {
      return patterns;
    }

    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('!')) continue;

      patterns.push(this.gitignoreToGlob(line));
    }

    return patterns;
  }

  private gitignoreToGlob(pattern: string): string {
    let p = pattern;

    const rooted = p.startsWith('/');
    if (rooted) p = p.slice(1);

    const isDir = p.endsWith('/');
    if (isDir) p = p.slice(0, -1);

    if (isDir || !p.includes('.')) {
      if (rooted) return `${p}/**`;
      return `**/${p}/**`;
    }

    if (rooted) return p;
    if (!p.includes('/')) return `**/${p}`;
    return p;
  }
}
