#!/bin/sh
set -e

echo "=============================================="
echo "⚡ Starting Hardhat Local EVM Node (port 8545)..."
echo "=============================================="

# Launch hardhat node in background binding to 0.0.0.0
npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

echo "Waiting for Hardhat node JSON-RPC to become available..."
MAX_TRIES=30
COUNT=0

until node -e '
  const http = require("http");
  const postData = JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 });
  const req = http.request({
    host: "127.0.0.1",
    port: 8545,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  }, (res) => {
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
  req.on("error", () => process.exit(1));
  req.write(postData);
  req.end();
' 2>/dev/null; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_TRIES ]; then
    echo "❌ Timed out waiting for Hardhat node."
    exit 1
  fi
  sleep 1
done

echo "✅ Hardhat node is live!"
echo "📜 Deploying SupplyChainRegistry.sol to local network..."
npx hardhat run scripts/deploy.ts --network localhost

echo "=============================================="
echo "🚀 Hardhat EVM Node & Contract ready on port 8545!"
echo "=============================================="

# Keep foreground process alive
wait $NODE_PID
