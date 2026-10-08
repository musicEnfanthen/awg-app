import type { Quad } from '@rdfjs/types';
import { Parser } from 'n3';

import { RESULT_GRAPH_UTILS } from '../graph-visualizer/results/construct/result-graph.utils';
import { DEFAULT_PREFIXES, PREFIX_UTILS } from '../graph-visualizer/utils/prefix.utils';
import { RDF_TYPE } from '../graph-visualizer/utils/term.utils';
import {
    ExplorerData,
    ExplorerEdge,
    ExplorerEdgeKind,
    ExplorerFlowLane,
    ExplorerFlowLayout,
    ExplorerFlowLink,
    ExplorerFlowNode,
    ExplorerNode,
    ExplorerNodeKind,
    ExplorerRelations,
    ExplorerTreeNode,
} from './graph-explorer.model';

const AWG = DEFAULT_PREFIXES['awg'];
const DC = DEFAULT_PREFIXES['dc'];

/**
 * Object constant: NODE_KINDS.
 *
 * It keeps the explorer node kind per `rdf:type` IRI.
 */
const NODE_KINDS: ReadonlyMap<string, ExplorerNodeKind> = new Map([
    [`${AWG}EditionComplex`, 'complex'],
    [`${AWG}Sketch`, 'sketch'],
    [`${AWG}Paratext`, 'paratext'],
]);

/**
 * Object constant: EDGE_KINDS.
 *
 * It keeps the explorer edge kind per predicate IRI.
 */
const EDGE_KINDS: ReadonlyMap<string, ExplorerEdgeKind> = new Map([
    [`${AWG}precedes`, 'precedes'],
    [`${AWG}precedes_scripture`, 'precedesScripture'],
    [`${AWG}precedes_content`, 'precedesContent'],
    [`${AWG}concomitates`, 'concomitates'],
]);

const DC_IS_PART_OF = `${DC}isPartOf`;
const DC_HAS_PART = `${DC}hasPart`;

/**
 * Object constant: FLOW_SIZES.
 *
 * It keeps the sizes (in px) of the flow diagram.
 */
export const FLOW_SIZES = Object.freeze({
    laneLabelWidth: 110,
    lanePadding: 18,
    columnWidth: 190,
    rowHeight: 30,
    nodeWidth: 126,
    nodeHeight: 22,
    concomitantIndent: 10,
    margin: 16,
});

/**
 * Utils method: isPrecedesKind.
 *
 * It checks if a given edge kind belongs to the `awg:precedes` property family
 * (`awg:precedes` and its sub properties).
 *
 * @param {ExplorerEdgeKind} kind The given edge kind.
 * @returns {boolean} The result of the check.
 */
export function isPrecedesKind(kind: ExplorerEdgeKind): boolean {
    return kind !== 'concomitates';
}

/**
 * Utils method: parseExplorerData.
 *
 * It parses the given turtle data into the explorer data model:
 * edition complexes, sketches and paratexts with their part-of hierarchy,
 * and the precedence and concomitance relations between them.
 * Invalid turtle data results in an empty model.
 *
 * @param {string} turtle The given turtle data.
 * @returns {ExplorerData} The explorer data.
 */
export function parseExplorerData(turtle: string): ExplorerData {
    let quads: Quad[];
    try {
        quads = new Parser().parse(turtle ?? '') as Quad[];
    } catch {
        return { nodes: new Map(), edges: [] };
    }

    const labels = RESULT_GRAPH_UTILS.extractLabels(quads);
    const label = (iri: string): string => labels.get(iri) ?? PREFIX_UTILS.compactIri(iri, DEFAULT_PREFIXES);

    // Kinds in order of appearance
    const kinds = new Map<string, ExplorerNodeKind>();
    quads.forEach(quad => {
        const kind = NODE_KINDS.get(quad.object.value);
        if (quad.predicate.equals(RDF_TYPE) && quad.subject.termType === 'NamedNode' && kind) {
            kinds.set(quad.subject.value, kind);
        }
    });

    // Part-of hierarchy (also from the inverse dc:hasPart)
    const partOf = new Map<string, string>();
    quads.forEach(({ subject, predicate, object }) => {
        if (predicate.value === DC_IS_PART_OF && kinds.has(subject.value) && kinds.has(object.value)) {
            partOf.set(subject.value, object.value);
        } else if (predicate.value === DC_HAS_PART && kinds.has(subject.value) && kinds.has(object.value)) {
            partOf.set(object.value, subject.value);
        }
    });

    const nodes = new Map<string, ExplorerNode>(
        [...kinds].map(([id, kind]) => [id, { id, label: label(id), kind, partOf: partOf.get(id) }])
    );

    // Relations between known nodes (without duplicates)
    const edgeKeys = new Set<string>();
    const edges: ExplorerEdge[] = [];
    quads.forEach(({ subject, predicate, object }) => {
        const kind = EDGE_KINDS.get(predicate.value);
        const key = `${subject.value} ${kind} ${object.value}`;
        if (kind && nodes.has(subject.value) && nodes.has(object.value) && !edgeKeys.has(key)) {
            edgeKeys.add(key);
            edges.push({ source: subject.value, target: object.value, kind });
        }
    });

    return { nodes, edges };
}

