import type { Quad } from '@rdfjs/types';
import { Parser } from 'n3';

import { RESULT_GRAPH_UTILS } from '../graph-visualizer/results/construct/result-graph.utils';
import { DEFAULT_PREFIXES, PREFIX_UTILS } from '../graph-visualizer/utils/prefix.utils';
import { RDF_TYPE } from '../graph-visualizer/utils/term.utils';
import { RDF_GENERATOR_PREFIXES } from '../rdf-generator/rdf-vocab';
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
} from './graph-explorer.model';

const { awg: AWG, dcterms: DCTERMS } = RDF_GENERATOR_PREFIXES;

/**
 * Array constant: NODE_KINDS_BY_PRIORITY.
 *
 * It keeps the node kind per class IRI, most specific first: the supertypes are materialized,
 * so a node gets the kind of its most specific class.
 */
const NODE_KINDS_BY_PRIORITY: readonly (readonly [string, ExplorerNodeKind])[] = [
    [`${AWG}SketchSegment`, 'segment'],
    [`${AWG}RowTable`, 'rowTable'],
    [`${AWG}ContinuityDraft`, 'continuityDraft'],
    [`${AWG}Sketch`, 'sketch'],
    [`${AWG}Paratext`, 'paratext'],
    [`${AWG}EditionComplex`, 'complex'],
];

/**
 * Object constant: EDGE_KINDS.
 *
 * It keeps the edge kind per property IRI.
 */
const EDGE_KINDS: ReadonlyMap<string, ExplorerEdgeKind> = new Map([
    [`${AWG}precedes`, 'precedes'],
    [`${AWG}precedesScripture`, 'precedesScripture'],
    [`${AWG}precedesContent`, 'precedesContent'],
    [`${AWG}concomitates`, 'concomitates'],
    [`${AWG}nextSegment`, 'nextSegment'],
]);

const AWG_BELONGS_TO_COMPLEX = `${AWG}belongsToComplex`;
const DCTERMS_HAS_PART = `${DCTERMS}hasPart`;

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
    minNodeWidth: 72,
    nodeHeight: 22,
    stackIndent: 10,
    margin: 16,
});

/**
 * Helper function: pushTo.
 *
 * It adds a value to the list of a key in a map.
 */
function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
    const values = map.get(key);
    if (values) {
        values.push(value);
    } else {
        map.set(key, [value]);
    }
}

/**
 * Helper function: nodeKindOf.
 *
 * It gets the most specific node kind of the given class IRIs, if any.
 */
function nodeKindOf(classes: ReadonlySet<string>): ExplorerNodeKind | undefined {
    return NODE_KINDS_BY_PRIORITY.find(([classIri]) => classes.has(classIri))?.[1];
}

/**
 * Utils function: isPrecedesKind.
 *
 * It checks if a given edge kind belongs to the `awg:precedes` property family
 * (`awg:precedes` and its subproperties); concomitance and segment order do not.
 *
 * @param {ExplorerEdgeKind} kind The given edge kind.
 * @returns {boolean} The result of the check.
 */
export function isPrecedesKind(kind: ExplorerEdgeKind): boolean {
    return kind === 'precedes' || kind === 'precedesScripture' || kind === 'precedesContent';
}

/**
 * Utils function: isGeneticKind.
 *
 * It checks if a given edge kind is a genetic relation (precedence or concomitance).
 *
 * @param {ExplorerEdgeKind} kind The given edge kind.
 * @returns {boolean} The result of the check.
 */
export function isGeneticKind(kind: ExplorerEdgeKind): boolean {
    return kind !== 'nextSegment';
}

/**
 * Utils function: parseExplorerData.
 *
 * It parses the given Turtle data into the explorer data: the complexes and the inscriptions
 * (sketches, segments, row tables, and paratexts with a genetic relation) with their complex
 * (`awg:belongsToComplex`) and the sketch of the segments (`dcterms:hasPart`),
 * and the genetic relations and segment order between them.
 * Invalid Turtle data results in empty explorer data.
 *
 * @param {string} turtle The given Turtle data.
 * @returns {ExplorerData} The explorer data.
 */
