# TASK 19_05: Browser Tool Wrapper

## هدف
Wrap کردن Browser automation tool برای استفاده در CopilotKit agents.

## فایل‌های مورد نیاز
- `cloudflare/platform-api/src/agents/tools/BrowserTool.ts` (CREATE)
- `cloudflare/platform-api/src/agents/tools/BrowserClient.ts` (CREATE - wrapper)

## پیاده‌سازی

### Step 1: Create BrowserClient.ts

```typescript
// cloudflare/platform-api/src/agents/tools/BrowserClient.ts

export interface BrowserOptions {
  headless: boolean;
  timeout: number;
  viewport: { width: number; height: number };
}

export interface BrowserSession {
  id: string;
  url: string;
  title: string;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  selector?: string;
}

export class BrowserClient {
  private options: BrowserOptions;
  
  constructor(options: Partial<BrowserOptions> = {}) {
    this.options = {
      headless: options.headless ?? true,
      timeout: options.timeout || 10000,
      viewport: options.viewport || { width: 1280, height: 720 }
    };
  }
  
  // Navigate to URL
  async navigate(url: string): Promise<BrowserSession> {
    // Mock implementation - in production use Puppeteer or Playwright
    return {
      id: this.generateSessionId(),
      url,
      title: 'Page Title'
    };
  }
  
  // Take screenshot
  async screenshot(url: string, options: ScreenshotOptions = {}): Promise<Buffer> {
    // Mock implementation
    return Buffer.from('mock-screenshot');
  }
  
  // Click element
  async click(url: string, selector: string): Promise<void> {
    // Mock implementation
    console.log(`[Browser] Clicking ${selector} on ${url}`);
  }
  
  // Fill input field
  async fill(url: string, selector: string, value: string): Promise<void> {
    // Mock implementation
    console.log(`[Browser] Filling ${selector} with ${value}`);
  }
  
  // Get page content
  async getContent(url: string): Promise<string> {
    // Mock implementation
    return '<html>Mock page content</html>';
  }
  
  // Execute JavaScript
  async evaluate(url: string, script: string): Promise<any> {
    // Mock implementation
    return { result: 'mock-result' };
  }
  
  // Close session
  async close(sessionId: string): Promise<void> {
    // Mock implementation
    console.log(`[Browser] Closing session ${sessionId}`);
  }
  
  // Helper to generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Step 2: Create BrowserTool.ts

```typescript
// cloudflare/platform-api/src/agents/tools/BrowserTool.ts

import { BaseTool } from './BaseTool';
import { ToolContext, ToolResult } from './types';
import { z } from 'zod';
import { BrowserClient, ScreenshotOptions } from './BrowserClient';

export class BrowserTool extends BaseTool {
  name = 'browser_automation';
  description = 'Control browser: navigate, screenshot, click, fill forms, extract content';
  
  parameters = z.object({
    operation: z.enum(['navigate', 'screenshot', 'click', 'fill', 'get_content', 'evaluate'])
      .describe('Browser operation to perform'),
    
    // Target
    url: z.string().url().describe('Target URL'),
    
    // Operation-specific parameters
    selector: z.string().optional().describe('CSS selector (for click, fill)'),
    value: z.string().optional().describe('Value to fill (for fill)'),
    script: z.string().optional().describe('JavaScript to execute (for evaluate)'),
    
    // Screenshot options
    fullPage: z.boolean().optional().describe('Take full page screenshot'),
    selectorForScreenshot: z.string().optional().describe('Take screenshot of specific element')
  });
  
  returns = z.object({
    success: z.boolean(),
    data: z.any(),
    sessionId: z.string().optional(),
    message: z.string().optional()
  });
  
  private browserClient: BrowserClient;
  
  constructor() {
    super();
    this.browserClient = new BrowserClient({
      headless: true,
      timeout: 10000,
      viewport: { width: 1280, height: 720 }
    });
    this.timeout = 10000; // 10s for browser operations
    this.retries = 2; // Fewer retries for browser
  }
  
