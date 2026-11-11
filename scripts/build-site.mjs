import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const content = JSON.parse(await fs.readFile(new URL('materials/content.json', root), 'utf8'));
if (content.sections.map(section => section.id).join() !== 'abstract,introduction,method,results,discussion,conclusion') {
  throw new Error('Expected the six project sections in order');
}
await fs.rm(new URL('dist/', root), {recursive: true, force: true});
await fs.mkdir(new URL('dist/materials/', root), {recursive: true});
for (const file of ['index.html', 'styles.css', 'main.js', '.nojekyll', 'materials/content.json']) {
  await fs.copyFile(new URL(file, root), new URL(`dist/${file}`, root));
}
console.log('Built project page in dist/ (media deferred).');
