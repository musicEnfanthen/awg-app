import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faSitemap, faTableCells, faTimeline, faXmark, IconDefinition } from '@fortawesome/free-solid-svg-icons';

import { GraphRdfData } from '@awg-views/edition-view/models/graph.model';

import { EDGE_LABELS, ExplorerNodeKind, ExplorerViewType, KIND_LABELS } from './graph-explorer.model';
import { GRAPH_EXPLORER_UTILS } from './graph-explorer.utils';
import { EditionGraphExplorerFlowComponent } from './flow/edition-graph-explorer-flow.component';
import { EditionGraphExplorerMatrixComponent } from './matrix/edition-graph-explorer-matrix.component';
import { EditionGraphExplorerTreeComponent } from './tree/edition-graph-explorer-tree.component';

/**
 * Counter variable: nextExplorerId.
 *
 * It keeps a counter for unique names of the view button groups.
 */
let nextExplorerId = 0;

/**
 * The ExplorerView interface.
 *
 * It represents a selectable view of the graph explorer.
 */
interface ExplorerView {
    readonly type: ExplorerViewType;
    readonly label: string;
    readonly icon: IconDefinition;
}

/**
 * The EditionGraphExplorer component.
 *
 * It contains an experimental explorer of the RDF data of a graph
 * with three alternative views (work structure tree, writing process flow,
 * relation matrix) that share the selection of a node and its profile.
 */
@Component({
    selector: 'awg-edition-graph-explorer',
    templateUrl: './edition-graph-explorer.component.html',
    styleUrls: ['./edition-graph-explorer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FaIconComponent,
        EditionGraphExplorerFlowComponent,
        EditionGraphExplorerMatrixComponent,
        EditionGraphExplorerTreeComponent,
    ],
})
export class EditionGraphExplorerComponent {
    /**
     * Readonly input signal: rdfData.
     *
     * It holds the RDF data (triples and queries) of the graph.
     */
    readonly rdfData = input.required<GraphRdfData>();

    /**
     * Readonly variable: views.
     *
     * It keeps the selectable views of the explorer.
     */
    readonly views: readonly ExplorerView[] = [
        { type: 'tree', label: 'Werkstruktur', icon: faSitemap },
        { type: 'flow', label: 'Schreibprozess', icon: faTimeline },
        { type: 'matrix', label: 'Beziehungsmatrix', icon: faTableCells },
    ];

    /**
     * Readonly variable: faXmark.
     *
     * It keeps the icon to close the profile.
     */
    readonly faXmark = faXmark;

    /**
     * Readonly variables: kindLabels, edgeLabels.
     *
     * They keep the german labels of node and relation kinds.
     */
    readonly kindLabels = KIND_LABELS;
    readonly edgeLabels = EDGE_LABELS;

    /**
     * Readonly variable: groupName.
     *
     * It keeps the unique name of the view button group.
     */
    readonly groupName = `awg-graph-explorer-views-${nextExplorerId++}`;

    /**
     * Readonly signal: selectedView.
     *
     * It holds the selected view of the explorer.
     */
    readonly selectedView = signal<ExplorerViewType>('flow');

    /**
     * Readonly signal: selectedId.
     *
     * It holds the id of the selected node (shared by all views).
     */
    readonly selectedId = signal<string | undefined>(undefined);

    /**
     * Readonly computed signal: explorerData.
     *
     * It holds the explorer data parsed from the triples.
     */
    readonly explorerData = computed(() => GRAPH_EXPLORER_UTILS.parseExplorerData(this.rdfData()?.triples ?? ''));

    /**
     * Readonly computed signal: stats.
     *
     * It holds the number of nodes per kind and the number of relations.
     */
    readonly stats = computed(() => {
        const { nodes, edges } = this.explorerData();
        const count = (kind: ExplorerNodeKind): number => [...nodes.values()].filter(node => node.kind === kind).length;
        return {
            complexes: count('complex'),
            sketches: count('sketch'),
            paratexts: count('paratext'),
            relations: edges.length,
        };
    });

    /**
     * Readonly computed signal: hasData.
     *
     * It holds a boolean flag if there are sketches or paratexts to explore.
     */
    readonly hasData = computed(() => this.stats().sketches + this.stats().paratexts > 0);

    /**
     * Readonly computed signal: selectedRelations.
     *
     * It holds the relations of the selected node (for its profile).
     */
    readonly selectedRelations = computed(() => {
        const id = this.selectedId();
        return id ? GRAPH_EXPLORER_UTILS.relationsOf(this.explorerData(), id) : undefined;
    });

    /**
     * Public method: selectNode.
     *
     * It selects the node with the given id (or deselects it if it is already selected).
     *
     * @param {string | undefined} id The given node id.
     * @returns {void} Selects the node.
     */
    selectNode(id: string | undefined): void {
        this.selectedId.set(id && id !== this.selectedId() ? id : undefined);
    }
}
