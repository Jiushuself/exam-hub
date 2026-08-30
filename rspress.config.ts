import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import katex from './scripts/rspress-katex-plugin.mjs';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'zh',
  title: '上岸知识库',
  description:
    '面向考研、考公、考编、教师资格证和四六级考生的知识整理与资料索引站。',
  icon: '/brand-mark.svg',
  logoText: '上岸知识库',
  logoHref: '/',
  plugins: [katex()],
  globalUIComponents: [
    path.join(__dirname, 'theme', 'components', 'SmoothReveal.tsx'),
  ],
});