/**
 * Utils method: concomitanceParent.
 *
 * It gets the id of the (first) node a given node concomitates, if any.
 *
 * @param {ExplorerData} data The given explorer data.
 * @param {string} id The given node id.
 * @returns {string | undefined} The id of the concomitated node.
 */
export function concomitanceParent(data: ExplorerData, id: string): string | undefined {
    return data.edges.find(edge => edge.kind === 'concomitates' && edge.source === id && edge.target !== id)?.target;
}

/**
 * Utils method: buildTree.
 *
 * It builds the work structure tree of the explorer data:
 * edition complexes contain their parts, sketches contain the sketches concomitating them.
 *
 * @param {ExplorerData} data The given explorer data.
 * @returns {ExplorerTreeNode[]} The root tree nodes.
 */
export function buildTree(data: ExplorerData): ExplorerTreeNode[] {
    const kindOrder: Record<ExplorerNodeKind, number> = { complex: 0, sketch: 1, paratext: 2, other: 3 };

    // Tree parent: the concomitated sketch first, otherwise the part-of parent
    const childIds = new Map<string | undefined, string[]>();
    data.nodes.forEach(node => {
        const parentId = concomitanceParent(data, node.id) ?? node.partOf;
        const key = parentId && data.nodes.has(parentId) ? parentId : undefined;
        childIds.set(key, [...(childIds.get(key) ?? []), node.id]);
    });

    const visited = new Set<string>();
    const toTreeNode = (id: string): ExplorerTreeNode | undefined => {
        const node = data.nodes.get(id);
        if (!node || visited.has(id)) {
            return undefined;
        }
        visited.add(id);

        const children = (childIds.get(id) ?? [])
            .map(childId => toTreeNode(childId))
            .filter((child): child is ExplorerTreeNode => !!child)
            .sort((a, b) => kindOrder[a.node.kind] - kindOrder[b.node.kind]);
        const descendantCount = children.reduce((sum, child) => sum + 1 + child.descendantCount, 0);

        return { node, children, descendantCount };
    };

    return (childIds.get(undefined) ?? [])
        .map(id => toTreeNode(id))
        .filter((root): root is ExplorerTreeNode => !!root)
        .sort((a, b) => kindOrder[a.node.kind] - kindOrder[b.node.kind]);
}

/**
 * Utils method: rankNodes.
 *
 * It ranks the nodes by the longest path of preceding nodes
 * (via the `awg:precedes` property family); cycles are broken.
 *
 * @param {ExplorerData} data The given explorer data.
 * @returns {Map<string, number>} The rank by node id.
 */
export function rankNodes(data: ExplorerData): Map<string, number> {
    const predecessors = new Map<string, string[]>();
    data.edges
        .filter(edge => isPrecedesKind(edge.kind))
        .forEach(edge => predecessors.set(edge.target, [...(predecessors.get(edge.target) ?? []), edge.source]));

    const ranks = new Map<string, number>();
    const visiting = new Set<string>();
    const rankOf = (id: string): number => {
        const known = ranks.get(id);
        if (known !== undefined) {
            return known;
        }
        if (visiting.has(id)) {
            return 0;
        }
        visiting.add(id);
        const rank = Math.max(-1, ...(predecessors.get(id) ?? []).map(rankOf)) + 1;
        visiting.delete(id);
        ranks.set(id, rank);
        return rank;
    };

    data.nodes.forEach(node => rankOf(node.id));
    return ranks;
}

/**
 * Utils method: transitiveClosure.
 *
 * It gets all transitive predecessors and successors of a given node
 * (via the `awg:precedes` property family, which is transitive).
 *
 * @param {ExplorerData} data The given explorer data.
 * @param {string} id The given node id.
 * @returns {{ predecessors: Set<string>; successors: Set<string> }} The transitive predecessors and successors.
 */
