// Read-only check for the supplied ABI and the configured Sepolia deployment.
const fs = require('node:fs');
const path = require('node:path');
const { Interface, JsonRpcProvider } = require('ethers');

const address = '0x74fd4f89b8ab7a3100b3291b7aeb43448f13c43a';
const source = fs.readFileSync(
  path.join(__dirname, '../src/blockchain/constants/sepolia-abi.constant.ts'),
  'utf8',
);
const abi = JSON.parse(source.slice(source.indexOf('['), source.lastIndexOf(']') + 1));
const iface = new Interface(abi);

async function main() {
  const rpc = process.env.BLOCKCHAIN_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const provider = new JsonRpcProvider(rpc);
  try {
    const [network, code] = await Promise.all([provider.getNetwork(), provider.getCode(address)]);
    if (network.chainId !== 11155111n) throw new Error(`Unexpected chain ID ${network.chainId}`);
    if (code === '0x') throw new Error(`No contract code at ${address}`);
    console.log(`Sepolia contract: ${address}; runtime bytes: ${(code.length - 2) / 2}`);
    const names = [
      'getTotalProducts', 'getTotalShipments', 'getProductByCode',
      'registerProduct', 'recordQualityCheck', 'createShipment',
      'shipProduct', 'markInTransit', 'receiveProduct', 'storeProduct', 'markAsSold',
    ];
    for (const name of names) {
      const fragment = iface.getFunction(name);
      if (!fragment) throw new Error(`ABI missing ${name}`);
      console.log(`${name}: ${fragment.selector}; selector in runtime: ${code.toLowerCase().includes(fragment.selector.slice(2).toLowerCase())}`);
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