  protected async doExecute(params: any, context: ToolContext): Promise<any> {
    const { operation } = params;
    
    try {
      switch (operation) {
        case 'navigate':
          return await this.navigate(params, context);
        
        case 'screenshot':
          return await this.screenshot(params, context);
        
        case 'click':
          return await this.click(params, context);
        
        case 'fill':
          return await this.fill(params, context);
        
        case 'get_content':
          return await this.getContent(params, context);
        
        case 'evaluate':
          return await this.evaluate(params, context);
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
    } catch (error: any) {
      // Browser errors are usually not retryable
      if (error.message?.includes('timeout')) {
        throw new Error(`Browser operation timed out: ${error.message}`);
      }
      
      if (error.message?.includes('selector')) {
        throw new Error(`Element not found: ${error.message}`);
      }
      
      throw new Error(`Browser error: ${error.message}`);
    }
  }
  
  private async navigate(params: any, context: ToolContext): Promise<any> {
    const { url } = params;
    
    if (!url) {
      throw new Error('url is required for navigate operation');
    }
    
    const session = await this.browserClient.navigate(url);
    
    return {
      success: true,
      data: session,
      sessionId: session.id,
      message: `Navigated to ${url}`
    };
  }
  
  private async screenshot(params: any, context: ToolContext): Promise<any> {
    const { url, fullPage, selectorForScreenshot } = params;
    
    if (!url) {
      throw new Error('url is required for screenshot operation');
    }
    
    const options: ScreenshotOptions = {};
    if (fullPage !== undefined) options.fullPage = fullPage;
    if (selectorForScreenshot) options.selector = selectorForScreenshot;
    
    const screenshot = await this.browserClient.screenshot(url, options);
    
    // Convert to base64 for transmission
    const base64Screenshot = screenshot.toString('base64');
    
    return {
      success: true,
      data: {
        screenshot: base64Screenshot,
        format: 'png',
        size: screenshot.length
      },
      message: 'Screenshot captured'
    };
  }
  
  private async click(params: any, context: ToolContext): Promise<any> {
    const { url, selector } = params;
    
    if (!url || !selector) {
      throw new Error('url and selector are required for click operation');
    }
    
    await this.browserClient.click(url, selector);
    
    return {
      success: true,
      message: `Clicked element ${selector}`
    };
  }
  
  private async fill(params: any, context: ToolContext): Promise<any> {
    const { url, selector, value } = params;
    
    if (!url || !selector || value === undefined) {
      throw new Error('url, selector, and value are required for fill operation');
    }
    
    await this.browserClient.fill(url, selector, value);
    
    return {
      success: true,
      message: `Filled ${selector} with value`
    };
  }
  
  private async getContent(params: any, context: ToolContext): Promise<any> {
    const { url } = params;
    
    if (!url) {
      throw new Error('url is required for get_content operation');
    }
    
    const content = await this.browserClient.getContent(url);
    
    return {
      success: true,
      data: {
        content,
        length: content.length
      },
      message: 'Page content retrieved'
    };
  }
  
  private async evaluate(params: any, context: ToolContext): Promise<any> {
    const { url, script } = params;
    
    if (!url || !script) {
      throw new Error('url and script are required for evaluate operation');
    }
    
    const result = await this.browserClient.evaluate(url, script);
    
    return {
      success: true,
      data: result,
      message: 'JavaScript executed'
    };
  }
}
```

### Step 3: Registration

```typescript
// In platform-api initialization

const browserTool = new BrowserTool();
ToolRegistry.getInstance().register(browserTool);
```

### Step 4: Usage Example

```typescript
// Navigate to URL
const result = await registry.get('browser_automation')?.execute(
  {
    operation: 'navigate',
    url: 'https://example.com'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);

// Take screenshot
const result = await registry.get('browser_automation')?.execute(
  {
    operation: 'screenshot',
    url: 'https://example.com',
    fullPage: true
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);

// Fill form
const result = await registry.get('browser_automation')?.execute(
  {
    operation: 'fill',
    url: 'https://example.com/form',
    selector: '#email',
    value: 'user@example.com'
  },
  { tenantId: '1', userId: '1', requestId: '123' }
);
```

## خروجی قابل مشاهده
- BrowserTool کلاس ایجاد می‌شود
- 6 عملیات browser automation پشتیبانی می‌شود
- Navigate, screenshot, click, fill, get_content, evaluate
- Timeout handling (10s default)
- Error handling for selectors

## معیارهای موفقیت
- [ ] BrowserTool compile می‌شود
- [ ] navigate کار می‌کند
- [ ] screenshot کار می‌کند
- [ ] click کار می‌کند
- [ ] fill کار می‌کند
- [ ] get_content کار می‌کند
- [ ] evaluate کار می‌کند
- [ ] Timeouts enforced
- [ ] Errors handled gracefully