export function parseExplorerData(turtle: string): ExplorerData {
    let quads: Quad[];
    try {
        quads = new Parser().parse(turtle);
    } catch {
        return { nodes: new Map(), edges: [] };
    }

    // Classes per named subject, in order of appearance
    const classesById = new Map<string, Set<string>>();
    quads.forEach(({ subject, predicate, object }) => {
        if (predicate.equals(RDF_TYPE) && subject.termType === 'NamedNode') {
            const classes = classesById.get(subject.value) ?? new Set<string>();
            classes.add(object.value);
            classesById.set(subject.value, classes);
        }
    });
    const kinds = new Map<string, ExplorerNodeKind>();
    classesById.forEach((classes, id) => {
        const kind = nodeKindOf(classes);
        if (kind) {
            kinds.set(id, kind);
        }
    });

    // Edges between typed nodes, without duplicates
    const edgeKeys = new Set<string>();
    const edges: ExplorerEdge[] = [];
    const complexById = new Map<string, string>();
    const sketchById = new Map<string, string>();
    quads.forEach(({ subject, predicate, object }) => {
        const sourceKind = kinds.get(subject.value);
        const targetKind = kinds.get(object.value);
        if (!sourceKind || !targetKind) {
            return;
        }
        if (predicate.value === AWG_BELONGS_TO_COMPLEX && targetKind === 'complex') {
            complexById.set(subject.value, object.value);
        } else if (predicate.value === DCTERMS_HAS_PART && targetKind === 'segment') {
            sketchById.set(object.value, subject.value);
        }
        const kind = EDGE_KINDS.get(predicate.value);
        if (!kind) {
            return;
        }
        const key = `${subject.value} ${kind} ${object.value}`;
        if (!edgeKeys.has(key)) {
            edgeKeys.add(key);
            edges.push({ source: subject.value, target: object.value, kind });
        }
    });

    // Paratexts only with a genetic relation
    const geneticIds = new Set<string>();
    edges
        .filter(edge => isGeneticKind(edge.kind))
        .forEach(edge => {
            geneticIds.add(edge.source);
            geneticIds.add(edge.target);
        });
    const isShown = (id: string, kind: ExplorerNodeKind): boolean => kind !== 'paratext' || geneticIds.has(id);

    const labels = RESULT_GRAPH_UTILS.extractLabels(quads);
    const nodes = new Map<string, ExplorerNode>();
    kinds.forEach((kind, id) => {
        if (isShown(id, kind)) {
            const label = labels.get(id) ?? PREFIX_UTILS.compactIri(id, DEFAULT_PREFIXES);
            nodes.set(id, { id, label, kind, complex: complexById.get(id), sketch: sketchById.get(id) });
        }
    });

    return { nodes, edges: edges.filter(edge => nodes.has(edge.source) && nodes.has(edge.target)) };
}

/**
 * Utils function: concomitantsOf.
 *
 * It gets the ids of the nodes concomitating with a given node, in both directions
 * (concomitance is symmetric, but only one direction is stored).
 *
 * @param {ExplorerData} data The given explorer data.
 * @param {string} id The given node id.
 * @returns {Set<string>} The ids of the concomitant nodes.
 */
export function concomitantsOf(data: ExplorerData, id: string): Set<string> {
    const ids = new Set<string>();
    data.edges
        .filter(edge => edge.kind === 'concomitates' && edge.source !== edge.target)
        .forEach(edge => {
            if (edge.source === id) {
                ids.add(edge.target);
            } else if (edge.target === id) {
                ids.add(edge.source);
            }
        });
    return ids;
}

/**
 * Utils function: stackRoot.
 *
 * It gets the main inscription at the root of the stack of a given node; cycles are broken.
 *
 * @param {ReadonlyMap<string, string>} parents The given stack parents by node id.
 * @param {string} id The given node id.
 * @returns {string} The id of the root.
 */
export function stackRoot(parents: ReadonlyMap<string, string>, id: string): string {
    const seen = new Set<string>([id]);
    let rootId = id;
    for (let parent = parents.get(rootId); parent && !seen.has(parent); parent = parents.get(rootId)) {
        seen.add(parent);
        rootId = parent;
    }
    return rootId;
}

/**
 * Utils function: stackParents.
 *
 * It gets the node each inscription is stacked below in the flow:
 * the main inscription it concomitates (stored direction: dependent → main),
 * preferring a segment over a sketch, otherwise the sketch of a segment.
 * A parent that would close a cycle is skipped.
 *
 * @param {ExplorerData} data The given explorer data.
 * @returns {Map<string, string>} The id of the stack parent by node id.
 */
