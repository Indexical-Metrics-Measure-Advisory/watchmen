# noinspection DuplicatedCode
class InsertConflictException(Exception):
	pass


class OptimisticLockException(Exception):
	pass


class UnexpectedStorageException(Exception):
	pass


class UnsupportedCriteriaException(UnexpectedStorageException):
	pass


class UnsupportedComputationException(UnexpectedStorageException):
	pass


class UnsupportedStraightColumnException(UnexpectedStorageException):
	pass


class NoFreeJoinException(UnexpectedStorageException):
	pass


class NoCriteriaForUpdateException(UnexpectedStorageException):
	pass


class UnsupportedSortMethodException(UnexpectedStorageException):
	pass


class EntityNotFoundException(Exception):
	pass


class TooManyEntitiesFoundException(Exception):
	pass
