import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
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
  'data-structure',
);
const publicAssetsRoot = path.join(
  projectRoot,
  'docs',
  'public',
  'kaoyan-408-data-structure-assets',
);
const sourceManifestPath = path.join(
  projectRoot,
  'artifacts',
  'cs-408-data-structure-source-manifest.json',
);

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error(
    '请传入 cs-408 仓库路径，例如：npm run import:cs408-data-structure -- D:\\path\\to\\cs-408',
  );
}

const remoteUrl = execFileSync(
  'git',
  ['-C', sourceRoot, 'config', '--get', 'remote.origin.url'],
  { encoding: 'utf8' },
).trim();

if (!/github\.com[/:]suhan42\/cs-408(?:\.git)?$/i.test(remoteUrl)) {
  throw new Error(`来源仓库不匹配：${remoteUrl}`);
}

const sourceCommit = execFileSync(
  'git',
  ['-C', sourceRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();

const dataDirectoryCandidates = readdirSync(sourceRoot, {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory() && entry.name.startsWith('数据结构'));

if (dataDirectoryCandidates.length !== 1) {
  throw new Error(
    `未能唯一定位数据结构目录，找到：${dataDirectoryCandidates.map((entry) => entry.name).join('、') || '无'}`,
  );
}

const sourceDataRoot = path.join(sourceRoot, dataDirectoryCandidates[0].name);
const previousManifest = existsSync(sourceManifestPath)
  ? JSON.parse(readFileSync(sourceManifestPath, 'utf8'))
  : null;
const previousImages = new Map(
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

function stripReferenceSections(markdown) {
  const lines = markdown.split('\n');
  const output = [];
  let referenceLevel = null;
  let inFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
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

function transformOutsideFences(markdown, transformLine) {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      return inFence ? line : transformLine(line);
    })
    .join('\n');
}

function imageDestination(rawDestination) {
  const value = rawDestination.trim();
  if (!value) return '';
  if (value.startsWith('<')) {
    const closingBracket = value.indexOf('>');
    return closingBracket > 0 ? value.slice(1, closingBracket) : value;
  }
  return value.split(/\s+/)[0];
}

function imageSourceKey(destination, sourceFile) {
  const value = imageDestination(destination);
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    url.hash = '';
    return { kind: 'remote', key: url.toString(), source: url.toString() };
  }

  const relativePath = value
    .split(/[?#]/, 1)[0]
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
  const localPath = path.resolve(path.dirname(sourceFile), relativePath);
  const relativeToSource = path.relative(sourceDataRoot, localPath);
  if (
    relativeToSource.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeToSource)
  ) {
    return null;
  }

  return { kind: 'local', key: localPath, source: localPath };
}

function collectImageSources(
  markdown,
  sourceFile,
  localSources,
  remoteSources,
) {
  const add = (destination) => {
    const source = imageSourceKey(destination, sourceFile);
    if (!source) return;
    if (source.kind === 'local') localSources.add(source.key);
    else remoteSources.add(source.key);
  };

  for (const match of markdown.matchAll(/!\[([^\n]*?)\]\(([^)\n]+)\)/g)) {
    add(match[2]);
  }
  for (const match of markdown.matchAll(
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
  )) {
    add(match[1]);
  }
}

function imageExtension(url, mediaType, fallback = 'bin') {
  const fromType = new Map([
    ['image/avif', 'avif'],
    ['image/apng', 'apng'],
    ['image/gif', 'gif'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/svg+xml', 'svg'],
    ['image/webp', 'webp'],
  ]).get(mediaType.split(';', 1)[0].trim().toLowerCase());
  if (fromType) return fromType;

  const fromUrl = path.extname(new URL(url).pathname).slice(1).toLowerCase();
  if (
    ['apng', 'avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(
      fromUrl,
    )
  ) {
    return fromUrl === 'jpeg' ? 'jpg' : fromUrl;
  }
  return fallback;
}

function saveAsset(buffer, extension) {
  const filename = `${sha256Buffer(buffer).slice(0, 20)}.${extension}`;
  mkdirSync(publicAssetsRoot, { recursive: true });
  const destination = path.join(publicAssetsRoot, filename);
  if (!existsSync(destination)) writeFileSync(destination, buffer);
  return `/kaoyan-408-data-structure-assets/${filename}`;
}

function remoteImageCandidates(source) {
  const candidates = [source];
  try {
    const url = new URL(source);
    const parts = url.pathname.split('/').filter(Boolean);
    const thumbIndex = parts.indexOf('thumb');
    if (thumbIndex >= 0 && thumbIndex < parts.length - 2) {
      const originalPath = parts
        .slice(0, thumbIndex)
        .concat(parts.slice(thumbIndex + 1, -1))
        .join('/');
      candidates.push(url.origin + '/' + originalPath);
    }
  } catch {
    // Invalid URLs are handled as unresolved below.
  }
  return [...new Set(candidates)];
}

function downloadWithCurl(source) {
  return execFileSync(
    'curl.exe',
    ['-sSL', '--fail', '--max-time', '30', source],
    { maxBuffer: 50 * 1024 * 1024 },
  );
}

async function localizeImages(sourceFiles) {
  const localSources = new Set();
  const remoteSources = new Set();

  for (const sourceFile of sourceFiles) {
    collectImageSources(
      readFileSync(sourceFile, 'utf8'),
      sourceFile,
      localSources,
      remoteSources,
    );
  }

  const localImages = new Map();
  const missingLocalImages = [];
  for (const source of localSources) {
    if (!existsSync(source) || !statSync(source).isFile()) {
      missingLocalImages.push(source);
      continue;
    }
    const buffer = readFileSync(source);
    localImages.set(
      source,
      saveAsset(
        buffer,
        imageExtension(
          `file://${source}`,
          '',
          path.extname(source).slice(1) || 'bin',
        ),
      ),
    );
  }

  const remoteImages = new Map();
  const unresolvedRemoteImages = [];
  let completed = 0;
  let nextIndex = 0;
  const remoteList = [...remoteSources];
  const workerCount = Math.min(8, remoteList.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < remoteList.length) {
        const source = remoteList[nextIndex++];
        const cachedLocalUrl = previousImages.get(source);
        const cachedFile = cachedLocalUrl
          ? path.join(
              projectRoot,
              'docs',
              'public',
              cachedLocalUrl.replace(/^\//, ''),
            )
          : null;

        if (cachedFile && existsSync(cachedFile)) {
          remoteImages.set(source, cachedLocalUrl);
          completed += 1;
          continue;
        }

        let localized = false;
        for (const candidate of remoteImageCandidates(source)) {
          try {
            const response = await fetch(candidate, {
              headers: {
                accept: 'image/*',
                'user-agent': 'exam-hub-cs408-data-structure-importer/1.0',
              },
              redirect: 'follow',
              signal: AbortSignal.timeout(30_000),
            });
            const mediaType = response.headers.get('content-type') ?? '';
            const extension = imageExtension(candidate, mediaType);
            const hasImageExtension =
              /\.(apng|avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i.test(candidate);
            const isImage =
              mediaType.toLowerCase().startsWith('image/') ||
              (mediaType.toLowerCase().startsWith('application/octet-stream') &&
                hasImageExtension);
            if (!response.ok || !isImage) {
              await response.body?.cancel();
              continue;
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.length === 0) continue;
            remoteImages.set(source, saveAsset(buffer, extension));
            localized = true;
            break;
          } catch {
            try {
              const buffer = downloadWithCurl(candidate);
              if (buffer.length > 0) {
                remoteImages.set(
                  source,
                  saveAsset(
                    buffer,
                    imageExtension(
                      candidate,
                      '',
                      path.extname(candidate).slice(1) || 'bin',
                    ),
                  ),
                );
                localized = true;
                break;
              }
            } catch {
              // Try the next candidate URL.
            }
          }
        }
        if (!localized) {
          unresolvedRemoteImages.push(source);
        }

        completed += 1;
        if (completed % 20 === 0 || completed === remoteList.length) {
          console.log(`已处理远程图片 ${completed}/${remoteList.length}`);
        }
      }
    }),
  );

  return {
    localImages,
    remoteImages,
    localSources: localSources.size,
    remoteSources: remoteSources.size,
    missingLocalImages,
    unresolvedRemoteImages,
  };
}

function localizedImageUrl(destination, sourceFile, imageStats) {
  const source = imageSourceKey(destination, sourceFile);
  if (!source) return null;
  return source.kind === 'local'
    ? imageStats.localImages.get(source.key)
    : imageStats.remoteImages.get(source.key);
}

function localizeMarkdownImages(markdown, sourceFile, imageStats) {
  let result = markdown.replace(
    /!\[!\[([^\n]*?)\]\(([^)\n]+)\)\]\(([^)\n]+)\)/g,
    (match, alt, innerDestination, outerDestination) => {
      const destination =
        localizedImageUrl(outerDestination, sourceFile, imageStats) ??
        localizedImageUrl(innerDestination, sourceFile, imageStats);
      return destination
        ? `![${alt}](${destination})`
        : `<span class="kaoyan-408-data-structure-missing-image">图片暂不可用</span>`;
    },
  );

  result = result.replace(
    /!\[([^\n]*?)\]\(([^)\n]+)\)/g,
    (match, alt, destination) => {
      const localized = localizedImageUrl(destination, sourceFile, imageStats);
      return localized
        ? `![${alt}](${localized})`
        : `<span class="kaoyan-408-data-structure-missing-image">图片暂不可用${alt ? `：${alt}` : ''}</span>`;
    },
  );

  return result.replace(
    /<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, destination, after) => {
      const localized = localizedImageUrl(destination, sourceFile, imageStats);
      return localized
        ? `<img${before}src="${localized}"${after}>`
        : '<span class="kaoyan-408-data-structure-missing-image">图片暂不可用</span>';
    },
  );
}

