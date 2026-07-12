import { Project, SyntaxKind, Node } from "ts-morph";

export function extractImportantLogic(fileContent: string, fileName: string): string {
  // Only process ts/tsx/js/jsx files, otherwise return first 100 lines
  if (!fileName.match(/\.(ts|tsx|js|jsx)$/)) {
    return fileContent.split('\n').slice(0, 100).join('\n') + '\n// [Truncated]';
  }

  try {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(fileName, fileContent);
    const header = `// Extracted logic from ${fileName}\n\n`;
    let extracted = header;

    // Extract classes
    const classes = sourceFile.getClasses();
    for (const cls of classes) {
      extracted += `class ${cls.getName() || 'Anonymous'} {\n`;
      const methods = cls.getMethods();
      for (const method of methods) {
         extracted += `  ${method.getText()}\n`;
      }
      extracted += `}\n\n`;
    }

    // Extract functions
    const functions = sourceFile.getFunctions();
    for (const func of functions) {
      extracted += `${func.getText()}\n\n`;
    }

    // Extract arrow functions declared in variable statements (e.g. const myFunc = () => {})
    const variables = sourceFile.getVariableDeclarations();
    for (const variable of variables) {
      const initializer = variable.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) {
        extracted += `${variable.getStatement()?.getText()}\n\n`;
      }
    }

    // If nothing was extracted other than the header, fallback to truncated file content
    if (extracted.trim().length <= header.trim().length) {
      return fileContent.split('\n').slice(0, 150).join('\n') + '\n// [Truncated full content]';
    }

    return extracted;
  } catch (error) {
    console.error(`Error parsing ${fileName} with ts-morph:`, error);
    return fileContent.split('\n').slice(0, 100).join('\n') + '\n// [Truncated due to parse error]';
  }
}
