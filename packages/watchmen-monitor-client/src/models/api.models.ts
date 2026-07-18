// Generic API response and error models, plus the shared pagination envelope
// used across watchmen-rest-doll endpoints (see watchmen_model/common/pagination.py).

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

/** Mirrors watchmen `Pageable { pageNumber, pageSize }`. */
export interface Pageable {
  pageNumber: number;
  pageSize: number;
}

/** Mirrors watchmen `DataPage { data, itemCount, pageCount }`. */
export interface DataPage<T> {
  data: T[];
  itemCount?: number;
  pageCount?: number;
  // Some endpoints historically return these aliases — tolerate them.
  total?: number;
  totalPages?: number;
}
