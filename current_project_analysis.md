# CodeRefTracker Project Analysis

## 1. Project Overview
**CodeRefTracker** is a VS Code extension designed to analyze and visualize code reference relationships within a workspace. It aims to help developers understand dependencies and code structure through a sidebar tree view and a rich visualization webview.

## 2. Current Implementation Status
Based on the codebase analysis, the following features are implemented:

*   **Reference Analysis**:
    *   Supports JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`), Vue (`.vue`), CSS/SCSS/Less, and HTML.
    *   Uses Regex-based parsing to identify imports and references.
    *   Resolves relative paths and handles common file extensions.
    *   Maintains an in-memory cache of file content and modification times.
*   **Sidebar Tree View**:
    *   `FileReferenceTreeProvider` implements the VS Code Tree Data Provider API.
    *   Displays files and folders.
    *   (Note: The implementation of reference counts in the tree view needs verification in `fileReferenceTreeProvider.ts`, but the structure is there).
*   **Visualization Webview**:
    *   React-based application hosted in a VS Code Webview.
    *   Uses `react-force-graph` (implied by `package.json` dependencies like `d3`, `cytoscape`, `vis-network`, though `App.tsx` imports `GraphView` which likely uses one of these).
    *   Supports different view modes: Network, Tree, Matrix (implied by `ViewMode` type).
    *   Interactive features: Node selection, zooming, panning.
*   **Extension Integration**:
    *   Commands to refresh references and show the graph.
    *   File watchers to trigger re-analysis on file changes (create, change, delete).

## 3. Codebase Structure

```
/
├── src/
│   ├── core/                 # Core logic (likely empty or minimal currently)
│   ├── ui/                   # UI components (likely empty or minimal currently)
│   ├── utils/                # Utility functions
│   ├── webview/              # React application for the visualization
│   │   ├── components/       # React components (GraphView, Sidebar, Toolbar)
│   │   ├── styles/           # CSS styles
│   │   ├── App.tsx           # Main React component
│   │   └── index.tsx         # Entry point
│   ├── commands.ts           # Command registration
│   ├── extension.ts          # Extension entry point
│   ├── fileReferenceTreeProvider.ts # Sidebar tree view provider
│   ├── logger.ts             # Logging utility
│   ├── referenceAnalyzer.ts  # Core analysis logic
│   └── webviewProvider.ts    # Webview data provider
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config
└── webpack.config.js         # Webpack config for the webview
```

## 4. Key Components Analysis

### ReferenceAnalyzer (`src/referenceAnalyzer.ts`)
*   **Logic**: Iterates through workspace files, reads content, and applies regex patterns to find imports (e.g., `import ... from ...`, `require(...)`, `@import`, `<script src=...>`).
*   **Strengths**: Simple, fast for small/medium projects, covers multiple languages.
*   **Weaknesses**:
    *   **Fragile**: Regex can be fooled by comments, strings, or complex syntax.
    *   **Path Resolution**: Basic implementation. May not support `tsconfig.json` paths (aliases) or `node_modules` resolution fully.
    *   **Scope**: Does not understand code symbols (classes, functions), only file-level dependencies.

### Webview Application (`src/webview/`)
*   **Tech Stack**: React, Tailwind CSS.
*   **Communication**: Uses `vscode.postMessage` and `window.addEventListener('message')` for bidirectional communication with the extension.
*   **State Management**: React `useState` and `useEffect` hooks.
*   **Visualization**: The `GraphView` component (not fully inspected but likely complex) handles the rendering of the reference graph.

### Extension Entry (`src/extension.ts`)
*   **Lifecycle**: Activates components, registers commands, and sets up file watchers.
*   **Reactivity**: Reacts to file events to keep the analysis up-to-date.

## 5. Dependencies
*   **Core**: `vscode`, `typescript`
*   **UI/Webview**: `react`, `react-dom`, `tailwindcss`
*   **Visualization**: `d3`, `cytoscape`, `vis-network`, `react-force-graph` (The project seems to have multiple visualization libraries installed, possibly experimenting with different ones).
*   **Utils**: `uuid`, `glob`, `ignore`.

## 6. Recommendations

1.  **Improve Analysis Accuracy**:
    *   Consider using AST (Abstract Syntax Tree) parsers (e.g., `typescript` compiler API, `babel-parser`) instead of Regex for more accurate import extraction.
    *   Implement support for `tsconfig.json` path aliases to correctly resolve imports in modern TS projects.

2.  **Enhance Visualization**:
    *   Consolidate visualization libraries. Using `d3`, `cytoscape`, and `vis-network` together bloats the extension. Choose one (e.g., `react-force-graph` or `cytoscape`) and optimize it.
    *   Add more interactive filters (e.g., filter by folder, filter by reference count).

3.  **Performance**:
    *   For very large workspaces, the initial analysis might block the extension host. Consider offloading analysis to a worker thread or making it more asynchronous/incremental.

4.  **Feature Completeness**:
    *   Ensure the "File Tree View" actually displays reference counts as described in the design.
    *   Implement the "Heatmap" and "Matrix" views if they are not fully functional yet.
