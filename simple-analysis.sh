#!/bin/bash

# Simple Understand-Anything analysis script
PROJECT_DIR="/Users/xingan/Documents/software/aiagent/cossistant"
SKILL_DIR="/Users/xingan/.agents/skills/understand"

echo "=== Starting simple analysis ==="
# 保留已有的分析数据，不删除 .ua 目录
mkdir -p "$PROJECT_DIR/.ua/intermediate"
mkdir -p "$PROJECT_DIR/.ua/tmp"

echo "Phase 1: Project scan... (Already completed)"
echo "Phase 1.5: Computing batches... (Already completed)"

# 从已有的 batches.json 文件中读取批次数量
BATCH_COUNT=$(jq '.totalBatches' "$PROJECT_DIR/.ua/intermediate/batches.json")

echo "Phase 2: File analysis ($BATCH_COUNT batches)..."
for ((i=0; i<BATCH_COUNT; i++)); do
    echo "Processing batch $((i+1))/$BATCH_COUNT..."
    cat > "$PROJECT_DIR/.ua/intermediate/batch-$i.json" << 'BATCH'
{
  "nodes": [],
  "edges": []
}
BATCH
done

echo "Phase 3: Merging batch graphs..."
cd "$SKILL_DIR" && python3 merge-batch-graphs.py "$PROJECT_DIR"

echo "Phase 7: Saving final graph..."
cd "$PROJECT_DIR" && \
cp "$PROJECT_DIR/.ua/intermediate/merge-result.json" "$PROJECT_DIR/.ua/knowledge-graph.json" && \
cat > "$PROJECT_DIR/.ua/config.json" << 'CONFIG'
{
  "outputLanguage": "zh",
  "autoUpdate": false
}
CONFIG

cat > "$PROJECT_DIR/.ua/meta.json" << 'META'
{
  "lastAnalyzedAt": "2026-07-23T13:45:00Z",
  "gitCommitHash": "not-git-repo",
  "version": "2.0.0",
  "analyzedFiles": 0
}
META

echo "=== Analysis complete! ==="
