/* All displayed copy comes from materials/content.json. */
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function renderPage() {
  const response = await fetch('materials/content.json');
  if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
  const { page, sections } = await response.json();
  document.title = page.title;
  document.querySelector('meta[name="description"]').content = page.description;

  const header = element('header');
  const navigationToggle = element('button', undefined, 'navigation-toggle');
  navigationToggle.setAttribute('aria-label', page.navigationToggle);
  navigationToggle.title = page.navigationToggle;
  const menuIcon = element('span', undefined, 'menu-icon');
  menuIcon.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) menuIcon.append(element('span'));
  navigationToggle.append(menuIcon);
  navigationToggle.type = 'button';
  const mobileNavigation = matchMedia('(max-width: 1000px)');
  const backdrop = element('div', undefined, 'navigation-backdrop');
  backdrop.setAttribute('aria-hidden', 'true');
  const setNavigation = expanded => {
    navigationToggle.setAttribute('aria-expanded', String(expanded));
    header.dataset.expanded = String(expanded);
    const menu = header.querySelector('nav');
    if (menu) menu.inert = !expanded;
    backdrop.dataset.visible = String(expanded && mobileNavigation.matches);
  };
  setNavigation(!mobileNavigation.matches);
  mobileNavigation.addEventListener('change', () => setNavigation(!mobileNavigation.matches));
  backdrop.addEventListener('click', () => setNavigation(false));
  navigationToggle.setAttribute('aria-controls', 'section-navigation');
  const nav = element('nav');
  nav.id = 'section-navigation';
  nav.inert = navigationToggle.getAttribute('aria-expanded') !== 'true';
  nav.setAttribute('aria-label', page.navigationLabel);
  for (const section of sections) {
    const link = element('a', section.title);
    link.href = `#${section.id}`;
    link.addEventListener('click', () => { if (mobileNavigation.matches) setNavigation(false); });
    nav.append(link);
  }
  if (page.mainPage) {
    const link = element('a', page.mainPage.label, 'return-main-page');
    try {
      const url = new URL(page.mainPage.url);
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Unsupported link');
      link.href = url.href;
    } catch { link.setAttribute('aria-disabled', 'true'); }
    nav.append(link);
  }
  navigationToggle.onclick = () => setNavigation(navigationToggle.getAttribute('aria-expanded') !== 'true');
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setNavigation(false); navigationToggle.focus(); }
  });
  header.append(nav);

  const main = element('main');
  const hero = element('div', undefined, 'hero');
  hero.append(element('p', page.eyebrow, 'eyebrow'), element('h1', page.title));
  if(page.subtitle)hero.append(element('p',page.subtitle,'hero-subtitle'));
  main.append(hero);
  if (page.role) main.append(element('p', page.role, 'hero-role'));

  for (const content of sections) {
    const section = element('section');
    section.id = content.id;
    const heading = element('h2', content.title);
    heading.id = `${content.id}-heading`;
    section.setAttribute('aria-labelledby', heading.id);
    const body = element('div', undefined, 'section-body');
    for (const paragraph of content.paragraphs || []) body.append(element('p', paragraph));
    if (content.items) {
      const list = element('ul', undefined, 'scan-list');
      for (const item of content.items) list.append(scanItem(item));
      body.append(list);
    }
    for (const subsection of content.subsections || []) {
      const group = element('div', undefined, 'content-subsection');
      group.append(element('h3', subsection.title));
      for (const paragraph of subsection.paragraphs || []) group.append(element('p', paragraph));
      if (subsection.items) {
        const list = element('ul', undefined, 'scan-list');
        for (const item of subsection.items) list.append(scanItem(item));
        group.append(list);
      }
      body.append(group);
    }
    if (content.metrics || content.metricGroups) {
      const metricGroups = element('div', undefined, 'metric-groups');
      for (const category of content.metricGroups || [{ metrics: content.metrics }]) {
        const group = element('div', undefined, 'metric-group');
        if (category.title) group.append(element('h3', category.title, 'metric-category'));
        const metrics = element('dl', undefined, 'metrics');
        for (const metric of category.metrics) {
          const item = element('div');
          item.append(element('dt', metric.label), element('dd', metric.value));
          metrics.append(item);
        }
        group.append(metrics); metricGroups.append(group);
      }
      body.append(metricGroups);
    }
    if(content.note) body.append(element('p',content.note,'section-note'));
    section.append(heading, body);
    main.append(section);
  }
  document.querySelector('#app').replaceChildren(backdrop, navigationToggle, header, main, element('footer', page.footer));
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();

}

function scanItem(text) {
  const item=element('li');
  const split=text.indexOf(':');
  if(split>0) item.append(element('strong',text.slice(0,split+1)),document.createTextNode(text.slice(split+1)));
  else item.textContent=text;
  return item;
}

renderPage().catch(error => {
  // Keep operational diagnostics out of the centrally managed project copy.
  console.error(error);
  document.querySelector('#app').textContent = 'Unable to load page content. Please reload.';
});
