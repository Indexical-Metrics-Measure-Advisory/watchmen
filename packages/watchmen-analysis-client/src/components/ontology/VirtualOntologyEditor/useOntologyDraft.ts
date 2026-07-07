import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Topic } from "@/services/topicService";
import {
	VirtualOntology,
	VirtualObject,
	VirtualLink,
	DerivedAttribute,
	PhysicalTableMapping,
	FilterCondition,
	FilterOperator,
	filterOperatorConfig,
	filterValueAsString,
	filterValueAsList,
} from "@/model/ontology";
import {
	createEmptyVirtualOntology,
	createEmptyVirtualObject,
	createEmptyVirtualLink,
	createEmptyDerivedAttribute,
	normalizeIds,
} from "@/services/ontologyService";
import { parseLinkFilterField } from "./utils";

/**
 * 集中管理 VirtualOntology 编辑器的 draft 状态与全部 CRUD。
 *
 * 性能要点：所有 handler 用 ``useCallback([], )`` 稳定引用，
 * 对读取 ``draft`` 的操作改用函数式更新 ``setDraft(prev => ...)`` 或通过 ``draftRef``。
 * 这样 ``api.updateObject`` 等在多次渲染间保持同一引用，
 * ``React.memo`` 的子组件即可跳过不相关的重渲染。
 */
