const circledNumbers = new Set([
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
]);

function replaceSection(markdown, heading, nextHeading, transform) {
  const start = markdown.indexOf(heading);
  if (start === -1) return markdown;

  const end = markdown.indexOf(nextHeading, start + heading.length);
  if (end === -1) return markdown;

  return `${markdown.slice(0, start)}${transform(
    markdown.slice(start, end),
  )}${markdown.slice(end)}`;
}

function repairArticleWriting(markdown) {
  let result = markdown
    .replace(
      '\n1. **第三步：用政策，定方向**',
      '\n3. **第三步：用政策，定方向**',
    )
    .replace(/\n2\. 常见题型立意要点\s*\n\s*：/, '\n4. 常见题型立意要点：')
    .replace("“过去”、“现在' 、“未来”", '“过去”、“现在”、“未来”')
    .replace('“主体分析法＇', '“主体分析法”')
    .replace('对个入的意义', '对个人的意义')
    .replace('在写作是要结合', '在写作时要结合')
    .replace('在说明关系，再辩证的表达', '再说明关系，辩证地表达')
    .replace('话题一直，不然', '话题一致，不然')
    .replace('性质载然相反', '性质截然相反');

  result = replaceSection(
    result,
    '### 3 种布局思路',
    '### 5 个段落',
    (section) => section.replace(/^ {3}\d+\.\s+/gm, '   - '),
  );

  result = replaceSection(
    result,
    '### 5 个段落',
    '### 3 个角度设置分论点',
    (section) => section.replace(/^\d+\.\s+/gm, '- '),
  );

  return result.replace(
    /^ {3}1\. 必须要做到以下几点：$/m,
    '\n   必须要做到以下几点：',
  );
}

function repairGrowthFormulas(markdown, sourcePath) {
  if (sourcePath === '资料分析/01开篇.md') {
    return markdown
      .replace('**3、**相关公式****：', '**3、相关公式**：')
      .replace(
        '$现期量=基期 + 增长量 = 基期量×(1+增长率)$',
        '$\\text{现期量} = \\text{基期量} + \\text{增长量} = \\text{基期量} \\times (1 + \\text{增长率})$',
      )
      .replace(
        '$基期量=现期 - 增长量=\\frac{现期量 }{1+增长率}=\\frac{增长量}{增长率}$',
        '$\\text{基期量} = \\text{现期量} - \\text{增长量} = \\frac{\\text{现期量}}{1 + \\text{增长率}} = \\frac{\\text{增长量}}{\\text{增长率}}$',
      )
      .replace(
        /^\s*\*\*2、增长量公式\*\*：.*$/m,
        () =>
          '**2、增长量公式**：\n\n$$\n\\text{增长量}\n= \\text{现期量} - \\text{基期量}\n= \\text{基期量} \\times \\text{增长率}\n= \\frac{\\text{现期量}}{1 + \\text{增长率}} \\times \\text{增长率}\n$$',
      )
      .replace(
        /^\*\*4、增长率公式\*\*：\$.*\$$/m,
        () =>
          '**4、增长率公式**：\n\n$$\n\\text{增长率}\n= \\frac{\\text{增长量}}{\\text{基期量}}\n= \\frac{\\text{增长量}}{\\text{现期量} - \\text{增长量}}\n= \\frac{\\text{现期量} - \\text{基期量}}{\\text{基期量}}\n= \\frac{\\text{现期量}}{\\text{基期量}} - 1\n$$',
      );
  }

  if (sourcePath === '资料分析/06增长量专题.md') {
    return markdown
      .replace(
        /^-\s+\*\*1、公式\*\*：.*$/m,
        () =>
          '**1、公式**：\n\n$$\n\\text{增长量} = \\frac{\\text{现期量}}{1 + \\text{增长率}} \\times \\text{增长率}\n$$',
      )
      .replace(
        '把增长率化成1n，即增长量=现期现期1+n',
        '把增长率化成 $1/n$，即 $\\text{增长量} = \\frac{\\text{现期量}}{1+n}$',
      );
  }

  if (sourcePath === '资料分析/10秒杀技巧.md') {
    return markdown
      .replace(
        '1、増长量=现期量增长率现期量1+增长率×增长率',
        '1、增长量公式：$\\text{增长量} = \\frac{\\text{现期量}}{1 + \\text{增长率}} \\times \\text{增长率}$',
      )
      .replace(
        '2、工业品物流总额同比增量=16636.151+0.2%×0.2%≈33亿元',
        '2、工业品物流总额同比增量：$\\frac{16636.15}{1 + 0.2\\%} \\times 0.2\\% \\approx 33\\text{亿元}$',
      )
      .replace(
        '3、社会物流总额同比增量=35357.261+6.4%×6.4%≈2143亿元',
        '3、社会物流总额同比增量：$\\frac{35357.26}{1 + 6.4\\%} \\times 6.4\\% \\approx 2126\\text{亿元}$',
      )
      .replace(
        '4、所求比重=部分量/总体量=33/2143=1.5%',
        '4、所求比重：$\\frac{33}{2126} \\approx 1.55\\%$，不到 5%。',
      );
  }

  if (sourcePath === '数量关系/数字推理/特征数列/幂次数列.md') {
    return markdown.replace('+ 3$。</li>', '+ 3。</li>');
  }

  return markdown;
}

