// Marks previews of .w.md files and adds a media target selector.
// The preview fills in and morphs its content after load, so everything
// is re-applied whenever the DOM changes or a new document is shown.
import ICON from '../images/icon.svg';
import hljs from './vendor/highlight.js';

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

  // Selectors, in/out, checks, status values and the compact schema line.
  // Only hljs-* classes, so the preview's own theme supplies the colours.
  hljs.registerLanguage('wmd', (hljs) => ({
    name: 'Workcard',
    contains: [
      { className: 'string', begin: /"/, end: /"/, contains: [hljs.BACKSLASH_ESCAPE] },
      { className: 'number', begin: /-?\b\d+(?:\.\d+)?\b/, relevance: 0 },
      { className: 'literal', begin: /\b(?:true|false)\b/ },
      { className: 'type', begin: /\b(?:string|number|integer|boolean|object|array|null|any)\b/ },
      { className: 'variable', begin: /\.[A-Za-z_][A-Za-z0-9_]*/ },
      { className: 'attr', begin: /[A-Za-z_][A-Za-z0-9_]*(?=\s*:)/, relevance: 0 },
      { className: 'keyword', begin: /\b[A-Z][A-Z0-9_]+\b/ },
      { className: 'punctuation', begin: /[{}\[\]:,|*]/, relevance: 0 },
    ],
  }));

  // Highlight only when the text changed. apply() runs on every DOM mutation,
  // including the one this write causes.
  const paint = (node, text, language) => {
    if (!text || node.wmdPainted === text) return;
    let html;
    try { html = hljs.highlight(text, { language, ignoreIllegals: true }).value; }
    catch { return; }
    node.innerHTML = html;
    node.wmdPainted = text;
  };
  // Leave a node alone when it already holds markup we did not write (a fenced schema).
  const paintText = (node, language) => {
    if (node.wmdPainted == null && node.children.length) return;
    paint(node, node.textContent, language);
  };
  const restore = (node) => {
    if (node.wmdPainted == null) return;
    node.textContent = node.wmdPainted;
    delete node.wmdPainted;
  };
  // Status, check and record select are CSS attr() text. A span can take hljs
  // classes; the pseudo stays for a copy of this stylesheet that has no script.
  const tag = (parent, className, text) => {
    let node = parent.querySelector(`:scope > .${className}`);
    if (!text) { node?.remove(); return; }
    if (!node) {
      node = document.createElement('span');
      node.className = className;
      parent.append(node);
    }
    paint(node, text, 'wmd');
  };

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
      if (mirror.classList.contains('wmd-bad')) delete mirror.wmdPainted;
      else paint(mirror, text, 'wmd');
      if (!schema.querySelector(':scope > pre')) paintText(schema, 'json');
    });
  };

  const keywords = () => {
    document.querySelectorAll('in, out').forEach((node) => paintText(node, 'wmd'));
    document.querySelectorAll(':is(card, form, go, nogo)[status]').forEach((node) =>
      tag(node, 'wmd-status', node.getAttribute('status')));
    document.querySelectorAll('gonogo[check]').forEach((node) =>
      tag(node, 'wmd-check', node.getAttribute('check')));
    document.querySelectorAll('record[select]').forEach((node) =>
      tag(node, 'wmd-select', node.getAttribute('select')));
    document.querySelectorAll('.wmd-status, .wmd-check, .wmd-select').forEach((node) => {
      const want = node.classList.contains('wmd-status') ? 'status'
        : node.classList.contains('wmd-check') ? 'check' : 'select';
      if (!node.parentElement?.hasAttribute(want)) node.remove();
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
    if (off) {
      document.querySelectorAll('.wmd-record, .wmd-schema, .wmd-status, .wmd-check, .wmd-select').forEach((n) => n.remove());
      document.querySelectorAll('in, out, schema').forEach(restore);
      return;
    }
    records();
    schemas();
    keywords();
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
