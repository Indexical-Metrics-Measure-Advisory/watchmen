export const countLines = (text: string): number => {
	const count = text.split('\n').length;
	return count === 0 ? 1 : count;
};