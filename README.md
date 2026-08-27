# 上岸知识库

一个基于 Rspress 的中文备考知识库和网盘资料索引站，面向考研、考公、考编、教师资格证、四六级等考试。

## 安装

```bash
npm install
```

## 本地开发

```bash
npm run dev
```

## 生产构建

```bash
npm run build
```

## 预览构建结果

```bash
npm run preview
```

## 内容位置

- `docs/knowledge/`：考研 408、考公等知识点文章。
- `theme/data/resources.ts`：网盘资料数据源。
- `docs/resources/index.mdx`：资料搜索和筛选页面。
- `docs/index.mdx`：网站首页。
- `theme/index.css`：全站视觉样式。

新增文档时需要同时补充中文 `description` frontmatter，并更新对应目录下的 `_meta.json`。
