export interface BrowserTools {
  getScreenshot(url: string): Promise<string>;
  getDOMSnapshot(url: string): Promise<string>;
  clickElement(selector: string): Promise<void>;
  typeText(selector: string, text: string): Promise<void>;
}

export class BrowserTools implements BrowserTools {
  async getScreenshot(url: string): Promise<string> {
    console.log(`[BrowserTool] Capturing screenshot of ${url}`);
    return 'base64-encoded-image-data';
  }

  async getDOMSnapshot(url: string): Promise<string> {
    console.log(`[BrowserTool] Getting DOM snapshot of ${url}`);
    return '<html>...</html>';
  }

  async clickElement(selector: string): Promise<void> {
    console.log(`[BrowserTool] Clicking element ${selector}`);
  }

  async typeText(selector: string, text: string): Promise<void> {
    console.log(`[BrowserTool] Typing "${text}" into ${selector}`);
  }
}
