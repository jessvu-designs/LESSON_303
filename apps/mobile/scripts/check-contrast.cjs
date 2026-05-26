const fs = require('fs');
const path = require('path');

const TOKENS_PATH = path.resolve(__dirname, '../src/theme/tokens.ts');

function parseColorsFromTokens(source) {
  const blockMatch = source.match(/export const colors\s*=\s*\{([\s\S]*?)\n\};/);
  if (!blockMatch) {
    throw new Error('Could not locate "export const colors" block in tokens.ts');
  }

  const block = blockMatch[1];
  const colorMatches = [...block.matchAll(/\s*([a-zA-Z0-9_]+)\s*:\s*'(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))'/g)];
  const colors = {};
  for (const m of colorMatches) {
    colors[m[1]] = m[2];
  }
  return colors;
}

function hexToRgb(hex) {
  let value = hex.replace('#', '');
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  if (value.length === 8) {
    value = value.slice(0, 6);
  }

  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function linearize(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

function formatRatio(ratio) {
  return ratio.toFixed(2);
}

function run() {
  const source = fs.readFileSync(TOKENS_PATH, 'utf8');
  const colors = parseColorsFromTokens(source);

  const checks = [
    {
      name: 'Primary body text on app background',
      fg: 'text',
      bg: 'bg',
      min: 4.5,
    },
    {
      name: 'Primary body text on cards',
      fg: 'text',
      bg: 'surface',
      min: 4.5,
    },
    {
      name: 'Muted body text on cards',
      fg: 'textMuted',
      bg: 'surface',
      min: 4.5,
    },
    {
      name: 'Label text on cards',
      fg: 'warning',
      bg: 'surface',
      min: 4.5,
    },
    {
      name: 'Link text on cards',
      fg: 'link',
      bg: 'surface',
      min: 4.5,
    },
    {
      name: 'Button text on primary background',
      fg: 'primaryText',
      bg: 'primary',
      min: 4.5,
    },
    {
      name: 'Text on danger background',
      fg: 'primaryText',
      bg: 'danger',
      min: 4.5,
    },
    {
      name: 'Large urgent countdown text on app background',
      fg: 'danger',
      bg: 'bg',
      min: 3.0,
    },
  ];

  const results = checks.map((check) => {
    const fgHex = colors[check.fg];
    const bgHex = colors[check.bg];
    if (!fgHex || !bgHex) {
      return {
        ...check,
        ratio: null,
        pass: false,
        message: `Missing color token(s): ${!fgHex ? check.fg : ''} ${!bgHex ? check.bg : ''}`.trim(),
      };
    }

    const ratio = contrastRatio(fgHex, bgHex);
    return {
      ...check,
      ratio,
      pass: ratio >= check.min,
      fgHex,
      bgHex,
    };
  });

  let hasFailures = false;
  console.log('Contrast audit for apps/mobile/src/theme/tokens.ts');
  console.log('');
  for (const item of results) {
    if (item.ratio == null) {
      hasFailures = true;
      console.log(`[FAIL] ${item.name}`);
      console.log(`       ${item.message}`);
      continue;
    }

    const status = item.pass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${item.name}`);
    console.log(
      `       ${item.fg} (${item.fgHex}) on ${item.bg} (${item.bgHex}) = ${formatRatio(item.ratio)} (min ${item.min.toFixed(1)})`,
    );

    if (!item.pass) hasFailures = true;
  }

  console.log('');
  if (hasFailures) {
    console.error('Contrast audit failed. Update tokens before shipping UI changes.');
    process.exit(1);
  }

  console.log('Contrast audit passed.');
}

run();
