class InsertConflictException(Exception):
	pass


class OptimisticLockException(Exception):
	pass


class UnexpectedStorageException(Exception):
	pass


class UnsupportedCriteriaException(UnexpectedStorageException):
	pass


class UnsupportedCriteriaJointConjunctionException(UnexpectedStorageException):
	pass


class UnsupportedCriteriaExpressionOperatorException(UnexpectedStorageException):
	pass


class NoCriteriaForUpdateException(UnexpectedStorageException):
	pass


class UnsupportedSortMethodException(UnexpectedStorageException):
	pass
