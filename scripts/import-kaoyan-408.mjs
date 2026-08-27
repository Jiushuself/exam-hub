import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
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
const publicAssetsRoot = path.join(
  projectRoot,
  'docs',
  'public',
  'kaoyan-408-assets',
);
const sourceManifestPath = path.join(
  projectRoot,
  'artifacts',
  'kaoyan-408-source-manifest.json',
);

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error(
    '请传入 LYuYang61/408 仓库路径，例如：npm run import:kaoyan408 -- D:\\path\\to\\408',
  );
}

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

const previousManifest = existsSync(sourceManifestPath)
  ? JSON.parse(readFileSync(sourceManifestPath, 'utf8'))
  : null;
const previousImageByUrl = new Map(
  previousManifest?.commit === sourceCommit
    ? (previousManifest.remoteImages ?? []).map(({ sourceUrl, localUrl }) => [
        sourceUrl,
        localUrl,
      ])
    : [],
);

const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});
const toPosix = (value) => value.split(path.sep).join('/');
const sha256 = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const sha256Buffer = (value) =>
  createHash('sha256').update(value).digest('hex');

const subjects = [
  {
    source: '数据结构',
    destination: 'data-structure',
    label: '数据结构',
  },
  {
    source: '计算机组成原理',
    destination: 'computer-organization',
    label: '计算机组成原理',
  },
  {
    source: '操作系统',
    destination: 'operating-system',
    label: '操作系统',
  },
  {
    source: '计算机网络',
    destination: 'computer-network',
    label: '计算机网络',
  },
];
const subjectBySource = new Map(
  subjects.map((subject) => [subject.source, subject]),
);

const markdownImagePattern =
  /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g;
const htmlImagePattern =
  /(<img\b[^>]*\bsrc=["'])(https?:\/\/[^"']+)(["'][^>]*>)/gi;

function listMarkdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => collator.compare(left.name, right.name))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listMarkdownFiles(fullPath) : [fullPath];
    })
    .filter((filePath) => /\.(md|mdx)$/i.test(filePath));
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function displayName(name) {
  return name
    .replace(/\.(md|mdx)$/i, '')
    .replace(/^README$/i, '408 笔记说明')
    .trim();
}

function plainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[\*_`~=]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageDescription(subjectLabel, title, markdown) {
  const headings = [...markdown.matchAll(/^#{2,6}\s+(.+)$/gm)]
    .map((match) => plainText(match[1]))
    .filter(Boolean)
    .filter((heading, index, all) => all.indexOf(heading) === index)
    .slice(0, 4);
  if (!markdown.trim()) {
    return `计算机 408「${title}」章节页，当前源文档未包含正文内容，保留章节位置以便后续补充。`;
  }
  const coverage = headings.length
    ? `涵盖${headings.join('、')}等内容`
    : '整理源文档中的核心概念、公式、图示与例题';
  const description = `计算机 408${subjectLabel ? `·${subjectLabel}` : ''}「${title}」知识笔记，${coverage}，适合系统复习、章节回顾与查漏补缺。`;
  return description.length > 155
    ? `${description.slice(0, 154).replace(/[，、；：]$/, '')}。`
    : description;
}

function outputPathForSource(relativeSource) {
  if (relativeSource === 'README.md')
    return path.join(knowledgeRoot, 'index.md');
  if (relativeSource === '考研经验分享.md') {
    return path.join(knowledgeRoot, 'experience', '考研经验分享.md');
  }

  const [topLevel, ...rest] = relativeSource.split(/[\\/]/);
  const subject = subjectBySource.get(topLevel);
  if (!subject) throw new Error(`未配置的源目录：${relativeSource}`);
  return path.join(knowledgeRoot, subject.destination, ...rest);
}

function subjectForSource(relativeSource) {
  const [topLevel] = relativeSource.split(/[\\/]/);
  return subjectBySource.get(topLevel) ?? null;
}

function sanitizeMarkdown(markdown) {
  let result = stripFrontmatter(markdown).replace(/\r\n?/g, '\n');

  // 保留图片语法，普通外部链接只保留可读文本；页面不保留源仓库跳转。
  result = result.replace(
    /(?<!!)\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/g,
    '$1',
  );
  result = result
    .replace(/^\t+/gm, (tabs) => '  '.repeat(tabs.length))
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  return result;
}

function stripSourceDisclosure(markdown) {
  return markdown
    .replace(/^### 参考[\s\S]*?(?=^### 注意(?:\s|$))/m, '')
    .replace(/^### 图床更新[\s\S]*$/m, '')
    .trim();
}

function removeBareExternalUrls(markdown) {
  return markdown
    .replace(/(?<!["'(])(https?:\/\/[^\s)>'"]+)/g, '')
    .replace(/^\s*[-*]\s*$/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function writePage({ sourceFile, relativeSource, destinationFile }) {
  const sourceMarkdown = readFileSync(sourceFile, 'utf8');
  const body = sanitizeMarkdown(sourceMarkdown);
  const subject = subjectForSource(relativeSource);
  const title = displayName(path.basename(sourceFile));
  const pageBody =
    body && /^#\s+/.test(body)
      ? body
      : `# ${title}${body ? `\n\n${body}` : ''}`;
  const description = pageDescription(subject?.label ?? '', title, body);
  const output = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n${pageBody.trim()}\n`;
  mkdirSync(path.dirname(destinationFile), { recursive: true });
  writeFileSync(destinationFile, output, 'utf8');
  return { sourceMarkdown, output };
}

function writeSubjectIndex(subject, sourceFiles) {
  const links = sourceFiles
    .map((sourceFile) => {
      const relativeSource = toPosix(path.relative(sourceRoot, sourceFile));
      const output = outputPathForSource(relativeSource);
      const relativeOutput = toPosix(
        path.relative(path.join(knowledgeRoot, subject.destination), output),
      );
      return `- [${displayName(path.basename(sourceFile))}](${relativeOutput.replace(/\.md$/i, '')})`;
    })
    .join('\n');
  const directoryNote = sourceFiles.length
    ? links
    : '当前源目录没有可直接站内阅读的 Markdown 章节；源仓库该科目以 PDF 等二进制资料为主，本次不复制大体积附件。';
  const output = `---\ntitle: ${JSON.stringify(subject.label)}\ndescription: ${JSON.stringify(`计算机 408 · ${subject.label}章节索引，按源文档章节顺序整理知识笔记，便于逐章阅读与复习。`)}\n---\n\n# ${subject.label}\n\n## 章节目录\n\n${directoryNote}\n`;
  const destination = path.join(knowledgeRoot, subject.destination, 'index.md');
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, output, 'utf8');
}

