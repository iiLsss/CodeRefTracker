export interface ImportInfo {
  path: string;
  start: number;
  end: number;
  isDynamic: boolean;
  isTypeOnly: boolean;
}

export interface Parser {
  /**
   * Parse the file content and return a list of imports
   * @param filePath Absolute path to the file
   * @param content File content
   */
  parse(filePath: string, content: string): Promise<ImportInfo[]>;
  
  /**
   * Check if this parser supports the given file extension
   * @param ext File extension (including dot, e.g., '.ts')
   */
  supports(ext: string): boolean;
}
