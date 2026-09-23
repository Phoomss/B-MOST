import { ethers } from 'ethers';

export interface ProductHashPayload {
  productCode: string;
  serialNumber: string;
  manufacturerId: string;
  name?: string;
  category?: string;
}

/**
 * Generates a deterministic Keccak-256 hash for a product as bytes32.
 * Conforms to the SupplyChainRegistry smart contract requirement:
 * keccak256(canonical JSON or encoded fields).
 */
export function generateProductHash(payload: ProductHashPayload): string {
  const canonicalData = JSON.stringify({
    productCode: payload.productCode.trim().toUpperCase(),
    serialNumber: payload.serialNumber.trim(),
    manufacturerId: payload.manufacturerId.trim(),
    name: payload.name ? payload.name.trim() : undefined,
    category: payload.category ? payload.category.trim() : undefined,
  });

  return ethers.keccak256(ethers.toUtf8Bytes(canonicalData));
}

/**
 * Validates whether a given string is a valid bytes32 hex string.
 */
export function isValidBytes32(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}
