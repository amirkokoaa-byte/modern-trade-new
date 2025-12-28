
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  employeeName: string;
  employeeCode: string;
  phone: string;
  isOnline: boolean;
  canSeeAllSales: boolean;
  vacationBalance: {
    annual: number;
    casual: number;
    sick: number;
    exams: number;
  };
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

export interface InventoryRecord {
  id: string;
  userId: string;
  userName: string;
  marketName: string;
  date: string;
  items: {
    productName: string;
    quantity: number;
  }[];
}

export interface CompetitorPrice {
  id: string;
  userId: string;
  marketName: string;
  companyName: string;
  category: string;
  items: {
    productName: string;
    price: number;
  }[];
}

export interface Vacation {
  id: string;
  userId: string;
  userName: string;
  date: string;
  days: number;
  type: 'annual' | 'casual' | 'sick' | 'exams';
}

export interface AppSettings {
  tickerText: string;
  showDailySalesTicker: boolean;
  showMonthlySalesTicker: boolean;
  whatsappNumber: string;
  programName: string;
  sidebarConfig: {
    [key: string]: {
      label: string;
      isVisible: boolean;
    }
  };
}
