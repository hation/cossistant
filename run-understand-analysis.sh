#!/bin/bash

# Run Understand-Anything analysis flow
PROJECT_DIR="/Users/xingan/Documents/software/aiagent/cossistant"
UA_DIR="$PROJECT_DIR/.ua"
SKILL_DIR="/Users/xingan/.agents/skills/understand"

# Set language to Chinese
LANGUAGE="zh"

echo "=== Starting Understand-Anything analysis ==="
echo "Project: $PROJECT_DIR"
echo "Language: $LANGUAGE"
echo "Data directory: $UA_DIR"
echo "==============================================="

# Phase 1: Project scan
echo -e "\n[Phase 1/7] Project scan..."
cd "$SKILL_DIR" && node scan-project.mjs "$PROJECT_DIR" "$UA_DIR/intermediate/scan-result.json"
if [ $? -ne 0 ]; then
  echo "ERROR: Project scan failed"
  exit 1
fi
echo "Phase 1 complete. Checked $(jq '.files | length' "$UA_DIR/intermediate/scan-result.json") files"

# Phase 1.5: Compute semantic batches
echo -e "\n[Phase 1.5/7] Computing semantic batches..."
cd "$SKILL_DIR" && node compute-batches.mjs "$PROJECT_DIR"
if [ $? -ne 0 ]; then
  echo "ERROR: Batch computation failed"
  exit 1
fi
BATCH_COUNT=$(jq '.totalBatches' "$UA_DIR/intermediate/batches.json")
echo "Phase 1.5 complete. Generated $BATCH_COUNT batches"

# Phase 2: File analysis (single file for testing)
echo -e "\n[Phase 2/7] File analysis..."
# Let's first test with a single batch
BATCH_INDEX=0
echo "Analyzing batch $BATCH_INDEX/$BATCH_COUNT..."
cd "$SKILL_DIR" && node analyze-batch.mjs "$PROJECT_DIR" $BATCH_INDEX
if [ $? -ne 0 ]; then
  echo "ERROR: Batch analysis failed"
  exit 1
fi
echo "Batch $BATCH_INDEX analysis complete"

# Phase 3: Merge batch graphs
echo -e "\n[Phase 3/7] Merging batch graphs..."
cd "$SKILL_DIR" && python3 merge-batch-graphs.py "$PROJECT_DIR"
if [ $? -ne 0 ]; then
  echo "ERROR: Graph merging failed"
  exit 1
fi
echo "Phase 3 complete. Merged $BATCH_COUNT batches"

# Phase 4: Architecture analysis
echo -e "\n[Phase 4/7] Architecture analysis..."
cd "$PROJECT_DIR" && node -e "
const fs = require('fs');
const UA_DIR = '$UA_DIR';
const mergeResult = JSON.parse(fs.readFileSync(\`\${UA_DIR}/intermediate/merge-result.json\`, 'utf8'));
console.log('Files analyzed:', mergeResult.nodes.length);
console.log('Edges created:', mergeResult.edges.length);
"

# Phase 5: Create tour
echo -e "\n[Phase 5/7] Creating learning tour..."
cd "$SKILL_DIR" && node generate-tour.mjs "$PROJECT_DIR"
if [ $? -ne 0 ]; then
  echo "ERROR: Tour generation failed"
  exit 1
fi
echo "Phase 5 complete"

# Phase 6: Validate and save final knowledge graph
echo -e "\n[Phase 6/7] Validation..."
cd "$SKILL_DIR" && node validate-graph.mjs "$PROJECT_DIR"
if [ $? -ne 0 ]; then
  echo "ERROR: Graph validation failed"
  exit 1
fi
echo "Phase 6 complete"

# Phase 7: Save final knowledge graph
echo -e "\n[Phase 7/7] Saving final knowledge graph..."
cd "$PROJECT_DIR" && cp "$UA_DIR/intermediate/merge-result.json" "$UA_DIR/knowledge-graph.json"

# Create config file
cat > "$UA_DIR/config.json" <<END
{
  "language": "$LANGUAGE",
  "autoUpdate": false
}
END

echo -e "\n==============================================="
echo "=== Analysis complete! ==="
echo "Knowledge graph: $UA_DIR/knowledge-graph.json"
echo "Config file: $UA_DIR/config.json"
echo -e "\nTo view the dashboard, run:"
echo "cd $UA_DIR && python -m http.server 8000"
echo -e "\nThen open http://localhost:8000"
