
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
  // canSeeAllSales is used in SalesHistory logic
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
  receiverId: string; // 'all' or specific ID
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
}

export interface Company {
  id: string;
  name: string;
}

// Added to fix errors in views/DailySales.tsx and views/SalesHistory.tsx
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

// Added to fix error in views/VacationManagement.tsx
export interface Vacation {
  id: string;
  userId: string;
  userName: string;
  date: string;
  days: number;
  type: 'annual' | 'casual' | 'sick' | 'exams';
  createdAt: string;
}

// Added to fix error in views/InventoryHistory.tsx
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
