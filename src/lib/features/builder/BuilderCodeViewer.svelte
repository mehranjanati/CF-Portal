<script lang="ts">
  import { onMount } from 'svelte';
  import Prism from 'prismjs';
  import 'prismjs/themes/prism-tomorrow.css';

  // Import languages
  import 'prismjs/components/prism-javascript';
  import 'prismjs/components/prism-typescript';
  import 'prismjs/components/prism-css';
  import 'prismjs/components/prism-markup'; // for HTML
  import 'prismjs/components/prism-json';

  let { code = '', language = 'typescript' } = $props<{ code?: string; language?: string }>();

  let codeElement: HTMLElement | undefined = $state();

  $effect(() => {
    if (codeElement) {
      Prism.highlightElement(codeElement);
    }
  });
</script>

<div class="code-container">
  <pre class="code-pre"><code bind:this={codeElement} class="language-{language}">{code}</code></pre>
</div>

<style>
  .code-container {
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: #1e1e1e;
    border-radius: 0.5rem;
    padding: 1rem;
  }

  .code-pre {
    margin: 0;
    color: #d4d4d4;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
</style>