export function useOntologyDraft(open: boolean, ontology: VirtualOntology | null) {
	const [draft, setDraft] = useState<VirtualOntology>(createEmptyVirtualOntology());
	const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());

	/** Always-current snapshot of draft, read inside stable callbacks. */
	const draftRef = useRef(draft);
	draftRef.current = draft;

	useEffect(() => {
		if (open) {
			setDraft(ontology ? normalizeIds(structuredClone(ontology)) : createEmptyVirtualOntology());
			setExpandedObjects(new Set());
		}
	}, [open, ontology]);

	const toggleObject = useCallback((id: string) => {
		setExpandedObjects((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	// ---- meta ----
	const update = useCallback((patch: Partial<VirtualOntology>) => {
		setDraft((prev) => ({ ...prev, ...patch }));
	}, []);

	// ---- Virtual Object ----
	const addObject = useCallback(() => {
		const vo = createEmptyVirtualObject(draftRef.current.virtualObjects.length);
		setDraft((prev) => ({ ...prev, virtualObjects: [...prev.virtualObjects, vo] }));
		setExpandedObjects((prev) => new Set(prev).add(vo.id));
	}, []);

	const updateObject = useCallback((id: string, patch: Partial<VirtualObject>) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) => (vo.id === id ? { ...vo, ...patch } : vo)),
		}));
	}, []);

	const removeObject = useCallback((id: string) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.filter((vo) => vo.id !== id),
			virtualLinks: prev.virtualLinks.filter((l) => l.sourceObjectId !== id && l.targetObjectId !== id),
		}));
	}, []);

	// ---- Physical table ----
	const addPhysicalTable = useCallback((voId: string, topic: Topic) => {
		const pt: PhysicalTableMapping = {
			topicId: topic.id,
			topicName: topic.name,
			alias: "",
			kind: "detail",
			fields: [],
			joinConditions: [],
		};
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) =>
				vo.id === voId ? { ...vo, physicalTables: [...vo.physicalTables, pt] } : vo,
			),
		}));
	}, []);

	const updatePhysicalTable = useCallback((voId: string, idx: number, patch: Partial<PhysicalTableMapping>) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) => {
				if (vo.id !== voId) return vo;
				const tables = vo.physicalTables.map((pt, i) => (i === idx ? { ...pt, ...patch } : pt));
				return { ...vo, physicalTables: tables };
			}),
		}));
	}, []);

	const removePhysicalTable = useCallback((voId: string, idx: number) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) => {
				if (vo.id !== voId) return vo;
				return { ...vo, physicalTables: vo.physicalTables.filter((_, i) => i !== idx) };
			}),
		}));
	}, []);

	// ---- Physical table join conditions (functional update, no draft read) ----
	const addPhysicalTableJoinCondition = useCallback((voId: string, tableIdx: number) => {
		setDraft((prev) => {
			const vo = prev.virtualObjects.find((v) => v.id === voId);
			const table = vo?.physicalTables[tableIdx];
			if (!table) return prev;
			return {
				...prev,
				virtualObjects: prev.virtualObjects.map((v) => {
					if (v.id !== voId) return v;
					return {
						...v,
						physicalTables: v.physicalTables.map((pt, i) =>
							i === tableIdx
								? {
										...pt,
										joinConditions: [
											...(pt.joinConditions ?? []),
											{ sourceField: "", targetField: "" },
										],
									}
								: pt,
						),
					};
				}),
			};
		});
	}, []);

	const updatePhysicalTableJoinCondition = useCallback(
		(
			voId: string,
			tableIdx: number,
			conditionIdx: number,
			patch: Partial<{ sourceField: string; targetField: string }>,
		) => {
			setDraft((prev) => {
				const vo = prev.virtualObjects.find((v) => v.id === voId);
				const table = vo?.physicalTables[tableIdx];
				if (!table) return prev;
				const joinConditions = [...(table.joinConditions ?? [])];
				joinConditions[conditionIdx] = { ...joinConditions[conditionIdx], ...patch };
				return {
					...prev,
					virtualObjects: prev.virtualObjects.map((v) => {
						if (v.id !== voId) return v;
						return {
							...v,
							physicalTables: v.physicalTables.map((pt, i) =>
								i === tableIdx ? { ...pt, joinConditions } : pt,
							),
						};
					}),
				};
			});
		},
		[],
	);

	const removePhysicalTableJoinCondition = useCallback((voId: string, tableIdx: number, conditionIdx: number) => {
		setDraft((prev) => {
			const vo = prev.virtualObjects.find((v) => v.id === voId);
			const table = vo?.physicalTables[tableIdx];
			if (!table) return prev;
			return {
				...prev,
				virtualObjects: prev.virtualObjects.map((v) => {
					if (v.id !== voId) return v;
					return {
						...v,
						physicalTables: v.physicalTables.map((pt, i) =>
							i === tableIdx
								? {
										...pt,
										joinConditions: (pt.joinConditions ?? []).filter(
											(_, ci) => ci !== conditionIdx,
										),
									}
								: pt,
						),
					};
				}),
			};
		});
	}, []);

	// ---- Physical table filters (functional update, no draft read) ----
	const addPhysicalTableFilter = useCallback((voId: string, tableIdx: number) => {
		setDraft((prev) => {
			const vo = prev.virtualObjects.find((v) => v.id === voId);
			const table = vo?.physicalTables[tableIdx];
			if (!table) return prev;
			const next: FilterCondition = { field: "", operator: "eq", value: "" };
			return {
				...prev,
				virtualObjects: prev.virtualObjects.map((v) => {
					if (v.id !== voId) return v;
					return {
						...v,
						physicalTables: v.physicalTables.map((pt, i) =>
							i === tableIdx ? { ...pt, filters: [...(pt.filters ?? []), next] } : pt,
						),
					};
				}),
			};
		});
	}, []);

	const updatePhysicalTableFilter = useCallback(
		(voId: string, tableIdx: number, filterIdx: number, patch: Partial<FilterCondition>) => {
			setDraft((prev) => {
				const vo = prev.virtualObjects.find((v) => v.id === voId);
				const table = vo?.physicalTables[tableIdx];
				if (!table) return prev;
				const filters = [...(table.filters ?? [])];
				const current = filters[filterIdx];
				if (!current) return prev;
				const merged: FilterCondition = { ...current, ...patch };

				// When operator changes, coerce value into the shape required by the new operator.
				if (patch.operator) {
					const needsValue = filterOperatorConfig[merged.operator].needsValue;
					if (needsValue === "list") {
						merged.value = filterValueAsList(current.value);
					} else if (needsValue === "single") {
						merged.value = filterValueAsString(current.value);
					} else {
						merged.value = "";
					}
				}

				filters[filterIdx] = merged;
				return {
					...prev,
					virtualObjects: prev.virtualObjects.map((v) => {
						if (v.id !== voId) return v;
						return {
							...v,
							physicalTables: v.physicalTables.map((pt, i) => (i === tableIdx ? { ...pt, filters } : pt)),
						};
					}),
				};
			});
		},
		[],
	);

	const removePhysicalTableFilter = useCallback((voId: string, tableIdx: number, filterIdx: number) => {
		setDraft((prev) => {
			const vo = prev.virtualObjects.find((v) => v.id === voId);
			const table = vo?.physicalTables[tableIdx];
			if (!table) return prev;
			return {
				...prev,
				virtualObjects: prev.virtualObjects.map((v) => {
					if (v.id !== voId) return v;
					return {
						...v,
						physicalTables: v.physicalTables.map((pt, i) =>
							i === tableIdx
								? { ...pt, filters: (pt.filters ?? []).filter((_, fi) => fi !== filterIdx) }
								: pt,
						),
					};
				}),
			};
		});
	}, []);

	// ---- Attributes ----
	const addAttribute = useCallback((voId: string) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) =>
				vo.id === voId
					? { ...vo, attributes: [...vo.attributes, { name: "", sourceTable: "", sourceField: "" }] }
					: vo,
			),
		}));
	}, []);

	const updateAttribute = useCallback(
		(voId: string, idx: number, patch: Partial<{ name: string; sourceTable: string; sourceField: string }>) => {
			setDraft((prev) => ({
				...prev,
				virtualObjects: prev.virtualObjects.map((vo) => {
					if (vo.id !== voId) return vo;
					const attrs = vo.attributes.map((a, i) => (i === idx ? { ...a, ...patch } : a));
					return { ...vo, attributes: attrs };
				}),
			}));
		},
		[],
	);

	const removeAttribute = useCallback((voId: string, idx: number) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) => {
				if (vo.id !== voId) return vo;
				return { ...vo, attributes: vo.attributes.filter((_, i) => i !== idx) };
			}),
		}));
	}, []);

	// ---- Derived attributes ----
	const addDerived = useCallback((voId: string) => {
		setDraft((prev) => {
			const target = prev.virtualObjects.find((v) => v.id === voId);
			if (!target) return prev;
			const da = createEmptyDerivedAttribute(voId);
			return {
				...prev,
				virtualObjects: prev.virtualObjects.map((v) =>
					v.id === voId ? { ...v, derivedAttributes: [...v.derivedAttributes, da] } : v,
				),
			};
		});
	}, []);

	const updateDerived = useCallback((voId: string, daId: string, patch: Partial<DerivedAttribute>) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) => {
				if (vo.id !== voId) return vo;
				return {
					...vo,
					derivedAttributes: vo.derivedAttributes.map((da) => (da.id === daId ? { ...da, ...patch } : da)),
				};
			}),
		}));
	}, []);

	const removeDerived = useCallback((voId: string, daId: string) => {
		setDraft((prev) => ({
			...prev,
			virtualObjects: prev.virtualObjects.map((vo) => {
				if (vo.id !== voId) return vo;
				return { ...vo, derivedAttributes: vo.derivedAttributes.filter((da) => da.id !== daId) };
			}),
		}));
	}, []);

	// ---- Links ----
	const addLink = useCallback(() => {
		setDraft((prev) => ({ ...prev, virtualLinks: [...prev.virtualLinks, createEmptyVirtualLink()] }));
	}, []);

	const updateLink = useCallback((idx: number, patch: Partial<VirtualLink>) => {
		setDraft((prev) => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
		}));
	}, []);

	const removeLink = useCallback((idx: number) => {
		setDraft((prev) => ({ ...prev, virtualLinks: prev.virtualLinks.filter((_, i) => i !== idx) }));
	}, []);

	// ---- Link filters ----
	const addLinkFilter = useCallback((idx: number) => {
		setDraft((prev) => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) =>
				i === idx
					? {
							...l,
							filters: [...(l.filters ?? []), { field: "", operator: "eq" as FilterOperator, value: "" }],
						}
					: l,
			),
		}));
	}, []);

	const updateLinkFilter = useCallback((idx: number, fIdx: number, patch: Partial<FilterCondition>) => {
		setDraft((prev) => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => {
				if (i !== idx) return l;
				const filters = [...(l.filters ?? [])];
				filters[fIdx] = { ...filters[fIdx], ...patch };
				return { ...l, filters };
			}),
		}));
	}, []);

	const removeLinkFilter = useCallback((idx: number, fIdx: number) => {
		setDraft((prev) => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => {
				if (i !== idx) return l;
				return { ...l, filters: (l.filters ?? []).filter((_, fi) => fi !== fIdx) };
			}),
		}));
	}, []);

	const setLinkFilterSide = useCallback((idx: number, fIdx: number, side: "source" | "target" | "none") => {
		const current = (draftRef.current.virtualLinks[idx]?.filters ?? [])[fIdx];
		if (!current) return;
		const parsed = parseLinkFilterField(current.field);
		const nextField = side === "none" ? parsed.column : `${side}.${parsed.column}`;
		// Delegate to the stable updateLinkFilter
		setDraft((prev) => ({
			...prev,
			virtualLinks: prev.virtualLinks.map((l, i) => {
				if (i !== idx) return l;
				const filters = [...(l.filters ?? [])];
				filters[fIdx] = { ...filters[fIdx], field: nextField };
				return { ...l, filters };
			}),
		}));
	}, []);

	const getSavePayload = useCallback(
		(): VirtualOntology => ({
			...draftRef.current,
			updatedAt: new Date().toISOString().slice(0, 10),
		}),
		[],
	);

	const actions = useMemo(
		() => ({
			toggleObject,
			update,
			addObject,
			updateObject,
			removeObject,
			addPhysicalTable,
			updatePhysicalTable,
			removePhysicalTable,
			addPhysicalTableJoinCondition,
			updatePhysicalTableJoinCondition,
			removePhysicalTableJoinCondition,
			addPhysicalTableFilter,
			updatePhysicalTableFilter,
			removePhysicalTableFilter,
			addAttribute,
			updateAttribute,
			removeAttribute,
			addDerived,
			updateDerived,
			removeDerived,
			addLink,
			updateLink,
			removeLink,
			addLinkFilter,
			updateLinkFilter,
			removeLinkFilter,
			setLinkFilterSide,
		}),
		[
			toggleObject,
			update,
			addObject,
			updateObject,
			removeObject,
			addPhysicalTable,
			updatePhysicalTable,
			removePhysicalTable,
			addPhysicalTableJoinCondition,
			updatePhysicalTableJoinCondition,
			removePhysicalTableJoinCondition,
			addPhysicalTableFilter,
			updatePhysicalTableFilter,
			removePhysicalTableFilter,
			addAttribute,
			updateAttribute,
			removeAttribute,
			addDerived,
			updateDerived,
			removeDerived,
			addLink,
			updateLink,
			removeLink,
			addLinkFilter,
			updateLinkFilter,
			removeLinkFilter,
			setLinkFilterSide,
		],
	);

	return { draft, expandedObjects, actions, getSavePayload };
}

export type OntologyDraftApi = ReturnType<typeof useOntologyDraft>;
export type OntologyActions = OntologyDraftApi["actions"];
