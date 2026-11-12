import test from 'node:test';
import assert from 'node:assert/strict';
import {rotationPlotChannels} from '../rotation-plot.js';
test('Plot includes all four geometric channels in frame order and preserves missing samples',()=>{
 const metrics={metrics:{geometric:{shoulder_turn_tilt:{turn:[1,2],tilt:[3,4]},hip_turn_tilt:{turn:[5,6],tilt:[7,8]}}}};
 const channels=rotationPlotChannels(metrics,3);
 assert.deepEqual(channels.map(c=>c.key),['shoulder-turn','shoulder-tilt','hip-turn','hip-tilt']);
 assert.deepEqual(channels.map(c=>c.values),[[1,2,null],[3,4,null],[5,6,null],[7,8,null]]);
 assert.equal(channels[0].color,channels[1].color);assert.notEqual(channels[0].color,channels[2].color);
 assert.deepEqual(channels.map(c=>c.dashed),[false,true,false,true]);
});