export function stackParents(data: ExplorerData): Map<string, string> {
    const parents = new Map<string, string>();
    const setParent = (id: string, parent: string): void => {
        if (!parents.has(id) && stackRoot(parents, parent) !== id) {
            parents.set(id, parent);
        }
    };
    // Segments first: a concomitance with a segment is more specific than one with its sketch
    const concomitances = data.edges.filter(edge => edge.kind === 'concomitates');
    const isSegment = (id: string): boolean => data.nodes.get(id)?.kind === 'segment';
    [
        ...concomitances.filter(edge => isSegment(edge.target)),
        ...concomitances.filter(edge => !isSegment(edge.target)),
    ].forEach(edge => setParent(edge.source, edge.target));
    data.nodes.forEach(node => {
        if (node.sketch && data.nodes.has(node.sketch)) {
            setParent(node.id, node.sketch);
        }
    });
    return parents;
}

/**
 * Utils function: transitiveClosure.
 *
 * It gets all transitive predecessors and successors of a given node
 * via the `awg:precedes` property family (transitive; concomitance and segment order are not followed).
 *
 * @param {ExplorerData} data The given explorer data.
 * @param {string} id The given node id.
 * @returns {{ predecessors: Set<string>; successors: Set<string> }} The transitive predecessors and successors.
 */
export function transitiveClosure(
    data: ExplorerData,
    id: string
): { predecessors: Set<string>; successors: Set<string> } {
    const sourcesByTarget = new Map<string, string[]>();
    const targetsBySource = new Map<string, string[]>();
    data.edges
        .filter(edge => isPrecedesKind(edge.kind))
        .forEach(edge => {
            pushTo(sourcesByTarget, edge.target, edge.source);
            pushTo(targetsBySource, edge.source, edge.target);
        });

    const walk = (next: ReadonlyMap<string, string[]>): Set<string> => {
        const found = new Set<string>();
        const queue = [id];
        for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
            next.get(current)?.forEach(nextId => {
                if (nextId !== id && !found.has(nextId)) {
                    found.add(nextId);
                    queue.push(nextId);
                }
            });
        }
        return found;
    };

    return { predecessors: walk(sourcesByTarget), successors: walk(targetsBySource) };
}

/**
 * Utils function: rankNodes.
 *
 * It ranks the main inscriptions (stack roots) by the longest path of preceding main inscriptions
 * via the `awg:precedes` property family; edges from or to stacked nodes count for their root,
 * cycles are broken.
 *
 * @param {ExplorerData} data The given explorer data.
 * @param {ReadonlyMap<string, string>} [parents] The optional stack parents by node id (computed if not given).
 * @returns {Map<string, number>} The rank by id of the main inscription.
 */
export function rankNodes(
    data: ExplorerData,
    parents: ReadonlyMap<string, string> = stackParents(data)
): Map<string, number> {
    const rootOf = (id: string): string => stackRoot(parents, id);
    const predecessors = new Map<string, string[]>();
    data.edges
        .filter(edge => isPrecedesKind(edge.kind))
        .forEach(edge => {
            const source = rootOf(edge.source);
            const target = rootOf(edge.target);
            if (source !== target) {
                pushTo(predecessors, target, source);
            }
        });

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
        const predecessorRanks = predecessors.get(id)?.map(rankOf) ?? [];
        const rank = predecessorRanks.length ? Math.max(...predecessorRanks) + 1 : 0;
        visiting.delete(id);
        ranks.set(id, rank);
        return rank;
    };

    data.nodes.forEach(node => {
        if (node.kind !== 'complex' && rootOf(node.id) === node.id) {
            rankOf(node.id);
        }
    });
    return ranks;
}

/**
 * Utils function: flowNodeWidth.
 *
 * It gets the width of a flow node by its depth in the stack (indented, right edges aligned).
 *
 * @param {number} depth The given depth in the stack.
 * @returns {number} The width.
 */
export function flowNodeWidth(depth: number): number {
    const { nodeWidth, minNodeWidth, stackIndent } = FLOW_SIZES;
    return Math.max(minNodeWidth, nodeWidth - depth * stackIndent);
}

/**
 * Helper function: createStacker.
 *
 * It creates a function that gets the nodes stacked below a main inscription, depth-first with their depth:
 * first the segments in the order of `awg:nextSegment` (else in order of the data),
 * then the concomitant nodes.
 */
