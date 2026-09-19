import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const updatesPath = path.join(__dirname, '..', 'docs', 'updates.md');

const START = '<!-- UPDATES:AUTO:START -->';
const END = '<!-- UPDATES:AUTO:END -->';

const recordsPath = process.argv[2];
if (!recordsPath || !fs.existsSync(recordsPath)) {
  console.log(`records 文件不存在: ${recordsPath}`);
  process.exit(1);
}

let records = {};
try {
  const parsed = JSON.parse(fs.readFileSync(recordsPath, 'utf-8'));
  records =
    parsed && typeof parsed === 'object' ? parsed.records || parsed : {};
} catch (e) {
  console.log(`records 解析失败: ${e.message}`);
  process.exit(1);
}

const entries = Object.values(records).sort((a, b) =>
  (b.last_time || '').localeCompare(a.last_time || ''),
);

const lines = [];
if (entries.length === 0) {
  lines.push('暂无转存记录');
} else {
  for (const entry of entries) {
    const time = (entry.last_time || '').slice(0, 16);
    const files = Array.isArray(entry.files) ? entry.files : [];
    lines.push(
      `**${entry.taskname}** — ${time} 更新，新增 ${files.length} 个文件`,
    );
    const treeText =
      typeof entry.tree_text === 'string' ? entry.tree_text.trim() : '';
    if (treeText) {
      lines.push('');
      lines.push('```text');
      lines.push(...treeText.split('\n'));
      lines.push('```');
    } else {
      const names = files
        .slice(0, 10)
        .map((f) => f.name)
        .join('、');
      const more = files.length > 10 ? ` 等 ${files.length} 个文件` : '';
      lines.push('');
      lines.push(`${names}${more}`);
    }
    lines.push('');
  }
}
while (lines.length > 0 && lines[lines.length - 1] === '') {
  lines.pop();
}

const block = `${START}\n## 自动转存\n\n${lines.join('\n')}\n${END}`;

let content = fs.readFileSync(updatesPath, 'utf-8');
const startIdx = content.indexOf(START);
const endIdx = content.indexOf(END);
if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  content = content.slice(0, startIdx) + block + content.slice(endIdx + END.length);
} else {
  console.log('updates.md 中未找到标记区块，未做修改');
  process.exit(1);
}

fs.writeFileSync(updatesPath, content, 'utf-8');
console.log(`updates.md 已更新：${entries.length} 条记录`);
