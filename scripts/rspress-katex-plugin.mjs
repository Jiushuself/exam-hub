import { createRequire } from 'node:module';
import katex from 'katex';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';

function remarkRenderKatex() {
  return (tree) => {
    visit(
      tree,
      (node) => node.type === 'math' || node.type === 'inlineMath',
      (node) => {
        const displayMode = node.type === 'math';
        node.type = 'html';
        node.value = katex.renderToString(node.value, {
          displayMode,
          output: 'htmlAndMathml',
          strict: false,
          throwOnError: false,
        });
        delete node.data;
      },
    );
  };
}

export default function rspressKatexPlugin() {
  const require = createRequire(import.meta.url);

  return {
    name: 'exam-hub-katex',
    globalStyles: require.resolve('katex/dist/katex.min.css'),
    markdown: {
      remarkPlugins: [remarkMath, remarkRenderKatex],
    },
  };
}
