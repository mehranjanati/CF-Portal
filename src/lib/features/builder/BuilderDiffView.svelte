<script lang="ts">
  import * as Diff from 'diff';

  let { oldCode = '', newCode = '', language = 'typescript' } = $props<{
    oldCode?: string;
    newCode?: string;
    language?: string;
  }>();

  let leftPane: HTMLElement | undefined = $state();
  let rightPane: HTMLElement | undefined = $state();

  // This is a simplified side-by-side diffing logic.
  // It aligns lines by inserting empty lines in the panes where content is missing.

  function getDiffLines() {
    const diff = Diff.diffLines(oldCode, newCode);
    const leftLines: { content: string; type: 'unchanged' | 'removed' | 'empty' }[] = [];
    const rightLines: { content: string; type: 'unchanged' | 'added' | 'empty' }[] = [];

    diff.forEach((part) => {
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      if (part.added) {
        lines.forEach((line) => {
          leftLines.push({ content: '', type: 'empty' });
          rightLines.push({ content: line, type: 'added' });
        });
      } else if (part.removed) {
        lines.forEach((line) => {
          leftLines.push({ content: line, type: 'removed' });
          rightLines.push({ content: '', type: 'empty' });
        });
      } else {
        lines.forEach((line) => {
          leftLines.push({ content: line, type: 'unchanged' });
          rightLines.push({ content: line, type: 'unchanged' });
        });
      }
    });

    return { leftLines, rightLines };
  }

  const { leftLines, rightLines } = $derived(getDiffLines());

  $effect(() => {
    if (leftPane && rightPane) {
      const syncScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target === leftPane) {
          rightPane.scrollTop = leftPane.scrollTop;
          rightPane.scrollLeft = leftPane.scrollLeft;
        } else {
          leftPane.scrollTop = rightPane.scrollTop;
          leftPane.scrollLeft = rightPane.scrollLeft;
        }
      };

      leftPane.addEventListener('scroll', syncScroll);
      rightPane.addEventListener('scroll', syncScroll);

      return () => {
        leftPane.removeEventListener('scroll', syncScroll);
        rightPane.removeEventListener('scroll', syncScroll);
      };
    }
  });
</script>

<div class="diff-container">
  <div class="pane" bind:this={leftPane}>
    <div class="pane-header">Original</div>
    <div class="lines-container">
      {#each leftLines as line}
        <div class="line {line.type}">
          <span class="line-number"></span>
          <span class="line-content">{line.content}</span>
        </div>
      {/each}
    </div>
  </div>
  <div class="pane" bind:this={rightPane}>
    <div class="pane-header">Generated</div>
    <div class="lines-container">
      {#each rightLines as line}
        <div class="line {line.type}">
          <span class="line-number"></span>
          <span class="line-content">{line.content}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .diff-container {
    display: flex;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-color: #000;
  }

  .pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .pane-header {
    padding: 0.25rem 0.5rem;
    font-size: 0.625rem;
    font-weight: bold;
    text-transform: uppercase;
    color: var(--text-muted);
    background-color: rgba(255, 255, 255, 0.05);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .lines-container {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .line {
    display: flex;
    min-height: 1.5rem;
  }

  .line-number {
    width: 3rem;
    text-align: right;
    padding-right: 0.5rem;
    color: var(--text-muted);
    user-select: none;
    background-color: rgba(0, 0, 0, 0.1);
  }

  .line-content {
    padding-left: 0.5rem;
    white-space: pre;
  }

  .line.removed {
    background-color: rgba(255, 0, 0, 0.15);
  }

  .line.added {
    background-color: rgba(0, 255, 0, 0.15);
  }

  .line.empty {
    background-color: transparent;
  }
</style>
