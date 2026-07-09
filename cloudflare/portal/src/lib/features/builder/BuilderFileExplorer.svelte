<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ChevronRight, ChevronDown, File, Folder } from 'lucide-svelte';

  let { files } = $props<{ files: Array<{ path: string; action: string; content?: string }> }>();
  const dispatch = createEventDispatcher();

  // Function to build a tree structure from a flat list of paths
  function buildTree(fileList: typeof files) {
    const root: any = { name: 'root', children: {}, isDir: true };

    fileList.forEach(file => {
      const parts = file.path.split('/').filter(p => p.length > 0);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            isDir: !isFile,
            children: {},
            fileData: isFile ? file : undefined
          };
        }
        current = current.children[part];
      }
    });

    return root;
  }

  const tree = $derived(buildTree(files));
</script>

<div class="file-explorer">
  {#if files.length === 0}
    <div class="empty">No files generated yet.</div>
  {:else}
    {@render TreeNode(tree)}
  {/if}
</div>

{#snippet TreeNode(node: any)}
  <div class="node">
    <div 
      class="node-content" 
      onclick={() => {
        if (node.isDir) {
          node.expanded = !node.expanded;
        } else if (node.fileData) {
          dispatch('selectFile', node.fileData);
        }
      }}
    >
      {#if node.isDir}
        {#if node.expanded}
          <ChevronDown class="w-4 h-4 mr-1" />
        {:else}
          <ChevronRight class="w-4 h-4 mr-1" />
        {/if}
        <Folder class="w-4 h-4 mr-2 text-accent-secondary" />
      {:else}
        <div class="w-4 h-4 mr-1"></div>
        <File class="w-4 h-4 mr-2 text-text-muted" />
      {/if}
      <span class="node-name">{node.name}</span>
    </div>

    {#if node.isDir && node.expanded}
      <div class="node-children">
        {#each Object.values(node.children) as child}
          {@render TreeNode(child)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .file-explorer {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
  }

  .empty {
    color: var(--text-muted);
    font-style: italic;
    padding: 1rem;
  }

  .node {
    user-select: none;
  }

  .node-content {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .node-content:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .node-name {
    color: var(--text-primary);
  }

  .node-children {
    padding-left: 1.25rem;
  }
</style>


