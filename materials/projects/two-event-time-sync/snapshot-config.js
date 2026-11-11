// Object enumeration reorders integer-like IDs (e.g. "12") ahead of "00".
// Read top-level keys from the JSON text so the carousel follows file order.
export function parseSnapshotEntries(source) {
  const config=JSON.parse(source);
  if(config===null||Array.isArray(config)||typeof config!=='object')throw new Error('Snapshot configuration must be an object');
  const entries=[],seen=new Set();
  const tokens=/"(?:\\.|[^"\\])*"|[{}\[\]]/g;
  let depth=0;
  for(const token of source.matchAll(tokens)){
    const value=token[0];
    if(value==='{'||value==='['){depth++;continue;}
    if(value==='}'||value===']'){depth--;continue;}
    if(depth!==1||!/^\s*:/.test(source.slice(token.index+value.length)))continue;
    const id=JSON.parse(value);
    if(seen.has(id))throw new Error(`Duplicate snapshot ID: ${id}`);
    seen.add(id);entries.push([id,config[id]]);
  }
  return entries;
}
