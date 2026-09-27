const fs = require('node:fs');
const path = require('node:path');

const artifactPath = path.resolve(__dirname, '../artifacts/contracts/SupplyChainRegistry.sol/SupplyChainRegistry.json');
const abiPath = path.resolve(__dirname, '../abi/SupplyChainRegistry.json');
if (!fs.existsSync(artifactPath)) {
  throw new Error('Compile SupplyChainRegistry before syncing its ABI');
}
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
if (artifact.contractName !== 'SupplyChainRegistry' || artifact.sourceName !== 'contracts/SupplyChainRegistry.sol') {
  throw new Error('Unexpected contract artifact');
}
const expected = JSON.stringify(artifact.abi, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(abiPath) || fs.readFileSync(abiPath, 'utf8') !== expected) {
    throw new Error('Committed ABI differs from the compiled SupplyChainRegistry artifact');
  }
  console.log('Committed ABI matches the compiled SupplyChainRegistry artifact');
} else {
  fs.mkdirSync(path.dirname(abiPath), { recursive: true });
  fs.writeFileSync(abiPath, expected);
  console.log('Synced SupplyChainRegistry ABI from the compiled artifact');
}
