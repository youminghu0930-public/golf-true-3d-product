// Serialize scene creation and discard stale selections. Only the latest metric
// keeps a live renderer, even when navigation changes during asset loading.
export function createSelectionLoader({load,onError=()=>{}}){
 let revision=0,pending,running,active,disposed=false;
 async function drain(){
  while(pending&&!disposed){
   const request=pending;pending=undefined;
   const current=()=>!disposed&&request.revision===revision;
   try{
    const controller=await load(request.value,current);
    if(current())active=controller;else controller?.dispose();
   }catch(error){if(current())onError(error,request.value);}
  }
 }
 return {
  select(value){
   if(disposed)return Promise.resolve();
   revision++;active?.dispose();active=undefined;pending={value,revision};
   if(!running)running=drain().finally(()=>{running=undefined;});
   return running;
  },
  dispose(){disposed=true;revision++;pending=undefined;active?.dispose();active=undefined;},
 };
}
