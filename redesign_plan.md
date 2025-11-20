# CodeRefTracker Redesign Plan

## 1. Vision & Goals
**Goal**: Transform CodeRefTracker into the ultimate tool for visualizing and understanding project architecture and file dependencies.
**Core Philosophy**: "Clarity over Complexity". The tool should turn the "spaghetti" of code references into structured, actionable insights.

## 2. User Experience (UX) Redesign

### 2.1. Sidebar: "Dependency Explorer"
The sidebar should be the command center, not just a list.

*   **Smart Tree Items**:
    *   Format: `[Icon] Filename  [Incoming | Outgoing]`
    *   Example: `📄 auth.service.ts   [⬇️ 12 | ⬆️ 3]` (Used by 12, uses 3)
    *   **Visual Cues**:
        *   **Color Coding**:
            *   🔴 High Impact (Used by many files)
            *   🟡 Medium Impact
            *   ⚪ Low Impact
            *   ⚫ Orphan (Unused)
*   **Sort & Filter**:
    *   Sort by: "Most Referenced" (Impact), "Most Dependencies" (Complexity), Name.
    *   Filter: "Show Orphans Only", "Hide Node Modules".
*   **Context Menu**:
    *   "Focus in Graph": Open graph and zoom to this node.
    *   "Calculate Impact": Show what breaks if this file changes.

### 2.2. Webview: "Architecture Board"
Move away from the "Hairball" force-directed graph as the default.

*   **View Modes**:
    *   **Flow View (DAG)**: A hierarchical top-down or left-right layout. Best for understanding flow and architecture layers (e.g., UI -> Domain -> API).
    *   **Cluster View**: Group nodes by folder/module. Good for high-level overview.
    *   **Focus View**: When a node is selected, fade out everything else except immediate neighbors (1-level or 2-level depth).
*   **Interactive Details Panel** (Slide-over):
    *   Clicking a node opens a panel showing:
        *   **Metadata**: File size, last modified.
        *   **Used By**: List of files importing this. Click to navigate.
        *   **Dependencies**: List of files this imports.
*   **Search & Highlight**:
    *   Global search bar in webview to find and highlight nodes.

### 2.3. Editor Integration
*   **Status Bar**: When editing a file, show `$(references) Used by X files` in the status bar.
*   **Code Lens**: Add a file-level Code Lens at the top of the file: `referenced by 5 files`.

## 3. Technical Architecture Redesign

### 3.1. Analysis Engine: From Regex to AST
The current Regex approach is fragile. We will move to a hybrid robust approach.

*   **TypeScript/JavaScript**: Use `typescript` Compiler API (or `swc`/`oxc` for speed if needed, but `ts` is standard).
    *   **Benefit**: Accurate handling of `import type`, aliases (`@/components/...`), and re-exports (`export * from ...`).
    *   **Symbol Resolution**: Ability to track *which* export is used (future proofing).
*   **Vue/React**: Specialized parsers to extract script parts correctly.
*   **CSS/HTML**: Robust parsers (e.g., `postcss` for CSS).

### 3.2. Caching & Performance
*   **Incremental Analysis**: Only re-analyze changed files (using file watchers).
*   **Persistence**: Save the dependency graph to `workspaceState` or a local JSON file. On reload, load from cache first, then validate in background.
*   **Worker Threads**: Run heavy AST parsing in a Worker to avoid freezing the VS Code UI.

### 3.3. Graph Data Structure
*   **Nodes**: `id` (abs path), `label` (basename), `type` (ext), `metrics` (in/out degree).
*   **Edges**: `source`, `target`, `type` (import, dynamic import, require).
*   **Groups**: Folder-based grouping.

## 4. Implementation Roadmap

### Phase 1: Foundation & Accuracy (The "Brain")
1.  **Refactor `ReferenceAnalyzer`**: Implement `Parser` interface.
2.  **Implement `TypeScriptParser`**: Use TS Compiler API.
3.  **Support Aliases**: Read `tsconfig.json` to resolve paths like `@/utils`.

### Phase 2: Sidebar Experience (The "Controller")
1.  **Enhance `TreeProvider`**: Add badges and sort logic.
2.  **Implement "Orphan" detection**.

### Phase 3: Visualization Overhaul (The "Face")
1.  **Switch Layout Engine**: Implement DAG (Directed Acyclic Graph) layout (e.g., using `cytoscape-dagre` or `react-flow` with `dagre`).
2.  **Build Details Panel**: React component for node details.
3.  **Add "Focus Mode"**.

### Phase 4: Polish
1.  **Status Bar Integration**.
2.  **Caching System**.
