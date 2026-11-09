/**
 * The ExplorerNodeKind type.
 *
 * It is used in the context of the graph explorer
 * to store the kind of a node (its most specific class).
 */
export type ExplorerNodeKind = 'complex' | 'sketch' | 'segment' | 'rowTable' | 'continuityDraft' | 'paratext';

/**
 * The ExplorerEdgeKind type.
 *
 * It is used in the context of the graph explorer
 * to store the kind of an edge: the genetic relations
 * and the (non-genetic) order of the segments of a sketch.
 */
export type ExplorerEdgeKind = 'precedes' | 'precedesScripture' | 'precedesContent' | 'concomitates' | 'nextSegment';

/**
 * The ExplorerNode interface.
 *
 * It represents a node of the graph explorer.
 */
export interface ExplorerNode {
    /**
     * The IRI of the node.
     */
    readonly id: string;

    /**
     * The label of the node.
     */
    readonly label: string;

    /**
     * The kind of the node.
     */
    readonly kind: ExplorerNodeKind;

    /**
     * The IRI of the complex the node belongs to (`awg:belongsToComplex`), if any.
     */
    readonly complex?: string;

    /**
     * The IRI of the sketch a segment is part of (`dcterms:hasPart`), if any.
     */
    readonly sketch?: string;
}

/**
 * The ExplorerEdge interface.
 *
 * It represents an edge of the graph explorer in its stored direction.
 */
export interface ExplorerEdge {
    /**
     * The IRI of the source node.
     */
    readonly source: string;

    /**
     * The IRI of the target node.
     */
    readonly target: string;

    /**
     * The kind of the edge.
     */
    readonly kind: ExplorerEdgeKind;
}

/**
 * The ExplorerData interface.
 *
 * It represents the data of the graph explorer:
 * the complexes and the inscriptions shown in the flow, with their edges.
 */
export interface ExplorerData {
    /**
     * The nodes by IRI, in order of appearance in the data.
     */
    readonly nodes: ReadonlyMap<string, ExplorerNode>;

    /**
     * The edges between the nodes.
     */
    readonly edges: readonly ExplorerEdge[];
}

/**
 * The ExplorerFlowNode interface.
 *
 * It represents a positioned node of the flow layout.
 */
export interface ExplorerFlowNode {
    /**
     * The node.
     */
    readonly node: ExplorerNode;

    /**
     * The x position of the center of the node.
     */
    readonly x: number;

    /**
     * The y position of the center of the node.
     */
    readonly y: number;

    /**
     * The depth of the node in the stack below its main inscription (0 for the main inscription).
     */
    readonly depth: number;
}

/**
 * The ExplorerFlowLink interface.
 *
 * It represents a drawn edge of the flow layout.
 */
export interface ExplorerFlowLink {
    /**
     * The edge.
     */
    readonly edge: ExplorerEdge;

    /**
     * The SVG path of the edge.
     */
    readonly path: string;
}

/**
 * The ExplorerFlowLane interface.
 *
 * It represents a lane of the flow layout (one per complex).
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
 * It represents the flow layout of the writing process.
 */
export interface ExplorerFlowLayout {
    /**
     * The positioned nodes.
     */
    readonly nodes: readonly ExplorerFlowNode[];

    /**
     * The drawn edges.
     */
    readonly links: readonly ExplorerFlowLink[];

    /**
     * The lanes.
     */
    readonly lanes: readonly ExplorerFlowLane[];

    /**
     * The width of the layout.
     */
    readonly width: number;

    /**
     * The height of the layout.
     */
    readonly height: number;
}

/**
 * Object constant: EXPLORER_KIND_LABELS.
 *
 * It keeps the labels of the node kinds (as in the ontology).
 */
export const EXPLORER_KIND_LABELS: Readonly<Record<ExplorerNodeKind, string>> = {
    complex: 'Editionskomplex',
    sketch: 'Skizze',
    segment: 'Skizzensegment',
    rowTable: 'Reihentabelle',
    continuityDraft: 'Verlaufsskizze',
    paratext: 'Paratext',
};

/**
 * Object constant: EXPLORER_EDGE_LABELS.
 *
 * It keeps the labels of the edge kinds (as in the ontology).
 */
export const EXPLORER_EDGE_LABELS: Readonly<Record<ExplorerEdgeKind, string>> = {
    precedes: 'geht voraus',
    precedesScripture: 'geht nach Schreibbefund voraus',
    precedesContent: 'geht inhaltlich voraus',
    concomitates: 'begleitet',
    nextSegment: 'nächstes Segment',
};
