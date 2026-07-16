import { FileSystemTools } from './file-system';
import fs from 'fs/promises';
import path from 'path';

async function runTest() {
  console.log('🚀 Starting test: FileSystemTools');

  const testDir = path.join(process.cwd(), 'test-fs-dir');
  const fsTools = new FileSystemTools(testDir);

  // Cleanup previous test dir
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (e) {}

  try {
    // 1. Test writeFile and readFile
    console.log('   Step 1: Testing writeFile and readFile...');
    const filePath = 'test.txt';
    const content = 'Hello, World!';
    await fsTools.writeFile(filePath, content);
    const readContent = await fsTools.readFile(filePath);
    if (readContent !== content) throw new Error(`Expected "${content}", got "${readContent}"`);
    console.log('   ✅ writeFile and readFile passed!');

    // 2. Test listDirectory
    console.log('   Step 2: Testing listDirectory...');
    const files = await fsTools.listDirectory('.');
    if (!files.includes(filePath)) throw new Error(`Expected files to include "${filePath}"`);
    console.log('   ✅ listDirectory passed!');

    // 3. Test moveFile
    console.log('   Step 3: Testing moveFile...');
    const newPath = 'moved_test.txt';
    await fsTools.moveFile(filePath, newPath);
    const movedContent = await fsTools.readFile(newPath);
    if (movedContent !== content) throw new Error(`Expected content to persist after move`);
    const stillExists = await fsTools.readFile(filePath).catch(() => null);
    if (stillExists !== null) throw new Error(`Old file should not exist after move`);
    console.log('   ✅ moveFile passed!');

    // 4. Test deleteFile
    console.log('   Step 4: Testing deleteFile...');
    await fsTools.deleteFile(newPath);
    const afterDelete = await fsTools.readFile(newPath).catch(() => null);
    if (afterDelete !== null) throw new Error(`File should be deleted`);
    console.log('   ✅ deleteFile passed!');

    // 5. Test Security (Path Traversal)
    console.log('   Step 5: Testing security (path traversal)...');
    try {
      await fsTools.readFile('../package.json');
      throw new Error('Should have thrown error for path traversal');
    } catch (err: any) {
      if (!err.message.includes('Security Error')) throw err;
      console.log('   ✅ path traversal protection passed!');
    }

    console.log('🎉 All FileSystemTools tests passed successfully!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

runTest();
