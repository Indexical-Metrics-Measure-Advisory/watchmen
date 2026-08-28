import {Factor} from '@/services/data/tuples/factor-types';
import {fetchFactorConsanguinity} from '@/services/data/tuples/lineage';
import {FactorConsanguinity, FactorLineageEdge} from '@/services/data/tuples/lineage-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useState} from 'react';
import {useCatalogEventBus} from '../../catalog-event-bus';
import {CatalogEventTypes} from '../../catalog-event-bus-types';
import {
	FactorLineageDialog,
	FactorLineageDialogBar,
	FactorLineageDialogFooter,
	FactorLineageDialogHeader,
	FactorLineageDialogWrapper,
	FactorLineageNodeBlock,
	FactorLineageNodeChildren,
	FactorLineageNodeName,
	FactorLineageNodePipeline,
	FactorLineageNodeRow,
	FactorLineageNodeTopic,
	FactorLineageNoData,
	FactorLineageRelationBadge,
	FactorLineageTree
} from './widgets';

interface LineageTreeNodeData {
	topicId: string;
	topicName?: string;
	factorId: string;
	factorName?: string;
	factorType?: string;
	relationType?: string;
	arithmetic?: string;
	pipelineName?: string;
	children: Array<LineageTreeNodeData>;
}

/**
 * Build the upstream tree rooted at the target factor: every edge pointing into a factor
 * becomes one child branch. A factor already on the current path renders as a leaf, so a
 * (theoretically impossible, backend guards it) cycle cannot loop forever.
 */
const buildUpstreamTree = (consanguinity: FactorConsanguinity): LineageTreeNodeData => {
	const nodeMeta = (topicId?: string, factorId?: string) => {
		return consanguinity.nodes.find(node => node.topicId === topicId && node.factorId === factorId);
	};
	const edgesByTarget = consanguinity.edges.reduce((map, edge) => {
		const key = `${edge.targetTopicId}|${edge.targetFactorId}`;
		(map[key] ??= []).push(edge);
		return map;
	}, {} as Record<string, Array<FactorLineageEdge>>);

	const build = (topicId: string | undefined, factorId: string | undefined,
	               via: FactorLineageEdge | undefined, path: Set<string>): LineageTreeNodeData => {
		const key = `${topicId}|${factorId}`;
		const meta = nodeMeta(topicId, factorId);
		// child edges are the ones writing into this factor
		const childEdges = path.has(key) ? [] : (edgesByTarget[key] ?? []);
		const nextPath = new Set(path);
		nextPath.add(key);
		return {
			topicId: topicId ?? '',
			topicName: meta?.topicName,
			factorId: factorId ?? '',
			factorName: meta?.factorName,
			factorType: meta?.factorType,
			relationType: via?.relationType,
			arithmetic: via?.arithmetic,
			pipelineName: via?.pipelineName,
			children: childEdges.map(childEdge => build(childEdge.sourceTopicId, childEdge.sourceFactorId, childEdge, nextPath))
		};
	};

	return build(consanguinity.topicId, consanguinity.factorId, void 0, new Set<string>());
};

const LineageTreeNode = (props: { node: LineageTreeNodeData, root?: boolean }) => {
	const {node, root = false} = props;
	const relationLabel = node.arithmetic ? `${node.relationType ?? 'Direct'} · ${node.arithmetic}` : node.relationType;

	return <FactorLineageNodeBlock>
		<FactorLineageNodeRow root={root}>
			<FactorLineageNodeName title={node.factorType}>{node.factorName ?? node.factorId}</FactorLineageNodeName>
			<FactorLineageNodeTopic>@ {node.topicName ?? node.topicId}</FactorLineageNodeTopic>
			<FactorLineageNodePipeline>{node.pipelineName ? `via ${node.pipelineName}` : ''}</FactorLineageNodePipeline>
			{root
				? <span data-widget="factor-lineage-node-root-holder"/>
				: <FactorLineageRelationBadge type={node.relationType}>{relationLabel}</FactorLineageRelationBadge>}
		</FactorLineageNodeRow>
		{node.children.length > 0
			? <FactorLineageNodeChildren>
				{node.children.map((child, index) =>
					<LineageTreeNode key={`${child.topicId}|${child.factorId}|${index}`} node={child}/>)}
			</FactorLineageNodeChildren>
			: null}
	</FactorLineageNodeBlock>;
};

export const FactorLineage = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useCatalogEventBus();
	const [destroyed, setDestroyed] = useState(true);
	const [visible, setVisible] = useState(false);
	const [consanguinity, setConsanguinity] = useState<FactorConsanguinity | null>(null);

	useEffect(() => {
		const onShowFactorLineage = (topic: Topic, factor: Factor) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchFactorConsanguinity({topicId: topic.topicId, factorId: factor.factorId}),
				(data?: FactorConsanguinity) => {
					if (data == null) {
						fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
							Failed to load lineage of given factor.
						</AlertLabel>);
					} else {
						setConsanguinity(data);
						setVisible(true);
						setDestroyed(false);
					}
				});
		};

		on(CatalogEventTypes.SHOW_FACTOR_LINEAGE, onShowFactorLineage);
		return () => {
			off(CatalogEventTypes.SHOW_FACTOR_LINEAGE, onShowFactorLineage);
		};
	}, [on, off, fireGlobal]);

	if (destroyed || consanguinity == null) {
		return null;
	}

	const onAnimationEnd = () => {
		if (!visible) {
			setDestroyed(true);
		}
	};
	const onCloseClicked = () => {
		setVisible(false);
	};

	const factorName = consanguinity.factorName ?? consanguinity.factorId;
	const topicName = consanguinity.topicName ?? consanguinity.topicId;
	const tree = buildUpstreamTree(consanguinity);

	return <FactorLineageDialog visible={visible} onAnimationEnd={onAnimationEnd}>
		<FactorLineageDialogWrapper>
			<FactorLineageDialogHeader>
				Field Lineage of {factorName}
				<span data-widget="factor-lineage-dialog-header-topic">@ {topicName}</span>
			</FactorLineageDialogHeader>
			<FactorLineageDialogBar>
				<span>{consanguinity.edges.length} upstream edge(s), {consanguinity.maxLevel} level(s)</span>
			</FactorLineageDialogBar>
			{consanguinity.edges.length === 0
				? <FactorLineageNoData>No upstream found. This factor is written by no enabled pipeline.</FactorLineageNoData>
				: <FactorLineageTree>
					<LineageTreeNode node={tree} root={true}/>
				</FactorLineageTree>}
			<FactorLineageDialogFooter>
				<Button ink={ButtonInk.PRIMARY} onClick={onCloseClicked}>Close</Button>
			</FactorLineageDialogFooter>
		</FactorLineageDialogWrapper>
	</FactorLineageDialog>;
};
