import * as fs from 'fs';
import * as path from 'path';

const IMPORT_PATTERNS = [
  /import\s+(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /export\s+(?:[\w*{}\s,]+\s+from\s+)['"]([^'"]+)['"]/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /@import\s+['"]([^'"]+)['"]/g,
  /@use\s+['"]([^'"]+)['"]/g,
];

const TRY_EXTENSIONS = [
  '', '.ts', '.tsx', '.js', '.jsx', '.vue',
  '.css', '.scss', '.sass', '.less',
  '/index.ts', '/index.tsx', '/index.js', '/index.jsx', '/index.vue',
];

export class ReferenceParser {
  constructor(
    private workspaceRoot: string,
    private knownFiles: Set<string>,
  ) {}

  parseFile(filePath: string): string[] {
    const abs = path.join(this.workspaceRoot, filePath);
    let content: string;
    try {
      content = fs.readFileSync(abs, 'utf-8');
    } catch {
      return [];
    }

    if (filePath.endsWith('.vue')) {
      const script = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      const styles = content.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
      content = (script?.[1] ?? '') + '\n' + (styles?.join('\n') ?? '');
    }

    const refs = new Set<string>();
    for (const pattern of IMPORT_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(content))) {
        const importPath = m[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) continue;
        const resolved = this.resolve(filePath, importPath);
        if (resolved) refs.add(resolved);
      }
    }
    return Array.from(refs);
  }

  private resolve(fromFile: string, importPath: string): string | null {
    const fromDir = path.dirname(fromFile);
    const base = path.normalize(path.join(fromDir, importPath)).replace(/\\/g, '/');
    for (const ext of TRY_EXTENSIONS) {
      const candidate = base + ext;
      if (this.knownFiles.has(candidate)) return candidate;
    }
    return null;
  }
}
