import * as ts from 'typescript';
import { Parser, ImportInfo } from './parser';

export class TypeScriptParser implements Parser {
  public supports(ext: string): boolean {
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext.toLowerCase());
  }

  public async parse(filePath: string, content: string): Promise<ImportInfo[]> {
    const imports: ImportInfo[] = [];
    
    try {
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const visit = (node: ts.Node) => {
        // Handle import declarations: import ... from 'path'
        if (ts.isImportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push({
              path: node.moduleSpecifier.text,
              start: node.moduleSpecifier.getStart(),
              end: node.moduleSpecifier.getEnd(),
              isDynamic: false,
              isTypeOnly: node.importClause?.isTypeOnly || false
            });
          }
        }
        
        // Handle export declarations: export ... from 'path'
        else if (ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            imports.push({
              path: node.moduleSpecifier.text,
              start: node.moduleSpecifier.getStart(),
              end: node.moduleSpecifier.getEnd(),
              isDynamic: false,
              isTypeOnly: node.isTypeOnly
            });
          }
        }
        
        // Handle dynamic imports: import('path')
        else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteral(arg)) {
            imports.push({
              path: arg.text,
              start: arg.getStart(),
              end: arg.getEnd(),
              isDynamic: true,
              isTypeOnly: false
            });
          }
        }
        
        // Handle require: require('path')
        else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteral(arg)) {
            imports.push({
              path: arg.text,
              start: arg.getStart(),
              end: arg.getEnd(),
              isDynamic: false,
              isTypeOnly: false
            });
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
    }

    return imports;
  }
}
