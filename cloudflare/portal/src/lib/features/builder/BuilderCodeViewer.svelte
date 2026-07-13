<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { javascript } from '@codemirror/lang-javascript';
  import { html } from '@codemirror/lang-html';
  import { css } from '@codemirror/lang-css';
  import { json } from '@codemirror/lang-json';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { EditorState } from '@codemirror/state';

  let { code = '', language = 'typescript' } = $props<{ code?: string; language?: string }>();

  let editorContainer: HTMLElement | undefined = $state();
  let view: EditorView | undefined;

  function getLanguageExtension(lang: string) {
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return javascript({ typescript: lang === 'typescript' });
      case 'html':
        return html();
      case 'css':
        return css();
      case 'json':
        return json();
      default:
        return javascript();
    }
  }

  function createEditor() {
    if (!editorContainer) return;

    if (view) {
      view.destroy();
    }

    const state = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        oneDark,
        EditorView.editable.of(false),
        EditorView.lineWrapping,
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" }
        })
      ]
    });

    view = new EditorView({
      state,
      parent: editorContainer
    });
  }

  $effect(() => {
    if (editorContainer && code !== undefined) {
      createEditor();
    }
  });

  onMount(() => {
    createEditor();
  });

  onDestroy(() => {
    if (view) view.destroy();
  });
</script>

<div class="code-container" bind:this={editorContainer}></div>

<style>
  .code-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: #1e1e1e;
    border-radius: 0.5rem;
  }

  :global(.cm-editor) {
    height: 100%;
    outline: none !important;
  }

  :global(.cm-scroller) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  }
</style>

