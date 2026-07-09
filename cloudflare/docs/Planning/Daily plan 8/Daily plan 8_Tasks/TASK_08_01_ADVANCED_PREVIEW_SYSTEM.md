# TASK 08-01: Advanced Preview System

## Objective
Allow users to browse, view, and compare generated code before applying it to their project.

## Requirements
- **File Explorer**: A tree view component to browse the files in the generated result.
- **Code Viewer**: A syntax-highlighted viewer (e.g., using Monaco Editor) to inspect file contents.
- **Diff View**: A side-by-side comparison view to see the differences between the current file and the generated version.
- **HTML/CSS Preview**: A sandboxed iframe to render the generated UI for immediate visual feedback.

## Deliverables
- `src/lib/features/builder/BuilderFileExplorer.svelte`
- `src/lib/features/builder/BuilderCodeViewer.svelte`
- `src/lib/features/builder/BuilderDiffView.svelte`
- `src/lib/features/builder/BuilderResultPanel.svelte` (Integration)
