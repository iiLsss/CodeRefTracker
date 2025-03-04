import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

// 文件引用信息接口
export interface FileReferences {
  incomingReferences: string[];
  outgoingReferences: string[];
}

// 文件信息接口
export interface FileInfo {
  path: string;
  content?: string;
  lastModified?: number;
}

// 引用分析器类
export class ReferenceAnalyzer {
  private _references: Record<string, FileReferences> = {};
  private _files: Record<string, FileInfo> = {};
  private _logger: Logger;
  private _fileCache: Map<string, { content: string, mtime: number }> = new Map();

  constructor(logger: Logger) {
    this._logger = logger;
  }

  /**
   * 获取所有引用信息
   */
  public getReferences(): Record<string, FileReferences> {
    return this._references;
  }

  /**
   * 获取所有文件信息
   */
  public getFiles(): Record<string, FileInfo> {
    return this._files;
  }

  /**
   * 分析工作区文件
   */
  public async analyzeWorkspace(): Promise<Record<string, FileReferences>> {
    try {
      // 获取工作区文件
      const files = await this.getWorkspaceFiles();
      
      // 清空现有引用
      this._references = {};
      this._files = {};
      
      // 分析每个文件
      for (const filePath of files) {
        await this.analyzeFile(filePath);
      }
      
      return this._references;
    } catch (error) {
      this._logger.error(`Error analyzing workspace: ${error}`);
      throw error;
    }
  }

  /**
   * 分析单个文件
   */
  public async analyzeFile(filePath: string): Promise<void> {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return;
      }
      
      // 获取文件状态
      const stats = fs.statSync(filePath);
      
      // 检查缓存
      const cached = this._fileCache.get(filePath);
      if (cached && cached.mtime === stats.mtimeMs) {
        // 文件未修改，使用缓存
        return;
      }
      
      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 更新缓存
      this._fileCache.set(filePath, {
        content,
        mtime: stats.mtimeMs
      });
      
      // 更新文件信息
      this._files[filePath] = {
        path: filePath,
        lastModified: stats.mtimeMs
      };
      
      // 初始化引用信息
      if (!this._references[filePath]) {
        this._references[filePath] = {
          incomingReferences: [],
          outgoingReferences: []
        };
      }
      
