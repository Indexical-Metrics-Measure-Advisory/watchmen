const {
	override,
	addDecoratorsLegacy,
	addWebpackAlias,
	addWebpackResolve,
	setWebpackOptimizationSplitChunks
} = require('customize-cra');
const path = require('path');

module.exports = override(
	addWebpackAlias({
		'@': path.resolve(__dirname, 'src')
	}),
	addWebpackResolve({
		fallback: {
			stream: require.resolve('stream-browserify'),
			buffer: require.resolve('buffer/'),
			assert: require.resolve('assert/')
		}
	}),
	addDecoratorsLegacy(),
	setWebpackOptimizationSplitChunks({maxSize: 1024 * 400})
)