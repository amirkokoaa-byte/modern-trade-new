
export type UserRole = 'admin' | 'user';
export type AppTheme = 'standard' | 'glass' | 'dark' | 'modern';

export interface UserPermissions {
  viewColleaguesSales: boolean;
  viewSalesHistory: boolean;
  registerInventory: boolean;
  viewInventoryHistory: boolean;
  viewCompetitorReports: boolean;
  viewCompetitorPrices: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  employeeName: string;
  employeeCode: string;
  phone: string;
  isOnline: boolean;
  permissions: UserPermissions;
  canSeeAllSales?: boolean;
  vacationBalance: {
    annual: number;
    casual: number;
    sick: number;
    exams: number;
  };
}

export interface Notification {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface AppSettings {
  tickerText: string;
  tickerSpeed: number;
  whatsappNumber: string;
  programName: string;
}

export interface Market {
  id: string;
  name: string;
  creatorId: string; // Added for privacy
}

export interface Company {
  id: string;
  name: string;
  creatorId: string; // Added for privacy
}

export interface SaleItem {
  id: string;
  category: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface DailySale {
  id: string;
  userId: string;
  userName: string;
  marketName: string;
  date: string;
  items: SaleItem[];
  total: number;
}

export interface Vacation {
  id: string;
  userId: string;
  userName: string;
  date: string;
  days: number;
  type: 'annual' | 'casual' | 'sick' | 'exams';
  createdAt: string;
}

export interface InventoryRecord {
  id: string;
  userId: string;
  userName: string;
  marketName: string;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
}
