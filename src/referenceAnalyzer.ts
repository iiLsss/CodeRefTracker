import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { Parser } from './parsers/parser';
import { TypeScriptParser } from './parsers/typescriptParser';
import { PathResolver } from './utils/pathResolver';

// File reference information interface
export interface FileReferences {
  incomingReferences: string[];
  outgoingReferences: string[];
}

// File information interface
export interface FileInfo {
  path: string;
  content?: string;
  lastModified?: number;
}

// Reference Analyzer class
export class ReferenceAnalyzer {
  private _references: Record<string, FileReferences> = {};
  private _files: Record<string, FileInfo> = {};
  private _logger: Logger;
  private _fileCache: Map<string, { content: string, mtime: number }> = new Map();
  
  private _parsers: Parser[] = [];
  private _pathResolver: PathResolver;
  private _workspaceRoot: string;
  private _storagePath: string | undefined;

  constructor(logger: Logger, workspaceRoot: string, storagePath?: string) {
    this._logger = logger;
    this._workspaceRoot = workspaceRoot;
    this._storagePath = storagePath;
    this._pathResolver = new PathResolver(workspaceRoot);
    
    // Register parsers
    this._parsers.push(new TypeScriptParser());
  }

  /**
   * Get all reference information
   */
  public getReferences(): Record<string, FileReferences> {
    return this._references;
  }

  /**
   * Get all file information
   */
  public getFiles(): Record<string, FileInfo> {
    return this._files;
  }

