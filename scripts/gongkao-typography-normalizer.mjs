const specialSpacingPattern =
  /[\u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]/u;
const explicitMarkerSource =
  '(?:[0-9０-９]+[、．]|[一二三四五六七八九十百]+、|[（(](?:[0-9０-９]+|[一二三四五六七八九十百]+)[）)]|[①-⑳])';
const explicitMarkerWhitespacePattern = new RegExp(
  `^(\\s*(?:(?:[-*+]|>)\\s+)?(?:#{1,6}\\s+)?(?:\\*\\*)?${explicitMarkerSource}(?:\\*\\*)?)([\\t \\u00a0\\u1680\\u2000-\\u200b\\u202f\\u205f\\u3000\\ufeff]+)(\\S.*)$`,
  'u',
);
const explicitMarkerOnlyPattern = new RegExp(
  `^(${explicitMarkerSource})$`,
  'u',
);
const circledNumbers = [
  '①',
  '②',
  '③',
  '④',
  '⑤',
  '⑥',
  '⑦',
  '⑧',
  '⑨',
  '⑩',
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
  '⑰',
  '⑱',
  '⑲',
  '⑳',
];
const chineseDigits = new Map([
  ['一', 1],
  ['二', 2],
  ['三', 3],
  ['四', 4],
  ['五', 5],
  ['六', 6],
  ['七', 7],
  ['八', 8],
  ['九', 9],
]);

function normalizeDigits(value) {
  return value.replace(/[０-９]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
  );
}

function chineseNumberToInteger(value) {
  if (value === '十') return 10;
  if (!value.includes('十')) return chineseDigits.get(value) ?? null;

  const [tensPart, onesPart] = value.split('十');
  const tens = tensPart === '' ? 1 : chineseDigits.get(tensPart);
  const ones = onesPart === '' ? 0 : chineseDigits.get(onesPart);
  return tens == null || ones == null ? null : tens * 10 + ones;
}

function markerOrdinal(marker) {
  const circledIndex = circledNumbers.indexOf(marker);
  if (circledIndex !== -1) return circledIndex + 1;

  const inner = marker.replace(/[、．]$/u, '').replace(/^[（(]|[）)]$/gu, '');
  if (/^[0-9０-９]+$/u.test(inner)) {
    return Number.parseInt(normalizeDigits(inner), 10);
  }
  return chineseNumberToInteger(inner);
}

function leadingExplicitMarker(value) {
  const match = value.match(
    /^([0-9０-９]+[、．]|[一二三四五六七八九十百]+、|[（(](?:[0-9０-９]+|[一二三四五六七八九十百]+)[）)]|[①-⑳])/u,
  );
  if (!match) return null;
  return { marker: match[1], ordinal: markerOrdinal(match[1]) };
}

function removeLeadingExplicitMarker(value) {
  if (value.startsWith('**')) {
    const body = value.slice(2);
    const parsed = leadingExplicitMarker(body);
    if (!parsed) return null;

    let remainder = body.slice(parsed.marker.length);
    if (remainder.startsWith('**')) {
      remainder = remainder.slice(2).trimStart();
    } else if (remainder !== '') {
      remainder = `**${remainder.trimStart()}`;
    }
    return { ...parsed, remainder };
  }

  const parsed = leadingExplicitMarker(value);
  if (!parsed) return null;
  return {
    ...parsed,
    remainder: value.slice(parsed.marker.length).trimStart(),
  };
}

function normalizeLineSpacing(line) {
  const ordered = line.match(
    /^(\s*)(\d+)\.([\t \u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]+)(.*)$/u,
  );
  if (ordered) {
    const [, indent, number, spacing, rest] = ordered;
    if (spacing !== ' ' || rest === '') {
      line = `${indent}${number}.${rest === '' ? '' : ` ${rest}`}`;
    }
  }

  const spacedMarker = line.match(explicitMarkerWhitespacePattern);
  if (spacedMarker) {
    line = `${spacedMarker[1]}${spacedMarker[3]}`;
  }

  return line;
}

function duplicateOrderedMarker(line) {
  const match = line.match(
    /^(\s*)(\d+)\. (?:(?:\*\*)(\d+)(?:\*\*)|(\d+))([、．.]?)(.*)$/u,
  );
  if (!match) return null;

  const innerNumber = match[3] ?? match[4];
  if (Number.parseInt(innerNumber, 10) !== Number.parseInt(match[2], 10)) {
    return null;
  }

  return {
    indent: match[1],
    number: match[2],
    remainder: match[6].trimStart(),
  };
}

