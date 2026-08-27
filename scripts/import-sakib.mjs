import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeGongkaoContent } from './gongkao-content-normalizer.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.resolve(process.argv[2] ?? '');
const gongkaoRoot = path.join(projectRoot, 'docs', 'knowledge', 'gongkao');
const publicMindmapsRoot = path.join(
  projectRoot,
  'docs',
  'public',
  'gongkao-mindmaps',
);
const publicEmbeddedImagesRoot = path.join(
  projectRoot,
  'docs',
  'public',
  'gongkao-assets',
  'embedded',
);
const publicRemoteImagesRoot = path.join(
  projectRoot,
  'docs',
  'public',
  'gongkao-assets',
  'remote',
);

if (!process.argv[2] || !existsSync(sourceRoot)) {
  throw new Error(
    '请传入 vsakib/sakib 仓库路径，例如：npm run import:gongkao -- D:\\path\\to\\sakib',
  );
}

const remoteUrl = execFileSync(
  'git',
  ['-C', sourceRoot, 'config', '--get', 'remote.origin.url'],
  { encoding: 'utf8' },
).trim();

if (!/github\.com[/:]vsakib\/sakib(?:\.git)?$/i.test(remoteUrl)) {
  throw new Error(`来源仓库不匹配：${remoteUrl}`);
}

const sourceCommit = execFileSync(
  'git',
  ['-C', sourceRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
const sourceManifestPath = path.join(
  projectRoot,
  'artifacts',
  'gongkao-source-manifest.json',
);
const legacyManifestPath = path.join(gongkaoRoot, 'source-manifest.json');
const previousManifestPath = existsSync(sourceManifestPath)
  ? sourceManifestPath
  : legacyManifestPath;
const previousManifest = existsSync(previousManifestPath)
  ? JSON.parse(readFileSync(previousManifestPath, 'utf8'))
  : null;
const previousRemoteImageByUrl = new Map(
  previousManifest?.commit === sourceCommit
    ? (previousManifest.remoteImages ?? []).map(({ sourceUrl, localUrl }) => [
        sourceUrl,
        localUrl,
      ])
    : [],
);

const modules = [
  { source: '资料分析', destination: ['xingce', 'ziliao-fenxi'] },
  { source: '言语理解', destination: ['xingce', 'yanyu-lijie'] },
  { source: '判断推理', destination: ['xingce', 'panduan-tuili'] },
  { source: '数量关系', destination: ['xingce', 'shuliang-guanxi'] },
  { source: '政治理论', destination: ['xingce', 'zhengzhi-lilun'] },
  { source: '公基常识', destination: ['xingce', 'gongji-changshi'] },
  { source: '申论', destination: ['shenlun'] },
];

const collator = new Intl.Collator('zh-CN', {
  numeric: true,
  sensitivity: 'base',
});

const toPosix = (value) => value.split(path.sep).join('/');
const sha256 = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex');
const sha256Buffer = (value) =>
  createHash('sha256').update(value).digest('hex');
const embeddedAssets = new Set();

const markdownRemoteImagePattern =
  /(!\[[^\]]*\]\()(https?:\/\/[^)\s]+)([^)]*\))/g;
const htmlRemoteImagePattern =
  /(<img\b[^>]*\bsrc=["'])(https?:\/\/[^"']+)(["'][^>]*>)/gi;
const imageExtensionsByMediaType = new Map([
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/svg+xml', 'svg'],
  ['image/webp', 'webp'],
]);

function listMarkdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => collator.compare(left.name, right.name))
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listMarkdownFiles(fullPath) : [fullPath];
    })
    .filter((filePath) => filePath.endsWith('.md'));
}