const inlineCodePattern = new RegExp(
  '(' +
    String.fromCharCode(96) +
    '+[^' +
    String.fromCharCode(96) +
    ']*' +
    String.fromCharCode(96) +
    '+)',
  'g',
);

function transformOutsideInlineCode(line, transform) {
  return line
    .split(inlineCodePattern)
    .map((segment, index) => (index % 2 ? segment : transform(segment)))
    .join('');
}

function normalizeFenceLanguage(line) {
  const openingFence = String.fromCharCode(96).repeat(3);
  const match = new RegExp(
    '^(\\s*' + openingFence + ')\\s*(C|pseudocode)\\s*$',
    'i',
  ).exec(line);
  if (!match) return line;
  return `${match[1]}${match[2].toLowerCase() === 'c' ? 'c' : 'text'}`;
}

function normalizeFenceLanguages(markdown) {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        const normalized = inFence ? line : normalizeFenceLanguage(line);
        inFence = !inFence;
        return normalized;
      }
      return line;
    })
    .join('\n');
}

function sanitizeMarkdown(markdown, sourceFile, imageStats) {
  let result = stripReferenceSections(stripFrontmatter(markdown))
    .replace(/^\s*\[toc\]\s*$/gim, '')
    .replace(/^>\s*Suhan\s*$/gim, '')
    .replace(/\r\n?/g, '\n');

  result = localizeMarkdownImages(result, sourceFile, imageStats);
  result = normalizeFenceLanguages(result);
  result = result.replace(
    /(?<!!)\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
    '$1',
  );
  result = transformOutsideFences(result, (line) =>
    transformOutsideInlineCode(line, (segment) =>
      segment.replace(/==([^=\n]+)==/g, '<mark>$1</mark>'),
    ),
  );
  result = result.replace(/https?:\/\/[^\s)>'"]+/g, '');
  result = result
    .replace(/^\s*(?:参考(?:资料|链接)?|来源)\s*[:：]?\s*$/gim, '')
    .replace(/^\t+/gm, (tabs) => '  '.repeat(tabs.length))
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/(?:\n---\s*){2,}$/g, '\n')
    .trim();

  return result;
}