function normalizeDuplicateOrderedMarkers(markdown) {
  const lines = markdown.split('\n');
  const editable = editableLineMask(lines);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const duplicate = editable[index]
      ? duplicateOrderedMarker(lines[index])
      : null;
    if (!duplicate) {
      output.push(lines[index]);
      continue;
    }

    if (duplicate.remainder !== '') {
      output.push(
        `${duplicate.indent}${duplicate.number}. ${duplicate.remainder}`,
      );
      continue;
    }

    const fragments = [];
    let lastConsumed = index;
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (!editable[cursor]) break;
      if (lines[cursor].trim() === '') {
        continue;
      }

      const fragment = proseFragment(lines[cursor]);
      if (!fragment || fragment.indentWidth <= duplicate.indent.length) break;

      let text = fragment.text;
      if (fragments.length === 0) text = text.replace(/^、/u, '');
      if (text !== '') fragments.push(text);
      lastConsumed = cursor;
      if (/[。！？!?]$/u.test(text)) break;
    }

    if (fragments.length === 0) {
      output.push(lines[index]);
      continue;
    }

    output.push(
      `${duplicate.indent}${duplicate.number}. ${fragments.join('')}`,
    );
    index = lastConsumed;
  }

  return output.join('\n');
}

function listItem(line) {
  let match = line.match(/^(\s*)(\d+)\. (.+)$/u);
  if (match) {
    return {
      indent: match[1],
      kind: 'ordered',
      number: Number.parseInt(match[2], 10),
      rest: match[3],
    };
  }

  match = line.match(/^(\s*)[-*+]\s+(.+)$/u);
  if (!match) return null;
  return { indent: match[1], kind: 'bullet', number: null, rest: match[2] };
}