export function transitiveClosure(
    data: ExplorerData,
    id: string
): { predecessors: Set<string>; successors: Set<string> } {
    const precedesEdges = data.edges.filter(edge => isPrecedesKind(edge.kind));

    const walk = (from: keyof ExplorerEdge, to: keyof ExplorerEdge): Set<string> => {
        const found = new Set<string>();
        const queue = [id];
        while (queue.length) {
            const current = queue.shift();
            precedesEdges
                .filter(edge => edge[from] === current && !found.has(edge[to]) && edge[to] !== id)
                .forEach(edge => {
                    found.add(edge[to]);
                    queue.push(edge[to]);
                });
        }
        return found;
    };

    return { predecessors: walk('target', 'source'), successors: walk('source', 'target') };
}

/**
 * Utils method: relationsOf.
 *
 * It gets the direct relations of a given node (for its profile).
 *
 * @param {ExplorerData} data The given explorer data.
 * @param {string} id The given node id.
 * @returns {ExplorerRelations | undefined} The relations, or undefined for unknown nodes.
 */
export function relationsOf(data: ExplorerData, id: string): ExplorerRelations | undefined {
    const node = data.nodes.get(id);
    if (!node) {
        return undefined;
    }
    const get = (nodeId: string): ExplorerNode => data.nodes.get(nodeId) as ExplorerNode;

    return {
        node,
        parent: node.partOf ? data.nodes.get(node.partOf) : undefined,
        predecessors: data.edges
            .filter(edge => isPrecedesKind(edge.kind) && edge.target === id)
            .map(edge => ({ node: get(edge.source), kind: edge.kind })),
        successors: data.edges
            .filter(edge => isPrecedesKind(edge.kind) && edge.source === id)
            .map(edge => ({ node: get(edge.target), kind: edge.kind })),
        accompanies: data.edges
            .filter(edge => edge.kind === 'concomitates' && edge.source === id)
            .map(edge => get(edge.target)),
        accompaniedBy: data.edges
            .filter(edge => edge.kind === 'concomitates' && edge.target === id)
            .map(edge => get(edge.source)),
    };
}

/**
 * Utils method: buildFlowLayout.
 *
 * It lays out the flow diagram of the writing process:
 * one lane per (sub) complex, main sketches in columns by their rank
 * (longest path of preceding sketches within the lane), concomitant sketches
 * stacked below the sketch they accompany.
 *
 * @param {ExplorerData} data The given explorer data.
 * @returns {ExplorerFlowLayout} The flow layout.
 */
