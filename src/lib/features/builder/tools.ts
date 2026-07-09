import { registerTool } from './tool-handler';
import { builderStore } from '../../stores/builder.svelte';

/**
 * Registers all available builder tools.
 * This should be called during application initialization.
 */
export function initializeBuilderTools() {
  registerTool('select_file', async (args) => {
    if (!args.path) return;
    builderStore.applicationState.selectedFilePath = args.path;
  });

  registerTool('set_editor_content', async (args) => {
    if (typeof args.content !== 'string') return;
    builderStore.applicationState.editorContent = args.content;
  });

  registerTool('notify', async (args) => {
    console.log('[Tool: notify]', args.message);
    // In a real app, this might show a toast notification
  });
}
