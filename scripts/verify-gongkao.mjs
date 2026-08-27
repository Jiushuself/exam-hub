import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeGongkaoContent } from './gongkao-content-normalizer.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.resolve(process.argv[2] ?? '');
const gongkaoRoot = path.join(projectRoot, 'docs', 'knowledge', 'gongkao');
const publicRoot = path.join(projectRoot, 'docs', 'public');
const manifestPath = path.join(
  projectRoot,
  'artifacts',
  'gongkao-source-manifest.json',
);
const errors = [];

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error(
    '请传入 vsakib/sakib 仓库路径，例如：npm run verify:gongkao -- D:\\path\\to\\sakib',
  );
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function check(condition, message) {
  if (!condition) errors.push(message);
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function frontmatterValue(markdown, field) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const rawValue = frontmatter.match(
    new RegExp(`^${field}:\\s*(.+)$`, 'm'),
  )?.[1];
  if (!rawValue) return '';
  if (!rawValue.startsWith('"')) return rawValue;
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue.slice(1, -1);
  }
}

function normalizeSourceCompatibility(markdown, sourcePath) {
  const compatible = markdown
    .split('\n')
    .map((line) => {
      const legacyHeadingLink = line.indexOf('[](https://sakib.hidns.co/');
      if (legacyHeadingLink === -1) return line;

      const heading = line.slice(0, legacyHeadingLink).trimEnd();
      const malformedSuffix = line
        .slice(legacyHeadingLink)
        .match(/\.\s+(\*\*.+)$/)?.[1];
      return malformedSuffix ? `${heading}\n\n${malformedSuffix}` : heading;
    })
    .join('\n')
    .replace(
      /https:\/\/sakib-img\.pages\.dev\/file\/(\d+_img) \((\d+)\)\.png/g,
      'https://sakib-img.pages.dev/file/$1%20%28$2%29.png',
    )
    .replace(/\[([^\]\n]+)\]\(javascript:void\(0\)\)/g, '$1')
    .replace(/带入排除/g, '代入排除');

  return normalizeGongkaoContent(compatible, sourcePath);
}

function visibleFragments(markdown, isSource = false, sourcePath = '') {
  let text = stripFrontmatter(markdown).replace(/\r\n?/g, '\n');
  if (isSource) text = normalizeSourceCompatibility(text, sourcePath);

  text = text
    .replace(
      /<span class="gongkao-missing-image"[^>]*>[\s\S]*?<\/span>/gi,
      '\n',
    )
    .replace(/\{\s*target=["']_blank["']\s*\}/g, '')
    .replace(/data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+/g, '')
    .replace(/!\[[^\]\n]*\]\([^\n]*\)/g, '\n')
    .replace(/<img\b[^>]*>/gi, '\n')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(
      /<\/(?:blockquote|details|div|h[1-6]|li|ol|p|summary|table|td|th|tr|ul)>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\((?:[^()\n]|\([^()\n]*\))*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/&(?:nbsp|ensp|emsp);/gi, ' ')
    .replace(/&#(?:x[0-9a-f]+|\d+);/gi, ' ')
    .replace(/&[a-z]+;/gi, ' ');

  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\d+[.)、]\s*/, '')
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}]+/gu, '')
        .trim(),
    )
    .filter((line) => line.length >= 10);
}

function countPattern(markdown, pattern) {
  return [...markdown.matchAll(pattern)].length;
}

function commonDirectory(files) {
  const parts = files.map((file) => path.dirname(file).split(path.sep));
  const common = [];
  for (
    let index = 0;
    index < Math.min(...parts.map((item) => item.length));
    index += 1
  ) {
    if (!parts.every((item) => item[index] === parts[0][index])) break;
    common.push(parts[0][index]);
  }
  return common.join(path.sep);
}

