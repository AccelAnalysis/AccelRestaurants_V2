/** Conservative, deterministic font metrics for starter copy. No DOM/font download
 * is needed on Firebase. Explicit line breaks stay editable in the ordinary text tile.
 * Pixel-level clipping tests use the actual player text renderer in Chromium/WebKit.
 */
export function fitStarterText(content: string, width: number, height: number, preferred: number, serif = false, singleLine = false) {
  const value = content.trim() || ' ';
  const units = (text: string) => [...text].reduce((sum, char) => sum + (
    /[MW@%]/.test(char) ? 1.1 : /[ilI.,:;'!|]/.test(char) ? 0.4 : /\s/.test(char) ? 0.38 :
    /[A-Z&]/.test(char) ? 0.88 : /[mw]/.test(char) ? 0.95 : char.charCodeAt(0) > 255 ? 1.15 : 0.68
  ), 0) * (serif ? 1.08 : 1);
  // Leave a small safety margin for platform font substitutions and fractional pixels.
  for (let size = preferred; size >= 12; size--) {
    if (singleLine) {
      if (units(value) * size <= width - 6) return { content: value, fontSize: size };
      continue;
    }
    const lines: string[] = []; let line = '';
    for (const word of value.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (units(candidate) * size <= width - 6) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      // Long product names/words still fit without truncation or lost characters.
      for (const char of word) {
        if (line && units(line + char) * size > width - 6) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line) lines.push(line);
    if (lines.length * size * 1.16 <= height - 4) return { content: lines.join('\n') || ' ', fontSize: size };
  }
  return { content: value, fontSize: 12 };
}
