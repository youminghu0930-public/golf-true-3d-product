export function frameAtTime(times,time){
  let low=0,high=times.length;
  while(low<high){const middle=(low+high)>>>1;if(times[middle]<=time+1e-7)low=middle+1;else high=middle;}
  return Math.max(0,low-1);
}
