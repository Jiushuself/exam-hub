import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  auditGongkaoTypography,
  gongkaoKnowledgeFingerprint,
  normalizeGongkaoTypography,
} from './gongkao-typography-normalizer.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const gongkaoRoot = path.join(projectRoot, 'docs', 'knowledge', 'gongkao');
const shouldWrite = process.argv.includes('--write');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const files = walk(gongkaoRoot).filter(
  (file) => statSync(file).isFile() && /\.(?:md|mdx)$/iu.test(file),
);
const beforeCounts = new Map();
const remainingIssues = [];
const changedFiles = [];
const contentIntegrityFailures = [];
const idempotenceFailures = [];

for (const file of files) {
  const relativePath = path.relative(projectRoot, file).replaceAll('\\', '/');
  const original = readFileSync(file, 'utf8');
  const beforeIssues = auditGongkaoTypography(original);
  for (const issue of beforeIssues) {
    beforeCounts.set(issue.type, (beforeCounts.get(issue.type) ?? 0) + 1);
  }

  const normalized = normalizeGongkaoTypography(original, relativePath);
  if (normalizeGongkaoTypography(normalized, relativePath) !== normalized) {
    idempotenceFailures.push(relativePath);
  }
  if (
    gongkaoKnowledgeFingerprint(normalized) !==
    gongkaoKnowledgeFingerprint(original)
  ) {
    contentIntegrityFailures.push(relativePath);
  }
  if (normalized !== original) {
    changedFiles.push(relativePath);
    if (shouldWrite) writeFileSync(file, normalized, 'utf8');
  }

  for (const issue of auditGongkaoTypography(normalized)) {
    remainingIssues.push({ file: relativePath, ...issue });
  }
}

const initialIssueCount = [...beforeCounts.values()].reduce(
  (total, count) => total + count,
  0,
);
const summary = {
  mode: shouldWrite ? 'write' : 'check',
  scannedFiles: files.length,
  changedFiles: changedFiles.length,
  initialIssues: initialIssueCount,
  issueTypes: Object.fromEntries([...beforeCounts].sort()),
  remainingIssues: remainingIssues.length,
  contentIntegrityFailures: contentIntegrityFailures.length,
  idempotenceFailures: idempotenceFailures.length,
};

console.log(JSON.stringify(summary, null, 2));

if (!shouldWrite && changedFiles.length > 0) {
  console.error(
    `\n${changedFiles.length} 个文件需要排版归一化。运行 npm run format:gongkao 修复。`,
  );
  process.exitCode = 1;
}

if (remainingIssues.length > 0) {
  console.error('\n仍需人工复核的排版异常：');
  for (const issue of remainingIssues.slice(0, 30)) {
    console.error(
      `${issue.file}:${issue.line} [${issue.type}] ${issue.text.trim()}`,
    );
  }
  if (remainingIssues.length > 30) {
    console.error(`... 其余 ${remainingIssues.length - 30} 处已省略`);
  }
  process.exitCode = 1;
}

if (contentIntegrityFailures.length > 0) {
  console.error('\n检测到非排版字符变化：');
  for (const file of contentIntegrityFailures) console.error(file);
  process.exitCode = 1;
}

if (idempotenceFailures.length > 0) {
  console.error('\n检测到重复运行后仍会变化的文件：');
  for (const file of idempotenceFailures) console.error(file);
  process.exitCode = 1;
}
