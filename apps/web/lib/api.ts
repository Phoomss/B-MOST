const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface BlockchainProductData {
  onChain?: boolean;
  productId?: number;
  productCode?: string;
  productHash?: string;
  manufacturer?: string;
  currentOwner?: string;
  status?: number;
  registeredAt?: number;
  hashMatches?: boolean;
  error?: string;
}

export interface QualityCheckItem {
  id?: string;
  result: string;
  inspectorName?: string;
  notes?: string;
  createdAt: string;
}

export interface ShipmentItem {
  id?: string;
  shipmentCode: string;
  status: string;
  origin?: string;
  destination?: string;
  createdAt: string;
}

export interface BlockchainTxItem {
  id?: string;
  txHash: string;
  blockNumber?: string | number;
  eventType: string;
  status: string;
  createdAt: string;
}

export interface ProductItem {
  id: string;
  productCode: string;
  serialNumber: string;
  name: string;
  description?: string;
  category?: string;
  status: string;
  manufacturerId: string;
  currentOwnerId: string;
  blockchainProductId?: string | null;
  blockchainTxHash?: string | null;
  productHash?: string | null;
  createdAt: string;
  updatedAt: string;
  manufacturer?: {
    id: string;
    name: string;
    code: string;
    type: string;
    walletAddress?: string;
  };
  currentOwner?: {
    id: string;
    name: string;
    code: string;
    type: string;
    walletAddress?: string;
  };
  qrCode?: string;
  verificationUrl?: string;
  blockchainData?: BlockchainProductData;
  qualityChecks?: QualityCheckItem[];
  shipments?: ShipmentItem[];
  blockchainTransactions?: BlockchainTxItem[];
}

export interface ProductsResponse {
  data: ProductItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface HistoryEventRecord {
  eventType: string;
  actor: string;
  timestamp: number;
  details: string;
}

export interface ProductHistoryResponse {
  product: Partial<ProductItem>;
  blockchainHistory: HistoryEventRecord[];
  blockchainTransactions?: BlockchainTxItem[];
  qualityChecks?: QualityCheckItem[];
  shipments?: ShipmentItem[];
  auditLogs?: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface PublicVerifyResponse {
  verified: boolean;
  productCode?: string;
  message?: string;
  product?: Partial<ProductItem>;
  blockchain?: {
    registeredOnChain: boolean;
    onChainProductId?: number;
    onChainStatus?: number;
    contractAddress?: string;
    blockchainTxHash?: string;
    hashMatch?: boolean;
    verified?: boolean;
    error?: string;
  };
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bmost_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bmost_token', token);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      errorData.message || `API request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  products: {
    list: (params?: {
      search?: string;
      status?: string;
      category?: string;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.category) query.set('category', params.category);
      if (params?.page) query.set('page', String(params.page));
      if (params?.limit) query.set('limit', String(params.limit));

      const qs = query.toString();
      return request<ProductsResponse>(`products${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => request<ProductItem>(`products/${id}`),
    getByCode: (code: string) => request<ProductItem>(`products/code/${encodeURIComponent(code)}`),
    create: (data: {
      productCode: string;
      serialNumber: string;
      name: string;
      description?: string;
      category?: string;
      registerOnBlockchain?: boolean;
    }) =>
      request<ProductItem>('products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name?: string; description?: string; category?: string }) =>
      request<ProductItem>(`products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    registerOnBlockchain: (id: string) =>
      request<ProductItem>(`products/${id}/register-blockchain`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    getHistory: (id: string) => request<ProductHistoryResponse>(`products/${id}/history`),
    getQr: (id: string) =>
      request<{ qrCodeDataUrl: string; verificationUrl: string }>(`products/${id}/qr`),
  },
  public: {
    verify: (productCode: string) =>
      request<PublicVerifyResponse>(`public/verify/${encodeURIComponent(productCode)}`),
  },
};
