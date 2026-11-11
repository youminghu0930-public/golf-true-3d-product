import {make} from './dom.js';

export function createSnapshotHeader({title,description}){
 const header=make('header',undefined,'snapshot-card-header');
 header.append(make('h4',title,'snapshot-sample-title'));
 if(description)header.append(make('p',description,'snapshot-metric-description'));
 return header;
}
