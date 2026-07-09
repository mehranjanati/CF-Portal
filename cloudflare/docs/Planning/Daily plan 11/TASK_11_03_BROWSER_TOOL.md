# TASK 11-03: Browser / Preview Tool

## Objective
Implement a tool that allows the agent to "see" and interact with the web application it is building.

## Requirements
- Implement `getScreenshot(url)`: Capture a screenshot of the rendered application.
- Implement `getDOMSnapshot(url)`: Get a simplified version of the DOM for structural analysis.
- Implement `clickElement(selector)` and `typeText(selector, text)`: Basic interaction capabilities.
- Integrate with a headless browser (e.s. Playwright or Puppeteer) running in a sandboxed environment.

## Deliverables
- `src/lib/features/builder/tools/browser.ts`
- Integration with the Tool Call Handler.
