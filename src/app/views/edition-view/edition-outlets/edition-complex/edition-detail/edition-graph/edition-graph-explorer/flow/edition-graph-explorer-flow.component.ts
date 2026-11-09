import { Component, computed, input, signal, viewChild } from '@angular/core';

import { SvgZoomDirective } from '@awg-shared/zoom/svg-zoom.directive';
import { ZoomConfig } from '@awg-shared/zoom/zoom.model';

import { GraphRdfData } from '@awg-views/edition-view/models/graph.model';

import {
    EXPLORER_EDGE_LABELS,
    EXPLORER_KIND_LABELS,
    ExplorerEdgeKind,
    ExplorerFlowLink,
} from '../graph-explorer.model';
import { FLOW_SIZES, GRAPH_EXPLORER_UTILS } from '../graph-explorer.utils';

/**
 * The ExplorerFlowState type.
 *
 * It is used in the context of the flow view
 * to store the highlight state of a node or link relative to the focused node.
 */
export type ExplorerFlowState = 'focus' | 'predecessor' | 'successor' | 'related' | 'dimmed' | 'none';

/**
 * Let variable: nextFlowId.
 *
 * It counts the flow views for unique marker ids.
 */
let nextFlowId = 0;

/**
 * The EditionGraphExplorerFlow component.
 *
 * It contains the flow view of the writing process of a graph:
 * the inscriptions per complex in the order of their precedence, with segments and concomitant
 * inscriptions stacked below; hovering or selecting a node highlights all its (transitive)
 * predecessors and successors, computed in TypeScript.
 */
@Component({
    selector: 'awg-edition-graph-explorer-flow',
    templateUrl: './edition-graph-explorer-flow.component.html',
    styleUrl: './edition-graph-explorer-flow.component.scss',
    imports: [SvgZoomDirective],
})
export class EditionGraphExplorerFlowComponent {
    /**
     * Readonly input signal: rdfData.
     *
     * It holds the RDF data of the graph (Turtle triples).
     */
    readonly rdfData = input.required<GraphRdfData>();

    /**
     * Readonly view child signal: svgZoom.
     *
     * It holds the zoom directive of the flow svg.
     */
    readonly svgZoom = viewChild.required(SvgZoomDirective);

    /**
     * Readonly variable: sizes.
     *
     * It keeps the sizes of the flow diagram.
     */
    readonly sizes = FLOW_SIZES;

    /**
     * Readonly variable: kindLabels.
     *
     * It keeps the labels of the node kinds.
     */
    readonly kindLabels = EXPLORER_KIND_LABELS;

    /**
     * Readonly variable: edgeLabels.
     *
     * It keeps the labels of the edge kinds.
     */
    readonly edgeLabels = EXPLORER_EDGE_LABELS;

    /**
     * Readonly variable: legend.
     *
     * It keeps the edge kinds of the legend.
     */
    readonly legend: readonly ExplorerEdgeKind[] = [
        'precedes',
        'precedesScripture',
        'precedesContent',
        'concomitates',
        'nextSegment',
    ];

    /**
     * Readonly variable: markerKinds.
     *
     * It keeps the kinds of the arrow markers (the precedence kinds and the highlight).
     */
    readonly markerKinds = ['precedes', 'precedesScripture', 'precedesContent', 'highlight'] as const;

    /**
     * Readonly variable: markerPrefix.
     *
     * It keeps the unique prefix of the marker ids.
     */
    readonly markerPrefix = `awg-graph-flow-${nextFlowId++}-arrow`;

    /**
     * Readonly variable: zoomConfig.
     *
     * It keeps the zoom configuration of the flow svg.
     */
    readonly zoomConfig = new ZoomConfig(1, 0.2, 3, 0.01);

    /**
     * Readonly computed signal: explorerData.
     *
     * It holds the explorer data parsed from the RDF data.
     */
    readonly explorerData = computed(() => GRAPH_EXPLORER_UTILS.parseExplorerData(this.rdfData().triples));

    /**
     * Readonly computed signal: layout.
     *
     * It holds the flow layout of the explorer data.
     */
    readonly layout = computed(() => GRAPH_EXPLORER_UTILS.buildFlowLayout(this.explorerData()));

    /**
     * Readonly computed signal: hasInscriptions.
     *
     * It holds whether the flow has inscriptions to show.
     */
    readonly hasInscriptions = computed(() => this.layout().nodes.length > 0);

    /**
     * Readonly computed signal: viewNodes.
     *
     * It holds the positioned nodes with their width, transform and shortened label.
     */
    readonly viewNodes = computed(() =>
        this.layout().nodes.map(flowNode => {
            const width = GRAPH_EXPLORER_UTILS.flowNodeWidth(flowNode.depth);
            return {
                ...flowNode,
                width,
                transform: `translate(${flowNode.x - width / 2},${flowNode.y - FLOW_SIZES.nodeHeight / 2})`,
                shortLabel: this._shorten(flowNode.node.label, Math.floor((width - 14) / 6.3)),
            };
        })
    );

    /**
     * Readonly computed signal: svgHeight.
     *
     * It holds the height of the svg (the layout height, at most 560 px).
     */
    readonly svgHeight = computed(() => Math.min(this.layout().height, 560));