function createStacker(
    data: ExplorerData,
    parents: ReadonlyMap<string, string>
): (rootId: string) => { node: ExplorerNode; depth: number }[] {
    const childrenByParent = new Map<string, ExplorerNode[]>();
    data.nodes.forEach(node => {
        const parent = parents.get(node.id);
        if (parent) {
            pushTo(childrenByParent, parent, node);
        }
    });
    const nextSegmentOf = new Map(
        data.edges.filter(edge => edge.kind === 'nextSegment').map(edge => [edge.source, edge.target])
    );

    const orderChildren = (children: readonly ExplorerNode[]): ExplorerNode[] => {
        const segments = children.filter(child => child.kind === 'segment');
        const segmentIds = new Set(segments.map(segment => segment.id));
        const followers = new Set(segments.map(segment => nextSegmentOf.get(segment.id)));
        const ordered: ExplorerNode[] = [];
        const append = (segment: ExplorerNode | undefined): void => {
            for (let current = segment; current && !ordered.includes(current);) {
                ordered.push(current);
                const nextId = nextSegmentOf.get(current.id);
                current = nextId && segmentIds.has(nextId) ? data.nodes.get(nextId) : undefined;
            }
        };
        segments.filter(segment => !followers.has(segment.id)).forEach(append);
        segments.forEach(append);
        return [...ordered, ...children.filter(child => child.kind !== 'segment')];
    };

    return (rootId: string) => {
        const result: { node: ExplorerNode; depth: number }[] = [];
        const visited = new Set<string>([rootId]);
        const visit = (parentId: string, depth: number): void => {
            orderChildren(childrenByParent.get(parentId) ?? []).forEach(child => {
                if (!visited.has(child.id)) {
                    visited.add(child.id);
                    result.push({ node: child, depth });
                    visit(child.id, depth + 1);
                }
            });
        };
        visit(rootId, 1);
        return result;
    };
}

/**
 * Helper function: linkPath.
 *
 * It gets the SVG path of an edge between two positioned nodes:
 * an elbow from a main inscription down to a node stacked below it (concomitance, segment of a sketch),
 * a vertical line between stacked segments (segment order),
 * otherwise a curve to the right (forward) or an arc on the right side (backward or same column).
 */
function linkPath(edge: ExplorerEdge, source: ExplorerFlowNode, target: ExplorerFlowNode, isStacked: boolean): string {
    const { nodeHeight } = FLOW_SIZES;
    const left = (flowNode: ExplorerFlowNode): number => flowNode.x - flowNodeWidth(flowNode.depth) / 2;
    const right = (flowNode: ExplorerFlowNode): number => flowNode.x + flowNodeWidth(flowNode.depth) / 2;

    if (edge.kind === 'nextSegment' && left(source) === left(target)) {
        const x = left(source) + 6;
        const [top, bottom] = source.y < target.y ? [source, target] : [target, source];
        return `M${x},${top.y + nodeHeight / 2} V${bottom.y - nodeHeight / 2}`;
    }
    if (isStacked) {
        // Elbow from the left side of the main inscription down to the stacked node
        const x = left(target) + 4;
        return `M${x},${target.y + nodeHeight / 2} V${source.y} H${left(source)}`;
    }

    const sx = right(source);
    const targetLeft = left(target);
    if (targetLeft > sx + 4) {
        const dx = Math.max(30, (targetLeft - sx) / 2);
        return `M${sx},${source.y} C${sx + dx},${source.y} ${targetLeft - dx},${target.y} ${targetLeft},${target.y}`;
    }
    const targetRight = right(target);
    const bulge = 28 + Math.abs(target.y - source.y) / 6;
    return `M${sx},${source.y} C${sx + bulge},${source.y} ${targetRight + bulge},${target.y} ${targetRight},${target.y}`;
}

/**
 * Regex constant: MNR_LABEL_REGEX.
 *
 * It keeps a regex for the M number at the start of a sketch label (e.g. `M 78 Sk1`, `M* 412 Sk2`, `M 35/42 Sk1`).
 */
const MNR_LABEL_REGEX = /^(M\*?\s\d+(?:\/\d+)?)\s/;

/**
 * Helper function: flowLane.
 *
 * It gets the lane of a main inscription: its complex, else the M number of its label
 * (sketches of M numbers without complex), else the lane without assignment.
 */
