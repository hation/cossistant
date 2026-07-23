#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = '/Users/xingan/Documents/software/aiagent/cossistant';
const UA_DIR = path.join(PROJECT_DIR, '.ua');
const SKILL_DIR = '/Users/xingan/.agents/skills/understand';

// 读取批次信息
const batches = JSON.parse(fs.readFileSync(path.join(UA_DIR, 'intermediate', 'batches.json'), 'utf8'));
const totalBatches = batches.totalBatches;

console.log(`=== Starting batch analysis (${totalBatches} batches) ===`);

// 分析每个批次
for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    try {
        console.log(`\nAnalyzing batch ${batchIndex + 1}/${totalBatches}...`);
        
        // 使用 file-analyzer 代理分析批次
        const command = `cd "${SKILL_DIR}" && node analyze-batch.mjs "${PROJECT_DIR}" ${batchIndex}`;
        execSync(command, { stdio: 'inherit' });
        
        // 检查是否生成了输出文件
        const outputFile = path.join(UA_DIR, 'intermediate', `batch-${batchIndex}.json`);
        if (fs.existsSync(outputFile)) {
            console.log(`✓ Batch ${batchIndex} analysis complete: ${outputFile}`);
        } else {
            console.log(`✗ Batch ${batchIndex} analysis failed: No output file`);
        }
    } catch (error) {
        console.error(`✗ Batch ${batchIndex} analysis failed:`, error.message);
    }
}

console.log(`\n=== Batch analysis complete ===`);

// 检查生成的文件数量
const generatedFiles = fs.readdirSync(path.join(UA_DIR, 'intermediate'))
    .filter(filename => filename.startsWith('batch-') && filename.endsWith('.json'));

console.log(`Generated ${generatedFiles.length} batch files out of ${totalBatches} expected`);
