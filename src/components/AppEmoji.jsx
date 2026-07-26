/**
 * AppEmoji — unified emoji renderer via Twemoji CDN.
 *
 * Converts any Unicode emoji to a platform-neutral SVG
 * from Twitter's open-source Twemoji set (v14).
 *
 * No extra npm package required — we replicate twemoji's
 * `convert.toCodePoint()` inline (same algorithm, MIT licensed).
 */
import React, { useState } from 'react';

const TWEMOJI_BASE =
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/';

/**
 * Convert a JS string emoji into a Twemoji codepoint path segment.
 * Handles: surrogate pairs, ZWJ sequences, variation selectors.
 */
function toCodePoint(str) {
  const r = [];
  let c = 0, p = 0;
  for (let i = 0; i < str.length; i++) {
    c = str.charCodeAt(i);
    if (p) {
      r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join('-');
}

function emojiToSrc(emoji) {
  if (!emoji) return null;
  // Twemoji omits the U+FE0F variation selector from filenames for standalone
  // emoji, but retains it in ZWJ sequences. Strip it when not in a sequence.
  const ZWJ = '\u200d';
  const VS16 = '\ufe0f';
  const cleaned = emoji.includes(ZWJ) ? emoji : emoji.replace(VS16, '');
  const cp = toCodePoint(cleaned);
  return `${TWEMOJI_BASE}${cp}.svg`;
}

/**
 * AppEmoji
 *
 * @param {string}  symbol    - Unicode emoji character(s)
 * @param {number}  size      - Rendered size in px (default 20)
 * @param {string}  className - Extra class names
 * @param {object}  style     - Extra inline styles
 */
export default function AppEmoji({ symbol, size = 20, className = '', style = {} }) {
  const [error, setError] = useState(false);

  if (!symbol) return null;

  const src = emojiToSrc(symbol);

  if (!src || error) {
    // Fallback: raw emoji text at the same optical size
    return (
      <span
        className={`app-emoji app-emoji--fallback ${className}`}
        style={{ fontSize: size * 0.9, lineHeight: 1, ...style }}
        aria-label={symbol}
        role="img"
      >
        {symbol}
      </span>
    );
  }

  return (
    <img
      className={`app-emoji ${className}`}
      src={src}
      alt={symbol}
      width={size}
      height={size}
      draggable={false}
      onError={() => setError(true)}
      style={{ display: 'block', flexShrink: 0, ...style }}
    />
  );
}
