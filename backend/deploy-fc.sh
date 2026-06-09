#!/usr/bin/env bash
# ─── ZEMA 360 — Alibaba Function Compute deploy script ────────────────────────
# Usage:
#   export DASHSCOPE_API_KEY="..."
#   export ALIBABA_CLOUD_ACCESS_KEY_ID="..."
#   export ALIBABA_CLOUD_ACCESS_KEY_SECRET="..."
#   export ALIBABA_ACCOUNT_ID="..."
#   export FAIRPRICE_API_URL="https://fairprice.ng"
#   export ZEMA_SERVICE_TOKEN="..."
#   bash backend/deploy-fc.sh
#
# Prerequisites: docker, node >= 18, @serverless-devs/s (npm i -g @serverless-devs/s)
# This script is run from the REPO ROOT, not from backend/.

set -euo pipefail

REGISTRY="registry-intl.ap-southeast-1.aliyuncs.com"
NAMESPACE="fairprice"
IMAGE_NAME="zema360-backend"
IMAGE_TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
REGION="ap-southeast-1"
PROOF_FILE="backend/deploy/fc-proof.json"

echo "▶ ZEMA 360 Function Compute Deploy"
echo "  Image : ${FULL_IMAGE}"
echo "  Region: ${REGION}"
echo ""

# ── Step 1: configure Serverless Devs credentials ─────────────────────────────
echo "── Step 1: configure Serverless Devs credentials ──"
s config add \
  --AccountID "${ALIBABA_ACCOUNT_ID}" \
  --AccessKeyID "${ALIBABA_CLOUD_ACCESS_KEY_ID}" \
  --AccessKeySecret "${ALIBABA_CLOUD_ACCESS_KEY_SECRET}" \
  2>/dev/null <<< "aliyun-default" || true
# (s v3 prompts for alias name; we send it via stdin)

# ── Step 2: build Docker image ─────────────────────────────────────────────────
echo "── Step 2: build Docker image ──"
docker build \
  --platform linux/amd64 \
  -t "${FULL_IMAGE}" \
  ./backend

# ── Step 3: push to Alibaba Container Registry ────────────────────────────────
echo "── Step 3: push to ACR ──"
# Login to ACR (uses the same RAM credentials)
docker login \
  --username="${ALIBABA_CLOUD_ACCESS_KEY_ID}" \
  --password="${ALIBABA_CLOUD_ACCESS_KEY_SECRET}" \
  "${REGISTRY}"

docker push "${FULL_IMAGE}"

# ── Step 4: deploy to Function Compute ────────────────────────────────────────
echo "── Step 4: s deploy ──"
cd backend
s deploy -y 2>&1 | tee /tmp/zema360-deploy.log
cd ..

# ── Step 5: extract endpoint URL and write proof file ─────────────────────────
echo "── Step 5: write proof file ──"
FC_URL=$(grep -oE 'https://[a-z0-9-]+\.fcapp\.run[^ ]*' /tmp/zema360-deploy.log | head -1 || true)
if [ -z "$FC_URL" ]; then
  # Fallback: use s info to get the URL
  FC_URL=$(cd backend && s info --output json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
urls = data.get('triggers', [{}])[0].get('urlInternet', '')
print(urls)
" 2>/dev/null || echo "")
fi

mkdir -p backend/deploy
cat > "${PROOF_FILE}" <<EOF
{
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "platform": "Alibaba Cloud Function Compute",
  "region": "${REGION}",
  "runtime": "custom-container",
  "image": "${FULL_IMAGE}",
  "function_name": "zema360-api",
  "endpoint_url": "${FC_URL}",
  "health_url": "${FC_URL}/api/v1/zema/health",
  "alibaba_services_used": [
    "Function Compute (FC3)",
    "Container Registry (ACR)",
    "Object Storage Service (OSS)",
    "Model Studio (DashScope/Qwen)"
  ],
  "qwen_models": ["qwen-max", "qwen-plus", "qwen-vl-max"],
  "oss_bucket": "fairprice-zema",
  "hackathon": "Global AI Hackathon with Qwen Cloud",
  "track": "Track 4 — Autopilot Agent"
}
EOF

echo ""
echo "✅ Deploy complete!"
echo "   Endpoint : ${FC_URL}"
echo "   Health   : ${FC_URL}/api/v1/zema/health"
echo "   Proof    : ${PROOF_FILE}"
echo ""
echo "Test the deploy:"
echo "  curl ${FC_URL}/api/v1/zema/health"
