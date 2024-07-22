import MDEditor from '@uiw/react-md-editor';
import mermaid from 'mermaid';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getCodeString} from 'rehype-rewrite';
import {ExecutionResultItemMarkdownContainer} from './widgets';

console.log(mermaid);

interface CodeProps {
	inline: any;
	className: string;
	children: any;
	node: any;
}

// copy from react-md-editor sample
const randomId = () => parseInt(String(Math.random() * 1e15), 10).toString(36);
const Code = (props: CodeProps) => {
	const {inline, children = [], className, ...rest} = props;
	const id = useRef(`id-${randomId()}`);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const isMermaid = className && /^language-mermaid/.test(className.toLocaleLowerCase());
	const code = children ? getCodeString(rest.node.children) : children[0] || '';

	console.log(className, isMermaid, id.current, code);
	useEffect(() => {
		if (container && isMermaid && id.current && code) {
			mermaid
				.render(id.current, code)
				.then(({svg, bindFunctions}) => {
					container.innerHTML = svg;
					if (bindFunctions) {
						bindFunctions(container);
					}
				})
				.catch((error) => {
					console.log('error:', error);
				});
		}
	}, [container, isMermaid, code, id]);

	const refElement = useCallback((node: HTMLElement) => {
		if (node !== null) {
			setContainer(node);
		}
	}, []);

	if (isMermaid) {
		return <>
			<code id={id.current} style={{display: 'none'}}/>
			<code className={className} ref={refElement} data-name="mermaid"/>
		</>;
	} else {
		// noinspection com.intellij.reactbuddy.ArrayToJSXMapInspection
		return <code className={className}>{children}</code>;
	}
};

export const ExecutionResultItemMarkdown = (props: { markdown: string }) => {
	const {markdown} = props;

	return <ExecutionResultItemMarkdownContainer>
		{/** @ts-ignore */}
		<MDEditor.Markdown source={markdown} components={{code: Code}}/>
	</ExecutionResultItemMarkdownContainer>;
};