function flowLane(data: ExplorerData, node: ExplorerNode): { key: string; label: string; isComplex: boolean } {
    if (node.complex) {
        const label = data.nodes.get(node.complex)?.label ?? PREFIX_UTILS.compactIri(node.complex, DEFAULT_PREFIXES);
        return { key: node.complex, label, isComplex: true };
    }
    const mnr = MNR_LABEL_REGEX.exec(node.label)?.[1];
    return mnr ? { key: mnr, label: mnr, isComplex: false } : { key: '', label: 'Ohne Zuordnung', isComplex: false };
}

/**
 * Utils function: buildFlowLayout.
 *
 * It lays out the flow diagram of the writing process: one lane per complex (or M number without complex),
 * main inscriptions in columns by their rank, segments and concomitant nodes stacked below them.
 *
 * @param {ExplorerData} data The given explorer data.
 * @returns {ExplorerFlowLayout} The flow layout.
 */
export function buildFlowLayout(data: ExplorerData): ExplorerFlowLayout {
    const { laneLabelWidth, lanePadding, columnWidth, rowHeight, nodeHeight, margin } = FLOW_SIZES;
    const parents = stackParents(data);
    const ranks = rankNodes(data, parents);
    const stackBelow = createStacker(data, parents);
    const mains = [...data.nodes.values()].filter(node => ranks.has(node.id));

    // Lanes: complexes in order of the data, then M numbers without complex, unassigned last
    const lanesByMain = new Map(mains.map(node => [node.id, flowLane(data, node)]));
    const nodeOrder = [...data.nodes.keys()];
    const laneOrder = ({ key, isComplex }: { key: string; isComplex: boolean }): number => {
        if (!key) {
            return Number.MAX_SAFE_INTEGER;
        }
        return isComplex ? nodeOrder.indexOf(key) : nodeOrder.length;
    };
    const laneEntries = [...new Map([...lanesByMain.values()].map(lane => [lane.key, lane])).values()];
    laneEntries.sort((a, b) => laneOrder(a) - laneOrder(b));

    const nodes: ExplorerFlowNode[] = [];
    const positions = new Map<string, ExplorerFlowNode>();
    const lanes: ExplorerFlowLane[] = [];
    let laneTop = margin;
    let columnCount = 1;

    laneEntries.forEach(lane => {
        const laneMains = mains.filter(node => lanesByMain.get(node.id)?.key === lane.key);
        const minRank = Math.min(...laneMains.map(node => ranks.get(node.id) ?? 0));

        // Stack of nodes per column
        const columns = new Map<number, { node: ExplorerNode; depth: number }[]>();
        laneMains.forEach(main => {
            const column = (ranks.get(main.id) ?? 0) - minRank;
            pushTo(columns, column, { node: main, depth: 0 });
            stackBelow(main.id).forEach(stacked => pushTo(columns, column, stacked));
        });

        let rowCount = 1;
        columns.forEach((stack, column) => {
            rowCount = Math.max(rowCount, stack.length);
            columnCount = Math.max(columnCount, column + 1);
            stack.forEach(({ node, depth }, row) => {
                const width = flowNodeWidth(depth);
                const flowNode: ExplorerFlowNode = {
                    node,
                    x: laneLabelWidth + column * columnWidth + FLOW_SIZES.nodeWidth - width / 2,
                    y: laneTop + lanePadding + row * rowHeight + nodeHeight / 2,
                    depth,
                };
                nodes.push(flowNode);
                positions.set(node.id, flowNode);
            });
        });

        const height = 2 * lanePadding + (rowCount - 1) * rowHeight + nodeHeight;
        lanes.push({ label: lane.label, y: laneTop, height });
        laneTop += height;
    });

    const links: ExplorerFlowLink[] = [];
    data.edges.forEach(edge => {
        const source = positions.get(edge.source);
        const target = positions.get(edge.target);
        if (source && target && edge.source !== edge.target) {
            const isStacked = edge.kind === 'concomitates' && parents.get(edge.source) === edge.target;
            links.push({ edge, path: linkPath(edge, source, target, isStacked) });
        }
    });

    return {
        nodes,
        links,
        lanes,
        width: laneLabelWidth + columnCount * columnWidth + margin,
        height: laneTop + margin,
    };
}

/**
 * Object constant: GRAPH_EXPLORER_UTILS.
 *
 * It keeps all utils functions of the graph explorer.
 */
export const GRAPH_EXPLORER_UTILS = {
    buildFlowLayout,
    concomitantsOf,
    flowNodeWidth,
    isGeneticKind,
    isPrecedesKind,
    parseExplorerData,
    rankNodes,
    stackParents,
    stackRoot,
    transitiveClosure,
} as const;
