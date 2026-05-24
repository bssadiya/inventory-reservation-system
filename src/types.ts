export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Inventory {
  productId: string;
  warehouseId: string;
  total: number;
  reserved: number;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'released' | 'expired' | 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface IdempotencyRecord {
  key: string;
  status: number;
  body: any;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
