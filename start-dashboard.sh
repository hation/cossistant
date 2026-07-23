#!/bin/bash
# 启动 Understand-Anything 仪表盘
UA_DIR=".ua"
SKILL_DIR="/Users/xingan/.agents/skills/understand-dashboard"

# 检查 knowledge-graph.json 是否存在
if [ ! -f "$UA_DIR/knowledge-graph.json" ]; then
    echo "知识图谱文件不存在: $UA_DIR/knowledge-graph.json"
    exit 1
fi

# 检查技能目录是否存在
if [ ! -d "$SKILL_DIR" ]; then
    echo "技能目录不存在: $SKILL_DIR"
    exit 1
fi

# 启动仪表盘
echo "启动 Cossistant 项目知识图谱仪表盘..."
node "$SKILL_DIR/start-dashboard.mjs" "$(pwd)"
