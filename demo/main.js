import { Starfield } from '../src/index.js';
import { renderControls, rgbToHex, hexToRgb, configurationCode, createUpdateQueue } from './controls.js';
import { createFrameMeter } from './frame-meter.js';

const $ = selector => document.querySelector(selector);
const descriptions = {
  default: 'The original galaxy, with every effect in play.',
  'deep-space': 'A quieter sky. Sparse stars, slower motion, cool light.',
  'milky-way': 'A dense band of light, shaped by the galaxy distribution.',
  constellation: 'Follow the connections. A network of stars near your pointer.',
};
renderControls($('#setting-groups'));

function mount(saved) {
  const lifetime = new AbortController();
  const signal = lifetime.signal;
  const field = new Starfield('#starfield', saved?.config);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 800px)');
  const panel = $('#controls');
  const form = $('#settings');
  const dialog = $('#code-dialog');
  let playing = saved?.playing ?? true;
  let selectedPreset = saved?.preset ?? 'default';
  let modified = saved?.modified ?? false;
  let presetFingerprint = saved?.presetFingerprint ?? JSON.stringify(field.config);
  let codeSource = null;
  let opener = null;
  const meter = createFrameMeter(requestAnimationFrame, cancelAnimationFrame, value => { $('#fps').textContent = value ?? '—'; });
  const on = (target, event, callback, options = {}) => target.addEventListener(event, callback, { ...options, signal });
  function notify(message = '') { $('#notice').textContent = message; $('#notice').hidden = !message; }

  function colors() {
    const container = $('#colors');
    const values = field.config.stars.colors;
    if (container.children.length !== values.length) {
      container.replaceChildren(...values.map((value, index) => {
        const item = document.createElement('div'); item.className = 'color-item';
        const input = document.createElement('input'); input.type = 'color'; input.dataset.color = index;
        input.setAttribute('aria-label', `Star color ${index + 1}`);
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-color';
        remove.dataset.removeColor = index; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove star color ${index + 1}`);
        item.append(input, remove); return item;
      }));
    }
    values.forEach((value, index) => {
      container.children[index].querySelector('input').value = rgbToHex(value);
      container.children[index].querySelector('button').disabled = values.length === 1;
    });
    $('#add-color').disabled = values.length >= 8;
  }
  function syncControls() {
    for (const input of form.querySelectorAll('[data-section]')) {
      const value = field.config[input.dataset.section][input.dataset.key];
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value === null ? 'native' : value;
    }
    colors();
    $('#preset').value = selectedPreset;
    $('#custom-label').hidden = !modified;
    $('#preset-description').textContent = descriptions[selectedPreset];
    $('#star-count').textContent = `${field.config.stars.count} stars`;
  }
  function syncPlayback() {
    const reduced = motion.matches && field.config.accessibility.respectReducedMotion;
    const active = playing && !document.hidden && !reduced;
    $('#playback').textContent = playing ? 'Pause' : 'Resume';
    $('#playback-status').textContent = !playing ? 'Paused' : document.hidden ? 'Background' : reduced ? 'Reduced motion' : 'Playing';
    $('#status-dot').classList.toggle('inactive', !active);
    if (active) meter.start(); else meter.stop();
  }
  const updates = createUpdateQueue(patch => {
    if (!form.checkValidity()) { notify('Check the highlighted number fields before applying changes.'); return false; }
    try {
      field.updateConfig(patch);
      modified = JSON.stringify(field.config) !== presetFingerprint;
      syncControls(); syncPlayback(); notify();
      return true;
    } catch (error) { notify(error.message); return false; }
  });
  function changeSetting(event) {
    const input = event.target;
    if (input.matches('[data-color]')) {
      updates.queue('stars', 'colors', [...$('#colors').querySelectorAll('input')].map(color => hexToRgb(color.value)));
    } else if (input.matches('[data-section]')) {
      if (!input.checkValidity()) { notify('Enter a number within the displayed control range.'); return; }
      const { section, key } = input.dataset;
      const value = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT'
        ? key === 'maxDpr' ? input.value === 'native' ? null : Number(input.value) : input.value
        : Number(input.value);
      for (const partner of form.querySelectorAll(`[data-section="${section}"][data-key="${key}"]`)) {
        if (partner !== input && partner.type !== 'checkbox') partner.value = input.value;
      }
      updates.queue(section, key, value);
    } else return;
    if (event.type === 'change') updates.flush();
  }
  on(form, 'input', changeSetting);
  on(form, 'change', changeSetting);
  on(form, 'submit', event => { event.preventDefault(); updates.flush(); });
  on($('#colors'), 'click', event => {
    const button = event.target.closest('[data-remove-color]');
    if (!button || !updates.flush()) return;
    const values = [...field.config.stars.colors];
    if (values.length === 1) return;
    values.splice(Number(button.dataset.removeColor), 1);
    updates.queue('stars', 'colors', values); updates.flush();
    $('#add-color').focus();
  });
  on($('#add-color'), 'click', () => {
    if (!updates.flush() || field.config.stars.colors.length >= 8) return;
    updates.queue('stars', 'colors', [...field.config.stars.colors, '255, 255, 255']); updates.flush();
    $('#colors').lastElementChild.querySelector('input').focus();
  });
  function selectPreset(name) {
    updates.clear();
    field.updateConfig({ preset: name });
    selectedPreset = name; modified = false;
    presetFingerprint = JSON.stringify(field.config);
    syncControls(); syncPlayback(); notify();
  }
  on($('#preset'), 'change', event => selectPreset(event.target.value));
  on($('#reset'), 'click', () => selectPreset('default'));
  on($('#playback'), 'click', () => {
    playing = !playing;
    if (playing) field.start(); else field.stop();
    syncPlayback();
  });
  function showPanel(open, focus = false) {
    panel.hidden = !open;
    $('#toggle-controls').setAttribute('aria-expanded', String(open));
    if (focus) (open ? $('#preset') : $('#toggle-controls')).focus();
  }
  on($('#toggle-controls'), 'click', () => showPanel(panel.hidden, true));
  on($('#close-controls'), 'click', () => showPanel(false, true));
  on(document, 'keydown', event => {
    if (event.key === 'Escape' && !dialog.open && !panel.hidden) { event.preventDefault(); showPanel(false, true); }
  });
  on(compact, 'change', () => showPanel(!compact.matches));
  // UI pointer movement must not also move the starfield's pointer underneath it.
  for (const element of document.querySelectorAll('[data-ui]')) {
    on(element, 'mousemove', event => event.stopPropagation());
    on(element, 'touchmove', event => event.stopPropagation(), { passive: true });
  }
  function updateCode() {
    $('#code-output').value = configurationCode(codeSource, $('#code-format').value);
    $('#copy-status').textContent = '';
  }
  function openCode(event) {
    if (!form.checkValidity() || !updates.flush()) { notify('Correct the settings before copying your configuration.'); showPanel(true, true); return; }
    codeSource = field.config;
    opener = event.currentTarget;
    updateCode(); dialog.showModal();
  }
  on($('#open-code'), 'click', openCode);
  on($('#panel-code'), 'click', openCode);
  on($('#close-code'), 'click', () => dialog.close());
  on(dialog, 'close', () => { if (opener?.isConnected) opener.focus(); });
  on($('#code-format'), 'change', updateCode);
  on($('#copy-code'), 'click', async () => {
    const value = $('#code-output').value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (!signal.aborted) $('#copy-status').textContent = 'Copied. Make something with it.';
    } catch {
      if (signal.aborted) return;
      $('#code-output').focus(); $('#code-output').select();
      $('#copy-status').textContent = 'Clipboard unavailable. Copy the selected text manually.';
    }
  });
  on(document, 'visibilitychange', syncPlayback);
  on(motion, 'change', syncPlayback);
  if (!playing) field.stop();
  syncControls(); syncPlayback(); showPanel(saved?.panelOpen ?? !compact.matches);
  for (const button of [$('#playback'), $('#toggle-controls'), $('#open-code')]) button.disabled = false;
  return () => {
    const state = { config: field.config, playing, preset: selectedPreset, modified, presetFingerprint, panelOpen: !panel.hidden };
    lifetime.abort(); updates.clear(); meter.stop();
    if (dialog.open) dialog.close();
    codeSource = null; opener = null; field.destroy();
    return state;
  };
}
let dispose;
let saved;
function initialize() {
  try { dispose = mount(saved); }
  catch (error) {
    $('#playback-status').textContent = 'Unavailable';
    $('#notice').hidden = false;
    $('#notice').textContent = `The preview could not start. ${error.message}`;
  }
}
initialize();
// Keep only these two page-lifecycle handlers for back/forward-cache restoration.
window.addEventListener('pagehide', () => { if (dispose) { saved = dispose(); dispose = null; } });
window.addEventListener('pageshow', event => { if (event.persisted && !dispose) initialize(); });
