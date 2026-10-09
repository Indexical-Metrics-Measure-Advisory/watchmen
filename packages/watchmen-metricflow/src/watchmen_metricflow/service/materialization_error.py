class MaterializationError(Exception):
	"""
	Business failure of a materialization (mapping drift, target topic missing,
	query declined by every path, write back failure). Surfaced as run.error_message.
	"""
	pass
