export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export const DEFAULT_PAGE_SIZE = 20;

export const createPaginationParams = (
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): PaginationParams => ({
  page,
  pageSize,
  sortBy,
  sortOrder,
});

export const buildPaginatedUrl = (baseUrl: string, params: PaginationParams): string => {
  const searchParams = new URLSearchParams();
  searchParams.append('page', params.page.toString());
  searchParams.append('pageSize', params.pageSize.toString());
  
  if (params.sortBy) {
    searchParams.append('sortBy', params.sortBy);
  }
  if (params.sortOrder) {
    searchParams.append('sortOrder', params.sortOrder);
  }

  return `${baseUrl}?${searchParams.toString()}`;
};

export const calculateTotalPages = (total: number, pageSize: number): number => {
  return Math.ceil(total / pageSize);
}; 