const remoteUrl = execFileSync(
  'git',
  ['-C', sourceRoot, 'config', '--get', 'remote.origin.url'],
  { encoding: 'utf8' },
).trim();
const sourceCommit = execFileSync(
  'git',
  ['-C', sourceRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

check(
  /github\.com[/:]vsakib\/sakib(?:\.git)?$/i.test(remoteUrl),
  `来源仓库不匹配：${remoteUrl}`,
);
check(sourceCommit === manifest.commit, '源仓库提交与清单提交不一致');
check(manifest.markdownFiles === manifest.files.length, '清单文件计数不一致');

const manifestSources = new Set(manifest.files.map((entry) => entry.source));
const moduleNames = [
  ...new Set(manifest.files.map((entry) => entry.source.split('/')[0])),
];
const sourceFiles = moduleNames
  .flatMap((moduleName) => walk(path.join(sourceRoot, moduleName)))
  .filter((file) => file.endsWith('.md'));

const publicDocumentationFiles = walk(path.join(projectRoot, 'docs')).filter(
  (file) => /\.(?:html|md|mdx|json)$/i.test(file),
);
const publicRepositoryMentions = publicDocumentationFiles.flatMap((file) => {
  const content = readFileSync(file, 'utf8');
  return /vsakib|github\.com\/vsakib|0634f718|sakib\.hidns|sakib-img/i.test(
    content,
  )
    ? [toPosix(path.relative(projectRoot, file))]
    : [];
});
check(
  publicRepositoryMentions.length === 0,
  `公开站点仍包含来源仓库标识：${publicRepositoryMentions.join('、')}`,
);
const sourceRelativeFiles = new Set(
  sourceFiles.map((file) => toPosix(path.relative(sourceRoot, file))),
);

for (const source of sourceRelativeFiles) {
  check(manifestSources.has(source), `源文件未写入清单：${source}`);
}
for (const source of manifestSources) {
  check(sourceRelativeFiles.has(source), `清单包含不存在的源文件：${source}`);
}

const outputFiles = manifest.files.map((entry) =>
  path.resolve(projectRoot, entry.output),
);
check(new Set(outputFiles).size === outputFiles.length, '清单存在重复输出路径');

let hashMismatch = 0;
let missingOutput = 0;
let visibleFragmentCount = 0;
const missingVisibleFragments = [];
let perPageAttributions = 0;
let remoteOutputImages = 0;
let localAssetReferences = 0;
let missingLocalAssets = 0;
let descriptionViolations = 0;
let sourceDetails = 0;
let outputDetails = 0;
let sourceCodeFences = 0;
let outputCodeFences = 0;
let sourceTableRows = 0;
let outputTableRows = 0;
let sourceRemoteImages = 0;
let sourceEmbeddedImages = 0;
let outputMissingImageMarkers = 0;
let sourceMindmaps = 0;
let outputMindmaps = 0;
let redundantListMarkers = 0;
let detachedColons = 0;
let malformedGrowthFormulas = 0;
let brokenLatexEscapes = 0;
let replacementCharacters = 0;
let unbalancedMathFiles = 0;
let unspacedContainerMarkers = 0;

for (const entry of manifest.files) {
  const sourceFile = path.join(sourceRoot, ...entry.source.split('/'));
  const outputFile = path.resolve(projectRoot, entry.output);
  const sourceMarkdown = readFileSync(sourceFile, 'utf8');

  if (sha256(sourceMarkdown) !== entry.sourceSha256) hashMismatch += 1;
  if (!existsSync(outputFile)) {
    missingOutput += 1;
    continue;
  }

  const outputMarkdown = readFileSync(outputFile, 'utf8');
  const outputPlainText = visibleFragments(outputMarkdown).join('');
  const sourceFragments = visibleFragments(sourceMarkdown, true, entry.source);
  visibleFragmentCount += sourceFragments.length;

  for (const fragment of sourceFragments) {
    if (!outputPlainText.includes(fragment)) {
      missingVisibleFragments.push({
        source: entry.source,
        fragment: fragment.slice(0, 80),
      });
    }
  }

  perPageAttributions += countPattern(
    outputMarkdown,
    /^>\s*\*\*内容来源\*\*：/gm,
  );
  remoteOutputImages += countPattern(
    outputMarkdown,
    /(?:!\[[^\]]*\]\(|<img\b[^>]*\bsrc=["'])https?:\/\//gi,
  );
  outputMissingImageMarkers += countPattern(
    outputMarkdown,
    /class="gongkao-missing-image"/g,
  );

  for (const match of outputMarkdown.matchAll(
    /(?:!\[[^\]]*\]\(|<img\b[^>]*\bsrc=["'])(\/gongkao-assets\/[^)"'\s]+)/gi,
  )) {
    localAssetReferences += 1;
    if (!existsSync(path.join(publicRoot, match[1].slice(1)))) {
      missingLocalAssets += 1;
    }
  }

  const descriptionLength = [...frontmatterValue(outputMarkdown, 'description')]
    .length;
  if (descriptionLength < 50 || descriptionLength > 160) {
    descriptionViolations += 1;
  }

  sourceDetails += countPattern(sourceMarkdown, /<details\b/gi);
  outputDetails += countPattern(outputMarkdown, /<details\b/gi);
  sourceCodeFences += countPattern(sourceMarkdown, /^```/gm);
  outputCodeFences += countPattern(outputMarkdown, /^```/gm);
  sourceTableRows += countPattern(sourceMarkdown, /^\s*\|.*\|\s*$/gm);
  outputTableRows += countPattern(outputMarkdown, /^\s*\|.*\|\s*$/gm);
  sourceRemoteImages += countPattern(
    sourceMarkdown,
    /!\[[^\]\n]*\]\(\s*https?:\/\//g,
  );
  sourceRemoteImages += countPattern(
    sourceMarkdown,
    /<img\b[^>]*\bsrc=["']https?:\/\//gi,
  );
  sourceEmbeddedImages += countPattern(
    sourceMarkdown,
    /data:image\/(?:png|jpeg|gif|webp);base64,/g,
  );
  sourceMindmaps += countPattern(
    sourceMarkdown,
    /<iframe\b[^>]*\bsrc=["'][^"']*思维导图\/[^"']+\.html/gi,
  );
  outputMindmaps += countPattern(
    outputMarkdown,
    /<iframe\b[^>]*\bsrc=["']\/gongkao-mindmaps\/[^"']+\.html/gi,
  );

  redundantListMarkers += countPattern(
    outputMarkdown,
    /^[ \t]*\d+\.[ \t]+(?:\*\*\d+(?:、|\.(?!\d))|\d+(?:、|\.(?!\d))|[ \t]*[（(][0-9０-９]+[）)]|[ \t]*[①②③④⑤⑥⑦⑧⑨⑩])/gm,
  );
  detachedColons += countPattern(outputMarkdown, /^\s*：/gm);
  malformedGrowthFormulas += countPattern(
    outputMarkdown,
    /现期量增长率现期量1\+增长率|现期现期1\+n|16636\.151\+0\.2%|35357\.261\+6\.4%/g,
  );
  brokenLatexEscapes += countPattern(outputMarkdown, /\text\{/g);
  replacementCharacters += countPattern(outputMarkdown, /�/g);

  const markdownWithoutCodeFences = outputMarkdown.replace(
    /```[\s\S]*?```/g,
    '',
  );
  if (countPattern(markdownWithoutCodeFences, /(?<!\\)\$/g) % 2 !== 0) {
    unbalancedMathFiles += 1;
  }

  const outputLines = outputMarkdown.split('\n');
  const containerMarker =
    /^:{3,4}(?:\s*(?:info|tip|warning|danger|note))?(?:\[[^\]]*\])?\s*$/;
  for (let index = 0; index < outputLines.length; index += 1) {
    if (!containerMarker.test(outputLines[index].trim())) continue;
    if (index > 0 && outputLines[index - 1] !== '') {
      unspacedContainerMarkers += 1;
    }
    if (index + 1 < outputLines.length && outputLines[index + 1] !== '') {
      unspacedContainerMarkers += 1;
    }
  }
}

check(hashMismatch === 0, `${hashMismatch} 个源文件哈希不匹配`);
check(missingOutput === 0, `${missingOutput} 个站内输出文件不存在`);
check(
  missingVisibleFragments.length === 0,
  `${missingVisibleFragments.length} 个源正文片段未在站内输出中找到`,
);
check(perPageAttributions === 0, '文章开头仍存在逐篇内容来源说明');
check(remoteOutputImages === 0, '正文仍存在远程图片引用');
check(missingLocalAssets === 0, '正文引用了不存在的本地图片');
check(descriptionViolations === 0, '存在不符合长度要求的 description');
check(sourceDetails === outputDetails, '折叠块数量与源仓库不一致');
check(sourceCodeFences === outputCodeFences, '代码围栏数量与源仓库不一致');
check(sourceTableRows === outputTableRows, 'Markdown 表格行数与源仓库不一致');
check(
  sourceRemoteImages + sourceEmbeddedImages ===
    localAssetReferences + outputMissingImageMarkers,
  '图片引用总数与源仓库不一致',
);
check(sourceMindmaps === outputMindmaps, '思维导图引用数量与源仓库不一致');
check(redundantListMarkers === 0, '正文仍存在重复序号');
check(detachedColons === 0, '正文仍存在脱离上文的冒号');
check(malformedGrowthFormulas === 0, '正文仍存在已知的损坏公式文本');
check(brokenLatexEscapes === 0, '正文仍存在损坏的 LaTeX 转义字符');
check(replacementCharacters === 0, '正文仍存在 Unicode 替换字符');
check(unbalancedMathFiles === 0, '正文仍存在未配对的数学公式分隔符');
check(unspacedContainerMarkers === 0, '提示容器标记前后缺少空行');
check(
  outputMissingImageMarkers === manifest.unresolvedRemoteImages,
  '失效图片提示数量与清单不一致',
);

let missingNavigationEntries = 0;
let deadNavigationEntries = 0;
const metaFiles = walk(gongkaoRoot).filter(
  (file) => path.basename(file) === '_meta.json',
);

for (const metaFile of metaFiles) {
  const directory = path.dirname(metaFile);
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const names = new Set(
    meta
      .map((item) => (typeof item === 'string' ? item : item.name))
      .filter(Boolean),
  );

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      /\.mdx?$/.test(entry.name) &&
      !names.has(entry.name.replace(/\.mdx?$/, ''))
    ) {
      missingNavigationEntries += 1;
    }
    if (
      entry.isDirectory() &&
      walk(path.join(directory, entry.name)).some((file) =>
        /\.mdx?$/.test(file),
      ) &&
      !names.has(entry.name)
    ) {
      missingNavigationEntries += 1;
    }
  }

  for (const item of meta) {
    const name = typeof item === 'string' ? item : item.name;
    if (!name) continue;
    const fileExists = ['.md', '.mdx'].some((extension) =>
      existsSync(path.join(directory, `${name}${extension}`)),
    );
    const directoryPath = path.join(directory, name);
    const directoryExists =
      existsSync(directoryPath) && statSync(directoryPath).isDirectory();
    if (!fileExists && !directoryExists) deadNavigationEntries += 1;
  }
}

check(missingNavigationEntries === 0, '侧边栏存在未收录页面或目录');
check(deadNavigationEntries === 0, '侧边栏存在无效页面或目录');

let remoteImageMapMissing = 0;
for (const { localUrl } of manifest.remoteImages) {
  if (!existsSync(path.join(publicRoot, localUrl.slice(1)))) {
    remoteImageMapMissing += 1;
  }
}
check(remoteImageMapMissing === 0, '远程图片映射指向不存在的本地文件');

const siteMarkdownFiles = walk(gongkaoRoot).filter((file) =>
  /\.mdx?$/.test(file),
);
const mappedOutputs = new Set(outputFiles.map((file) => path.resolve(file)));
const extraSitePages = siteMarkdownFiles
  .filter((file) => !mappedOutputs.has(path.resolve(file)))
  .map((file) => toPosix(path.relative(gongkaoRoot, file)));

const moduleCounts = {};
for (const moduleName of moduleNames) {
  const moduleEntries = manifest.files.filter((entry) =>
    entry.source.startsWith(`${moduleName}/`),
  );
  const moduleOutputFiles = moduleEntries.map((entry) =>
    path.resolve(projectRoot, entry.output),
  );
  const moduleOutputRoot = commonDirectory(moduleOutputFiles);
  moduleCounts[moduleName] = {
    source: sourceFiles.filter(
      (file) =>
        toPosix(path.relative(sourceRoot, file)).split('/')[0] === moduleName,
    ).length,
    mapped: moduleEntries.length,
    site: walk(moduleOutputRoot).filter((file) => /\.mdx?$/.test(file)).length,
  };
}

const summary = {
  sourceMarkdownFiles: sourceFiles.length,
  mappedMarkdownFiles: manifest.files.length,
  siteMarkdownPages: siteMarkdownFiles.length,
  extraSitePages,
  moduleCounts,
  sourceHashes: {
    checked: manifest.files.length,
    mismatches: hashMismatch,
  },
  visibleTextCoverage: {
    checkedFragments: visibleFragmentCount,
    missingFragments: missingVisibleFragments.length,
    percent:
      visibleFragmentCount === 0
        ? 100
        : Number(
            (
              ((visibleFragmentCount - missingVisibleFragments.length) /
                visibleFragmentCount) *
              100
            ).toFixed(4),
          ),
    sampleMissing: missingVisibleFragments.slice(0, 10),
  },
  structure: {
    details: { source: sourceDetails, site: outputDetails },
    codeFences: { source: sourceCodeFences, site: outputCodeFences },
    markdownTableRows: { source: sourceTableRows, site: outputTableRows },
  },
  formatting: {
    redundantListMarkers,
    detachedColons,
    malformedGrowthFormulas,
    brokenLatexEscapes,
    replacementCharacters,
    unbalancedMathFiles,
    unspacedContainerMarkers,
  },
  media: {
    sourceRemoteReferences: sourceRemoteImages,
    sourceEmbeddedImages,
    localAssetReferences,
    localizedRemoteAssets: manifest.remoteImageAssets,
    unresolvedReferences: outputMissingImageMarkers,
    missingLocalAssets,
    remoteOutputImages,
    mindmaps: { source: sourceMindmaps, site: outputMindmaps },
  },
  navigation: {
    metaFiles: metaFiles.length,
    missingEntries: missingNavigationEntries,
    deadEntries: deadNavigationEntries,
  },
  perPageAttributions,
  publicRepositoryMentions,
  descriptionViolations,
  errors,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length > 0) process.exit(1);