function normalizeListMarkers(markdown) {
  const output = [];
  let inCodeFence = false;

  for (const originalLine of markdown.split('\n')) {
    if (/^\s*(?:\d+\.\s+)?```/.test(originalLine)) {
      inCodeFence = !inCodeFence;
      output.push(originalLine);
      continue;
    }

    if (inCodeFence) {
      output.push(originalLine);
      continue;
    }

    let line = originalLine;
    let match = line.match(/^(\s*)(\d+)\.\s+\*\*(\d+)(、|\.(?!\d))\s*(.*)$/);
    if (match) {
      const [, indent, automaticNumber, writtenNumber, separator, rest] = match;
      line =
        automaticNumber === writtenNumber
          ? `${indent}${automaticNumber}. **${rest}`
          : `${indent}- **${writtenNumber}${separator}${rest}`;
    } else {
      match = line.match(/^(\s*)(\d+)\.\s+(\d+)(、|\.(?!\d))\s*(.*)$/);
      if (match) {
        const [, indent, automaticNumber, writtenNumber, separator, rest] =
          match;
        line =
          automaticNumber === writtenNumber
            ? `${indent}${automaticNumber}. ${rest}`
            : `${indent}- ${writtenNumber}${separator}${rest}`;
      }
    }

    match = line.match(/^(\s*)\d+\.\s+\s*([（(])([0-9０-９]+)([）)])(.*)$/);
    if (match) {
      const [, indent, opening, number, closing, rest] = match;
      line = `${indent}- ${opening}${number}${closing}${rest}`;
    }

    match = line.match(/^(\s*)\d+\.\s+\s*([①②③④⑤⑥⑦⑧⑨⑩])(.*)$/);
    if (match && circledNumbers.has(match[2])) {
      const [, indent, number, rest] = match;
      line = `${indent}- ${number}${rest}`;
    }

    match = line.match(/^(\s*)\d+\.\s+>\s?(.*)$/);
    if (match) {
      const [, indent, rest] = match;
      line = `${indent}> ${rest}`;
    }

    match = line.match(/^(\s*)\d+\.\s+(`比如`.*)$/);
    if (match) {
      const [, indent, rest] = match;
      line = `${indent}- ${rest}`;
    }

    output.push(line);
  }

  return output.join('\n');
}

function mergeDetachedColons(markdown) {
  const output = [];
  let inCodeFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*(?:\d+\.\s+)?```/.test(line)) {
      inCodeFence = !inCodeFence;
      output.push(line);
      continue;
    }

    if (!inCodeFence && /^\s*：/.test(line)) {
      while (output.at(-1) === '') output.pop();
      if (output.length > 0) {
        output[output.length - 1] = `${output.at(-1).trimEnd()}${line.trim()}`;
        continue;
      }
    }

    output.push(line);
  }

  return output.join('\n');
}

function spaceCustomContainers(markdown) {
  const directive =
    /^:{3,4}(?:\s*(?:info|tip|warning|danger|note))?(?:\[[^\]]*\])?\s*$/;
  const output = [];
  let inCodeFence = false;

  for (const line of markdown.split('\n')) {
    if (/^\s*(?:\d+\.\s+)?```/.test(line)) {
      inCodeFence = !inCodeFence;
      output.push(line);
      continue;
    }

    if (!inCodeFence && directive.test(line.trim())) {
      if (output.length > 0 && output.at(-1) !== '') output.push('');
      output.push(line.trim());
      output.push('');
      continue;
    }

    output.push(line);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function normalizeGongkaoContent(markdown, sourcePath = '') {
  const normalizedPath = sourcePath.replaceAll('\\', '/');
  let result = markdown.replace(
    /^(\s*)\d+\.\s+```\s*\n\s*([^`\n]{1,20})\s*\n\s*```[：:]?\s*$/gm,
    (_match, indent, label) =>
      `${indent}**${label.trim().replace(/[：:]$/, '')}：**`,
  );
  result = repairGrowthFormulas(result, normalizedPath);

  if (normalizedPath === '申论/03题型详解/文章写作.md') {
    result = repairArticleWriting(result);
  }

  result = normalizeListMarkers(result);
  result = mergeDetachedColons(result);
  result = spaceCustomContainers(result);

  return result;
}
