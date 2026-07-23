const fs = require('fs');
const path = require('path');

const KG_FILE = './.ua/knowledge-graph.json';
const KG = JSON.parse(fs.readFileSync(KG_FILE, 'utf8'));

// 修复项目元数据
KG.project.name = "Cossistant";
KG.project.description = "Cossistant 是一个开源的 React 聊天支持 widget，包含完整的 AI 会话架构、实时通信系统和知识管理功能";
KG.project.analyzedAt = new Date().toISOString();

// 修复语言类型
KG.project.languages = KG.project.languages.filter(lang => 
  ['javascript', 'typescript', 'python', 'sql', 'css', 'html', 'json', 'jsonc', 'markdown', 'yaml', 'toml', 'shell', 'dockerfile'].includes(lang)
);

// 修复文件节点的 summary
KG.nodes.forEach(node => {
  if (node.type === 'file' && node.summary) {
    node.summary = node.summary.replace('undefined', '0');
  }
});

// 添加必要的根节点
const rootNode = {
  id: "root",
  type: "root",
  name: "Cossistant",
  description: "项目根节点"
};

if (!KG.nodes.some(n => n.id === "root")) {
  KG.nodes.unshift(rootNode);
}

// 保存修复后的知识图谱
fs.writeFileSync(KG_FILE, JSON.stringify(KG, null, 2));
console.log('知识图谱已修复');

// 同时更新 meta.json
const META_FILE = './.ua/meta.json';
const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
meta.gitCommitHash = "not-git-repo";
meta.analyzedAt = KG.project.analyzedAt;
meta.projectName = KG.project.name;
fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

console.log('Meta 信息已更新');
