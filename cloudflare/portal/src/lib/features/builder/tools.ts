import { registerTool } from './tool-handler';
import { builderStore } from '../../stores/builder.svelte';
import { BrowserTools } from './tools/browser';

/**
 * Registers all available builder tools.
 * This should be called during application initialization.
 */
export function initializeBuilderTools() {
  const browser = new BrowserTools();

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

  registerTool('get_screenshot', async (args) => {
    await browser.getScreenshot(args.url);
  });

  registerTool('get_dom_snapshot', async (args) => {
    await browser.getDOMSnapshot(args.url);
  });

  registerTool('click_element', async (args) => {
    await browser.clickElement(args.selector);
  });

  registerTool('type_text', async (args) => {
    await browser.typeText(args.selector, args.text);
  });
}
