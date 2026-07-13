<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw, Globe, Lock, ChevronLeft, ChevronRight } from 'lucide-svelte';

  let { files } = $props<{ files: Array<{ path: string; action: string; content?: string }> }>();
  let iframe: HTMLIFrameElement | undefined = $state();
  let srcDoc = $state('');
  let isRefreshing = $state(false);

  function toBase64(str: string) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  $effect(() => {
    const indexFile = files.find((f: any) => f.path.endsWith('index.html'));
    if (indexFile && indexFile.content) {
      let html = indexFile.content;

      // Replace relative CSS links
      html = html.replace(/<link.*href=["'](.*\.css)["'].*>/g, (match: string, href: string) => {
        const cssFile = files.find((f: any) => f.path.endsWith(href));
        if (cssFile && cssFile.content) {
          const base64 = toBase64(cssFile.content);
          return "<link rel=\"stylesheet\" href=\"data:text/css;base64," + base64 + "\">";
        }
        return match;
      });

      // Replace relative JS links
      html = html.replace(/<script.*src=["'](.*\.js)["'].*><\/script>/g, (match: string, src: string) => {
        const jsFile = files.find((f: any) => f.path.endsWith(src));
        if (jsFile && jsFile.content) {
          const base64 = toBase64(jsFile.content);
          return "<sc" + "ript src=\"data:text/javascript;base64," + base64 + "\"></scr" + "ipt>";
        }
        return match;
      });

      srcDoc = html;
    }
  });

  async function refresh() {
    if (iframe) {
      iframe.srcdoc = srcDoc;
    }
  }
</script>
<div class="browser-container">
  <div class="browser-toolbar">
    <div class="window-controls">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
    </div>
    <div class="nav-controls">
      <ChevronLeft class="nav-icon" size={16} />
      <ChevronRight class="nav-icon" size={16} />
      <RefreshCw 
        class="nav-icon {isRefreshing ? 'animate-spin' : ''}" 
        size={16} 
        onclick={refresh} 
      />
    </div>
    <div class="address-bar">
      <Lock class="address-icon" size={12} />
      <span class="url">preview://generated-site/index.html</span>
    </div>
    <div class="toolbar-spacer"></div>
    <div class="action-buttons">
      <button class="toolbar-btn" title="Open in new tab">
        <Globe class="toolbar-icon" size={16} />
      </button>
    </div>
  </div>
  
  <div class="iframe-wrapper">
    {#if srcDoc}
      <iframe bind:this={iframe} title="Preview" srcdoc={srcDoc}></iframe>
    {:else}
      <div class="empty">
        <div class="empty-icon">
          <Globe size={48} />
        </div>
        <p>No index.html found to preview.</p>
        <p class="text-xs text-muted">Ensure your project contains an index.html file.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .browser-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: #1e1e1e;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .browser-toolbar {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: #2d2d2d;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    gap: 1rem;
  }

  .window-controls {
    display: flex;
    gap: 0.5rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  .red { background-color: #ff5f56; }
  .yellow { background-color: #ffbd2e; }
  .green { background-color: #27c93f; }

  .nav-controls {
    display: flex;
    gap: 0.5rem;
    color: #8b949e;
  }

  .nav-icon {
    cursor: pointer;
    transition: color 0.2s;
  }
  .nav-icon:hover {
    color: white;
  }

  .address-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.375rem;
    padding: 0.25rem 0.75rem;
    color: #8b949e;
    font-size: 0.75rem;
  }

  .address-icon {
    flex-shrink: 0;
  }

  .url {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .toolbar-btn {
    background: none;
    border: none;
    color: #8b949e;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }
  .toolbar-btn:hover {
    color: white;
  }

  .iframe-wrapper {
    flex: 1;
    position: relative;
    background-color: white;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #8b949e;
    gap: 1rem;
  }

  .empty-icon {
    opacity: 0.2;
  }

  .empty p {
    margin: 0;
    font-size: 0.875rem;
  }

  .text-xs {
    font-size: 0.75rem;
  }
</style>