function displayName(name) {
  return name.replace(/\.(md|mdx)$/i, '').trim();
}

function plainText(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[\*_`~=]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageDescription(title, markdown) {
  const headings = [...markdown.matchAll(/^#{2,6}\s+(.+)$/gm)]
    .map((match) => plainText(match[1]))
    .filter(Boolean)
    .filter((heading, index, all) => all.indexOf(heading) === index)
    .slice(0, 4);
  const coverage = headings.length
    ? `涵盖${headings.join('、')}等内容`
    : '整理源文档中的核心概念、算法、代码与例题';
  const description = `计算机 408 数据结构「${title}」知识笔记，${coverage}，适合系统复习、章节回顾与查漏补缺。`;
  return description.length > 155
    ? `${description.slice(0, 154).replace(/[，、；：]$/, '')}。`
    : description;
}

function outputPathForSource(relativeSource) {
  return path.join(knowledgeRoot, relativeSource);
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

function writePage({ sourceFile, relativeSource, imageStats }) {
  const sourceMarkdown = readFileSync(sourceFile, 'utf8');
  const body = sanitizeMarkdown(sourceMarkdown, sourceFile, imageStats);
  const title = displayName(path.basename(sourceFile));
  const pageBody =
    body && /^#\s+/.test(body)
      ? body
      : `# ${title}${body ? `\n\n${body}` : ''}`;
  const output = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(pageDescription(title, body))}\n---\n\n${pageBody.trim()}\n`;
  const destinationFile = outputPathForSource(relativeSource);
  mkdirSync(path.dirname(destinationFile), { recursive: true });
  writeFileSync(destinationFile, output, 'utf8');
  return { sourceMarkdown, destinationFile };
}

function writeIndex(sourceFiles) {
  const links = sourceFiles
    .map((sourceFile) => {
      const relativeSource = toPosix(path.relative(sourceDataRoot, sourceFile));
      const title = displayName(path.basename(sourceFile));
      return `- [${title}](./${relativeSource.replace(/\.(md|mdx)$/i, '')})`;
    })
    .join('\n');
  const output = `---\ntitle: 数据结构\ndescription: 计算机 408 数据结构知识库，按数据结构基础、线性表、栈队列、串、树、图、查找和排序等主题整理原始笔记与代码。\n---\n\n# 数据结构\n\n本页汇总计算机 408 数据结构专题笔记。章节内容按源目录中的 Markdown 文件分别展示，考公知识库与其他 408 科目保持独立。\n\n## 章节目录\n\n${links}\n\n## 图示\n\n正文中的图示已整理为站内资源，打开章节即可直接查看。\n`;
  const destination = path.join(knowledgeRoot, 'index.md');
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, output, 'utf8');
}

