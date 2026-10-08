import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { ExplorerData, ExplorerNodeKind, ExplorerTreeNode, KIND_LABELS } from '../graph-explorer.model';
import { GRAPH_EXPLORER_UTILS } from '../graph-explorer.utils';

/**
 * The LabelParts interface.
 *
 * It represents a label split around a filter match.
 */
interface LabelParts {
    readonly before: string;
    readonly match: string;
    readonly after: string;
}

/**
 * The EditionGraphExplorerTree component.
 *
 * It contains the work structure view of the graph explorer:
 * a collapsible tree of edition complexes, sketches and paratexts
 * (concomitant sketches below the sketch they accompany) with a text filter.
 */
@Component({
    selector: 'awg-edition-graph-explorer-tree',
    templateUrl: './edition-graph-explorer-tree.component.html',
    styleUrls: ['./edition-graph-explorer-tree.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FaIconComponent, NgTemplateOutlet],
})
export class EditionGraphExplorerTreeComponent {
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
     * Readonly variable: faChevronRight.
     *
     * It keeps the toggle icon.
     */
    readonly faChevronRight = faChevronRight;

    /**
     * Readonly signal: filter.
     *
     * It holds the text filter of the tree.
     */
    readonly filter = signal('');

    /**
     * Readonly signal: toggled.
     *
     * It holds the ids of the tree nodes the user toggled (relative to the default expansion).
     */
    readonly toggled = signal<ReadonlySet<string>>(new Set());

    /**
     * Readonly computed signal: tree.
     *
     * It holds the root nodes of the work structure tree.
     */
    readonly tree = computed(() => GRAPH_EXPLORER_UTILS.buildTree(this.explorerData()));

    /**
     * Readonly computed signal: parents.
     *
     * It holds the tree parent id per node id.
     */
    readonly parents = computed(() => {
        const parents = new Map<string, string>();
        const visit = (treeNode: ExplorerTreeNode): void =>
            treeNode.children.forEach(child => {
                parents.set(child.node.id, treeNode.node.id);
                visit(child);
            });
        this.tree().forEach(visit);
        return parents;
    });

    /**
     * Readonly computed signal: successorCounts.
     *
     * It holds the number of direct successors per node id.
     */
    readonly successorCounts = computed(() => {
        const counts = new Map<string, number>();
        this.explorerData()
            .edges.filter(edge => GRAPH_EXPLORER_UTILS.isPrecedesKind(edge.kind))
            .forEach(edge => counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1));
        return counts;
    });

    /**
     * Readonly computed signal: matches.
     *
     * It holds the ids of the nodes whose label matches the filter (undefined without filter).
     */
    readonly matches = computed<ReadonlySet<string> | undefined>(() => {
        const filter = this.filter().trim().toLowerCase();
        if (!filter) {
            return undefined;
        }
        const ids = [...this.explorerData().nodes.values()]
            .filter(node => node.label.toLowerCase().includes(filter))
            .map(node => node.id);
        return new Set(ids);
    });

    /**
     * Readonly computed signal: visible.
     *
     * It holds the ids of the visible nodes while filtering
     * (matches and their ancestors), undefined without filter.
     */
    readonly visible = computed<ReadonlySet<string> | undefined>(() => {
        const matches = this.matches();
        if (!matches) {
            return undefined;
        }
        const visible = new Set<string>();
        matches.forEach(id => this._ancestorsAndSelf(id).forEach(ancestor => visible.add(ancestor)));
        return visible;
    });

    /**
     * Readonly computed signal: expanded.
     *
     * It holds the ids of the expanded tree nodes: complexes by default,
     * ancestors of the selected node and of filter matches, toggled by the user.
     */
    readonly expanded = computed<ReadonlySet<string>>(() => {
        const expanded = new Set<string>();
        this.explorerData().nodes.forEach(node => {
            if (node.kind === 'complex') {
                expanded.add(node.id);
            }
        });
        const forced = new Set<string>();
        const selectedId = this.selectedId();
        if (selectedId) {
            this._ancestorsAndSelf(selectedId)
                .slice(1)
                .forEach(id => forced.add(id));
        }
        this.visible()?.forEach(id => forced.add(id));

        this.toggled().forEach(id => (expanded.has(id) ? expanded.delete(id) : expanded.add(id)));
        forced.forEach(id => expanded.add(id));
        return expanded;
    });

    /**
     * Public method: toggle.
     *
     * It toggles the expansion of the tree node with the given id.
     *
     * @param {string} id The given node id.
     * @returns {void} Toggles the tree node.
     */
    toggle(id: string): void {
        this.toggled.update(toggled => {
            const next = new Set(toggled);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    /**
     * Public method: expandAll.
     *
     * It expands (or collapses) all tree nodes with children.
     *
     * @param {boolean} expand The flag if the tree nodes should be expanded.
     * @returns {void} Expands or collapses all tree nodes.
     */
    expandAll(expand: boolean): void {
        // Toggled nodes differ from the default expansion (complexes expanded, others collapsed)
        const toggled = new Set<string>();
        this.parents().forEach(parentId => {
            const isComplex = this.explorerData().nodes.get(parentId)?.kind === 'complex';
            if (isComplex !== expand) {
                toggled.add(parentId);
            }
        });
        this.toggled.set(toggled);
    }

    /**
     * Public method: kindLabel.
     *
     * It gets the german label of a given node kind
     * (typed access for the untyped context of the recursive tree template).
     *
     * @param {ExplorerNodeKind} kind The given node kind.
     * @returns {string} The label.
     */
    kindLabel(kind: ExplorerNodeKind): string {
        return KIND_LABELS[kind];
    }

    /**
     * Public method: labelParts.
     *
     * It splits a given label around the first match of the filter.
     *
     * @param {string} label The given label.
     * @returns {LabelParts} The label parts.
     */
    labelParts(label: string): LabelParts {
        const filter = this.filter().trim();
        const index = filter ? label.toLowerCase().indexOf(filter.toLowerCase()) : -1;
        if (index < 0) {
            return { before: label, match: '', after: '' };
        }
        return {
            before: label.slice(0, index),
            match: label.slice(index, index + filter.length),
            after: label.slice(index + filter.length),
        };
    }

    /**
     * Public method: onFilterInput.
     *
     * It sets the filter from a given input event.
     *
     * @param {Event} event The given input event.
     * @returns {void} Sets the filter.
     */
    onFilterInput(event: Event): void {
        this.filter.set((event.target as HTMLInputElement).value);
    }

    /**
     * Private method: _ancestorsAndSelf.
     *
     * It gets the given node id followed by the ids of its tree ancestors.
     *
     * @param {string} id The given node id.
     * @returns {string[]} The node id and its ancestor ids.
     */
    private _ancestorsAndSelf(id: string): string[] {
        const ids = [id];
        let parentId = this.parents().get(id);
        while (parentId && !ids.includes(parentId)) {
            ids.push(parentId);
            parentId = this.parents().get(parentId);
        }
        return ids;
    }
}
