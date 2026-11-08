// Marks previews of .w.md files and adds a media target selector.
// The preview fills in and morphs its content after load, so everything
// is re-applied whenever the DOM changes or a new document is shown.
import ICON from '../images/icon.svg';

(() => {
  const ID = 'wmd-media';
  const TARGETS = ['full', 'screen', 'document', 'flow', 'receipt', 'disabled'];

  let source = (() => {
    const meta = document.getElementById('vscode-markdown-preview-data');
    try { return JSON.parse(meta.getAttribute('data-settings')).source || ''; }
    catch { return ''; }
  })();

  const isWmd = () => /\.w\.md$/i.test(decodeURIComponent(source.split(/[?#]/)[0]));

  let current = 'full';
  const setTarget = (target) => {
    current = target;
    for (const t of TARGETS) document.body.classList.toggle(`wmd-${t}`, t === target);
    sessionStorage.setItem(ID, target);
    document.querySelectorAll(`#${ID} li`).forEach((li) =>
      li.setAttribute('aria-checked', String(li.dataset.target === target)));
    const root = document.getElementById(ID);
    if (root) root.dataset.tip = `Work card view: ${target}`;
    schedule();
  };

  // The W icon: images/icon.svg, inlined at build time, so the preview needs no extra resources.
  const LOGO = ICON
    .replace(/<!--.*?-->/gs, '')
    .replace(/>\s+</g, '><')
    .replace(/\bid="([^"]+)"/g, 'id="wmd-$1"')
    .replace(/url\(#([^)]+)\)/g, 'url(#wmd-$1)')
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ');

  const selector = () => {
    let root = document.getElementById(ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ID;
    const button = document.createElement('button');
    button.innerHTML = LOGO;
    button.setAttribute('aria-label', 'Work card view');
    button.setAttribute('aria-haspopup', 'menu');
    const menu = document.createElement('ul');
    menu.setAttribute('role', 'menu');
    for (const t of TARGETS) {
      const li = document.createElement('li');
      li.textContent = t;
      li.dataset.target = t;
      li.setAttribute('role', 'menuitemradio');
      li.addEventListener('click', () => { setTarget(t); root.classList.remove('open'); });
      menu.appendChild(li);
    }
    button.addEventListener('click', (e) => { e.stopPropagation(); root.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) root.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') root.classList.remove('open'); });
    root.append(button, menu);
    document.body.appendChild(root);
    return root;
  };

  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

  // Mirror each input[record] as "Record: value" text for flow and receipt.
  const fill = (input, text) => {
    setText(text.children[0], `${input.getAttribute('record')}: `);
    setText(text.children[1], input.value);
    const name = text.children[2];
    setText(name, input.name || '');
    const label = input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    const tip = label ? label.textContent.trim() : '';
    if (name.title !== tip) name.title = tip;
  };
  const records = () => {
    document.querySelectorAll('input[record]').forEach((input) => {
      let text = input.nextElementSibling;
      if (!text?.classList.contains('wmd-record')) {
        text = document.createElement('span');
        text.className = 'wmd-record';
        const name = document.createElement('span');
        name.className = 'wmd-name';
        const key = document.createElement('span');
        key.className = 'wmd-key';
        text.append(key, document.createElement('span'), name);
        input.after(text);
      }
      if (!input.dataset.wmdBound) {
        input.dataset.wmdBound = '1';
        input.addEventListener('input', () => {
          const next = input.nextElementSibling;
          if (next?.classList.contains('wmd-record')) fill(input, next);
        });
      }
      fill(input, text);
    });
  };

  // A JSON Schema in compact form: {Azzurro: string*}, a star marks a required key.
  const compact = (s) => {
    if (!s || typeof s !== 'object') return 'any';
    for (const k of ['oneOf', 'anyOf']) if (Array.isArray(s[k])) return s[k].map(compact).join(' | ');
    if (Array.isArray(s.enum)) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
    if (s.properties) {
      const req = new Set(s.required || []);
      return `{${Object.entries(s.properties).map(([k, v]) => `${k}: ${compact(v)}${req.has(k) ? '*' : ''}`).join(', ')}}`;
    }
    if (s.type === 'array') return `[${compact(s.items)}]`;
    return [].concat(s.type || 'any').join('|');
  };

  // Mirror each <schema> as a compact line right after it.
  const schemas = () => {
    document.querySelectorAll('schema').forEach((schema) => {
      const at = schema;
      let mirror = schema.wmdMirror;
      if (!mirror?.isConnected) {
        mirror = document.createElement('div');
        mirror.className = 'wmd-schema';
        schema.wmdMirror = mirror;
      }
      if (at.nextElementSibling !== mirror) at.after(mirror);
      let text, tip;
      try {
        const json = JSON.parse(schema.textContent);
        text = compact(json);
        tip = JSON.stringify(json, null, 2);
        mirror.classList.remove('wmd-bad');
      } catch (e) {
        text = 'invalid JSON schema';
        tip = e.message;
        mirror.classList.add('wmd-bad');
      }
      setText(mirror, text);
      if (mirror.title !== tip) mirror.title = tip;
    });
  };

  const apply = () => {
    if (!isWmd()) { document.body.classList.remove('wmd'); document.getElementById(ID)?.remove(); return; }
    if (!document.getElementById(ID)) {
      selector();
      const saved = sessionStorage.getItem(ID);
      setTarget(TARGETS.includes(saved) ? saved : 'full');
    }
    // Disabled: drop the mark and everything added, leaving the plain Markdown preview
    const off = current === 'disabled';
    document.body.classList.toggle('wmd', !off);
    if (off) { document.querySelectorAll('.wmd-record, .wmd-schema').forEach((n) => n.remove()); return; }
    records();
    schemas();
  };

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; apply(); });
  };

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'updateContent' && e.data.source) source = e.data.source;
    schedule();
  });
  window.addEventListener('vscode.markdown.updateContent', schedule);
  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    apply();
  };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', start);
  else start();
})();