function writeMeta(sourceFiles) {
  const meta = [
    { type: 'file', name: 'index', label: '数据结构章节索引' },
    ...sourceFiles.map((sourceFile) => {
      const name = toPosix(path.relative(sourceDataRoot, sourceFile));
      return {
        type: 'file',
        name: name.replace(/\.(md|mdx)$/i, ''),
        label: displayName(path.basename(sourceFile)),
      };
    }),
  ];
  writeFileSync(
    path.join(knowledgeRoot, '_meta.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf8',
  );
}

const sourceMarkdownFiles = listMarkdownFiles(sourceDataRoot);
if (sourceMarkdownFiles.length === 0) {
  throw new Error(`数据结构目录中没有 Markdown 文件：${sourceDataRoot}`);
}

cleanupPreviousGeneratedFiles();
mkdirSync(knowledgeRoot, { recursive: true });

const imageStats = await localizeImages(sourceMarkdownFiles);
const manifestEntries = [];
for (const sourceFile of sourceMarkdownFiles) {
  const relativeSource = toPosix(path.relative(sourceDataRoot, sourceFile));
  const { sourceMarkdown, destinationFile } = writePage({
    sourceFile,
    relativeSource,
    imageStats,
  });
  manifestEntries.push({
    source: relativeSource,
    output: toPosix(path.relative(projectRoot, destinationFile)),
    sourceSha256: sha256(sourceMarkdown),
  });
}

writeIndex(sourceMarkdownFiles);
writeMeta(sourceMarkdownFiles);
manifestEntries.sort((left, right) =>
  collator.compare(left.source, right.source),
);

const generated = [
  path.join(knowledgeRoot, 'index.md'),
  path.join(knowledgeRoot, '_meta.json'),
];
mkdirSync(path.dirname(sourceManifestPath), { recursive: true });
writeFileSync(
  sourceManifestPath,
  `${JSON.stringify(
    {
      repository: 'https://github.com/suhan42/cs-408',
      sourceDirectory: dataDirectoryCandidates[0].name,
      commit: sourceCommit,
      markdownFiles: manifestEntries.length,
      localImageSources: imageStats.localSources,
      localImageAssets: imageStats.localImages.size,
      remoteImageSourceUrls: imageStats.remoteSources,
      remoteImageAssets: imageStats.remoteImages.size,
      unresolvedRemoteImages: imageStats.unresolvedRemoteImages.length,
      unresolvedRemoteImageUrls: imageStats.unresolvedRemoteImages,
      missingLocalImages: imageStats.missingLocalImages,
      remoteImages: [...imageStats.remoteImages].map(
        ([sourceUrl, localUrl]) => ({
          sourceUrl,
          localUrl,
        }),
      ),
      generated: generated.map((filePath) =>
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
  `Imported ${manifestEntries.length} data-structure Markdown files; localized ${imageStats.localImages.size} local and ${imageStats.remoteImages.size}/${imageStats.remoteSources} remote image assets.`,
);
if (imageStats.missingLocalImages.length) {
  console.warn(
    `Missing local images: ${imageStats.missingLocalImages.join(', ')}`,
  );
}
if (imageStats.unresolvedRemoteImages.length) {
  console.warn(
    `Unresolved remote images: ${imageStats.unresolvedRemoteImages.length}`,
  );
}
