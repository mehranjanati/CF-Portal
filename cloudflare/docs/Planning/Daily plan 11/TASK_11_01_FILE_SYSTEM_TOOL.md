# TASK 11-01: File System Tool Implementation

## Objective
Implement a set of file system tools that allow the agent to perform standard file operations.

## Requirements
- Implement `readFile(path)`: Read content of a file.
- Implement `writeFile(path, content)`: Write or overwrite a file.
- Implement `listDirectory(path)`: List files and directories.
- Implement `deleteFile(path)`: Remove a file.
- Implement `moveFile(oldPath, newPath)`: Rename or move a file.
- Ensure all operations are secure and respect project boundaries.

## Deliverables
- `src/lib/features/builder/tools/file-system.ts`
- Integration with the Tool Call Handler.
