import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.resolve(process.argv[2] || '');
const knowledgeRoot = path.join(
  projectRoot,
  'docs',
  'knowledge',
  'kaoyan',
  '408',
  'data-structure',
);
const manifestPath = path.join(
  projectRoot,
  'artifacts',
  'cs-408-data-structure-source-manifest.json',
);

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error(
    '请传入与导入时相同的 cs-408 仓库路径，例如：npm run verify:cs408-data-structure -- D:\\path\\to\\cs-408',
  );
}
if (!existsSync(manifestPath)) {
  throw new Error('缺少迁移清单：' + manifestPath);
}

const remoteUrl = execFileSync(
  'git',
  ['-C', sourceRoot, 'config', '--get', 'remote.origin.url'],
  { encoding: 'utf8' },
).trim();
if (!/github\.com[/:]suhan42\/cs-408(?:\.git)?$/i.test(remoteUrl)) {
  throw new Error('来源仓库不匹配：' + remoteUrl);
}

const sourceCommit = execFileSync(
  'git',
  ['-C', sourceRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.commit !== sourceCommit) {
  throw new Error(
    '源仓库提交不一致：清单为 ' +
      manifest.commit +
      '，当前为 ' +
      sourceCommit +
      '。请重新导入。',
  );
}

const dataDirectoryCandidates = readdirSync(sourceRoot, {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory() && entry.name.startsWith('数据结构'));
if (dataDirectoryCandidates.length !== 1) {
  throw new Error(
    '未能唯一定位数据结构目录，找到：' +
      (dataDirectoryCandidates.map((entry) => entry.name).join('、') || '无'),
  );
}
const sourceDataRoot = path.join(sourceRoot, dataDirectoryCandidates[0].name);

const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});
const toPosix = (value) => value.split(path.sep).join('/');
const sha256 = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const fencePattern = new RegExp(
  '^\\s*(?:' + String.fromCharCode(96).repeat(3) + '|~~~)',
);

function listFiles(directory, extensionPattern) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => collator.compare(left.name, right.name))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? listFiles(fullPath, extensionPattern)
        : extensionPattern.test(entry.name)
          ? [fullPath]
          : [];
    });
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function stripReferenceSections(markdown) {
  const lines = markdown.split('\n');
  const output = [];
  let referenceLevel = null;
  let inFence = false;

  for (const line of lines) {
    if (fencePattern.test(line)) {
      inFence = !inFence;
      if (referenceLevel === null) output.push(line);
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!inFence && heading) {
      const level = heading[1].length;
      const headingText = heading[2]
        .replace(/[*_~=]/g, '')
        .replace(/(?:❗|⚠️)/gu, '')
        .trim();
      if (referenceLevel !== null && level <= referenceLevel) {
        referenceLevel = null;
      }
      if (/^(?:总)?参考(?:资料|链接|文献)?$/i.test(headingText)) {
        referenceLevel = level;
        continue;
      }
    }

    if (referenceLevel === null) output.push(line);
  }

  return output.join('\n');
}

function plainText(markdown) {
  return stripReferenceSections(stripFrontmatter(markdown))
    .replace(/^\s*\[toc\]\s*$/gim, '')
    .replace(/^>\s*Suhan\s*$/gim, '')
    .replace(
      new RegExp(
        '^\\s*(?:' + String.fromCharCode(96).repeat(3) + '|~~~)[^\\n]*$',
        'gm',
      ),
      '',
    )
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<\/?(?:u|mark|span|img|br|details|summary)\b[^>]*>/gi, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/[^\s)>'"]+/g, '')
    .replace(new RegExp('[' + String.fromCharCode(96) + '*_~=]', 'g'), '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function comparableText(value) {
  return value
    .replace(/\\[A-Za-z]+/g, '')
    .replace(/[^0-9A-Za-z\u4e00-\u9fff]+/gi, '')
    .toLowerCase();
}

function meaningfulFragments(markdown) {
  return plainText(markdown)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*+]\s+|\d+[.)、]\s+)/, '').trim())
    .filter((line) => line.length >= 8)
    .filter((line) => !/^\|?\s*[:-]+(?:\s*\|\s*[:-]+)+\s*\|?$/.test(line))
    .filter((line) => !/^图片暂不可用/.test(line))
    .filter((line) => !/imgs-DS|data-structure-assets/.test(line))
    .filter((line) => !/[\\$]/.test(line))
    .map((line) => comparableText(line).slice(0, 32))
    .filter((line) => line.length >= 8);
}

const sourceFiles = listFiles(sourceDataRoot, /\.(md|mdx)$/i);
if (sourceFiles.length !== manifest.markdownFiles) {
  throw new Error(
    '源数据结构 Markdown 数量不一致：清单 ' +
      manifest.markdownFiles +
      '，当前 ' +
      sourceFiles.length +
      '。',
  );
}
if (manifest.files.length !== sourceFiles.length) {
  throw new Error(
    '迁移条目数量不一致：清单 ' +
      manifest.files.length +
      '，源文件 ' +
      sourceFiles.length +
      '。',
  );
}

