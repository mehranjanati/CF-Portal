<script lang="ts">
  import * as Diff from 'diff';

  let { oldCode = '', newCode = '', language = 'typescript' } = $props<{
    oldCode?: string;
    newCode?: string;
    language?: string;
  }>();

  let leftPane: HTMLElement | undefined = $state();
  let rightPane: HTMLElement | undefined = $state();

  function getDiffLines() {
    const diff = Diff.diffLines(oldCode, newCode);
    const leftLines: { content: string; type: 'unchanged' | 'removed' | 'empty'; num?: number }[] = [];
    const rightLines: { content: string; type: 'unchanged' | 'added' | 'empty'; num?: number }[] = [];

    let leftNum = 1;
    let rightNum = 1;

    diff.forEach((part) => {
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      if (part.added) {
        lines.forEach((line) => {
          leftLines.push({ content: '', type: 'empty' });
          rightLines.push({ content: line, type: 'added', num: rightNum++ });
        });
      } else if (part.removed) {
        lines.forEach((line) => {
          leftLines.push({ content: line, type: 'removed', num: leftNum++ });
          rightLines.push({ content: '', type: 'empty' });
        });
      } else {
        lines.forEach((line) => {
          leftLines.push({ content: line, type: 'unchanged', num: leftNum++ });
          rightLines.push({ content: line, type: 'unchanged', num: rightNum++ });
        });
      }
    });

    return { leftLines, rightLines };
  }

  const diffData = $derived(getDiffLines());

  $effect(() => {
    if (leftPane && rightPane) {
      const lp = leftPane;
      const rp = rightPane;

      const syncScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target === lp) {
          rp.scrollTop = lp.scrollTop;
          rp.scrollLeft = lp.scrollLeft;
        } else {
          lp.scrollTop = rp.scrollTop;
          lp.scrollLeft = rp.scrollLeft;
        }
      };

      lp.addEventListener('scroll', syncScroll);
      rp.addEventListener('scroll', syncScroll);

      return () => {
        lp.removeEventListener('scroll', syncScroll);
        rp.removeEventListener('scroll', syncScroll);
      };
    }
  });
</script>
<div class="diff-container">
  <div class="pane" bind:this={leftPane}>
    <div class="pane-header">Original</div>
    <div class="lines-container">
      {#each diffData.leftLines as line}
        <div class="line {line.type}">
          <span class="line-number">{line.num || ''}</span>
          <span class="line-content">{line.content}</span>
        </div>
      {/each}
    </div>
  </div>
  <div class="pane" bind:this={rightPane}>
    <div class="pane-header">Generated</div>
    <div class="lines-container">
      {#each diffData.rightLines as line}
        <div class="line {line.type}">
          <span class="line-number">{line.num || ''}</span>
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
    background-color: #0d1117;
  }

  .pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: auto;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
  }

  .pane-header {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #8b949e;
    background-color: #161b22;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .lines-container {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.8125rem;
    line-height: 1.5;
  }

  .line {
    display: flex;
    min-height: 1.25rem;
  }

  .line-number {
    width: 3.5rem;
    min-width: 3.5rem;
    text-align: right;
    padding-right: 1rem;
    color: #484f58;
    user-select: none;
    background-color: #0d1117;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .line-content {
    padding-left: 0.75rem;
    white-space: pre;
    color: #c9d1d9;
  }

  .line.removed {
    background-color: rgba(248, 81, 73, 0.15);
  }
  .line.removed .line-content {
    color: #ffa198;
  }

  .line.added {
    background-color: rgba(63, 185, 80, 0.15);
  }
  .line.added .line-content {
    color: #aff5b4;
  }

  .line.empty {
    background-color: rgba(255, 255, 255, 0.02);
  }
</style>
