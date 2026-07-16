<script lang="ts">
  import { onMount } from 'svelte';

  let { files } = $props<{ files: Array<{ path: string; action: string; content?: string }> }>();
  let previewIframe: HTMLIFrameElement | undefined = $state();
  let srcDoc = $state('');

  function toBase64(str: string) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  $effect(() => {
    const indexFile = files.find(f => f.path.endsWith('index.html'));
    if (indexFile && indexFile.content) {
      let html = indexFile.content;

      // Replace relative CSS links
      html = html.replace(/<link.*href=["'](.*\.css)["'].*>/g, (match, href) => {
        const cssFile = files.find(f => f.path.endsWith(href));
        if (cssFile && cssFile.content) {
          const base64 = toBase64(cssFile.content);
          return `<link rel="stylesheet" href="data:text/css;base64,${base64}">`;
        }
        return match;
      });

      // Replace relative JS links
      html = html.replace(/<script.*src=["'](.*\.js)["'].*><\/script>/g, (match, src) => {
        const jsFile = files.find(f => f.path.endsWith(src));
        if (jsFile && jsFile.content) {
          const base64 = toBase64(jsFile.content);
          return `<script src="data:text/javascript;base64,${base64}"></script>`;
        }
        return match;
      });

      srcDoc = html;
    }
  });

  let baseUrl = $state<string | null>(null);

  function refresh() {
    if (previewIframe) {
      previewIframe.srcdoc = '';
      void previewIframe.offsetWidth;
      previewIframe.srcdoc = srcDoc;
    }
  }
</script>

<div class="preview-container">
  <div class="toolbar">
    <button onclick={refresh}>Refresh</button>
  </div>
  <div class="iframe-wrapper">
    {#if srcDoc && !baseUrl}
      {#key srcDoc}
        <iframe
          bind:this={previewIframe}
          title="Preview"
          srcdoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
      {/key}
    {:else if baseUrl}
      <iframe
        title="Preview"
        src={baseUrl}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        referrerpolicy="no-referrer"
      />
    {:else}
      <div class="empty">No index.html found to preview.</div>
    {/if}
  </div>
</div>

<style>
  .preview-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: #000;
  }

  .toolbar {
    padding: 0.25rem 0.5rem;
    background-color: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    gap: 0.5rem;
  }

  button {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-primary);
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .iframe-wrapper {
    flex: 1;
    position: relative;
    background-color: #fff;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    font-style: italic;
  }
</style>