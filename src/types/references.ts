/**
 * Represents a reference from one file to another
 */
export interface FileReference {
  /**
   * Source file path that contains the reference
   */
  source: string;
  
  /**
   * Target file path that is being referenced
   */
  target: string;
  
  /**
   * Line number in the source file where the reference appears
   */
  line: number;
  
  /**
   * Type of the reference (import, require, etc.)
   */
  type: ReferenceType;
}


/**
* Types of file references
*/
export type ReferenceType = 
  | 'import'          // ES Modules import
  | 'require'         // CommonJS require
  | 'dynamic import'  // Dynamic import()
  | 'css import'      // CSS @import
  | 'script src'      // HTML <script src="...">
  | 'link href'       // HTML <link href="...">
  | 'unknown';        // Other reference types

/**
* Represents information about a file and its references
*/
export interface FileInfo {
  /**
   * File path
   */
  path: string;
  
  /**
   * List of files this file references (outgoing references)
   */
  references: FileReference[];
  
  /**
   * List of files that reference this file (incoming references)
   */
  referencedBy: FileReference[];
  
  /**
   * Optional metadata about the file
   */
  metadata?: FileMetadata;
}

/**
* Additional metadata about a file
*/
export interface FileMetadata {
  /**
   * File size in bytes
   */
  size?: number;
  
  /**
   * Last modified timestamp
   */
  lastModified?: number;
  
  /**
   * Number of lines in the file
   */
  lineCount?: number;
  
  /**
   * Programming language of the file
   */
  language?: string;
  
  /**
   * Any additional custom metadata
   */
  [key: string]: any;
}