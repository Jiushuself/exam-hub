import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.resolve(process.argv[2] ?? '');
const knowledgeRoot = path.join(
  projectRoot,
  'docs',
  'knowledge',
  'kaoyan',
  '408',
);
const manifestPath = path.join(
  projectRoot,
  'artifacts',
  'kaoyan-408-source-manifest.json',
);
const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});
const toPosix = (value) => value.split(path.sep).join('/');

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error(
    '请传入与导入时相同的 LYuYang61/408 仓库路径，例如：npm run verify:kaoyan408 -- D:\\path\\to\\408',
  );
}
if (!existsSync(manifestPath)) {
  throw new Error(`缺少迁移清单：${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const remoteUrl = execFileSync(
  'git',
  ['-C', sourceRoot, 'config', '--get', 'remote.origin.url'],
  { encoding: 'utf8' },
).trim();
if (!/github\.com[/:]LYuYang61\/408(?:\.git)?$/i.test(remoteUrl)) {
  throw new Error(`来源仓库不匹配：${remoteUrl}`);
}
const sourceCommit = execFileSync(
  'git',
  ['-C', sourceRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
if (manifest.commit !== sourceCommit) {
  throw new Error(
    `源仓库提交不一致：清单为 ${manifest.commit}，当前为 ${sourceCommit}。请重新导入。`,
  );
}

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

function sourceMarkdownFiles() {
  return listFiles(sourceRoot, /\.(md|mdx)$/i);
}

function expectedOutput(relativeSource) {
  if (relativeSource === 'README.md')
    return path.join(knowledgeRoot, 'index.md');
  if (relativeSource === '考研经验分享.md') {
    return path.join(knowledgeRoot, 'experience', '考研经验分享.md');
  }
  const [topLevel, ...rest] = relativeSource.split('/');
  const destination = new Map([
    ['数据结构', 'data-structure'],
    ['计算机组成原理', 'computer-organization'],
    ['操作系统', 'operating-system'],
    ['计算机网络', 'computer-network'],
  ]).get(topLevel);
  if (!destination) throw new Error(`清单中出现未知源目录：${relativeSource}`);
  return path.join(knowledgeRoot, destination, ...rest);
}

function plainText(markdown) {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/[^\s)>'"]+/g, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/\s+#+$/gm, '')
    .replace(/[`*_~]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function meaningfulFragments(markdown) {
  return plainText(markdown)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*+]\s+|\d+[.)、]\s+)/, '').trim())
    .filter((line) => line.length >= 8)
    .filter((line) => !/^\|?\s*[:-]+(?:\s*\|\s*[:-]+)+\s*\|?$/.test(line))
    .filter((line) => !/^图片暂不可用/.test(line))
    .map((line) => line.slice(0, Math.min(80, line.length)));
}