    /**
     * Readonly signal: zoomValue.
     *
     * It holds the zoom value of the flow svg.
     */
    readonly zoomValue = signal(this.zoomConfig.initial);

    /**
     * Readonly computed signal: zoomPercent.
     *
     * It holds the zoom value in percent.
     */
    readonly zoomPercent = computed(() => Math.round(this.zoomValue() * 100));

    /**
     * Readonly signal: hoveredId.
     *
     * It holds the id of the hovered node.
     */
    readonly hoveredId = signal<string | undefined>(undefined);

    /**
     * Readonly signal: selectedId.
     *
     * It holds the id of the selected node.
     */
    readonly selectedId = signal<string | undefined>(undefined);

    /**
     * Readonly computed signal: focusId.
     *
     * It holds the id of the focused node (hovered, else selected).
     */
    readonly focusId = computed(() => this.hoveredId() ?? this.selectedId());

    /**
     * Readonly computed signal: states.
     *
     * It holds the highlight states of the nodes relative to the focused node
     * (transitive predecessors and successors, concomitant nodes), or undefined without focus.
     */
    readonly states = computed<ReadonlyMap<string, ExplorerFlowState> | undefined>(() => {
        const focusId = this.focusId();
        const data = this.explorerData();
        if (!focusId || !data.nodes.has(focusId)) {
            return undefined;
        }
        const { predecessors, successors } = GRAPH_EXPLORER_UTILS.transitiveClosure(data, focusId);
        const states = new Map<string, ExplorerFlowState>();
        GRAPH_EXPLORER_UTILS.concomitantsOf(data, focusId).forEach(id => states.set(id, 'related'));
        predecessors.forEach(id => states.set(id, 'predecessor'));
        successors.forEach(id => states.set(id, 'successor'));
        states.set(focusId, 'focus');
        return states;
    });

    /**
     * Readonly computed signal: focusSummary.
     *
     * It holds the label of the focused node with the number of its predecessors and successors.
     */
    readonly focusSummary = computed(() => {
        const focusId = this.focusId();
        const states = this.states();
        const node = focusId ? this.explorerData().nodes.get(focusId) : undefined;
        if (!node || !states) {
            return undefined;
        }
        const values = [...states.values()];
        return {
            label: node.label,
            predecessors: values.filter(state => state === 'predecessor').length,
            successors: values.filter(state => state === 'successor').length,
        };
    });

    /**
     * Public method: linkMarker.
     *
     * It gets the arrow marker of a link: precedence links get the marker of their kind,
     * or the highlight marker when highlighted; other links get none.
     *
     * @param {ExplorerEdgeKind} kind The given edge kind of the link.
     * @param {ExplorerFlowState} state The given highlight state of the link.
     * @returns {string | null} The marker reference, or null without marker.
     */
    linkMarker(kind: ExplorerEdgeKind, state: ExplorerFlowState): string | null {
        if (!GRAPH_EXPLORER_UTILS.isPrecedesKind(kind)) {
            return null;
        }
        const markerKind = state === 'none' || state === 'dimmed' ? kind : 'highlight';
        return `url(#${this.markerPrefix}-${markerKind})`;
    }

    /**
     * Public method: nodeState.
     *
     * It gets the highlight state of a node.
     *
     * @param {string} id The given node id.
     * @returns {ExplorerFlowState} The state.
     */
    nodeState(id: string): ExplorerFlowState {
        const states = this.states();
        return states ? (states.get(id) ?? 'dimmed') : 'none';
    }

    /**
     * Public method: linkState.
     *
     * It gets the highlight state of a link: focus for links of the focused node,
     * the chain state for precedence links within the predecessors or successors, else dimmed.
     *
     * @param {ExplorerFlowLink} link The given link.
     * @returns {ExplorerFlowState} The state.
     */
    linkState(link: ExplorerFlowLink): ExplorerFlowState {
        const states = this.states();
        if (!states) {
            return 'none';
        }
        const { source, target, kind } = link.edge;
        const focusId = this.focusId();
        if (source === focusId || target === focusId) {
            return 'focus';
        }
        const sourceState = states.get(source);
        const isChain = sourceState === 'predecessor' || sourceState === 'successor';
        return GRAPH_EXPLORER_UTILS.isPrecedesKind(kind) && isChain && sourceState === states.get(target)
            ? sourceState
            : 'dimmed';
    }

    /**
     * Public method: onSelect.
     *
     * It selects a node, or deselects it if it is already selected.
     *
     * @param {string} id The given node id.
     * @returns {void} Sets the selected node.
     */
    onSelect(id: string): void {
        this.selectedId.update(selectedId => (selectedId === id ? undefined : id));
    }

    /**
     * Public method: resetZoom.
     *
     * It resets the zoom of the flow svg.
     *
     * @returns {void} Resets the zoom.
     */
    resetZoom(): void {
        this.svgZoom().reset();
    }

    /**
     * Private method: _shorten.
     *
     * It shortens a label to a maximum length with an ellipsis.
     *
     * @param {string} label The given label.
     * @param {number} maxLength The given maximum length.
     * @returns {string} The shortened label.
     */
    private _shorten(label: string, maxLength: number): string {
        return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
    }
}
