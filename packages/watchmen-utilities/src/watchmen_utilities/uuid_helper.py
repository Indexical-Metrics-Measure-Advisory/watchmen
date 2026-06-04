import os
import time
import uuid


def _get_v7_random_bytes() -> bytes:
	return os.urandom(10)


def uuid7() -> uuid.UUID:
	"""
	Generate a UUIDv7 (RFC 9562). Requires Python < 3.14 where uuid.uuid7 is not available natively.
	Layout: 48-bit unix_ms timestamp | 4-bit ver(7) | 12-bit rand_a | 2-bit var(10) | 62-bit rand_b
	"""
	unix_ms = time.time_ns() // 1_000_000
	ts_bytes = unix_ms.to_bytes(6, byteorder='big', signed=False)
	rand = bytearray(_get_v7_random_bytes())
	# Set version to 7 in high nibble of byte 6
	rand[0] = (rand[0] & 0x0F) | 0x70
	# Set variant to 10 in top two bits of byte 8
	rand[2] = (rand[2] & 0x3F) | 0x80
	raw = ts_bytes + bytes(rand)
	return uuid.UUID(bytes=raw)


def uuid7_str() -> str:
	"""Return a 32-character UUIDv7 string with hyphens stripped (matches existing DSQL id_ format)."""
	return str(uuid7()).replace('-', '')