function displayName(name) {
  return name
    .replace(/\.md$/i, '')
    .replace(/^(\d{2})(?=\D)/, '$1 ')
    .trim();
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

function plainText(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`~=]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractEmbeddedImages(markdown) {
  return markdown.replace(
    /data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)/g,
    (_match, imageType, encoded) => {
      const image = Buffer.from(encoded, 'base64');
      const extension = imageType === 'jpeg' ? 'jpg' : imageType;
      const filename = `${sha256Buffer(image).slice(0, 20)}.${extension}`;
      const destination = path.join(publicEmbeddedImagesRoot, filename);
      mkdirSync(publicEmbeddedImagesRoot, { recursive: true });
      writeFileSync(destination, image);
      embeddedAssets.add(filename);
      return `/gongkao-assets/embedded/${filename}`;
    },
  );
}

function imageExtension(url, mediaType) {
  const normalizedMediaType = mediaType.split(';', 1)[0].trim().toLowerCase();
  const mediaTypeExtension =
    imageExtensionsByMediaType.get(normalizedMediaType);
  if (mediaTypeExtension) return mediaTypeExtension;

  const urlExtension = path
    .extname(new URL(url).pathname)
    .slice(1)
    .toLowerCase();
  if (
    ['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(urlExtension)
  ) {
    return urlExtension === 'jpeg' ? 'jpg' : urlExtension;
  }

  throw new Error(
    `Unsupported image response for ${url}: ${mediaType || 'unknown media type'}`,
  );
}

async function downloadRemoteImage(url) {
  const candidates = [url];
  if (url.startsWith('https://sakib.hidns.co/')) {
    candidates.push(
      url.replace('https://sakib.hidns.co/', 'https://saduck.top/'),
    );
  }

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          accept: 'image/*',
          'user-agent': 'exam-hub-content-importer/1.0',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });

      const mediaType = response.headers.get('content-type') ?? '';
      const normalizedMediaType = mediaType
        .split(';', 1)[0]
        .trim()
        .toLowerCase();
      const isImageResponse =
        normalizedMediaType.startsWith('image/') ||
        normalizedMediaType === 'application/octet-stream';

      if (!response.ok || !isImageResponse) {
        await response.body?.cancel();
        continue;
      }

      const image = Buffer.from(await response.arrayBuffer());
      if (image.length === 0) continue;

      const extension = imageExtension(candidate, mediaType);
      const filename = `${sha256Buffer(image).slice(0, 20)}.${extension}`;
      mkdirSync(publicRemoteImagesRoot, { recursive: true });
      writeFileSync(path.join(publicRemoteImagesRoot, filename), image);

      return `/gongkao-assets/remote/${filename}`;
    } catch {
      // Try the next source candidate. Unresolved images are recorded below.
    }
  }

  return null;
}

async function localizeRemoteImages(entries) {
  const outputFiles = entries.map(({ output }) =>
    path.join(projectRoot, output),
  );
  const urls = [];
  let references = 0;

  for (const outputFile of outputFiles) {
    const markdown = readFileSync(outputFile, 'utf8');
    for (const match of markdown.matchAll(markdownRemoteImagePattern)) {
      urls.push(match[2]);
      references += 1;
    }
    for (const match of markdown.matchAll(htmlRemoteImagePattern)) {
      urls.push(match[2]);
      references += 1;
    }
  }

  const uniqueUrls = [...new Set(urls)];
  const localizedUrlByRemoteUrl = new Map();
  let nextIndex = 0;
  const workerCount = Math.min(8, uniqueUrls.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < uniqueUrls.length) {
        const url = uniqueUrls[nextIndex];
        nextIndex += 1;
        const cachedLocalUrl = previousRemoteImageByUrl.get(url);
        const cachedFile = cachedLocalUrl?.startsWith('/gongkao-assets/remote/')
          ? path.join(projectRoot, 'docs', 'public', cachedLocalUrl.slice(1))
          : null;
        if (cachedFile && existsSync(cachedFile)) {
          localizedUrlByRemoteUrl.set(url, cachedLocalUrl);
          continue;
        }
        localizedUrlByRemoteUrl.set(url, await downloadRemoteImage(url));
      }
    }),
  );

  for (const outputFile of outputFiles) {
    const markdown = readFileSync(outputFile, 'utf8');
    const replaceRemoteUrl = (match, prefix, url, suffix) => {
      const localizedUrl = localizedUrlByRemoteUrl.get(url);
      if (!localizedUrl) {
        return '<span class="gongkao-missing-image" role="note">\u56fe\u7247\u6682\u4e0d\u53ef\u7528</span>';
      }
      return `${prefix}${localizedUrl}${suffix}`;
    };
    const localizedMarkdown = markdown
      .replace(markdownRemoteImagePattern, replaceRemoteUrl)
      .replace(htmlRemoteImagePattern, replaceRemoteUrl);
    writeFileSync(outputFile, localizedMarkdown, 'utf8');
  }

  return {
    assets: new Set([...localizedUrlByRemoteUrl.values()].filter(Boolean)).size,
    references,
    sourceUrls: uniqueUrls.length,
    unresolvedUrls: uniqueUrls.filter(
      (url) => !localizedUrlByRemoteUrl.get(url),
    ),
    files: [...localizedUrlByRemoteUrl]
      .filter((entry) => entry[1])
      .map(([sourceUrl, localUrl]) => ({ sourceUrl, localUrl })),
  };
}

function sanitizeSource(markdown, sourcePath = '') {
  let result = stripFrontmatter(markdown).replace(/\r\n?/g, '\n');

  result = result
    .split('\n')
    .map((line) => {
      const legacyHeadingLink = line.indexOf('[](https://sakib.hidns.co/');
      if (legacyHeadingLink === -1) return line;

      const heading = line.slice(0, legacyHeadingLink).trimEnd();
      const malformedSuffix = line
        .slice(legacyHeadingLink)
        .match(/\.\s+(\*\*.+)$/)?.[1];

      // One source heading has an unclosed legacy URL followed by real notes.
      // Keep those notes instead of treating the whole suffix as link metadata.
      return malformedSuffix ? `${heading}\n\n${malformedSuffix}` : heading;
    })
    .join('\n');

  result = result
    .replace(
      /https:\/\/sakib-img\.pages\.dev\/file\/(\d+_img) \((\d+)\)\.png/g,
      'https://sakib-img.pages.dev/file/$1%20%28$2%29.png',
    )
    .replace(
      '[分母小化分](https://sakib.hidns.co/资料分析/速算技巧.html#六、分母小化分)',
      '[分母小化分](#七、分母小化分)',
    )
    .replace(
      '[【带入排除】](https://sakib.hidns.co/数量关系/数学运算/代入排除.html)',
      '[【代入排除】](./代入排除思想)',
    )
    .replace(
      '[【十字交叉】](https://sakib.hidns.co/数量关系/数学运算/十字交叉.html)',
      '[【十字交叉】](../解题思想/十字交叉)',
    )
    .replace(
      '[画边法](https://sakib.hidns.co/判断推理/图形推理/空间重构.html#_1、画边法)',
      '[画边法](#_1、画边法)',
    )
    .replace(
      /(?<!!)\[([^\]]+)\]\(https:\/\/sakib\.hidns\.co\/(?:[^()\n]|\([^()\n]*\))*\)/g,
      '$1',
    )
    .replace(/\[([^\]\n]+)\]\(javascript:void\(0\)\)/g, '$1')
    .replace(/<font\b[^>]*>/gi, '<mark>')
    .replace(/<\/font>/gi, '</mark>')
    .replace(/==([^=\n]+)==/g, '**$1**')
    .replace(/\/思维导图\/资料分析\.html/g, '/gongkao-mindmaps/资料分析.html')
    .replace(/\/思维导图\/判断推理\.html/g, '/gongkao-mindmaps/判断推理.html')
    .replace(
      /\[🔍 点击全屏查看\]\((\/gongkao-mindmaps\/[^)]+)\)\s*/g,
      '<a href="$1" target="_blank" rel="noreferrer">🔍 点击全屏查看</a>',
    )
    .replace(/\{\s*target=["']_blank["']\s*\}/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  return extractEmbeddedImages(normalizeGongkaoContent(result, sourcePath));
}

function pageDescription(moduleName, title, markdown) {
  const headings = [...markdown.matchAll(/^#{2,4}\s+(.+)$/gm)]
    .map((match) => plainText(match[1]))
    .filter(Boolean)
    .filter((heading, index, all) => all.indexOf(heading) === index)
    .slice(0, 4);
  const coverage = headings.length
    ? `覆盖${headings.join('、')}等内容`
    : `覆盖源文档列出的核心概念、方法、例题与解析`;
  const description = `整理考公${moduleName}中的“${title}”知识点，${coverage}，适合系统复习、专项训练、考前回顾与查漏补缺。`;
  return description.length > 155
    ? `${description.slice(0, 154)}。`
    : description;
}

function localChapterList(sourceDirectory) {
  const entries = readdirSync(sourceDirectory, { withFileTypes: true }).sort(
    (left, right) => collator.compare(left.name, right.name),
  );
  const lines = [];

  for (const entry of entries) {
    if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      entry.name !== 'index.md'
    ) {
      const basename = entry.name.replace(/\.md$/i, '');
      lines.push(`- [${displayName(entry.name)}](./${basename})`);
    }

    if (entry.isDirectory()) {
      const children = listMarkdownFiles(
        path.join(sourceDirectory, entry.name),
      );
      const links = children.map((filePath) => {
        const relative = toPosix(
          path.relative(sourceDirectory, filePath),
        ).replace(/\.md$/i, '');
        return `[${displayName(path.basename(filePath))}](./${relative})`;
      });
      lines.push(`- **${entry.name}**：${links.join(' · ')}`);
    }
  }

  return lines.join('\n');
}

function writeModuleIndex(moduleConfig, sourceDirectory, destinationDirectory) {
  const indexSource = path.join(sourceDirectory, 'index.md');
  const sourceMarkdown = existsSync(indexSource)
    ? sanitizeSource(
        readFileSync(indexSource, 'utf8'),
        toPosix(path.relative(sourceRoot, indexSource)),
      )
    : '';
  const description = pageDescription(
    moduleConfig.source,
    `${moduleConfig.source}知识总览`,
    sourceMarkdown,
  );
  const originalBody = sourceMarkdown
    ? `\n\n## 模块导读\n\n${sourceMarkdown.replace(/^#\s+[^\n]+\n?/, '')}`
    : '';
  const output = `---\ntitle: ${JSON.stringify(moduleConfig.source)}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${moduleConfig.source}\n\n## 本模块章节\n\n${localChapterList(sourceDirectory)}${originalBody}\n`;

  writeFileSync(path.join(destinationDirectory, 'index.md'), output, 'utf8');
  return { source: existsSync(indexSource) ? indexSource : null, output };
}

function writeContentPage(moduleConfig, sourceFile, destinationFile) {
  const title = displayName(path.basename(sourceFile));
  let body = sanitizeSource(
    readFileSync(sourceFile, 'utf8'),
    toPosix(path.relative(sourceRoot, sourceFile)),
  );
  const description = pageDescription(moduleConfig.source, title, body);
  if (!body.startsWith('# ')) body = `# ${title}\n\n${body}`;

  const output = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n${body.trim()}\n`;
  mkdirSync(path.dirname(destinationFile), { recursive: true });
  writeFileSync(destinationFile, output, 'utf8');
  return output;
}

function directoryMeta(
  sourceDirectory,
  destinationDirectory,
  moduleName,
  isRoot,
) {
  const sourceEntries = readdirSync(sourceDirectory, {
    withFileTypes: true,
  }).sort((left, right) => collator.compare(left.name, right.name));
  const meta = isRoot
    ? [{ type: 'file', name: 'index', label: `${moduleName}总览` }]
    : [];

  for (const entry of sourceEntries) {
    if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      entry.name !== 'index.md'
    ) {
      meta.push({
        type: 'file',
        name: entry.name.replace(/\.md$/i, ''),
        label: displayName(entry.name),
      });
    }

    if (entry.isDirectory()) {
      meta.push({
        type: 'dir-section-header',
        name: entry.name,
        label: entry.name,
      });
      directoryMeta(
        path.join(sourceDirectory, entry.name),
        path.join(destinationDirectory, entry.name),
        moduleName,
        false,
      );
    }
  }

  mkdirSync(destinationDirectory, { recursive: true });
  writeFileSync(
    path.join(destinationDirectory, '_meta.json'),
    `${JSON.stringify(meta, null, 2)}\n`,
    'utf8',
  );
}

const manifestEntries = [];

for (const moduleConfig of modules) {
  const sourceDirectory = path.join(sourceRoot, moduleConfig.source);
  const destinationDirectory = path.join(
    gongkaoRoot,
    ...moduleConfig.destination,
  );

  if (
    !existsSync(sourceDirectory) ||
    !statSync(sourceDirectory).isDirectory()
  ) {
    throw new Error(`缺少源目录：${sourceDirectory}`);
  }

  mkdirSync(destinationDirectory, { recursive: true });
  const indexResult = writeModuleIndex(
    moduleConfig,
    sourceDirectory,
    destinationDirectory,
  );

  if (indexResult.source) {
    const sourceContent = readFileSync(indexResult.source, 'utf8');
    manifestEntries.push({
      source: toPosix(path.relative(sourceRoot, indexResult.source)),
      output: toPosix(
        path.relative(projectRoot, path.join(destinationDirectory, 'index.md')),
      ),
      sourceSha256: sha256(sourceContent),
    });
  }

  for (const sourceFile of listMarkdownFiles(sourceDirectory)) {
    if (path.basename(sourceFile) === 'index.md') continue;
    const relativeFile = path.relative(sourceDirectory, sourceFile);
    const destinationFile = path.join(destinationDirectory, relativeFile);
    writeContentPage(moduleConfig, sourceFile, destinationFile);
    manifestEntries.push({
      source: toPosix(path.relative(sourceRoot, sourceFile)),
      output: toPosix(path.relative(projectRoot, destinationFile)),
      sourceSha256: sha256(readFileSync(sourceFile, 'utf8')),
    });
  }

  directoryMeta(
    sourceDirectory,
    destinationDirectory,
    moduleConfig.source,
    true,
  );
}

mkdirSync(publicMindmapsRoot, { recursive: true });
for (const filename of ['资料分析.html', '判断推理.html']) {
  copyFileSync(
    path.join(sourceRoot, 'public', '思维导图', filename),
    path.join(publicMindmapsRoot, filename),
  );
}

manifestEntries.sort((left, right) =>
  collator.compare(left.source, right.source),
);
const remoteImages = await localizeRemoteImages(manifestEntries);
mkdirSync(path.dirname(sourceManifestPath), { recursive: true });
writeFileSync(
  sourceManifestPath,
  `${JSON.stringify(
    {
      repository: 'https://github.com/vsakib/sakib',
      commit: sourceCommit,
      markdownFiles: manifestEntries.length,
      embeddedImages: embeddedAssets.size,
      remoteImageAssets: remoteImages.assets,
      remoteImageReferences: remoteImages.references,
      remoteImageSourceUrls: remoteImages.sourceUrls,
      unresolvedRemoteImages: remoteImages.unresolvedUrls.length,
      unresolvedRemoteImageUrls: remoteImages.unresolvedUrls,
      remoteImages: remoteImages.files,
      files: manifestEntries,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

writeFileSync(
  path.join(gongkaoRoot, 'xingce', '_meta.json'),
  `${JSON.stringify(
    [
      { type: 'file', name: 'index', label: '行测知识地图' },
      { type: 'dir', name: 'ziliao-fenxi', label: '资料分析' },
      { type: 'dir', name: 'yanyu-lijie', label: '言语理解' },
      { type: 'dir', name: 'panduan-tuili', label: '判断推理' },
      { type: 'dir', name: 'shuliang-guanxi', label: '数量关系' },
      { type: 'dir', name: 'zhengzhi-lilun', label: '政治理论' },
      { type: 'dir', name: 'gongji-changshi', label: '公基常识' },
    ],
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`Imported ${manifestEntries.length} Markdown files.`);
