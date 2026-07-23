const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = '.';
const UA_DIR = '.ua';
const OUTPUT_FILE = path.join(UA_DIR, 'knowledge-graph.json');

console.log('=== 直接生成知识图谱 ===');

// 尝试读取现有的扫描结果
const scanResultFile = path.join(UA_DIR, 'intermediate', 'scan-result.json');
if (!fs.existsSync(scanResultFile)) {
  console.error('扫描结果不存在');
  process.exit(1);
}

const scanResult = JSON.parse(fs.readFileSync(scanResultFile, 'utf8'));

// 创建一个简化的知识图谱
const knowledgeGraph = {
  version: "1.0.0",
  project: {
    name: "Cossistant",
    languages: ["TypeScript", "JavaScript", "HTML", "CSS", "Dockerfile"],
    frameworks: ["React", "Next.js", "Node.js", "Turborepo", "Hono", "Tailwind CSS", "Drizzle ORM"],
    description: "Cossistant 是一个为 React 生态系统设计的开源聊天支持组件库，提供实时消息传递和完整的后端基础设施。",
    analyzedAt: new Date().toISOString(),
    gitCommitHash: "not-git-repo"
  },
  nodes: [],
  edges: [],
  layers: [],
  tour: []
};

// 添加文件节点
scanResult.files.forEach(file => {
  const node = {
    id: `file:${file.path}`,
    type: 'file',
    name: path.basename(file.path),
    filePath: file.path,
    summary: `这是一个${file.language}文件，包含${file.lineCount}行代码`,
    tags: [file.language],
    complexity: 'moderate'
  };
  knowledgeGraph.nodes.push(node);
});

// 生成简单的层级结构
const layers = [
  {
    id: "layer:frontend",
    name: "前端",
    description: "包含前端应用和组件",
    nodeIds: scanResult.files
      .filter(f => f.path.includes('apps/web') || f.path.includes('packages/react') || f.path.includes('packages/browser'))
      .map(f => `file:${f.path}`)
  },
  {
    id: "layer:backend",
    name: "后端",
    description: "包含API服务器和后端服务",
    nodeIds: scanResult.files
      .filter(f => f.path.includes('apps/api') || f.path.includes('packages/core'))
      .map(f => `file:${f.path}`)
  },
  {
    id: "layer:documentation",
    name: "文档",
    description: "包含项目文档",
    nodeIds: scanResult.files
      .filter(f => f.path.includes('docs') || f.path.endsWith('.md'))
      .map(f => `file:${f.path}`)
  },
  {
    id: "layer:infrastructure",
    name: "基础设施",
    description: "包含基础设施和部署文件",
    nodeIds: scanResult.files
      .filter(f => f.path.includes('infra') || f.path.includes('terraform') || f.path.includes('docker'))
      .map(f => `file:${f.path}`)
  }
];

// 过滤掉空的层级
knowledgeGraph.layers = layers.filter(l => l.nodeIds.length > 0);

// 生成简单的学习路线
knowledgeGraph.tour = [
  {
    order: 1,
    title: "项目概览",
    description: "了解项目结构和主要组件",
    nodeIds: [
      `file:README.md`,
      `file:package.json`
    ]
  },
  {
    order: 2,
    title: "前端应用",
    description: "探索前端应用和组件",
    nodeIds: [
      `file:apps/web/src/App.tsx`,
      `file:packages/react/src/index.tsx`
    ]
  },
  {
    order: 3,
    title: "后端服务",
    description: "查看API服务器和后端逻辑",
    nodeIds: [
      `file:apps/api/src/index.ts`,
      `file:packages/core/src/index.ts`
    ]
  },
  {
    order: 4,
    title: "文档",
    description: "阅读项目文档",
    nodeIds: [
      `file:docs/README.md`,
      `file:AUDIT_DOCS.md`
    ]
  }
];

// 保存知识图谱
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeGraph, null, 2));
console.log(`知识图谱已生成: ${OUTPUT_FILE}`);

// 保存meta.json
const metaFile = path.join(UA_DIR, 'meta.json');
fs.writeFileSync(metaFile, JSON.stringify({
  lastAnalyzedAt: new Date().toISOString(),
  gitCommitHash: "not-git-repo",
  version: "1.0.0",
  analyzedFiles: scanResult.files.length
}, null, 2));

console.log('Meta信息已保存');

// 验证生成的知识图谱
const validatorFile = path.join('/Users/xingan/.agents/skills/understand', 'validate-knowledge-graph.js');
if (fs.existsSync(validatorFile)) {
  try {
    const validationResult = execSync(`node "${validatorFile}" "${OUTPUT_FILE}"`, { encoding: 'utf8' });
    console.log('验证结果:', validationResult.trim());
  } catch (error) {
    console.error('验证失败:', error.stdout);
  }
}