      // 分析文件引用
      this.analyzeFileReferences(filePath, content);
      
    } catch (error) {
      this._logger.error(`Error analyzing file ${filePath}: ${error}`);
    }
  }

  /**
   * 分析文件引用
   */
  private analyzeFileReferences(filePath: string, content: string): void {
    // 获取文件扩展名
    const ext = path.extname(filePath).toLowerCase();
    
    // 清除现有的传出引用
    this._references[filePath].outgoingReferences = [];
    
    // 根据文件类型分析引用
    switch (ext) {
      case '.ts':
      case '.tsx':
      case '.js':
      case '.jsx':
        this.analyzeJsReferences(filePath, content);
        break;
      case '.vue':
        this.analyzeVueReferences(filePath, content);
        break;
      case '.css':
      case '.scss':
      case '.less':
        this.analyzeCssReferences(filePath, content);
        break;
      case '.html':
        this.analyzeHtmlReferences(filePath, content);
        break;
    }
  }

  /**
   * 分析 JavaScript/TypeScript 引用
   */
  private analyzeJsReferences(filePath: string, content: string): void {
    // 导入语句正则表达式
    const importRegex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    
    // 查找所有导入
    let match;
    const imports = new Set<string>();
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    
    while ((match = requireRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    
    // 解析导入路径
    for (const importPath of imports) {
      // 忽略 node_modules 导入
      if (importPath.startsWith('.')) {
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        if (resolvedPath && this._files[resolvedPath]) {
          // 添加传出引用
          this._references[filePath].outgoingReferences.push(resolvedPath);
          
          // 添加传入引用
          if (!this._references[resolvedPath]) {
            this._references[resolvedPath] = {
              incomingReferences: [],
              outgoingReferences: []
            };
          }
          
          if (!this._references[resolvedPath].incomingReferences.includes(filePath)) {
            this._references[resolvedPath].incomingReferences.push(filePath);
          }
        }
      }
    }
  }

  /**
   * 分析 Vue 文件引用
   */
  private analyzeVueReferences(filePath: string, content: string): void {
    // 简单实现：提取 <script> 标签内容并分析
    const scriptMatch = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(content);
    if (scriptMatch) {
      this.analyzeJsReferences(filePath, scriptMatch[1]);
    }
    
    // 提取 <style> 标签内容并分析
    const styleMatch = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(content);
    if (styleMatch) {
      this.analyzeCssReferences(filePath, styleMatch[1]);
    }
    
    // 提取 <template> 标签内容并分析
    const templateMatch = /<template[^>]*>([\s\S]*?)<\/template>/i.exec(content);
    if (templateMatch) {
      this.analyzeHtmlReferences(filePath, templateMatch[1]);
    }
  }

  /**
   * 分析 CSS 引用
   */
  private analyzeCssReferences(filePath: string, content: string): void {
    // 导入语句正则表达式
    const importRegex = /@import\s+(?:url\s*\(\s*)?['"]([^'"]+)['"]/g;
    
    // 查找所有导入
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const resolvedPath = this.resolveImportPath(filePath, importPath);
        if (resolvedPath && this._files[resolvedPath]) {
          // 添加传出引用
          this._references[filePath].outgoingReferences.push(resolvedPath);
          
          // 添加传入引用
          if (!this._references[resolvedPath]) {
            this._references[resolvedPath] = {
              incomingReferences: [],
              outgoingReferences: []
            };
          }
          
          if (!this._references[resolvedPath].incomingReferences.includes(filePath)) {
            this._references[resolvedPath].incomingReferences.push(filePath);
          }
        }
      }
    }
  }

  /**
   * 分析 HTML 引用
   */
  private analyzeHtmlReferences(filePath: string, content: string): void {
    // 链接和脚本引用正则表达式
    const linkRegex = /<link[^>]*href=['"]([^'"]+)['"]/g;
    const scriptRegex = /<script[^>]*src=['"]([^'"]+)['"]/g;
    const imgRegex = /<img[^>]*src=['"]([^'"]+)['"]/g;
    
    // 查找所有引用
    const processMatch = (match: RegExpExecArray) => {
      const refPath = match[1];
      if (refPath.startsWith('.')) {
        const resolvedPath = this.resolveImportPath(filePath, refPath);
        if (resolvedPath && this._files[resolvedPath]) {
          // 添加传出引用
          this._references[filePath].outgoingReferences.push(resolvedPath);
          
          // 添加传入引用
          if (!this._references[resolvedPath]) {
            this._references[resolvedPath] = {
              incomingReferences: [],
              outgoingReferences: []
            };
          }
          
          if (!this._references[resolvedPath].incomingReferences.includes(filePath)) {
            this._references[resolvedPath].incomingReferences.push(filePath);
          }
        }
      }
    };
    
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      processMatch(match);
    }
    
    while ((match = scriptRegex.exec(content)) !== null) {
      processMatch(match);
    }
    
    while ((match = imgRegex.exec(content)) !== null) {
      processMatch(match);
    }
  }

  /**
   * 解析导入路径
   */
  private resolveImportPath(filePath: string, importPath: string): string | null {
    try {
      const dir = path.dirname(filePath);
      let resolvedPath = path.resolve(dir, importPath);
      
      // 检查文件是否存在
      if (fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        if (stats.isFile()) {
          return resolvedPath;
        }
      }
      
      // 尝试添加扩展名
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.css', '.scss', '.less', '.html'];
      for (const ext of extensions) {
        resolvedPath = path.resolve(dir, importPath + ext);
        if (fs.existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }
      
      // 尝试 index 文件
      for (const ext of extensions) {
        resolvedPath = path.resolve(dir, importPath, 'index' + ext);
        if (fs.existsSync(resolvedPath)) {
          return resolvedPath;
        }
      }
      
      return null;
    } catch (error) {
      this._logger.error(`Error resolving import path: ${error}`);
      return null;
    }
  }

  /**
   * 获取工作区文件
   */
  private async getWorkspaceFiles(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }
    
    const files: string[] = [];
    
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath;
      
      // 查找所有文件
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
   * 移除文件
   */
  public removeFile(filePath: string): void {
    // 移除文件信息
    delete this._files[filePath];
    
    // 移除文件缓存
    this._fileCache.delete(filePath);
    
    // 移除引用信息
    if (this._references[filePath]) {
      // 获取传入引用
      const incomingRefs = [...this._references[filePath].incomingReferences];
      
      // 从传入引用中移除对该文件的引用
      for (const ref of incomingRefs) {
        if (this._references[ref]) {
          this._references[ref].outgoingReferences = this._references[ref].outgoingReferences.filter(
            r => r !== filePath
          );
        }
      }
      
      // 获取传出引用
      const outgoingRefs = [...this._references[filePath].outgoingReferences];
      
      // 从传出引用中移除对该文件的引用
      for (const ref of outgoingRefs) {
        if (this._references[ref]) {
          this._references[ref].incomingReferences = this._references[ref].incomingReferences.filter(
            r => r !== filePath
          );
        }
      }
      
      // 删除引用信息
      delete this._references[filePath];
    }
  }
} 
