# TASK 11-01: File System Tool Implementation

## Objective
Implement a set of file system tools as part of the MCP-compatible tooling layer.

## Requirements
- Implement `readFile(path)`: Read content of a file.
- Implement `writeFile(path, content)`: Write or overwrite a file.
- Implement `listDirectory(path)`: List files and directories.
- Implement `deleteFile(path)`: Remove a file.
- Implement `moveFile(oldPath, newPath)`: Rename or move a file.
- **Security**: Ensure all operations are strictly scoped to the project directory to prevent directory traversal attacks.
- **Structure**: Implement using MCP tool definitions.

## Deliverables
- `src/lib/features/builder/tools/file-system.ts`
- Integration with the Tool Call Handler and MCP protocol.
