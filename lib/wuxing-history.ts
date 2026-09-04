/** Expand only the selected formula. Legacy manifests remain supported. */
export async function hydrateWuxingHistory(manifest: any, item: any) {
  if (manifest.historyFormat !== 'branch-gzip-v1') return item;
  if (!Array.isArray(item.historyRefs) || item.historyRefs.length !== item.branches.length) throw new Error('Invalid wuxing history references');
  const chunks = new Map<number, Promise<any>>();
  const histories = await Promise.all(item.historyRefs.map(async ([chunk, ref]: number[]) => {
    if (!chunks.has(chunk)) chunks.set(chunk, (async () => {
      const encoded = manifest.branchHistory[chunk];
      if (typeof encoded !== 'string') throw new Error('Missing wuxing branch history');
      const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text());
    })());
    const rows = (await chunks.get(chunk))[ref];
    if (!Array.isArray(rows) || rows.length !== manifest.draws.length - 1) throw new Error('Incomplete wuxing branch history');
    return rows;
  }));
  const history = manifest.draws.slice(1).map((target: any, index: number) => {
    const actual = target.numbers[6];
    const branches = item.branches.map((branch: any, branchIndex: number) => ({
      name: branch.name, calculation: histories[branchIndex][index][0], result: histories[branchIndex][index][1],
    }));
    return {
      sourcePeriod: Number(manifest.draws[index].period), targetPeriod: Number(target.period),
      branches, actualNumber: String(actual.number).padStart(2, '0'),
      actualAnimal: actual.animal || '', actualElement: actual.element || '',
      hit: branches.some((branch: any) => branch.result === (actual.element || '')),
    };
  });
  return {...item, history};
}
