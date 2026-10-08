import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';

import { SvgZoomDirective } from '@awg-shared/zoom/svg-zoom.directive';
import { ZoomConfig } from '@awg-shared/zoom/zoom.model';

import { EDGE_LABELS, ExplorerData, ExplorerEdgeKind, ExplorerFlowLink, KIND_LABELS } from '../graph-explorer.model';
import { FLOW_SIZES, GRAPH_EXPLORER_UTILS } from '../graph-explorer.utils';

/**
 * Counter variable: nextFlowId.
 *
 * It keeps a counter for unique marker ids of the flow diagrams.
 */
let nextFlowId = 0;

/**
 * The FlowState type.
 *
 * It represents the highlighting state of a node or link in the flow diagram.
 */
type FlowState = 'focus' | 'predecessor' | 'successor' | 'related' | 'dimmed' | 'none';

/**
 * The EditionGraphExplorerFlow component.
 *
 * It contains the writing process view of the graph explorer:
 * a layered diagram of the sketches per sub complex, ordered by their precedence,
 * that highlights all (transitive) predecessors and successors of the focused sketch.
 */
@Component({
    selector: 'awg-edition-graph-explorer-flow',
    templateUrl: './edition-graph-explorer-flow.component.html',
    styleUrls: ['./edition-graph-explorer-flow.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SvgZoomDirective],
})
export class EditionGraphExplorerFlowComponent {
    /**
     * Readonly input signal: explorerData.
     *
     * It holds the explorer data.
     */
    readonly explorerData = input.required<ExplorerData>();

    /**
     * Readonly input signal: selectedId.
     *
     * It holds the id of the selected node.
     */
    readonly selectedId = input<string | undefined>(undefined);

    /**
     * Readonly output signal: selectRequest.
     *
     * It emits the id of a node the user selects.
     */
    readonly selectRequest = output<string>();

    /**
     * Readonly view child signal: svgZoom.
     *
     * It holds the svg zoom directive of the diagram.
     */
    readonly svgZoom = viewChild.required(SvgZoomDirective);

    /**
     * Readonly variables: sizes, kindLabels, edgeLabels, markerPrefix, zoomConfig.
     *
     * They keep the diagram sizes, the german labels, the prefix of the marker ids
     * and the zoom configuration.
     */
    readonly sizes = FLOW_SIZES;
    readonly kindLabels = KIND_LABELS;
    readonly edgeLabels = EDGE_LABELS;
    readonly markerPrefix = `awg-gx-flow-${nextFlowId++}-arrow`;
    readonly zoomConfig = new ZoomConfig(1, 0.2, 3, 0.01);

    /**
     * Readonly variable: legend.
     *
     * It keeps the relation kinds shown in the legend.
     */
    readonly legend: readonly ExplorerEdgeKind[] = ['precedes', 'precedesScripture', 'precedesContent', 'concomitates'];

    /**
     * Readonly variable: markerKinds.
     *
     * It keeps the kinds of the arrow markers (per precedence kind and for highlighted links).
     */
    readonly markerKinds = ['precedes', 'precedesScripture', 'precedesContent', 'highlight'] as const;

    /**
     * Readonly signals: zoomValue, hoveredId.
     *
     * They hold the zoom factor and the id of the hovered node.
     */
    readonly zoomValue = signal(this.zoomConfig.initial);
    readonly hoveredId = signal<string | undefined>(undefined);

    /**
     * Readonly computed signal: zoomPercent.
     *
     * It holds the zoom factor in percent.
     */
    readonly zoomPercent = computed(() => Math.round(this.zoomValue() * 100));

    /**
     * Readonly computed signal: layout.
     *
     * It holds the layout of the diagram.
     */
    readonly layout = computed(() => GRAPH_EXPLORER_UTILS.buildFlowLayout(this.explorerData()));

    /**
     * Readonly computed signal: viewNodes.
     *
     * It holds the drawn nodes with their box size, position and shortened label.
     */
    readonly viewNodes = computed(() =>
        this.layout().nodes.map(flowNode => {
            const width = FLOW_SIZES.nodeWidth - (flowNode.isConcomitant ? FLOW_SIZES.concomitantIndent : 0);
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
     * It holds the height of the svg viewport (the diagram itself can be panned and zoomed).
     */
    readonly svgHeight = computed(() => Math.min(this.layout().height, 560));

    /**
     * Readonly computed signal: focusId.
     *
     * It holds the id of the focused node (hovered or selected).
     */
    readonly focusId = computed(() => this.hoveredId() ?? this.selectedId());

    /**
     * Readonly computed signal: states.
     *
     * It holds the highlighting state per node id while a node is focused.
     */
    readonly states = computed<ReadonlyMap<string, FlowState> | undefined>(() => {
        const focusId = this.focusId();
        const data = this.explorerData();
        if (!focusId || !data.nodes.has(focusId)) {
            return undefined;
        }
        const { predecessors, successors } = GRAPH_EXPLORER_UTILS.transitiveClosure(data, focusId);
        const states = new Map<string, FlowState>();
        data.edges
            .filter(edge => edge.kind === 'concomitates' && (edge.source === focusId || edge.target === focusId))
            .forEach(edge => states.set(edge.source === focusId ? edge.target : edge.source, 'related'));
        predecessors.forEach(id => states.set(id, 'predecessor'));
        successors.forEach(id => states.set(id, 'successor'));
        states.set(focusId, 'focus');
        return states;
    });

    /**
     * Readonly computed signal: focusSummary.
     *
     * It holds a summary of the focused node and its transitive relations.
     */
    readonly focusSummary = computed(() => {
        const focusId = this.focusId();
        const states = this.states();
        const node = focusId ? this.explorerData().nodes.get(focusId) : undefined;
        if (!node || !states) {
            return undefined;
        }
        const count = (state: FlowState): number => [...states.values()].filter(s => s === state).length;
        return { label: node.label, predecessors: count('predecessor'), successors: count('successor') };
    });

    /**
     * Public method: nodeState.
     *
     * It gets the highlighting state of the node with the given id.
     *
     * @param {string} id The given node id.
     * @returns {FlowState} The state.
     */
    nodeState(id: string): FlowState {
        const states = this.states();
        return states ? (states.get(id) ?? 'dimmed') : 'none';
    }

    /**
     * Public method: linkState.
     *
     * It gets the highlighting state of a given link:
     * highlighted if both ends belong to the focused precedence chain or it touches the focused node.
     *
     * @param {ExplorerFlowLink} link The given link.
     * @returns {FlowState} The state.
     */
    linkState(link: ExplorerFlowLink): FlowState {
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
        const targetState = states.get(target);
        const inChain = (state: FlowState | undefined): boolean =>
            state === 'predecessor' || state === 'successor' || state === 'focus';
        return kind !== 'concomitates' && inChain(sourceState) && inChain(targetState) && sourceState === targetState
            ? (sourceState as FlowState)
            : 'dimmed';
    }

    /**
     * Public method: resetZoom.
     *
     * It resets the zoom and the panning of the diagram.
     *
     * @returns {void} Resets the zoom.
     */
    resetZoom(): void {
        this.svgZoom().reset();
    }

    /**
     * Private method: _shorten.
     *
     * It shortens a given label to a maximum number of characters (with ellipsis).
     *
     * @param {string} label The given label.
     * @param {number} maxLength The maximum number of characters.
     * @returns {string} The shortened label.
     */
    private _shorten(label: string, maxLength: number): string {
        return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
    }
}
