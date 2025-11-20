import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export class PathResolver {
  private compilerOptions: ts.CompilerOptions = {};
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.loadTsConfig();
  }

  private loadTsConfig() {
    const configPath = ts.findConfigFile(
      this.projectRoot,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (configPath) {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) {
        console.error('Error reading tsconfig.json:', configFile.error);
        return;
      }

      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );

      this.compilerOptions = parsedConfig.options;
    }
  }

  public resolve(importPath: string, containingFile: string): string | null {
    // Use TypeScript's module resolution logic
    const result = ts.resolveModuleName(
      importPath,
      containingFile,
      this.compilerOptions,
      ts.sys
    );

    if (result.resolvedModule) {
      return result.resolvedModule.resolvedFileName;
    }

    // Fallback for non-TS files or if resolution fails (e.g. CSS imports)
    // This part can be expanded for other file types
    return this.resolveRelative(importPath, containingFile);
  }

  private resolveRelative(importPath: string, containingFile: string): string | null {
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(containingFile), importPath);
      // Try common extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.css', '.scss', '.less', '.html'];
      
      if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return resolved;
      }

      for (const ext of extensions) {
        if (fs.existsSync(resolved + ext)) {
          return resolved + ext;
        }
        if (fs.existsSync(path.join(resolved, 'index' + ext))) {
          return path.join(resolved, 'index' + ext);
        }
      }
    }
    return null;
  }
}
