/**
 * The ExplorerNodeKind type.
 *
 * It represents the kind of a node in the graph explorer (from its `rdf:type`).
 */
export type ExplorerNodeKind = 'complex' | 'sketch' | 'paratext' | 'other';

/**
 * The ExplorerEdgeKind type.
 *
 * It represents the kind of a relation between two nodes in the graph explorer.
 */
export type ExplorerEdgeKind = 'precedes' | 'precedesScripture' | 'precedesContent' | 'concomitates';

/**
 * The ExplorerViewType type.
 *
 * It represents the view types of the graph explorer.
 */
export type ExplorerViewType = 'tree' | 'flow' | 'matrix';

/**
 * The ExplorerNode interface.
 *
 * It represents a node (edition complex, sketch, paratext) in the graph explorer.
 */
export interface ExplorerNode {
    /**
     * The id (IRI) of the node.
     */
    readonly id: string;

    /**
     * The label of the node (`rdfs:label` or compacted IRI).
     */
    readonly label: string;

    /**
     * The kind of the node.
     */
    readonly kind: ExplorerNodeKind;

    /**
     * The id of the parent (`dc:isPartOf` or inverse `dc:hasPart`), if any.
     */
    readonly partOf: string | undefined;
}

/**
 * The ExplorerEdge interface.
 *
 * It represents a directed relation between two nodes in the graph explorer.
 */
export interface ExplorerEdge {
    /**
     * The id of the source node.
     */
    readonly source: string;

    /**
     * The id of the target node.
     */
    readonly target: string;

    /**
     * The kind of the relation.
     */
    readonly kind: ExplorerEdgeKind;
}

/**
 * The ExplorerData interface.
 *
 * It represents the data model of the graph explorer.
 */
export interface ExplorerData {
    /**
     * The nodes by id (in order of appearance in the triples).
     */
    readonly nodes: ReadonlyMap<string, ExplorerNode>;

    /**
     * The relations between the nodes.
     */
    readonly edges: readonly ExplorerEdge[];
}

/**
 * The ExplorerTreeNode interface.
 *
 * It represents a node of the work structure tree of the graph explorer.
 */
export interface ExplorerTreeNode {
    /**
     * The explorer node.
     */
    readonly node: ExplorerNode;

    /**
     * The child tree nodes (parts and concomitant sketches).
     */
    readonly children: readonly ExplorerTreeNode[];

    /**
     * The total number of descendants.
     */
    readonly descendantCount: number;
}

/**
 * The ExplorerRelations interface.
 *
 * It represents the relations of a single node (for the profile of a selected node).
 */
export interface ExplorerRelations {
    /**
     * The node.
     */
    readonly node: ExplorerNode;

    /**
     * The parent node, if any.
     */
    readonly parent: ExplorerNode | undefined;

    /**
     * The direct predecessors with the kind of relation.
     */
    readonly predecessors: readonly { node: ExplorerNode; kind: ExplorerEdgeKind }[];

    /**
     * The direct successors with the kind of relation.
     */
    readonly successors: readonly { node: ExplorerNode; kind: ExplorerEdgeKind }[];

    /**
     * The nodes this node concomitates (accompanies).
     */
    readonly accompanies: readonly ExplorerNode[];

    /**
     * The nodes concomitating (accompanying) this node.
     */
    readonly accompaniedBy: readonly ExplorerNode[];
}

/**
 * The ExplorerFlowNode interface.
 *
 * It represents a positioned node in the flow diagram of the graph explorer.
 */
export interface ExplorerFlowNode {
    /**
     * The explorer node.
     */
    readonly node: ExplorerNode;

    /**
     * The x position (center).
     */
    readonly x: number;

    /**
     * The y position (center).
     */
    readonly y: number;

    /**
     * The flag if the node is a concomitant sketch (drawn smaller, below its main sketch).
     */
    readonly isConcomitant: boolean;
}

/**
 * The ExplorerFlowLink interface.
 *
 * It represents a drawn relation in the flow diagram of the graph explorer.
 */
export interface ExplorerFlowLink {
    /**
     * The relation.
     */
    readonly edge: ExplorerEdge;

    /**
     * The svg path of the relation.
     */
    readonly path: string;
}

/**
 * The ExplorerFlowLane interface.
 *
 * It represents a lane (one per sub complex) in the flow diagram of the graph explorer.
 */
export interface ExplorerFlowLane {
    /**
     * The label of the lane.
     */
    readonly label: string;

    /**
     * The y position of the top of the lane.
     */
    readonly y: number;

    /**
     * The height of the lane.
     */
    readonly height: number;
}

/**
 * The ExplorerFlowLayout interface.
 *
 * It represents the layout of the flow diagram of the graph explorer.
 */
export interface ExplorerFlowLayout {
    /**
     * The positioned nodes.
     */
    readonly nodes: readonly ExplorerFlowNode[];

    /**
     * The drawn relations.
     */
    readonly links: readonly ExplorerFlowLink[];

    /**
     * The lanes.
     */
    readonly lanes: readonly ExplorerFlowLane[];

    /**
     * The width of the diagram.
     */
    readonly width: number;

    /**
     * The height of the diagram.
     */
    readonly height: number;
}

/**
 * Object constant: KIND_LABELS.
 *
 * It keeps the german labels of the node kinds.
 */
export const KIND_LABELS: Readonly<Record<ExplorerNodeKind, string>> = {
    complex: 'Editionskomplex',
    sketch: 'Skizze',
    paratext: 'Paratext',
    other: 'Objekt',
};

/**
 * Object constant: EDGE_LABELS.
 *
 * It keeps the german labels of the relation kinds.
 */
export const EDGE_LABELS: Readonly<Record<ExplorerEdgeKind, string>> = {
    precedes: 'geht voraus',
    precedesScripture: 'geht schriftlich voraus',
    precedesContent: 'geht inhaltlich voraus',
    concomitates: 'begleitet',
};
