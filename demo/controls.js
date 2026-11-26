// These are playground input limits, not library defaults or validation limits.
const number = (key, label, min, max, step) => ({ key, label, min, max, step });
export const groups = [
  { key: 'stars', title: 'Stars', open: true, fields: [
    number('count', 'Count', 0, 1000, 1), number('minRadius', 'Minimum radius', 0, 5, .1),
    number('maxRadius', 'Maximum radius', .1, 5, .1), number('minSpeed', 'Minimum speed', 0, 100, 1), number('maxSpeed', 'Maximum speed', 0, 100, 1),
  ] },
  { key: 'generation', title: 'Distribution', fields: [] },
  { key: 'galaxy', title: 'Galaxy shape', fields: [number('centerStrength', 'Center concentration', .1, 5, .1), number('spread', 'Spread', .1, 1, .01), number('flattening', 'Flattening', .05, 1, .01), number('rotation', 'Rotation', -3, 3, .1)] },
  { key: 'twinkle', title: 'Twinkle', toggle: true, fields: [number('strength', 'Strength', 0, 1, .01), number('speed', 'Speed', 0, .01, .0001)] },
  { key: 'parallax', title: 'Parallax', toggle: true, fields: [number('strength', 'Strength', 0, 60, 1)] },
  { key: 'repulsion', title: 'Mouse repulsion', toggle: true, fields: [number('radius', 'Radius', 1, 300, 1), number('strength', 'Strength', 0, 100, 1), number('friction', 'Friction', 0, .99, .01)] },
  { key: 'shootingStar', title: 'Shooting stars', fields: [number('minSpeed', 'Minimum speed', 0, 2000, 10), number('maxSpeed', 'Maximum speed', 0, 2000, 10), number('lineWidth', 'Line width', .1, 5, .1)] },
  { key: 'connections', title: 'Connections', toggle: true, fields: [number('radius', 'Connection radius', 1, 300, 1), number('mouseRadius', 'Pointer radius', 1, 400, 1), number('lineOpacity', 'Opacity', 0, 1, .01), number('lineWidth', 'Line width', .1, 3, .1)] },
  { key: 'glow', title: 'Glow', toggle: true, fields: [number('strength', 'Strength', 0, 12, .1)] },
  { key: 'rendering', title: 'Display & motion', fields: [] },
];

export function renderControls(container) {
  container.innerHTML = groups.map(group => `
    <details class="setting-group" ${group.open ? 'open' : ''}><summary>${group.title}</summary><div class="group-body">
    ${group.toggle ? `<label class="toggle"><input type="checkbox" data-section="${group.key}" data-key="enabled"> Enable ${group.title.toLowerCase()}</label>` : ''}
    ${group.fields.map(field => {
      const id = `${group.key}-${field.key}`;
      const attributes = `data-section="${group.key}" data-key="${field.key}" min="${field.min}" max="${field.max}" step="${field.step}"`;
      return `<div class="control"><div class="control-heading"><label for="${id}">${field.label}</label><input id="${id}" type="number" ${attributes} required></div><input type="range" ${attributes} aria-label="${group.title}: ${field.label} slider"></div>`;
    }).join('')}
    ${group.key === 'stars' ? '<fieldset class="palette"><legend>Colors</legend><div id="colors" class="colors"></div><button type="button" id="add-color" class="add-color">Add color</button></fieldset>' : ''}
    ${group.key === 'generation' ? '<label for="generation-mode" class="hint">Initial arrangement</label><select id="generation-mode" data-section="generation" data-key="mode"><option value="galaxy">Galaxy</option><option value="random">Random</option></select>' : ''}
    ${group.key === 'galaxy' ? '<p class="hint">Used for the initial galaxy arrangement. Stars continue to drift.</p>' : ''}
    ${group.key === 'shootingStar' ? '<p class="hint">New speeds apply to the next shooting star.</p>' : ''}
    ${group.key === 'rendering' ? '<label for="rendering-maxDpr" class="hint">Resolution limit</label><select id="rendering-maxDpr" data-section="rendering" data-key="maxDpr"><option value="native">Native display resolution</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option><option value="3">3×</option></select><p class="hint">A lower limit trades sharpness for fewer pixels.</p><label class="toggle"><input type="checkbox" data-section="accessibility" data-key="respectReducedMotion"> Respect reduced motion</label>' : ''}
    </div></details>`).join('');
}

export function rgbToHex(rgb) {
  return '#' + rgb.split(',').map(channel => Math.round(Number(channel.trim())).toString(16).padStart(2, '0')).join('');
}
export function hexToRgb(hex) {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(', ');
}

export function configurationCode(config, format) {
  if (format === 'setup') return 'git clone https://github.com/Jaason/interactive-starfield.git\ncd interactive-starfield\nnpm ci\nnpm run dev\n\n# The npm package is not published yet.';
  const json = JSON.stringify(config, null, 2);
  if (format === 'json') return json;
  return `import { Starfield } from './src/index.js';\n\n// Mount #starfield with a positive CSS size first.\nconst field = new Starfield('#starfield', ${json});\n\n// When removing the canvas:\n// field.destroy();`;
}

// One pending timer and one merged patch, even during a long slider drag.
export function createUpdateQueue(apply, delay = 120) {
  let timer = null;
  let pending = {};
  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (Object.keys(pending).length === 0) return true;
    if (!apply(pending)) return false;
    pending = {};
    return true;
  }
  return {
    queue(section, key, value) {
      (pending[section] ??= {})[key] = value;
      if (timer === null) timer = setTimeout(flush, delay);
    },
    flush,
    clear() { if (timer !== null) clearTimeout(timer); timer = null; pending = {}; },
  };
}