const bySource = new Map(manifest.files.map((entry) => [entry.source, entry]));
let sourceFragments = 0;
let matchedFragments = 0;
const mismatches = [];
for (const sourceFile of sourceFiles) {
  const relativeSource = toPosix(path.relative(sourceDataRoot, sourceFile));
  const entry = bySource.get(relativeSource);
  if (!entry) throw new Error('迁移清单缺少源文件：' + relativeSource);
  const expected = path.resolve(knowledgeRoot, relativeSource);
  const actual = path.resolve(projectRoot, entry.output);
  if (actual !== expected) {
    throw new Error('输出路径错误：' + relativeSource + ' -> ' + entry.output);
  }
  if (!existsSync(actual)) throw new Error('缺少站内页面：' + entry.output);
  const sourceMarkdown = readFileSync(sourceFile, 'utf8');
  if (sha256(sourceMarkdown) !== entry.sourceSha256) {
    throw new Error('源文件校验失败：' + relativeSource);
  }
  const outputMarkdown = readFileSync(actual, 'utf8');
  const fragments = meaningfulFragments(sourceMarkdown);
  sourceFragments += fragments.length;
  const outputCompact = comparableText(plainText(outputMarkdown));
  const unmatched = fragments.filter(
    (fragment) => !outputCompact.includes(fragment),
  );
  mismatches.push(
    ...unmatched
      .slice(0, 3)
      .map((fragment) => relativeSource + ': ' + fragment),
  );
  matchedFragments += fragments.length - unmatched.length;
}

const expectedGenerated = new Set([
  'index.md',
  '_meta.json',
  ...sourceFiles.map((sourceFile) =>
    toPosix(path.relative(sourceDataRoot, sourceFile)),
  ),
]);
const actualKnowledgeFiles = new Set(
  listFiles(knowledgeRoot, /\.(md|mdx|json)$/i).map((filePath) =>
    toPosix(path.relative(knowledgeRoot, filePath)),
  ),
);
for (const output of actualKnowledgeFiles) {
  if (!expectedGenerated.has(output)) {
    throw new Error('数据结构目录出现未登记文件：' + output);
  }
}
for (const output of expectedGenerated) {
  if (!actualKnowledgeFiles.has(output)) {
    throw new Error('数据结构目录缺少文件：' + output);
  }
}

const publicText = [...actualKnowledgeFiles]
  .filter((file) => /\.(md|mdx)$/i.test(file))
  .map((file) => readFileSync(path.join(knowledgeRoot, file), 'utf8'))
  .join('\n');
for (const pattern of [/github\.com/i, /suhan42/i, /https?:\/\//i]) {
  if (pattern.test(publicText)) {
    throw new Error('站内数据结构页面含有不应出现的外部标识：' + pattern);
  }
}

const assetReferences = [
  ...publicText.matchAll(
    /(?:src|\])(?:=|\]\()?["']?(\/kaoyan-408-data-structure-assets\/[^\s"')>]+)/g,
  ),
].map((match) => match[1]);
const missingAssets = [...new Set(assetReferences)].filter(
  (assetUrl) =>
    !existsSync(path.join(projectRoot, 'docs', 'public', assetUrl.slice(1))),
);
if (missingAssets.length) {
  throw new Error('站内图片资源缺失：' + missingAssets.join('、'));
}

if (manifest.missingLocalImages?.length) {
  throw new Error(
    '源仓库本地图片缺失：' + manifest.missingLocalImages.join('、'),
  );
}

const percentage = sourceFragments
  ? ((matchedFragments / sourceFragments) * 100).toFixed(2)
  : '100.00';
if (matchedFragments !== sourceFragments) {
  throw new Error(
    '正文可见覆盖率不足：' +
      matchedFragments +
      '/' +
      sourceFragments +
      '（' +
      percentage +
      '%）。\n' +
      mismatches.slice(0, 10).join('\n'),
  );
}

console.log(
  JSON.stringify(
    {
      sourceCommit,
      sourceDirectory: dataDirectoryCandidates[0].name,
      sourceMarkdownFiles: sourceFiles.length,
      mappedMarkdownFiles: manifest.files.length,
      visibleFragments: matchedFragments + '/' + sourceFragments,
      visibleCoverage: percentage + '%',
      localImageSources: manifest.localImageSources,
      localImageAssets: manifest.localImageAssets,
      remoteImageSourceUrls: manifest.remoteImageSourceUrls,
      remoteImageAssets: manifest.remoteImageAssets,
      unresolvedRemoteImages: manifest.unresolvedRemoteImages,
      pageCount: actualKnowledgeFiles.size,
    },
    null,
    2,
  ),
);
