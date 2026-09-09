/* Atlas Command: next-version workspace module. Developer preview only.
   No remote services, permissions, site edits, or changes to the submitted package.
   Native asset integration is intentionally deferred to a new reviewed build. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.AtlasLayouts = api; api.mount(root); }
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const panels = ['catalog', 'layers', 'dossier', 'plan'];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function dimensions(w, h) {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 950 || h < 400)
      throw new Error('Layout presets need a window at least 950 pixels wide with 400 pixels of workspace height.');
  }
  function scope(w) { return w >= 1700 ? 'ultrawide' : 'desktop'; }
  function fit(layout, w, h) {
    dimensions(w, h);
    const out = {};
    for (const id of panels) {
      const p = layout && layout[id];
      if (!p || !['x', 'y', 'w', 'h'].every(k => Number.isFinite(p[k])))
        throw new Error('Saved layout has an invalid panel: ' + id);
      const width = clamp(p.w, 250, w - 32), height = clamp(p.h, 120, h - 80);
      const collapsed = p.collapsed === true;
      out[id] = { x: clamp(p.x, 16, w - width - 16),
        y: clamp(p.y, 16, h - (collapsed ? 47 : height) - 32),
        w: width, h: height, collapsed };
    }
    return out;
  }
  function preset(name, w, h) {
    dimensions(w, h);
    if (!['explore', 'research', 'expedition'].includes(name)) throw new Error('Unknown workspace preset.');
    const left = clamp(Math.round(w * .215), 250, 340);
    const right = clamp(Math.round(w * .24), 290, 410);
    const top = 16, gap = 12, usable = h - 64;
    const leftTop = Math.round((usable - gap) * .61);
    const rightTop = Math.round((usable - gap) * .64);
    const box = (x, y, width, height, collapsed = false) => ({x, y, w: width, h: height, collapsed});
    const layout = {
      catalog: box(16, top, left, leftTop),
      layers: box(16, top + leftTop + gap, left, usable - leftTop - gap),
      dossier: box(w - right - 16, top, right, rightTop),
      plan: box(w - right - 16, top + rightTop + gap, right, usable - rightTop - gap)
    };
    if (name === 'research') {
      layout.dossier = box(w - right - 16, top, right, usable - gap - 47);
      layout.plan = box(w - right - 16, top + usable - 47, right, rightTop, true);
    }
    if (name === 'expedition') {
      layout.plan = box(w - right - 16, top, right, usable - gap - 47);
      layout.dossier = box(w - right - 16, top + usable - 47, right, rightTop, true);
    }
    return fit(layout, w, h);
  }
  function mount(win) {
    if (!win.document) return;
    const doc = win.document;
    function ready() {
      // Existing narrow integration surface; no application state is sent externally.
      const app = win.AtlasTest;
      if (!app || doc.getElementById('boot')) return false;
      if (doc.getElementById('workspacePresets')) return true;
      const workspace = doc.getElementById('workspace');
      const trigger = doc.createElement('button');
      trigger.id = 'workspacePresets'; trigger.textContent = 'Workspaces';
      trigger.setAttribute('aria-haspopup', 'dialog'); trigger.title = 'Choose or restore a panel layout';
      doc.querySelector('.top-actions').prepend(trigger);
      const style = doc.createElement('style');
      style.textContent = '#workspacePresets{min-height:44px;color:var(--cyan)}' +
        '#workspaceChooser{width:min(700px,94vw);padding:26px;background:#0c1822;color:var(--text);border:1px solid var(--line);border-radius:14px}' +
        '#workspaceChooser::backdrop{background:#0009}#workspaceChooser h2{font-size:25px;margin:8px 0}' +
        '#workspaceChooser p{line-height:1.6;color:var(--muted)}#workspaceChooser .layout-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}' +
        '#workspaceChooser .layout-choice{text-align:left;min-height:108px;padding:16px}#workspaceChooser strong{display:block;color:var(--cyan);margin-bottom:10px}' +
        '#workspaceChooser small{display:block;line-height:1.5;color:var(--muted)}#workspaceChooser .layout-actions{display:flex;gap:9px;flex-wrap:wrap}' +
        '#workspaceChooser button{min-height:44px}#workspaceChooser [data-close]{float:right}' +
        '#layoutNotice{position:fixed;left:50%;bottom:140px;transform:translateX(-50%);background:#142b36;color:#ecf0ee;border:1px solid #5b8491;border-radius:8px;padding:14px 20px;z-index:80;max-width:90vw}' +
        '@media(max-width:1250px){#workspacePresets{font-size:11px;padding:5px 8px}.top-actions .local-badge{display:none}}' +
        '@media(max-width:650px){#workspaceChooser .layout-grid{grid-template-columns:1fr}.topbar{flex-wrap:wrap}}';
      doc.head.append(style);
      const dialog = doc.createElement('dialog'); dialog.id = 'workspaceChooser';
      dialog.setAttribute('aria-labelledby', 'layoutTitle');
      dialog.innerHTML = '<button data-close aria-label="Close workspace chooser">Close</button>' +
        '<span class="eyebrow">NEXT VERSION · DEVELOPMENT PREVIEW</span><h2 id="layoutTitle">Make room for discovery.</h2>' +
        '<p>Choose a layout, then drag and resize panels to make it yours. Your research and notes are not changed.</p>' +
        '<div class="layout-grid"><button class="layout-choice" data-preset="explore"><strong>Explore</strong><small>Balanced space for sites, layers, and your mission.</small></button>' +
        '<button class="layout-choice" data-preset="research"><strong>Research</strong><small>Give site intelligence more room. Fold the expedition desk.</small></button>' +
        '<button class="layout-choice" data-preset="expedition"><strong>Expedition</strong><small>Expand planning. Keep site intelligence one click away.</small></button></div>' +
        '<div class="layout-actions"><button data-save>Save my layout</button><button data-restore>Restore my layout</button><button data-focus>Globe focus</button></div>' +
        '<p id="layoutStatus" role="status" aria-live="polite"></p><small>Saved separately for desktop and ultrawide windows. Layout controls only; no live data or new scientific model.</small>';
      doc.body.append(dialog);
      const notice = doc.createElement('div'); notice.id = 'layoutNotice'; notice.hidden = true;
      notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite'); doc.body.append(notice);
      let noticeTimer, busy = false;
      const size = () => ({w: workspace.clientWidth, h: workspace.clientHeight});
      const key = () => scope(win.innerWidth);
      function snapshot() {
        const b = workspace.getBoundingClientRect(), result = {};
        for (const id of panels) {
          const panel = doc.querySelector('[data-panel="' + id + '"]');
          const rect = panel.getBoundingClientRect();
          if (!rect.width || !rect.height) throw new Error('Show panels before saving a custom layout.');
          const old = app.state.layout[key()] && app.state.layout[key()][id];
          result[id] = {x: rect.left - b.left, y: rect.top - b.top, w: rect.width,
            h: panel.classList.contains('collapsed') ? (old && old.h || 300) : rect.height,
            collapsed: panel.classList.contains('collapsed')};
        }
        return result;
      }
      function announce(text) {
        notice.textContent = text; notice.hidden = false;
        win.clearTimeout(noticeTimer); noticeTimer = win.setTimeout(() => { notice.hidden = true; }, 4000);
      }
      function syncExpandLabels() {
        for (const id of panels) {
          const panel = doc.querySelector('[data-panel="' + id + '"]');
          const folded = panel.classList.contains('collapsed'), button = panel.querySelector('.collapse');
          button.textContent = folded ? '+' : '−';
          button.setAttribute('aria-expanded', String(!folded));
        }
      }
      function apply(raw) {
        const {w, h} = size(), next = fit(raw, w, h);
        if (doc.body.classList.contains('globe-focus')) doc.getElementById('focusBtn').click();
        app.state.layout[key()] = next;
        for (const id of panels) {
          const p = next[id], node = doc.querySelector('[data-panel="' + id + '"]');
          Object.assign(node.style, {left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px', right: 'auto'});
          node.classList.toggle('collapsed', p.collapsed);
        }
        syncExpandLabels(); app.globe.resize();
      }
      function saved() { return app.state.settings.savedWorkspaceLayouts && app.state.settings.savedWorkspaceLayouts[key()]; }
      function refresh() {
        const {w, h} = size(), enabled = w >= 950 && h >= 400;
        dialog.querySelectorAll('[data-preset], [data-save]').forEach(b => { b.disabled = busy || !enabled; });
        dialog.querySelector('[data-save]').disabled ||= doc.body.classList.contains('globe-focus');
        dialog.querySelector('[data-restore]').disabled = busy || !enabled || !saved();
        dialog.querySelector('[data-save]').textContent = saved() ? 'Update my saved layout' : 'Save my layout';
        dialog.querySelector('[data-focus]').textContent = doc.body.classList.contains('globe-focus') ? 'Show panels' : 'Globe focus';
        dialog.querySelector('[data-focus]').disabled = busy;
        dialog.querySelector('[data-close]').disabled = busy;
        dialog.querySelector('#layoutStatus').textContent = !enabled ? 'Compact view uses scrolling panels. Widen the window for presets.' :
          (saved() ? 'Your saved ' + key() + ' layout is available.' : 'Your current layout is preserved automatically before the first preset.');
      }
      async function run(action) {
        if (busy) return; busy = true; refresh();
        let failure = '';
        try { await action(); }
        catch (error) { failure = 'Layout was not saved: ' + error.message; announce('Layout save needs attention. Export your workspace from Settings.'); }
        finally { busy = false; refresh(); if (failure) dialog.querySelector('#layoutStatus').textContent = failure; }
      }
      dialog.querySelectorAll('[data-preset]').forEach(button => { button.onclick = () => run(async () => {
        if (!saved()) {
          if (doc.body.classList.contains('globe-focus')) doc.getElementById('focusBtn').click();
          app.state.settings.savedWorkspaceLayouts ||= {};
          app.state.settings.savedWorkspaceLayouts[key()] = snapshot();
        }
        const {w, h} = size(); apply(preset(button.dataset.preset, w, h));
        await app.flush(); dialog.close(); announce(({explore:'Explore', research:'Research', expedition:'Expedition'})[button.dataset.preset] + ' layout saved locally.');
      }); });
      dialog.querySelector('[data-save]').onclick = () => run(async () => {
        const {w, h} = size(); const copy = fit(snapshot(), w, h);
        app.state.settings.savedWorkspaceLayouts ||= {};
        app.state.settings.savedWorkspaceLayouts[key()] = copy;
        await app.flush(); dialog.close(); announce('Your ' + key() + ' layout is saved.');
      });
      dialog.querySelector('[data-restore]').onclick = () => run(async () => {
        if (!saved()) throw new Error('No saved layout for this window size.');
        apply(saved()); await app.flush(); dialog.close(); announce('Your saved layout is restored.');
      });
      dialog.querySelector('[data-focus]').onclick = () => { dialog.close(); doc.getElementById('focusBtn').click(); };
      dialog.querySelector('[data-close]').onclick = () => dialog.close();
      dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
      trigger.onclick = () => { refresh(); dialog.showModal(); };
      win.addEventListener('resize', () => { if (dialog.open && !busy) refresh(); });
      doc.querySelectorAll('.collapse').forEach(button => button.addEventListener('click', syncExpandLabels));
      syncExpandLabels(); return true;
    }
    if (ready()) return;
    const observer = new win.MutationObserver(() => { if (ready()) { observer.disconnect(); win.clearTimeout(timeout); } });
    observer.observe(doc.body, {childList: true});
    const timeout = win.setTimeout(() => observer.disconnect(), 20000);
  }
  return Object.freeze({preset, fit, scope, mount});
});