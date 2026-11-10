// Keep authored Mermaid sources so diagrams can follow the site's theme.
var diagrams = Array.from(document.querySelectorAll('.mermaid')).map(function (element) {
  var source = element.cloneNode(true);
  // Raw HTML diagrams contain actual BR elements; textContent alone loses them.
  source.querySelectorAll('br').forEach(function (br) { br.replaceWith(document.createTextNode('<br/>')); });
  return { element: element, source: source.textContent.trim() };
});
var renderQueue = Promise.resolve();
var mermaid;

function renderDiagrams() {
  renderQueue = renderQueue.then(async function () {
    var dark = document.documentElement.dataset.theme === 'dark';
    mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', securityLevel: 'strict', fontFamily: 'DM Sans, sans-serif' });
    for (var diagram of diagrams) {
      diagram.element.textContent = diagram.source;
      diagram.element.removeAttribute('data-processed');
      try {
        await mermaid.run({ nodes: [diagram.element] });
        diagram.element.setAttribute('aria-label', 'Article diagram');
      } catch (error) {
        diagram.element.textContent = diagram.source;
        diagram.element.removeAttribute('data-processed');
      }
    }
    window.dispatchEvent(new Event('resize'));
  }).catch(function () { /* The authored diagram text remains readable. */ });
  return renderQueue;
}

try {
  mermaid = (await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
  document.addEventListener('site:theme', renderDiagrams);
  await renderDiagrams();
} catch (error) {
  // CDN unavailable: leave the readable source, not an empty diagram or script error.
  diagrams.forEach(function (diagram) { diagram.element.classList.add('diagram-error'); });
}
