// Decode ahead of presentation. No decoder callback may publish a scene frame.
export function createSnapshotPipeline({streams,mapping,present,onDrop=()=>{},timeoutMs=2000}){
  const warmed=new Set(),warming=new Set();
  let busy=false,disposed=false;
  async function decode(stream,frame){
    const raw=mapping[stream.name]?.[frame];
    if(!Number.isInteger(raw))throw new Error(`Invalid sync frame: ${stream.name}/${frame}`);
    let timer;
    try{
      const result=await Promise.race([
        Promise.resolve().then(()=>stream.decode(raw)),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Frame decode timed out: ${stream.name}`)),timeoutMs);})
      ]);
      if(result!==raw)throw new Error(`Decoded frame mismatch: ${stream.name}, expected ${raw}, got ${result}`);
      return {name:stream.name,raw};
    }finally{clearTimeout(timer);}
  }
  function drop(stream,error){warmed.delete(stream);stream.reset?.();onDrop(stream.name,error);}
  return {
    get busy(){return busy;},
    async advance(frame){
      if(disposed||busy)return false;
      // Initial loading/first decode never holds the standalone animation.
      for(const stream of streams)if(stream.ready()&&!warmed.has(stream)&&!warming.has(stream)){
        warming.add(stream);
        decode(stream,frame).then(()=>{if(!disposed)warmed.add(stream);},error=>{if(!disposed)drop(stream,error);}).finally(()=>warming.delete(stream));
      }
      const joined=streams.filter(stream=>warmed.has(stream)&&stream.ready());
      if(!joined.length){present(frame,[]);return true;}
      busy=true;
      try{
        const results=await Promise.allSettled(joined.map(stream=>decode(stream,frame)));
        if(disposed)return false;
        const matched=[];
        results.forEach((result,i)=>{
          if(result.status==='fulfilled')matched.push(result.value);
          else drop(joined[i],result.reason);
        });
        // Pose, overlays and video textures become visible in one render.
        present(frame,matched);return true;
      }finally{busy=false;}
    },
    dispose(){disposed=true;streams.forEach(stream=>stream.reset?.());}
  };
}
