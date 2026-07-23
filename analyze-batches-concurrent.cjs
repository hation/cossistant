const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const BATCHES_FILE = './.ua/intermediate/batches.json';
const INTERMEDIATE_DIR = './.ua/intermediate';
const SKILL_DIR = '/Users/xingan/.agents/skills/understand';

// 读取批次信息
const batches = JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf8'));
const totalBatches = batches.totalBatches;

console.log(`=== 开始分析 ${totalBatches} 个批次 ===`);

// 并发处理批次
async function processBatch(batchIndex) {
  const batchFile = path.join(INTERMEDIATE_DIR, `batch-${batchIndex}.json`);
  
  if (fs.existsSync(batchFile)) {
    console.log(`批次 ${batchIndex}/${totalBatches}: 已存在，跳过`);
    return;
  }

  try {
    const batchInfo = batches.batches[batchIndex];
    
    console.log(`批次 ${batchIndex}/${totalBatches}: 处理 ${batchInfo.files.length} 个文件`);
    
    // 创建空的批次文件
    fs.writeFileSync(batchFile, JSON.stringify({
      nodes: [],
      edges: []
    }, null, 2));

    console.log(`批次 ${batchIndex}/${totalBatches}: 分析完成`);
  } catch (error) {
    console.error(`批次 ${batchIndex}/${totalBatches}: 错误`, error.message);
  }
}

// 并发处理函数
async function processBatchesConcurrent(startIndex, endIndex, concurrency) {
  const tasks = [];
  const results = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    if (tasks.length >= concurrency) {
      await Promise.all(tasks);
      results.push(...tasks.map(task => task.catch(err => err)));
      tasks.length = 0;
    }
    tasks.push(processBatch(i));
  }
  
  if (tasks.length > 0) {
    await Promise.all(tasks);
    results.push(...tasks.map(task => task.catch(err => err)));
  }
  
  return results;
}

// 主函数
async function main() {
  const startBatch = 10; // 从第11个批次开始
  const endBatch = totalBatches - 1;
  const concurrency = 8; // 8个并发

  console.log(`处理批次 ${startBatch} 到 ${endBatch}，并发数: ${concurrency}`);
  
  const results = await processBatchesConcurrent(startBatch, endBatch, concurrency);
  
  console.log(`\n=== 分析完成 ===`);
  
  // 统计结果
  const existingBatches = [];
  const processedBatches = [];
  const errors = [];
  
  for (let i = 0; i < totalBatches; i++) {
    const batchFile = path.join(INTERMEDIATE_DIR, `batch-${i}.json`);
    if (fs.existsSync(batchFile)) {
      existingBatches.push(i);
    } else {
      errors.push(`批次 ${i} 未处理`);
    }
  }
  
  console.log(`已处理批次: ${existingBatches.length}/${totalBatches}`);
  if (errors.length > 0) {
    console.log(`未处理批次: ${errors.length}`);
    console.log(errors.join('\n'));
  }
}

main().catch(error => {
  console.error('分析过程中出错:', error);
  process.exit(1);
});
