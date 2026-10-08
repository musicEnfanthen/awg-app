import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { EDGE_LABELS, ExplorerData, ExplorerEdgeKind, ExplorerNode } from '../graph-explorer.model';
import { GRAPH_EXPLORER_UTILS } from '../graph-explorer.utils';

/**
 * The MatrixCellKind type.
 *
 * It represents the kind of a matrix cell (a direct relation or a transitive precedence).
 */
type MatrixCellKind = ExplorerEdgeKind | 'transitive';

/**
 * The MatrixCell interface.
 *
 * It represents a filled cell of the relation matrix.
 */
interface MatrixCell {
    readonly row: number;
    readonly col: number;
    readonly kind: MatrixCellKind;
}

/**
 * The MatrixGroup interface.
 *
 * It represents a group of consecutive rows/columns (one per sub complex).
 */
interface MatrixGroup {
    readonly label: string;
    readonly start: number;
    readonly size: number;
}

/**
 * Object constant: MATRIX_SIZES.
 *
 * It keeps the sizes (in px) of the relation matrix.
 */
const MATRIX_SIZES = Object.freeze({
    cell: 11,
    rowLabelWidth: 170,
    colLabelHeight: 130,
    margin: 8,
});

/**
 * The EditionGraphExplorerMatrix component.
 *
 * It contains the relation matrix view of the graph explorer:
 * an adjacency matrix of all related sketches and paratexts (ordered like the writing process),
 * with direct relations colored by kind and transitive precedences shaded.
 */
@Component({
    selector: 'awg-edition-graph-explorer-matrix',
    templateUrl: './edition-graph-explorer-matrix.component.html',
    styleUrls: ['./edition-graph-explorer-matrix.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
})
export class EditionGraphExplorerMatrixComponent {
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
     * Readonly variables: sizes, legend.
     *
     * They keep the matrix sizes and the cell kinds of the legend.
     */
    readonly sizes = MATRIX_SIZES;
    readonly legend: readonly { kind: MatrixCellKind; label: string }[] = [
        ...(Object.entries(EDGE_LABELS) as [ExplorerEdgeKind, string][]).map(([kind, label]) => ({ kind, label })),
        { kind: 'transitive', label: 'geht (transitiv) voraus' },
    ];

    /**
     * Readonly signal: hovered.
     *
     * It holds the hovered cell position, if any.
     */
    readonly hovered = signal<{ row: number; col: number } | undefined>(undefined);

    /**
     * Readonly computed signal: matrixNodes.
     *
     * It holds the related sketches and paratexts in the order of the writing process.
     */
    readonly matrixNodes = computed<ExplorerNode[]>(() => {
        const data = this.explorerData();
        const related = new Set(data.edges.flatMap(edge => [edge.source, edge.target]));
        return GRAPH_EXPLORER_UTILS.buildFlowLayout(data)
            .nodes.map(flowNode => flowNode.node)
            .filter(node => related.has(node.id));
    });

    /**
     * Readonly computed signal: indexById.
     *
     * It holds the matrix index per node id.
     */
    readonly indexById = computed(() => new Map(this.matrixNodes().map((node, index) => [node.id, index])));

    /**
     * Readonly computed signal: cells.
     *
     * It holds the filled cells: direct relations and transitive precedences.
     */
    readonly cells = computed<MatrixCell[]>(() => {
        const data = this.explorerData();
        const indexById = this.indexById();
        const cells = new Map<string, MatrixCell>();

        data.edges.forEach(edge => {
            const row = indexById.get(edge.source);
            const col = indexById.get(edge.target);
            const key = `${row}|${col}`;
            if (row !== undefined && col !== undefined && !cells.has(key)) {
                cells.set(key, { row, col, kind: edge.kind });
            }
        });

        this.matrixNodes().forEach(node => {
            const row = indexById.get(node.id) as number;
            GRAPH_EXPLORER_UTILS.transitiveClosure(data, node.id).successors.forEach(id => {
                const col = indexById.get(id);
                const key = `${row}|${col}`;
                if (col !== undefined && !cells.has(key)) {
                    cells.set(key, { row, col, kind: 'transitive' });
                }
            });
        });

        return [...cells.values()];
    });

    /**
     * Readonly computed signal: groups.
     *
     * It holds the groups of consecutive nodes with the same part-of parent.
     */
    readonly groups = computed<MatrixGroup[]>(() => {
        const data = this.explorerData();
        const groups: MatrixGroup[] = [];
        this.matrixNodes().forEach((node, index) => {
            const label = (node.partOf && data.nodes.get(node.partOf)?.label) || 'Ohne Zuordnung';
            const last = groups.at(-1);
            if (last && last.label === label) {
                groups[groups.length - 1] = { ...last, size: last.size + 1 };
            } else {
                groups.push({ label, start: index, size: 1 });
            }
        });
        return groups;
    });

    /**
     * Readonly computed signals: gridSize, width, height.
     *
     * They hold the size of the cell grid and of the svg.
     */
    readonly gridSize = computed(() => this.matrixNodes().length * MATRIX_SIZES.cell);
    readonly width = computed(() => MATRIX_SIZES.rowLabelWidth + this.gridSize() + MATRIX_SIZES.margin);
    readonly height = computed(() => MATRIX_SIZES.colLabelHeight + this.gridSize() + MATRIX_SIZES.margin);

    /**
     * Readonly computed signal: selectedIndex.
     *
     * It holds the matrix index of the selected node, if any.
     */
    readonly selectedIndex = computed(() => {
        const id = this.selectedId();
        return id ? this.indexById().get(id) : undefined;
    });

    /**
     * Readonly computed signal: hoverText.
     *
     * It holds the description of the hovered cell.
     */
    readonly hoverText = computed(() => {
        const hovered = this.hovered();
        if (!hovered) {
            return undefined;
        }
        const nodes = this.matrixNodes();
        const source = nodes[hovered.row]?.label;
        const target = nodes[hovered.col]?.label;
        const cell = this.cells().find(c => c.row === hovered.row && c.col === hovered.col);
        const relation = cell ? (this.legend.find(entry => entry.kind === cell.kind)?.label ?? '') : 'keine Relation';
        return { source, target, relation, hasRelation: !!cell };
    });

    /**
     * Public method: onGridMove.
     *
     * It sets the hovered cell from the position of a given mouse event over the grid.
     *
     * @param {MouseEvent} event The given mouse event.
     * @returns {void} Sets the hovered cell.
     */
    onGridMove(event: MouseEvent): void {
        const rect = (event.currentTarget as Element).getBoundingClientRect();
        const size = this.matrixNodes().length;
        const col = Math.floor(((event.clientX - rect.left) / rect.width) * size);
        const row = Math.floor(((event.clientY - rect.top) / rect.height) * size);
        if (row >= 0 && row < size && col >= 0 && col < size) {
            const hovered = this.hovered();
            if (hovered?.row !== row || hovered?.col !== col) {
                this.hovered.set({ row, col });
            }
        }
    }

    /**
     * Public method: onGridClick.
     *
     * It selects the source (row) node of the hovered cell.
     *
     * @returns {void} Emits the id of the row node.
     */
    onGridClick(): void {
        const hovered = this.hovered();
        const node = hovered ? this.matrixNodes()[hovered.row] : undefined;
        if (node) {
            this.selectRequest.emit(node.id);
        }
    }
}