export function buildFlowLayout(data: ExplorerData): ExplorerFlowLayout {
    const S = FLOW_SIZES;
    const ranks = rankNodes(data);
    const items = [...data.nodes.values()].filter(node => node.kind !== 'complex');

    // Root (main) node of a concomitance chain and the depth within it
    const chainOf = (id: string): { rootId: string; depth: number } => {
        const seen = new Set<string>([id]);
        let current = id;
        let parent = concomitanceParent(data, current);
        while (parent && data.nodes.has(parent) && !seen.has(parent)) {
            seen.add(parent);
            current = parent;
            parent = concomitanceParent(data, current);
        }
        return { rootId: current, depth: seen.size - 1 };
    };
    const chains = new Map(items.map(node => [node.id, chainOf(node.id)]));
    const mains = items.filter(node => chains.get(node.id)?.rootId === node.id);

    // Concomitant descendants of a main node in depth-first order
    const concomitantsOf = (rootId: string): ExplorerNode[] => {
        const result: ExplorerNode[] = [];
        const visit = (id: string): void => {
            data.edges
                .filter(edge => edge.kind === 'concomitates' && edge.target === id && edge.source !== id)
                .map(edge => data.nodes.get(edge.source) as ExplorerNode)
                .filter(node => !result.includes(node) && chains.get(node.id)?.rootId === rootId)
                .forEach(node => {
                    result.push(node);
                    visit(node.id);
                });
        };
        visit(rootId);
        return result;
    };

    // Lanes: one per part-of parent of the main nodes (in order of the parents in the data, unassigned last)
    const nodeOrder = [...data.nodes.keys()];
    const laneOrder = (laneId: string): number => (laneId ? nodeOrder.indexOf(laneId) : Number.MAX_SAFE_INTEGER);
    const laneIds = [...new Set(mains.map(node => node.partOf ?? ''))].sort((a, b) => laneOrder(a) - laneOrder(b));

    const nodes: ExplorerFlowNode[] = [];
    const positions = new Map<string, ExplorerFlowNode>();
    const lanes: ExplorerFlowLane[] = [];
    let laneTop = S.margin;
    let maxColumns = 1;

    laneIds.forEach(laneId => {
        const laneMains = mains.filter(node => (node.partOf ?? '') === laneId);
        const minRank = Math.min(...laneMains.map(node => ranks.get(node.id) ?? 0));

        // Stack of nodes per column
        const columns = new Map<number, { node: ExplorerNode; depth: number }[]>();
        laneMains.forEach(main => {
            const column = (ranks.get(main.id) ?? 0) - minRank;
            const stack = columns.get(column) ?? [];
            stack.push({ node: main, depth: 0 });
            concomitantsOf(main.id).forEach(node => stack.push({ node, depth: chains.get(node.id)?.depth ?? 1 }));
            columns.set(column, stack);
        });

        const maxRows = Math.max(1, ...[...columns.values()].map(stack => stack.length));
        maxColumns = Math.max(maxColumns, ...[...columns.keys()].map(column => column + 1));

        [...columns.entries()]
            .sort(([a], [b]) => a - b)
            .forEach(([column, stack]) =>
                stack.forEach(({ node, depth }, row) => {
                    const flowNode: ExplorerFlowNode = {
                        node,
                        x: S.laneLabelWidth + column * S.columnWidth + S.nodeWidth / 2 + depth * S.concomitantIndent,
                        y: laneTop + S.lanePadding + row * S.rowHeight + S.nodeHeight / 2,
                        isConcomitant: depth > 0,
                    };
                    nodes.push(flowNode);
                    positions.set(node.id, flowNode);
                })
            );

        const height = 2 * S.lanePadding + (maxRows - 1) * S.rowHeight + S.nodeHeight;
        lanes.push({ label: data.nodes.get(laneId)?.label ?? 'Ohne Zuordnung', y: laneTop, height });
        laneTop += height;
    });

    const halfWidth = (flowNode: ExplorerFlowNode): number =>
        (S.nodeWidth - (flowNode.isConcomitant ? S.concomitantIndent : 0)) / 2;

    const links: ExplorerFlowLink[] = data.edges
        .filter(edge => positions.has(edge.source) && positions.has(edge.target) && edge.source !== edge.target)
        .map(edge => {
            const source = positions.get(edge.source) as ExplorerFlowNode;
            const target = positions.get(edge.target) as ExplorerFlowNode;

            if (edge.kind === 'concomitates') {
                // Elbow connector from the left side of the accompanied sketch down to the concomitant sketch
                const x = target.x - halfWidth(target) + 4;
                return {
                    edge,
                    path: `M${x},${target.y + S.nodeHeight / 2} V${source.y} H${source.x - halfWidth(source)}`,
                };
            }

            const sx = source.x + halfWidth(source);
            if (target.x - halfWidth(target) > sx + 4) {
                // Forward: cubic curve from the right side of the source to the left side of the target
                const targetLeft = target.x - halfWidth(target);
                const dx = Math.max(30, (targetLeft - sx) / 2);
                return {
                    edge,
                    path: `M${sx},${source.y} C${sx + dx},${source.y} ${targetLeft - dx},${target.y} ${targetLeft},${target.y}`,
                };
            }
            // Backward or same column: arc on the right side
            const targetRight = target.x + halfWidth(target);
            const bulge = 28 + Math.abs(target.y - source.y) / 6;
            return {
                edge,
                path: `M${sx},${source.y} C${sx + bulge},${source.y} ${targetRight + bulge},${target.y} ${targetRight},${target.y}`,
            };
        });

    return {
        nodes,
        links,
        lanes,
        width: S.laneLabelWidth + maxColumns * S.columnWidth + S.margin,
        height: laneTop + S.margin,
    };
}

/**
 * Utils constants: GRAPH_EXPLORER_UTILS.
 *
 * It keeps a namespace reference to the graph explorer utils methods.
 */
export const GRAPH_EXPLORER_UTILS = {
    buildFlowLayout,
    buildTree,
    concomitanceParent,
    isPrecedesKind,
    parseExplorerData,
    rankNodes,
    relationsOf,
    transitiveClosure,
} as const;
