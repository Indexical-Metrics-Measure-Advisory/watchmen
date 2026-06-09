from enum import Enum
from typing import List, Optional, Union, Dict

from watchmen_model.common import TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


class StandardStatus(str, Enum):
	ACTIVE = 'active'
	DEPRECATED = 'deprecated'
	DRAFT = 'draft'


class SectionId(str, Enum):
	TABLES = 'tables'
	FIELDS = 'fields'
	CODES = 'codes'
	TERMS = 'terms'
	NAMING = 'naming'
	DEPENDENCIES = 'dependencies'
	OVERVIEW = 'overview'


class Standard(ExtendedBaseModel, TenantBasedTuple):
	id: str = None
	abbreviation: str = None
	name: str = None
	description: Optional[str] = None
	version: str = None
	status: StandardStatus = None
	sourceUrl: Optional[str] = None
	tags: Optional[List[str]] = None


class TableEntry(ExtendedBaseModel):
	id: str = None
	domain: str = None
	name: str = None
	abbreviation: str = None
	fieldCount: int = None


class FieldCodeEntry(ExtendedBaseModel):
	id: str = None
	code: str = None
	usedInTables: int = None
	tables: Optional[str] = None
	description: Optional[str] = None


class CodeValueEntry(ExtendedBaseModel):
	id: str = None
	code: str = None
	name: str = None
	description: Optional[str] = None
	codeTable: Optional[str] = None


class TermEntry(ExtendedBaseModel):
	id: str = None
	index: int = None
	term: str = None
	relatedCode: Optional[str] = None
	definition: Optional[str] = None


class NamingEntry(ExtendedBaseModel):
	id: str = None
	prefix: str = None
	meaning: str = None
	example: Optional[str] = None


class DependencyEntry(ExtendedBaseModel):
	id: str = None
	level: int = None
	description: str = None


class OverviewEntry(ExtendedBaseModel):
	id: str = None
	domain: str = None
	tableCount: int = None
	coreEntities: Optional[str] = None
	description: Optional[str] = None


EntryRow = Union[
	TableEntry, FieldCodeEntry, CodeValueEntry,
	TermEntry, NamingEntry, DependencyEntry, OverviewEntry
]


class EntryMap(ExtendedBaseModel):
	tables: List[TableEntry] = []
	fields: List[FieldCodeEntry] = []
	codes: List[CodeValueEntry] = []
	terms: List[TermEntry] = []
	naming: List[NamingEntry] = []
	dependencies: List[DependencyEntry] = []
	overview: List[OverviewEntry] = []


class StandardBundle(ExtendedBaseModel):
	standard: Standard
	entries: Optional[EntryMap] = None


class StandardUpsert(ExtendedBaseModel, TenantBasedTuple):
	"""Payload for create/update of a Standard. The id may be assigned by the server."""
	abbreviation: str = None
	name: str = None
	description: Optional[str] = None
	version: str = None
	status: StandardStatus = None
	sourceUrl: Optional[str] = None
	tags: Optional[List[str]] = None


class EntryUpsertRequest(ExtendedBaseModel):
	"""Wrapper for the entry to be written, plus a stable client-provided id when needed."""
	row: EntryRow


class EntryDeleteRequest(ExtendedBaseModel):
	entryId: str


# Helper: list field name in EntryMap per section.
ENTRY_FIELD_BY_SECTION: Dict[SectionId, str] = {
	SectionId.TABLES: 'tables',
	SectionId.FIELDS: 'fields',
	SectionId.CODES: 'codes',
	SectionId.TERMS: 'terms',
	SectionId.NAMING: 'naming',
	SectionId.DEPENDENCIES: 'dependencies',
	SectionId.OVERVIEW: 'overview',
}
