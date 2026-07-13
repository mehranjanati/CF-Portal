<script lang="ts">
  import { ChevronRight, ChevronDown, File, Folder } from 'lucide-svelte';

  type FileItem = { path: string; action: string; content?: string };

  type FileNode = {
    name: string;
    path: string;
    isDir: boolean;
    children?: Record<string, FileNode>;
    fileData?: FileItem;
  };

  let { files, onselectfile } = $props<{ 
    files: FileItem[];
    onselectfile: (file: FileItem) => void;
  }>();

  // Track expanded directories by their path
  let expandedPaths = $state<Set<string>>(new Set());

  function toggleExpand(path: string) {
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path);
    } else {
      expandedPaths.add(path);
    }
  }

  // Function to build a tree structure from a flat list of paths
  function buildTree(fileList: FileItem[]): FileNode {
    const root: FileNode = { name: 'root', children: {}, isDir: true, path: '' };

    fileList.forEach(file => {
      const parts = file.path.split('/').filter(p => p.length > 0);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        if (!current.children?.[part]) {
          current.children![part] = {
            name: part,
            path: currentPath,
            isDir: !isFile,
            children: {},
            fileData: isFile ? file : undefined
          };
        }
        current = current.children![part];
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

{#snippet TreeNode(node: FileNode)}
  <div class="node">
    <div 
      class="node-content" 
      role="button"
      tabindex="0"
      onclick={() => {
        if (node.isDir) {
          toggleExpand(node.path);
        } else if (node.fileData) {
          onselectfile(node.fileData);
        }
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (node.isDir) {
            toggleExpand(node.path);
          } else if (node.fileData) {
            onselectfile(node.fileData);
          }
        }
      }}
    >
      {#if node.isDir}
        {#if expandedPaths.has(node.path)}
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

    {#if node.isDir && expandedPaths.has(node.path)}
      <div class="node-children">
        {#each Object.values(node.children ?? {}).sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        }) as child}
          {@render TreeNode(child)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .file-explorer {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.75rem;
    color: #c9d1d9;
  }

  .empty {
    color: #8b949e;
    font-style: italic;
    padding: 1.5rem;
    text-align: center;
    font-size: 0.8125rem;
  }

  .node {
    user-select: none;
  }

  .node-content {
    display: flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    border-radius: 0.25rem;
    margin: 0 0.25rem;
    transition: background-color 0.1s ease;
  }

  .node-content:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .node-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #c9d1d9;
  }

  .node-children {
    padding-left: 0.75rem;
    border-left: 1px solid rgba(255, 255, 255, 0.05);
    margin-left: 1.125rem;
  }

  :global(.node-content svg) {
    flex-shrink: 0;
  }
</style>
