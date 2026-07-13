<script lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';

  let { currentVersion = 1, onversionchange }: { currentVersion: number; onversionchange: (v: number) => void } = $props();
  const versions = [1, 2, 3]; // Placeholder versions

  let selectedValue = $state(currentVersion.toString());

  $effect(() => {
    selectedValue = currentVersion.toString();
  });

  function handleValueChange(v: string) {
    onversionchange(parseInt(v));
  }
</script>

<Select value={selectedValue} onValueChange={handleValueChange}>
  <SelectTrigger class="h-7 px-3 text-xs font-medium bg-white/5 border-white/10 rounded-md text-text-primary hover:bg-white/10 transition-colors">
    <SelectValue placeholder="Version" />
  </SelectTrigger>
  <SelectContent class="bg-zinc-900 border-white/10 text-white">
    {#each versions as v}
      <SelectItem value={v.toString()} class="cursor-pointer hover:bg-white/10">
        Version {v}
      </SelectItem>
    {/each}
  </SelectContent>
</Select>
