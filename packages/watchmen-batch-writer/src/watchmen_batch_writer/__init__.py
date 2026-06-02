"""watchmen-batch-writer: high-throughput CDC -> ODS topic sync, bypassing pipeline triggers."""

__all__ = [
	'ConfigResolver',
	'ResolvedConfig',
	'transform_canal_row',
	'BatchWriter',
	'KafkaConsumer',
	'Accumulator',
	'BatchGroup',
	'FlushResult',
]


def __getattr__(name):
	if name in ('ConfigResolver', 'ResolvedConfig', 'transform_canal_row'):
		from .config_resolver import ConfigResolver, ResolvedConfig, transform_canal_row
		mapping = {
			'ConfigResolver': ConfigResolver,
			'ResolvedConfig': ResolvedConfig,
			'transform_canal_row': transform_canal_row,
		}
		return mapping[name]
	if name == 'BatchWriter':
		from .writer import BatchWriter
		return BatchWriter
	if name == 'KafkaConsumer':
		from .consumer import KafkaConsumer
		return KafkaConsumer
	if name in ('Accumulator', 'BatchGroup', 'FlushResult'):
		from . import accumulator
		return getattr(accumulator, name)
	raise AttributeError(f'module {__name__!r} has no attribute {name!r}')