function editableLineMask(lines) {
  const editable = [];
  let inCodeFence = false;
  let inFrontmatter = lines[0] === '---';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (inFrontmatter) {
      editable.push(false);
      if (index > 0 && line === '---') inFrontmatter = false;
      continue;
    }
    if (/^\s*(?:```|~~~)/u.test(line)) {
      inCodeFence = !inCodeFence;
      editable.push(false);
      continue;
    }
    editable.push(!inCodeFence);
  }

  return editable;
}

function siblingListBlock(lines, editable, index, indentWidth) {
  let start = index;
  let end = index;

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!editable[cursor]) break;
    if (lines[cursor].trim() === '') {
      start = cursor;
      continue;
    }
    const sibling = listItem(lines[cursor]);
    const width = lines[cursor].match(/^\s*/u)?.[0].length ?? 0;
    if (
      (sibling && sibling.indent.length === indentWidth) ||
      width > indentWidth
    ) {
      start = cursor;
      continue;
    }
    break;
  }

  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (!editable[cursor]) break;
    if (lines[cursor].trim() === '') {
      end = cursor;
      continue;
    }
    const sibling = listItem(lines[cursor]);
    const width = lines[cursor].match(/^\s*/u)?.[0].length ?? 0;
    if (
      (sibling && sibling.indent.length === indentWidth) ||
      width > indentWidth
    ) {
      end = cursor;
      continue;
    }
    break;
  }

  const siblingIndexes = [];
  for (let cursor = start; cursor <= end; cursor += 1) {
    const sibling = listItem(lines[cursor]);
    if (sibling?.indent.length === indentWidth) siblingIndexes.push(cursor);
  }

  return { start, end, siblingIndexes };
}

function isChoiceItem(text) {
  return /^(?:\*\*)?[A-HＡ-Ｈ](?:\*\*)?(?:[.．、:：]|\s)/u.test(text);
}

function proseFragment(line) {
  const match = line.match(/^(\s+)(\S.*)$/u);
  if (!match) return null;

  const text = match[2];
  if (
    /^(?:#{1,6}\s|[-*+]\s+|\d+\.\s+|>|:{3,}|```|~~~|<|\||!\[|\$\$)/u.test(
      text,
    ) ||
    /^\d+[.．、]/u.test(text) ||
    text.startsWith('**') ||
    text.startsWith('==') ||
    /^第[一二三四五六七八九十百0-9]+条/u.test(text) ||
    isChoiceItem(text) ||
    removeLeadingExplicitMarker(text) ||
    /^`?(?:例|分析|注意)`?[:：]/u.test(text)
  ) {
    return null;
  }

  return { indentWidth: match[1].length, text };
}

function proseAnchor(line) {
  const item = listItem(line);
  if (item) {
    if (/^!\[/u.test(item.rest) || /^\*\*.*\*\*$/u.test(item.rest)) {
      return null;
    }
    const explicit = removeLeadingExplicitMarker(item.rest);
    return {
      indentWidth: item.indent.length,
      kind: explicit?.remainder === '' ? 'marker-list' : 'list',
      text: item.rest,
    };
  }

  const emptyOrdered = line.match(/^(\s*)(\d+)\.\s*$/u);
  if (emptyOrdered) {
    return {
      indentWidth: emptyOrdered[1].length,
      kind: 'empty-ordered',
      text: '',
    };
  }

  const fragment = proseFragment(line);
  if (fragment) return { ...fragment, kind: 'prose' };

  const boldFragment = line.match(/^(\s+)(\*\*.+\*\*|==.+==)$/u);
  return boldFragment
    ? {
        indentWidth: boldFragment[1].length,
        kind: 'bold-prose',
        text: boldFragment[2],
      }
    : null;
}

function shouldMergeProseFragments(previousLine, currentLine) {
  const previous = proseAnchor(previousLine);
  const current = proseFragment(currentLine);
  if (!previous || !current) return false;

  const isPlainAnchor =
    previous.kind === 'prose' || previous.kind === 'bold-prose';
  const samePlainIndent =
    isPlainAnchor && previous.indentWidth === current.indentWidth;
  const nestedUnderList =
    !isPlainAnchor && current.indentWidth > previous.indentWidth;
  if (!samePlainIndent && !nestedUnderList) return false;

  const beginsWithContinuationPunctuation = /^[，。；：、,:;=（(“]/u.test(
    current.text,
  );
  if (beginsWithContinuationPunctuation) return true;
  if (previous.kind === 'bold-prose') return false;
  if (previous.kind === 'marker-list') return true;

  const beginsWithGrammaticalContinuation =
    /^(?:的|是|为|就|才|使|成为|以及|并且|或者|等)(?![。！？!?；;：:])/u.test(
      current.text,
    );
  const previousText = previous.text.replace(/(?:\*\*|__|`)$/u, '');
  const endsWithGrammaticalContinuation =
    /(?:[，,、（(“=]|这时候|分为|包括|享有|订立|其中|形成|进行|有很|来源是|特点是|特别是|实施|更加|阶段|需要|应当|不得|若|为|是|有|的)$/u.test(
      previousText,
    );
  return beginsWithGrammaticalContinuation || endsWithGrammaticalContinuation;
}

function mergeProseFragments(previousLine, currentLine) {
  const previous = proseAnchor(previousLine);
  let continuation = proseFragment(currentLine).text;
  if (previous.kind === 'empty-ordered') {
    continuation = continuation.replace(/^、/u, '');
    return continuation === ''
      ? previousLine.trimEnd()
      : `${previousLine.trimEnd()} ${continuation}`;
  }
  return `${previousLine.trimEnd()}${continuation}`;
}

function normalizeBrokenProseLines(markdown) {
  const lines = markdown.split('\n');
  const editable = editableLineMask(lines);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const entry = { line: lines[index], editable: editable[index] };
    if (!entry.editable || entry.line.trim() === '') {
      output.push(entry);
      continue;
    }

    let previousIndex = output.length - 1;
    while (previousIndex >= 0 && output[previousIndex].line.trim() === '') {
      previousIndex -= 1;
    }
    const previous = output[previousIndex];
    if (
      !previous?.editable ||
      !shouldMergeProseFragments(previous.line, entry.line)
    ) {
      output.push(entry);
      continue;
    }

    previous.line = mergeProseFragments(previous.line, entry.line);
    output.splice(previousIndex + 1);
  }

  return output.map(({ line }) => line).join('\n');
}

function normalizeQuestionChoiceBlocks(markdown) {
  const lines = markdown.split('\n');
  const editable = editableLineMask(lines);
  const handledBlocks = new Set();
  const plainIndentByLine = new Map();
  const blankBefore = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    if (!editable[index]) continue;
    const seed = listItem(lines[index]);
    if (!seed || !isChoiceItem(seed.rest)) continue;

    const indentWidth = seed.indent.length;
    const block = siblingListBlock(lines, editable, index, indentWidth);
    const blockKey = `${block.start}:${block.end}:${indentWidth}`;
    if (handledBlocks.has(blockKey)) continue;
    handledBlocks.add(blockKey);

    const plainIndent = ' '.repeat(Math.min(indentWidth, 3));
    block.siblingIndexes.forEach((cursor, siblingIndex) => {
      plainIndentByLine.set(cursor, plainIndent);
      if (siblingIndex > 0) blankBefore.add(cursor);
    });
  }

  if (plainIndentByLine.size === 0) return markdown;

  const output = [];
  for (let index = 0; index < lines.length; index += 1) {
    const plainIndent = plainIndentByLine.get(index);
    if (plainIndent === undefined) {
      output.push(lines[index]);
      continue;
    }

    if (blankBefore.has(index) && output.at(-1)?.trim() !== '') output.push('');
    output.push(`${plainIndent}${listItem(lines[index]).rest}`);
  }

  return output.join('\n');
}

function normalizeRedundantListBlocks(markdown) {
  const lines = markdown.split('\n');
  const editable = editableLineMask(lines);
  const handledBlocks = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    if (!editable[index]) continue;
    const seed = listItem(lines[index]);
    if (!seed || !removeLeadingExplicitMarker(seed.rest)) continue;

    const indentWidth = seed.indent.length;
    let start = index;
    let end = index;

    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (!editable[cursor]) break;
      if (lines[cursor].trim() === '') {
        start = cursor;
        continue;
      }
      const sibling = listItem(lines[cursor]);
      const width = lines[cursor].match(/^\s*/u)?.[0].length ?? 0;
      if (
        (sibling && sibling.indent.length === indentWidth) ||
        width > indentWidth
      ) {
        start = cursor;
        continue;
      }
      break;
    }

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (!editable[cursor]) break;
      if (lines[cursor].trim() === '') {
        end = cursor;
        continue;
      }
      const sibling = listItem(lines[cursor]);
      const width = lines[cursor].match(/^\s*/u)?.[0].length ?? 0;
      if (
        (sibling && sibling.indent.length === indentWidth) ||
        width > indentWidth
      ) {
        end = cursor;
        continue;
      }
      break;
    }

    const blockKey = `${start}:${end}:${indentWidth}`;
    if (handledBlocks.has(blockKey)) continue;
    handledBlocks.add(blockKey);

    const siblingIndexes = [];
    for (let cursor = start; cursor <= end; cursor += 1) {
      const sibling = listItem(lines[cursor]);
      if (sibling?.indent.length === indentWidth) siblingIndexes.push(cursor);
    }
    const explicitItems = siblingIndexes
      .map((cursor) => ({
        cursor,
        item: listItem(lines[cursor]),
        marker: removeLeadingExplicitMarker(listItem(lines[cursor]).rest),
      }))
      .filter(({ marker }) => marker);

    const first = siblingIndexes[0];
    const firstExplicit = explicitItems[0];
    const isSimpleNumericSequence =
      explicitItems.length === 1 &&
      firstExplicit?.cursor === first &&
      firstExplicit.marker.ordinal === 1 &&
      siblingIndexes.every((cursor, siblingIndex) => {
        const item = listItem(lines[cursor]);
        return (
          siblingIndex === 0 ||
          (item.kind === 'ordered' && item.number === siblingIndex + 1)
        );
      });

    if (isSimpleNumericSequence) {
      const firstItem = listItem(lines[first]);
      lines[first] = `${firstItem.indent}1. ${firstExplicit.marker.remainder}`;
      continue;
    }

    for (const cursor of siblingIndexes) {
      const item = listItem(lines[cursor]);
      if (item.kind === 'ordered') {
        lines[cursor] = `${item.indent}- ${item.rest}`;
      }
    }
  }

  return lines.join('\n');
}

function mergeDetachedExplicitMarkers(markdown) {
  const lines = markdown.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!explicitMarkerOnlyPattern.test(trimmed)) continue;

    let nextIndex = index + 1;
    while (nextIndex < lines.length && lines[nextIndex].trim() === '') {
      nextIndex += 1;
    }
    if (nextIndex >= lines.length) continue;

    const next = lines[nextIndex].trimStart();
    if (/^(?:#{1,6}\s|[-*+]\s|\d+\.\s|>|:{3,}|```|~~~|<|\||!\[)/u.test(next)) {
      continue;
    }

    const asciiIndent = lines[index].match(/^ */u)?.[0] ?? '';
    lines[index] = `${asciiIndent}${trimmed}${next}`;
    lines.splice(index + 1, nextIndex - index);
  }

  return lines.join('\n');
}

function repairKnownDetachedNumbering(markdown, documentPath) {
  const normalizedPath = documentPath.replaceAll('\\', '/');
  let result = markdown;

  if (
    normalizedPath.endsWith('资料分析/03速算技巧.md') ||
    normalizedPath.endsWith('xingce/ziliao-fenxi/03速算技巧.md')
  ) {
    result = result
      .replace(
        /^3\. \*\*步骤\*\*：\n4\.\n {4}（1）(.+)\n {4}（2）(.+)$/mu,
        '3. **步骤**：\n   - （1）$1\n   - （2）$2',
      )
      .replace(
        /^3\. \*\*步骤\*\*：\n {3}1\. \*\*(.+)\n {3}2\. \*\*(.+)$/mu,
        '3. **步骤**：\n   - （1）**$1\n   - （2）**$2',
      );
  }

  if (
    normalizedPath.endsWith('申论/03题型详解/文章写作.md') ||
    normalizedPath.endsWith('shenlun/03题型详解/文章写作.md')
  ) {
    result = result
      .replace(/^ {3}3\.\n\n {6}(善用引寓成标题：.*)$/mu, '   3. $1')
      .replace(/^ {6}- \(1\)(.+)\n {6}2\./gmu, '      1. $1\n      2.');
  }

  if (
    normalizedPath.endsWith('申论/03题型详解/归纳概括.md') ||
    normalizedPath.endsWith('shenlun/03题型详解/归纳概括.md')
  ) {
    result = result.replace(
      /^2\.\n\n {3}(注意数据型材料)\n\n {3}。(数据型材料.*)$/mu,
      '2. $1。$2',
    );
  }

  if (
    normalizedPath.endsWith('申论/03题型详解/作文写作模板.md') ||
    normalizedPath.endsWith('shenlun/03题型详解/作文写作模板.md')
  ) {
    result = result.replace(/^(3\. \*\*范例[12]\*\*：)\n4\.\n\n/gmu, '$1\n\n');
  }

  if (
    normalizedPath.endsWith('公基常识/经济篇/微观经济.md') ||
    normalizedPath.endsWith('xingce/gongji-changshi/经济篇/微观经济.md')
  ) {
    result = result
      .replace(/^ {3}3\.\n\n {6}(相关商品的价格：.*)$/mu, '   3. $1')
      .replace(/^ {3}1\.\n {3}2\. (以上图表表明：.*)$/mu, '   $1');
  }

  const emptyMarkerBeforeHeading = [
    ['公基常识/公文篇.md', 'xingce/gongji-changshi/公文篇.md'],
    ['公基常识/国情省情/国情.md', 'xingce/gongji-changshi/国情省情/国情.md'],
    [
      '公基常识/自然科技篇/生活常识.md',
      'xingce/gongji-changshi/自然科技篇/生活常识.md',
    ],
  ];
  if (
    emptyMarkerBeforeHeading.some((suffixes) =>
      suffixes.some((suffix) => normalizedPath.endsWith(suffix)),
    )
  ) {
    result = result.replace(/^\s*\d+\.\n\n(?=#{2,6}\s)/gmu, '');
  }

  if (
    normalizedPath.endsWith('公基常识/经济篇/宏观经济.md') ||
    normalizedPath.endsWith('xingce/gongji-changshi/经济篇/宏观经济.md')
  ) {
    result = result
      .replace(/^(4\. 菲利普斯曲线：)\n\n {3}1\.\n\n(?=5\.)/mu, '$1\n\n')
      .replace(/^(3\. 货币政策的种类：)\n\n {3}1\.\n\n(?=### )/mu, '$1\n\n');
  }

  return mergeDetachedExplicitMarkers(result);
}

function mapMarkdownLines(markdown, transform) {
  const output = [];
  const lines = markdown.split('\n');
  let inCodeFence = false;
  let inFrontmatter = lines[0] === '---';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (inFrontmatter) {
      output.push(line);
      if (index > 0 && line === '---') inFrontmatter = false;
      continue;
    }

    if (/^\s*(?:```|~~~)/u.test(line)) {
      inCodeFence = !inCodeFence;
      output.push(line);
      continue;
    }

    output.push(inCodeFence ? line : transform(line, index + 1));
  }

  return output.join('\n');
}

export function normalizeGongkaoTypography(markdown, documentPath = '') {
  const normalizedLineEndings = markdown.replace(/\r\n?/gu, '\n');
  const normalizedSpacing = mapMarkdownLines(
    normalizedLineEndings,
    normalizeLineSpacing,
  );
  const normalizedDuplicates =
    normalizeDuplicateOrderedMarkers(normalizedSpacing);
  const normalizedProse = normalizeBrokenProseLines(normalizedDuplicates);
  const normalizedQuestions = normalizeQuestionChoiceBlocks(normalizedProse);
  const normalizedLists = normalizeRedundantListBlocks(normalizedQuestions);
  return repairKnownDetachedNumbering(normalizedLists, documentPath);
}

export function auditGongkaoTypography(markdown) {
  const issues = [];

  mapMarkdownLines(markdown, (line, lineNumber) => {
    const ordered = line.match(
      /^(\s*\d+\.)([\t \u00a0\u1680\u2000-\u200b\u202f\u205f\u3000\ufeff]+)(.*)$/u,
    );
    if (
      ordered &&
      ordered[3] !== '' &&
      (ordered[2] !== ' ' || specialSpacingPattern.test(ordered[2]))
    ) {
      issues.push({
        type: 'ordered-marker-spacing',
        line: lineNumber,
        text: line,
      });
    }

    if (explicitMarkerWhitespacePattern.test(line)) {
      issues.push({
        type: 'explicit-marker-spacing',
        line: lineNumber,
        text: line,
      });
    }

    const redundant = line.match(/^\s*\d+\. (.+)$/u);
    if (redundant && removeLeadingExplicitMarker(redundant[1])) {
      issues.push({ type: 'redundant-marker', line: lineNumber, text: line });
    }

    const item = listItem(line);
    if (item && isChoiceItem(item.rest)) {
      issues.push({
        type: 'redundant-choice-marker',
        line: lineNumber,
        text: line,
      });
    }

    const trimmed = line.trim();
    if (/^\d+\.$/u.test(trimmed) || explicitMarkerOnlyPattern.test(trimmed)) {
      issues.push({ type: 'detached-marker', line: lineNumber, text: line });
    }

    return line;
  });

  const lines = markdown.split('\n');
  const editable = editableLineMask(lines);
  for (let index = 0; index < lines.length; index += 1) {
    if (!editable[index]) continue;
    if (duplicateOrderedMarker(lines[index])) {
      issues.push({
        type: 'duplicate-ordered-marker',
        line: index + 1,
        text: lines[index],
      });
    }

    if (lines[index].trim() === '') continue;
    let previousIndex = index - 1;
    while (previousIndex >= 0 && lines[previousIndex].trim() === '') {
      previousIndex -= 1;
    }
    if (
      previousIndex >= 0 &&
      editable[previousIndex] &&
      shouldMergeProseFragments(lines[previousIndex], lines[index])
    ) {
      issues.push({
        type: 'broken-prose-line',
        line: index + 1,
        text: lines[index],
      });
    }
  }

  return issues;
}

export function gongkaoKnowledgeFingerprint(markdown) {
  return normalizeBrokenProseLines(normalizeDuplicateOrderedMarkers(markdown))
    .split('\n')
    .map((line) => {
      let value = line.trimStart();
      let previous = '';
      while (value !== previous) {
        previous = value;
        value = value
          .replace(/^(?:[-*+]\s+|\d+\.\s*)/u, '')
          .replace(new RegExp(`^\\*\\*${explicitMarkerSource}\\*\\*`, 'u'), '')
          .replace(new RegExp(`^\\*\\*${explicitMarkerSource}`, 'u'), '**')
          .replace(new RegExp(`^${explicitMarkerSource}`, 'u'), '');
      }
      return value.replace(/\s/gu, '');
    })
    .join('');
}
