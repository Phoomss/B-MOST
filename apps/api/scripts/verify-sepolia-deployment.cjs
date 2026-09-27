// Read-only check for the compiled ABI and the configured Sepolia deployment.
const { Interface, JsonRpcProvider } = require('ethers');
const artifact = require('../../../packages/contracts/artifacts/contracts/SupplyChainRegistry.sol/SupplyChainRegistry.json');

const address = '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a';
const abi = require('@b-most/contracts/abi');
if (JSON.stringify(abi) !== JSON.stringify(artifact.abi)) {
  throw new Error('Committed ABI differs from the compiled Solidity contract');
}
const iface = new Interface(abi);

async function main() {
  const rpc = process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const provider = new JsonRpcProvider(rpc);
  try {
    const [network, code] = await Promise.all([provider.getNetwork(), provider.getCode(address)]);
    if (network.chainId !== 11155111n) throw new Error(`Unexpected chain ID ${network.chainId}`);
    if (code === '0x') throw new Error(`No contract code at ${address}`);
    if (code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()) {
      throw new Error(`Deployed runtime bytecode differs from compiled SupplyChainRegistry at ${address}`);
    }
    console.log(`Sepolia contract: ${address}; runtime bytes: ${(code.length - 2) / 2}`);
    const names = [
      'registerProduct', 'recordQualityCheck', 'createShipment',
      'shipProduct', 'markInTransit', 'receiveProduct', 'storeProduct',
      'transferOwnership', 'markAsSold', 'recallProduct', 'getProduct',
      'getProductByCode', 'getShipment', 'getShipmentByCode',
      'getQualityChecks', 'getProductHistory', 'grantRole', 'hasRole',
    ];
    for (const name of names) {
      const fragment = iface.getFunction(name);
      if (!fragment) throw new Error(`ABI missing ${name}`);
      if (!code.toLowerCase().includes(fragment.selector.slice(2).toLowerCase())) {
        throw new Error(`Runtime bytecode is missing ${name} selector`);
      }
      console.log(`${name}: ${fragment.selector}`);
    }
    for (const name of [
      'ProductRegistered', 'QualityChecked', 'ShipmentCreated',
      'ProductShipped', 'ShipmentInTransit', 'ProductReceived',
      'ProductStored', 'OwnershipTransferred', 'ProductSold', 'ProductRecalled',
    ]) {
      const event = iface.getEvent(name);
      if (!event) throw new Error(`ABI missing event ${name}`);
      console.log(`${name}: topic in runtime: ${code.toLowerCase().includes(event.topicHash.slice(2).toLowerCase())}`);
    }
    for (const name of ['getTotalProducts', 'getTotalShipments']) {
      try {
        const result = await provider.call({ to: address, data: iface.encodeFunctionData(name) });
        console.log(`${name}() = ${iface.decodeFunctionResult(name, result)[0]}`);
      } catch (error) {
        console.log(`${name}() failed: ${error.shortMessage || error.message}`);
      }
    }
  } finally {
    provider.destroy();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