  /**
   * Load cache
   */
  public loadCache(): void {
    if (!this._storagePath) return;

    try {
      const cacheFile = path.join(this._storagePath, 'cache.json');
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this._references = data.references || {};
        this._files = data.files || {};
        this._logger.info(`Loaded cache from ${cacheFile}`);
      }
    } catch (error) {
      this._logger.error(`Error loading cache: ${error}`);
    }
  }

  /**
   * Save cache
   */
  public saveCache(): void {
    if (!this._storagePath) return;

    try {
      if (!fs.existsSync(this._storagePath)) {
        fs.mkdirSync(this._storagePath, { recursive: true });
      }
      
      const cacheFile = path.join(this._storagePath, 'cache.json');
      const data = {
        references: this._references,
        files: this._files
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(data), 'utf8');
      this._logger.info(`Saved cache to ${cacheFile}`);
    } catch (error) {
      this._logger.error(`Error saving cache: ${error}`);
    }
  }

  /**
   * Analyze workspace files
   */
  public async analyzeWorkspace(): Promise<Record<string, FileReferences>> {
    try {
      // Load cache first
      this.loadCache();

      // Get workspace files
      const files = await this.getWorkspaceFiles();
      const filesSet = new Set(files);
      
      // Identify deleted files
      const deletedFiles = Object.keys(this._files).filter(f => !filesSet.has(f));
      for (const file of deletedFiles) {
        this.removeFile(file);
      }

      // Analyze new or modified files
      let analyzedCount = 0;
      for (const filePath of files) {
        const stats = fs.statSync(filePath);
        const cachedFile = this._files[filePath];
        
        if (!cachedFile || cachedFile.lastModified !== stats.mtimeMs) {
          await this.analyzeFile(filePath);
          analyzedCount++;
        }
      }
      
      this._logger.info(`Analysis complete. Analyzed ${analyzedCount} files, ${files.length - analyzedCount} from cache.`);
      
      // Save cache
      this.saveCache();
      
      return this._references;
    } catch (error) {
      this._logger.error(`Error analyzing workspace: ${error}`);
      throw error;
    }
  }

  /**
   * Analyze a single file
   */
  public async analyzeFile(filePath: string): Promise<void> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return;
      }
      
      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Check cache
      const cached = this._fileCache.get(filePath);
      if (cached && cached.mtime === stats.mtimeMs) {
        // File not modified, use cache
        return;
      }
      
      // Read file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Update cache
      this._fileCache.set(filePath, {
        content,
        mtime: stats.mtimeMs
      });
      
      // Update file info
      this._files[filePath] = {
        path: filePath,
        lastModified: stats.mtimeMs
      };
      
      // Initialize reference info
      if (!this._references[filePath]) {
        this._references[filePath] = {
          incomingReferences: [],
          outgoingReferences: []
        };
      }
      
      // Analyze file references
      await this.analyzeFileReferences(filePath, content);
      
    } catch (error) {
      this._logger.error(`Error analyzing file ${filePath}: ${error}`);
    }
  }

  /**
   * Analyze file references
   */
  private async analyzeFileReferences(filePath: string, content: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    
    // Clear existing outgoing references
    // Note: We need to handle incoming references cleanup if we want to be fully correct on updates,
    // but for now let's focus on finding new ones. 
    // Ideally we should diff the old and new outgoing refs and update incoming refs of target files.
    const oldOutgoing = this._references[filePath].outgoingReferences;
    this._references[filePath].outgoingReferences = [];
    
    // Remove this file from incoming refs of old targets
    for (const target of oldOutgoing) {
      if (this._references[target]) {
        this._references[target].incomingReferences = this._references[target].incomingReferences.filter(r => r !== filePath);
      }
    }
    
    // Find appropriate parser
    const parser = this._parsers.find(p => p.supports(ext));
    
    if (parser) {
      const imports = await parser.parse(filePath, content);
      
      for (const imp of imports) {
        const resolvedPath = this._pathResolver.resolve(imp.path, filePath);
        if (resolvedPath) {
          this.addReference(filePath, resolvedPath);
        }
      }
    } else if (ext === '.vue') {
      this.analyzeVueReferences(filePath, content);
    } else if (['.css', '.scss', '.less'].includes(ext)) {
      this.analyzeCssReferences(filePath, content);
    } else if (ext === '.html') {
      this.analyzeHtmlReferences(filePath, content);
    }
  }

  private addReference(source: string, target: string) {
    // Add outgoing reference
    if (!this._references[source].outgoingReferences.includes(target)) {
      this._references[source].outgoingReferences.push(target);
    }
    
    // Initialize target if not exists
    if (!this._references[target]) {
      this._references[target] = {
        incomingReferences: [],
        outgoingReferences: []
      };
    }
    
    // Add incoming reference
    if (!this._references[target].incomingReferences.includes(source)) {
      this._references[target].incomingReferences.push(source);
    }
  }

  /**
   * Analyze Vue file references
   */
  private async analyzeVueReferences(filePath: string, content: string): Promise<void> {
    // Extract script content
    const scriptMatch = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(content);
    if (scriptMatch) {
      // Use TypeScript parser for script content
      const tsParser = this._parsers.find(p => p instanceof TypeScriptParser);
      if (tsParser) {
        const imports = await tsParser.parse(filePath + '.ts', scriptMatch[1]); // Fake extension for parser
        for (const imp of imports) {
          const resolvedPath = this._pathResolver.resolve(imp.path, filePath);
          if (resolvedPath) {
            this.addReference(filePath, resolvedPath);
          }
        }
      }
    }
    
    // Extract style content
    const styleMatch = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(content);
    if (styleMatch) {
      this.analyzeCssReferences(filePath, styleMatch[1]);
    }
    
    // Extract template content (HTML)
    const templateMatch = /<template[^>]*>([\s\S]*?)<\/template>/i.exec(content);
    if (templateMatch) {
      this.analyzeHtmlReferences(filePath, templateMatch[1]);
    }
  }

  /**
   * Analyze CSS references (Legacy Regex)
   */
  private analyzeCssReferences(filePath: string, content: string): void {
    const importRegex = /@import\s+(?:url\s*\(\s*)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const resolvedPath = this._pathResolver.resolve(match[1], filePath);
      if (resolvedPath) {
        this.addReference(filePath, resolvedPath);
      }
    }
  }

  /**
   * Analyze HTML references (Legacy Regex)
   */
  private analyzeHtmlReferences(filePath: string, content: string): void {
    const linkRegex = /<link[^>]*href=['"]([^'"]+)['"]/g;
    const scriptRegex = /<script[^>]*src=['"]([^'"]+)['"]/g;
    const imgRegex = /<img[^>]*src=['"]([^'"]+)['"]/g;
    
    const processMatch = (match: RegExpExecArray) => {
      const resolvedPath = this._pathResolver.resolve(match[1], filePath);
      if (resolvedPath) {
        this.addReference(filePath, resolvedPath);
      }
    };
    
    let match;
    while ((match = linkRegex.exec(content)) !== null) processMatch(match);
    while ((match = scriptRegex.exec(content)) !== null) processMatch(match);
    while ((match = imgRegex.exec(content)) !== null) processMatch(match);
  }

  /**
   * Get workspace files
   */
  private async getWorkspaceFiles(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }
    
    const files: string[] = [];
    
    for (const folder of workspaceFolders) {
      const pattern = new vscode.RelativePattern(
        folder,
        '**/*.{ts,tsx,js,jsx,vue,css,scss,less,html}'
      );
      
      const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
      
      for (const uri of uris) {
        files.push(uri.fsPath);
      }
    }
    
    return files;
  }

  /**
   * Remove file
   */
  public removeFile(filePath: string): void {
    delete this._files[filePath];
    this._fileCache.delete(filePath);
    
    if (this._references[filePath]) {
      const incomingRefs = [...this._references[filePath].incomingReferences];
      for (const ref of incomingRefs) {
        if (this._references[ref]) {
          this._references[ref].outgoingReferences = this._references[ref].outgoingReferences.filter(
            r => r !== filePath
          );
        }
      }
      
      const outgoingRefs = [...this._references[filePath].outgoingReferences];
      for (const ref of outgoingRefs) {
        if (this._references[ref]) {
          this._references[ref].incomingReferences = this._references[ref].incomingReferences.filter(
            r => r !== filePath
          );
        }
      }
      
      delete this._references[filePath];
    }
  }
}