function writeExperienceIndex() {
  const destination = path.join(knowledgeRoot, 'experience', 'index.md');
  const output = `---\ntitle: 考研经验分享\ndescription: 计算机 408 资料中的考研经验分享，单独归档于考研知识库，便于与四门专业课笔记区分阅读。\n---\n\n# 考研经验分享\n\n- [考研经验分享](./考研经验分享)\n`;
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, output, 'utf8');
}

function writeIndex(readmeBody, subjectFiles) {
  const subjectLinks = subjects
    .map((subject) => {
      const count = subjectFiles.get(subject.source)?.length ?? 0;
      const summary = count
        ? `（${count} 篇章节笔记）`
        : '（源目录暂无 Markdown 章节）';
      return `- [${subject.label}](./${subject.destination}/)${summary}`;
    })
    .join('\n');
  const cleanedReadme = stripSourceDisclosure(readmeBody)
    .replace(/^#\s+[^\n]+\n?/m, '')
    .trim();
  const output = `---\ntitle: 计算机 408 知识库\ndescription: 计算机 408 知识库总览，按数据结构、计算机组成原理、操作系统和计算机网络四门科目分开展示章节笔记，并单独归档考研经验分享。\n---\n\n# 计算机 408 知识库\n\n这里将四门专业课分别组织，考公知识点仍位于独立的“考公”目录，两套内容不会混入同一章节树。\n\n## 四门专业课\n\n${subjectLinks}\n\n## 考研经验\n\n- [考研经验分享](./experience/)\n\n## 资料说明\n\n${cleanedReadme || '当前目录保留源文档中的章节说明。'}\n`;
  writeFileSync(path.join(knowledgeRoot, 'index.md'), output, 'utf8');
}

function writeMeta(subjectFiles) {
  const rootMeta = [
    { type: 'file', name: 'index', label: '408 知识库总览' },
    ...subjects.map((subject) => ({
      type: 'dir',
      name: subject.destination,
      label: subject.label,
    })),
    { type: 'dir', name: 'experience', label: '考研经验分享' },
  ];
  writeFileSync(
    path.join(knowledgeRoot, '_meta.json'),
    `${JSON.stringify(rootMeta, null, 2)}\n`,
    'utf8',
  );

  for (const subject of subjects) {
    const files = subjectFiles.get(subject.source) ?? [];
    const meta = [
      { type: 'file', name: 'index', label: `${subject.label}章节索引` },
      ...files.map((sourceFile) => ({
        type: 'file',
        name: path.basename(sourceFile).replace(/\.(md|mdx)$/i, ''),
        label: displayName(path.basename(sourceFile)),
      })),
    ];
    const destination = path.join(knowledgeRoot, subject.destination);
    mkdirSync(destination, { recursive: true });
    writeFileSync(
      path.join(destination, '_meta.json'),
      `${JSON.stringify(meta, null, 2)}\n`,
      'utf8',
    );
  }

  writeFileSync(
    path.join(knowledgeRoot, 'experience', '_meta.json'),
    `${JSON.stringify(
      [
        { type: 'file', name: 'index', label: '经验分享索引' },
        { type: 'file', name: '考研经验分享', label: '考研经验分享' },
      ],
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function cleanupPreviousGeneratedFiles() {
  const generatedPaths = [
    ...(previousManifest?.files ?? []),
    ...(previousManifest?.generated ?? []).map((output) => ({ output })),
  ];
  for (const entry of generatedPaths) {
    const target = path.resolve(projectRoot, entry.output);
    const relative = path.relative(knowledgeRoot, target);
    if (
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative) ||
      !/\.(md|mdx|json)$/i.test(target)
    ) {
      continue;
    }
    if (existsSync(target)) unlinkSync(target);
  }
}

function imageExtension(url, mediaType) {
  const fromType = new Map([
    ['image/avif', 'avif'],
    ['image/gif', 'gif'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/svg+xml', 'svg'],
    ['image/webp', 'webp'],
  ]).get(mediaType.split(';', 1)[0].trim().toLowerCase());
  if (fromType) return fromType;
  const fromUrl = path.extname(new URL(url).pathname).slice(1).toLowerCase();
  if (['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(fromUrl)) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  }
  return 'bin';
}

async function downloadImage(url) {
  const cachedLocalUrl = previousImageByUrl.get(url);
  const cachedFile = cachedLocalUrl
    ? path.join(
        projectRoot,
        'docs',
        'public',
        cachedLocalUrl.replace(/^\//, ''),
      )
    : null;
  if (cachedFile && existsSync(cachedFile)) return cachedLocalUrl;

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'image/*',
        'user-agent': 'exam-hub-content-importer/1.0',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    const mediaType = response.headers.get('content-type') ?? '';
    if (!response.ok || !mediaType.toLowerCase().startsWith('image/')) {
      await response.body?.cancel();
      return null;
    }
    const image = Buffer.from(await response.arrayBuffer());
    if (image.length === 0) return null;
    const filename = `${sha256Buffer(image).slice(0, 20)}.${imageExtension(url, mediaType)}`;
    mkdirSync(publicAssetsRoot, { recursive: true });
    writeFileSync(path.join(publicAssetsRoot, filename), image);
    return `/kaoyan-408-assets/${filename}`;
  } catch {
    return null;
  }
}

async function localizeImages(outputFiles) {
  const urls = [];
  for (const outputFile of outputFiles) {
    const markdown = readFileSync(outputFile, 'utf8');
    for (const match of markdown.matchAll(markdownImagePattern))
      urls.push(match[2]);
    for (const match of markdown.matchAll(htmlImagePattern))
      urls.push(match[2]);
  }
  const uniqueUrls = [...new Set(urls)];
  const localByUrl = new Map();
  let nextIndex = 0;
  const workerCount = Math.min(8, uniqueUrls.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < uniqueUrls.length) {
        const url = uniqueUrls[nextIndex++];
        localByUrl.set(url, await downloadImage(url));
      }
    }),
  );

  for (const outputFile of outputFiles) {
    const markdown = readFileSync(outputFile, 'utf8');
    const localized = markdown
      .replace(markdownImagePattern, (match, alt, url) => {
        const localUrl = localByUrl.get(url);
        return localUrl
          ? `![${alt}](${localUrl})`
          : `<span class="kaoyan-408-missing-image" role="note">图片暂不可用${alt ? `：${alt}` : ''}</span>`;
      })
      .replace(htmlImagePattern, (match, prefix, url, suffix) => {
        const localUrl = localByUrl.get(url);
        return localUrl
          ? `${prefix}${localUrl}${suffix}`
          : '<span class="kaoyan-408-missing-image" role="note">图片暂不可用</span>';
      });
    writeFileSync(outputFile, removeBareExternalUrls(localized), 'utf8');
  }

  return {
    assets: new Set([...localByUrl.values()].filter(Boolean)).size,
    references: urls.length,
    sourceUrls: uniqueUrls.length,
    unresolvedUrls: uniqueUrls.filter((url) => !localByUrl.get(url)),
    files: [...localByUrl]
      .filter((entry) => entry[1])
      .map(([sourceUrl, localUrl]) => ({ sourceUrl, localUrl })),
  };
}

const sourceMarkdownFiles = listMarkdownFiles(sourceRoot);
const subjectFiles = new Map(
  subjects.map((subject) => [
    subject.source,
    sourceMarkdownFiles.filter(
      (filePath) =>
        toPosix(path.relative(sourceRoot, filePath)).split('/')[0] ===
        subject.source,
    ),
  ]),
);
const readmeFile = sourceMarkdownFiles.find(
  (filePath) => toPosix(path.relative(sourceRoot, filePath)) === 'README.md',
);
const experienceFile = sourceMarkdownFiles.find(
  (filePath) =>
    toPosix(path.relative(sourceRoot, filePath)) === '考研经验分享.md',
);

cleanupPreviousGeneratedFiles();
mkdirSync(knowledgeRoot, { recursive: true });

const manifestEntries = [];
const outputFiles = [];
const sourceReadmeBody = readmeFile
  ? sanitizeMarkdown(readFileSync(readmeFile, 'utf8'))
  : '';

for (const sourceFile of sourceMarkdownFiles) {
  const relativeSource = toPosix(path.relative(sourceRoot, sourceFile));
  const destinationFile = outputPathForSource(relativeSource);
  if (relativeSource === 'README.md') {
    continue;
  }
  const { sourceMarkdown } = writePage({
    sourceFile,
    relativeSource,
    destinationFile,
  });
  outputFiles.push(destinationFile);
  manifestEntries.push({
    source: relativeSource,
    output: toPosix(path.relative(projectRoot, destinationFile)),
    sourceSha256: sha256(sourceMarkdown),
  });
}

for (const subject of subjects) {
  const files = subjectFiles.get(subject.source) ?? [];
  const chapterFiles = files.filter(
    (filePath) => path.basename(filePath) !== 'index.md',
  );
  writeSubjectIndex(subject, chapterFiles);
}
writeExperienceIndex();
writeIndex(sourceReadmeBody, subjectFiles);
writeMeta(subjectFiles);
if (readmeFile) {
  manifestEntries.push({
    source: 'README.md',
    output: toPosix(
      path.relative(projectRoot, path.join(knowledgeRoot, 'index.md')),
    ),
    sourceSha256: sha256(readFileSync(readmeFile, 'utf8')),
  });
}
outputFiles.push(
  path.join(knowledgeRoot, 'index.md'),
  ...subjects.map((subject) =>
    path.join(knowledgeRoot, subject.destination, 'index.md'),
  ),
  path.join(knowledgeRoot, 'experience', 'index.md'),
);

const imageStats = await localizeImages(outputFiles);
manifestEntries.sort((left, right) =>
  collator.compare(left.source, right.source),
);
const generatedPaths = [
  path.join(knowledgeRoot, '_meta.json'),
  ...subjects.flatMap((subject) => [
    path.join(knowledgeRoot, subject.destination, '_meta.json'),
    path.join(knowledgeRoot, subject.destination, 'index.md'),
  ]),
  path.join(knowledgeRoot, 'experience', '_meta.json'),
  path.join(knowledgeRoot, 'experience', 'index.md'),
];
mkdirSync(path.dirname(sourceManifestPath), { recursive: true });
writeFileSync(
  sourceManifestPath,
  `${JSON.stringify(
    {
      repository: 'https://github.com/LYuYang61/408',
      commit: sourceCommit,
      markdownFiles: manifestEntries.length,
      remoteImageAssets: imageStats.assets,
      remoteImageReferences: imageStats.references,
      remoteImageSourceUrls: imageStats.sourceUrls,
      unresolvedRemoteImages: imageStats.unresolvedUrls.length,
      unresolvedRemoteImageUrls: imageStats.unresolvedUrls,
      remoteImages: imageStats.files,
      generated: generatedPaths.map((filePath) =>
        toPosix(path.relative(projectRoot, filePath)),
      ),
      files: manifestEntries,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(
  `Imported ${manifestEntries.length} Markdown files and localized ${imageStats.assets}/${imageStats.sourceUrls} image assets.`,
);
