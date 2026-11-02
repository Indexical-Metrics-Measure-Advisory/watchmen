export interface EnumerationItem {
	code: string;
	label: string;
	parentCode?: string;
}

export interface Enumeration {
	enumId: string;
	name: string;
	description?: string;
	items?: EnumerationItem[];
}

export interface EnumerationPage {
	data: Enumeration[];
	itemCount: number;
	pageNumber: number;
	pageSize: number;
	pageCount: number;
}
