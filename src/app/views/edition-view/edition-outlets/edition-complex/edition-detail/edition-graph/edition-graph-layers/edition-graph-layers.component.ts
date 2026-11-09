import { Component, computed, input, model, output } from '@angular/core';

import { GraphLayerMode } from '@awg-views/edition-view/models/graph.model';

/**
 * Object constant: GRAPH_LAYER_HINTS.
 *
 * It keeps the hints on the origin of the triples by layer mode.
 */
const GRAPH_LAYER_HINTS: Readonly<Record<GraphLayerMode, string>> = {
    both: 'Kuratierte Triples, ergänzt um automatisch aus den Editionsdaten erzeugte Triples.',
    curated: 'Von den Editoren kuratierte Triples.',
    generated: 'Automatisch aus den Editionsdaten erzeugte Triples.',
};

/**
 * Let variable: nextGroupId.
 *
 * It counts the radio groups for unique group names.
 */
let nextGroupId = 0;

/**
 * The EditionGraphLayers component.
 *
 * It contains the selection of the graph layers (curated, generated or both),
 * a hint on the origin of the triples and the download of the triples as Turtle.
 */
@Component({
    selector: 'awg-edition-graph-layers',
    templateUrl: './edition-graph-layers.component.html',
    styleUrl: './edition-graph-layers.component.scss',
})
export class EditionGraphLayersComponent {
    /**
     * Readonly model signal: layerMode.
     *
     * It holds the selected layer mode of the graph.
     */
    readonly layerMode = model<GraphLayerMode>('both');

    /**
     * Readonly input signal: hasCuratedTriples.
     *
     * It holds whether the graph has curated triples (only then the layers can be selected).
     */
    readonly hasCuratedTriples = input<boolean>(false);

    /**
     * Readonly output: downloadRequest.
     *
     * It emits a request to download the triples as Turtle.
     */
    readonly downloadRequest = output();

    /**
     * Readonly variable: layerOptions.
     *
     * It keeps the selectable layer modes with their labels.
     */
    readonly layerOptions: readonly { mode: GraphLayerMode; label: string }[] = [
        { mode: 'both', label: 'beides' },
        { mode: 'curated', label: 'kuratiert' },
        { mode: 'generated', label: 'automatisch erzeugt' },
    ];

    /**
     * Readonly variable: groupName.
     *
     * It keeps the unique name of the radio group.
     */
    readonly groupName = `awg-graph-layers-${nextGroupId++}`;

    /**
     * Readonly computed signal: hint.
     *
     * It holds the hint on the origin of the triples of the selected (or only) layer.
     */
    readonly hint = computed(() => GRAPH_LAYER_HINTS[this.hasCuratedTriples() ? this.layerMode() : 'generated']);
}
