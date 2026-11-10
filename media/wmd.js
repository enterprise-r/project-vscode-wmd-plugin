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
    button.setAttribute('aria-expanded', 'false');
    const open = (on) => {
      root.classList.toggle('open', on);
      button.setAttribute('aria-expanded', String(on));
    };
    const menu = document.createElement('ul');
    menu.setAttribute('role', 'menu');
    for (const t of TARGETS) {
      const li = document.createElement('li');
      li.textContent = t;
      li.dataset.target = t;
      li.setAttribute('role', 'menuitemradio');
      li.addEventListener('click', () => { setTarget(t); open(false); });
      menu.appendChild(li);
    }
    button.addEventListener('click', (e) => { e.stopPropagation(); open(!root.classList.contains('open')); });
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) open(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
    root.append(button, menu);
    document.body.appendChild(root);
    return root;
  };

  const setText = (node, value) => { if (node.textContent !== value) node.textContent = value; };

  // Selectors, in/out text, check and select bubbles, and the compact schema line.
  // Only hljs-* classes, so the preview's own theme supplies the colors.
  hljs.registerLanguage('wmd', (hljs) => ({
    name: 'Workcard',
    contains: [
      { className: 'string', begin: /"/, end: /"/, contains: [hljs.BACKSLASH_ESCAPE] },
      { className: 'number', begin: /-?\b\d+(?:\.\d+)?\b/, relevance: 0 },
      { className: 'literal', begin: /\b(?:true|false)\b/ },
      { className: 'type', begin: /\b(?:string|number|integer|boolean|object|array|null|any)\b/ },
      { className: 'variable', begin: /\.[A-Za-z_][A-Za-z0-9_]*/ },
      { className: 'attr', begin: /[A-Za-z_][A-Za-z0-9_]*(?=\s*:)/, relevance: 0 },
      { className: 'punctuation', begin: /[{}\[\]:,|*]/, relevance: 0 },
    ],
  }));

  // Highlight only when the text or the markup changed. apply() runs on every
  // DOM mutation, including the one this write causes, and a preview update
  // puts back the plain text. The markup is compared as read back, so an
  // unchanged node is never written again.
  const paint = (node, text, language) => {
    if (!text || (node.wmdText === text && node.innerHTML === node.wmdHtml)) return;
    let html;
    try { html = hljs.highlight(text, { language, ignoreIllegals: true }).value; }
    catch { return; }
    node.innerHTML = html;
    node.wmdText = text;
    node.wmdHtml = node.innerHTML;
  };
  // Leave a node alone when it holds markup we did not write (a fenced schema).
  const paintText = (node, language) => {
    if (node.children.length && node.innerHTML !== node.wmdHtml) return;
    paint(node, node.textContent, language);
  };
  const restore = (node) => {
    if (node.wmdText == null) return;
    if (node.innerHTML === node.wmdHtml) node.textContent = node.wmdText;
    delete node.wmdText;
    delete node.wmdHtml;
  };

  // The input name bubble, colored as a variable like .Name in a selector.
  const setName = (node, value) => {
    const v = node.firstElementChild;
    if (!value) { setText(node, ''); return; }
    if (node.childNodes.length === 1 && v?.className === 'hljs-variable' && v.textContent === value) return;
    const span = document.createElement('span');
    span.className = 'hljs-variable';
    span.textContent = value;
    node.replaceChildren(span);
  };

  // Mirror each input[record] as "Record: value" text for flow and receipt.
  const fill = (input, text) => {
    setText(text.children[0], `${input.getAttribute('record')}: `);
    setText(text.children[1], input.value);
    const name = text.children[2];
    setName(name, input.name || '');
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
      if (mirror.classList.contains('wmd-bad')) delete mirror.wmdText;
      else paint(mirror, text, 'wmd');
      paintText(schema, 'json');
    });
  };

  // The gonogo check and the record select as spans, highlighted like
  // <in>: an attr() label in a pseudo element cannot hold colored spans.
  const bubble = (host, cls, text) => {
    let span = host.wmdBubble;
    if (!span?.isConnected || span.parentNode !== host) {
      span = document.createElement('span');
      span.className = cls;
      host.wmdBubble = span;
    }
    if (host.lastChild !== span) host.append(span);
    paint(span, text, 'wmd');
  };
  const bubbles = () => {
    document.querySelectorAll('gonogo[check]').forEach((g) => bubble(g, 'wmd-check', g.getAttribute('check')));
    document.querySelectorAll('record[select]').forEach((r) => bubble(r, 'wmd-select', r.getAttribute('select')));
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
      document.querySelectorAll('.wmd-record, .wmd-schema, .wmd-check, .wmd-select').forEach((n) => n.remove());
      document.querySelectorAll('in, out, schema').forEach(restore);
      return;
    }
    records();
    schemas();
    bubbles();
    document.querySelectorAll('in, out').forEach((node) => paintText(node, 'wmd'));
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
