// Read boundaries from the scheduled plan so tags follow authored durations.
export function playbackStages(plan){
 const find=id=>plan.segments.find(segment=>segment.id===id);
 const preview=find('result-preview'),intro=find('intro'),review=find('finish'),end=find('end-stay');
 return [
  preview&&{key:'start',label:'Start',start:preview.start,end:preview.end},
  intro&&{key:'explain',label:'Explain',start:intro.start,end:review?.start??plan.duration},
  review&&{key:'review',label:'Review',start:review.start,end:end?.start??plan.duration},
  end&&{key:'end',label:'End',start:end.start,end:end.end},
 ].filter(stage=>stage&&stage.end>stage.start);
}
