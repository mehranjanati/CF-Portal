export interface BrowserToolParams {
  url: string;
  width?: number;
  height?: number;
}

export class BrowserTool {
  name = 'browser';

  async execute(params: BrowserToolParams): Promise<string> {
    // Simplified browser screenshot - in production, use Puppeteer or similar
    const { url, width = 1280, height = 720 } = params;
    return `Screenshot of ${url} (${width}x${height})`;
  }
}