# TASK 12-01: Advanced Preview System (Frontend)

## Objective
Implement file exploration, code viewing, and side-by-side diffing in the UI to allow users to inspect and compare generated code.

## Requirements
- **File Explorer**: A tree view component to browse the files in the generated result.
- **Code Viewer**: A syntax-highlighted viewer to inspect file contents.
- **Diff View**: A side-by-side comparison view to see the differences between the current file and the generated version.
- **HTML/CSS Preview**: An iframe to render the generated UI for immediate visual feedback.
- **Integration**: Integrate these components into the `BuilderResultPanel`.

## Deliverables
- `src/lib/features/builder/BuilderFileExplorer.svelte`
- `src/lib/features/builder/BuilderCodeViewer.svelte`
- `src/lib/features/builder/BuilderDiffView.svelte`
- `src/lib/features/builder/BuilderResultPanel.svelte` (Integration)