function stripSourceDisclosure(markdown) {
  return markdown
    .replace(/^### 参考[\s\S]*?(?=^### 注意(?:\s|$))/m, '')
    .replace(/^### 图床更新[\s\S]*$/m, '')
    .trim();
}

const sourceFiles = sourceMarkdownFiles();
if (sourceFiles.length !== manifest.markdownFiles) {
  throw new Error(
    `源 Markdown 数量不一致：清单 ${manifest.markdownFiles}，当前 ${sourceFiles.length}。`,
  );
}
if (manifest.files.length !== sourceFiles.length) {
  throw new Error(
    `迁移条目数量不一致：清单 ${manifest.files.length}，源文件 ${sourceFiles.length}。`,
  );
}

const bySource = new Map(manifest.files.map((entry) => [entry.source, entry]));
let sourceFragments = 0;
let matchedFragments = 0;
const mismatches = [];
for (const sourceFile of sourceFiles) {
  const relativeSource = toPosix(path.relative(sourceRoot, sourceFile));
  const entry = bySource.get(relativeSource);
  if (!entry) throw new Error(`迁移清单缺少源文件：${relativeSource}`);
  const expected = expectedOutput(relativeSource);
  const actual = path.resolve(projectRoot, entry.output);
  if (actual !== expected) {
    throw new Error(`输出路径错误：${relativeSource} -> ${entry.output}`);
  }
  if (!existsSync(actual)) throw new Error(`缺少站内页面：${entry.output}`);
  const sourceMarkdown = readFileSync(sourceFile, 'utf8');
  const outputMarkdown = readFileSync(actual, 'utf8');
  const fragments = meaningfulFragments(
    relativeSource === 'README.md'
      ? stripSourceDisclosure(sourceMarkdown)
      : sourceMarkdown,
  );
  sourceFragments += fragments.length;
  const outputText = plainText(outputMarkdown).replace(/\s+/g, ' ');
  const outputCompact = outputText.replace(/\s+/g, '');
  const unmatched = fragments.filter(
    (fragment) =>
      !outputText.includes(fragment) &&
      !outputCompact.includes(fragment.replace(/\s+/g, '')),
  );
  mismatches.push(
    ...unmatched
      .slice(0, 3)
      .map((fragment) => `${relativeSource}: ${fragment}`),
  );
  matchedFragments += fragments.length - unmatched.length;
}

const publicKnowledgeFiles = listFiles(knowledgeRoot, /\.(md|mdx|json)$/i);
const publicText = publicKnowledgeFiles
  .map((filePath) => readFileSync(filePath, 'utf8'))
  .join('\n');
const forbiddenPublicPatterns = [
  /github\.com\/LYuYang61\/408/i,
  /LYuYang61/i,
  /Notes-Images/i,
  /cdn\.jsdelivr\.net/i,
  /sakib/i,
  /xingce|gongkao/i,
];
for (const pattern of forbiddenPublicPatterns) {
  if (pattern.test(publicText)) {
    throw new Error(`站内 408 页面含有不应出现的标识：${pattern}`);
  }
}
if (manifest.unresolvedRemoteImages !== 0) {
  throw new Error(
    `仍有 ${manifest.unresolvedRemoteImages} 个图片地址未能本地化：${manifest.unresolvedRemoteImageUrls.join(', ')}`,
  );
}

const expectedGeneratedIndexes = [
  'index.md',
  'data-structure/index.md',
  'computer-organization/index.md',
  'operating-system/index.md',
  'computer-network/index.md',
  'experience/index.md',
].map((relative) =>
  toPosix(path.join('docs', 'knowledge', 'kaoyan', '408', relative)),
);
const expectedOutputs = new Set([
  ...manifest.files.map((entry) => entry.output),
  ...expectedGeneratedIndexes,
]);
const actualMarkdownOutputs = new Set(
  listFiles(knowledgeRoot, /\.(md|mdx)$/i).map((filePath) =>
    toPosix(path.relative(projectRoot, filePath)),
  ),
);
for (const output of actualMarkdownOutputs) {
  if (!expectedOutputs.has(output))
    throw new Error(`出现未登记的 408 页面：${output}`);
}
for (const output of expectedOutputs) {
  if (output.endsWith('.md') && !actualMarkdownOutputs.has(output)) {
    throw new Error(`缺少登记的 408 页面：${output}`);
  }
}

const percentage = sourceFragments
  ? ((matchedFragments / sourceFragments) * 100).toFixed(2)
  : '100.00';
if (matchedFragments !== sourceFragments) {
  throw new Error(
    `正文可见覆盖率不足：${matchedFragments}/${sourceFragments}（${percentage}%）。\n${mismatches.slice(0, 10).join('\n')}`,
  );
}

console.log(
  JSON.stringify(
    {
      sourceCommit,
      sourceMarkdownFiles: sourceFiles.length,
      mappedMarkdownFiles: manifest.files.length,
      visibleFragments: `${matchedFragments}/${sourceFragments}`,
      visibleCoverage: `${percentage}%`,
      remoteImageReferences: manifest.remoteImageReferences,
      remoteImageAssets: manifest.remoteImageAssets,
      unresolvedRemoteImages: manifest.unresolvedRemoteImages,
      publicPageCount: actualMarkdownOutputs.size,
    },
    null,
    2,
  ),
);
