import { Component, computed, DOCUMENT, inject, resource, signal } from '@angular/core';

import { Parser } from 'n3';

import { AlertErrorComponent } from '@awg-shared/alert-error/alert-error.component';
import { TwelveToneSpinnerComponent } from '@awg-shared/twelve-tone-spinner/twelve-tone-spinner.component';

import { GraphLayerMode, GraphRdfData } from '@awg-views/edition-view/models/graph.model';
import { EditionStateService } from '@awg-views/edition-view/services/edition-state.service';
import { EditionViewService } from '@awg-views/edition-view/services/edition-view.service';

import { EditionGraphDescriptionComponent } from './edition-graph-description/edition-graph-description.component';
import { EditionGraphDynamicComponent } from './edition-graph-dynamic/edition-graph-dynamic.component';
import { EditionGraphExplorerFlowComponent } from './edition-graph-explorer/flow/edition-graph-explorer-flow.component';
import { EditionGraphGeneratorService } from './edition-graph-generator.service';
import { EditionGraphLayersComponent } from './edition-graph-layers/edition-graph-layers.component';
import { GENERATED_GRAPH_QUERIES } from './edition-graph-queries.data';
import { EditionGraphStaticComponent } from './edition-graph-static/edition-graph-static.component';
import { RdfGeneratorResult } from './rdf-generator/rdf-generator.model';
import { mergeLayers } from './rdf-generator/rdf-generator.utils';
import { serializeTurtle } from './rdf-generator/rdf-quads.utils';
import { RDF_GENERATOR_PREFIXES } from './rdf-generator/rdf-vocab';

/**
 * The GraphLayerRequest interface.
 *
 * It represents the input for the layered RDF data of the graph.
 */
interface GraphLayerRequest {
    /**
     * The layer mode to show.
     */
    mode: GraphLayerMode;

    /**
     * The curated RDF data of the graph, if any.
     */
    curated: GraphRdfData | undefined;

    /**
     * The generated graph of the edition complex (null for the curated layer only).
     */
    generated: RdfGeneratorResult | null;
}

/**
 * The EditionGraph component.
 *
 * It contains the graph section
 * of the edition view of the app.
 */
@Component({
    selector: 'awg-edition-graph',
    templateUrl: './edition-graph.component.html',
    styleUrl: './edition-graph.component.scss',
    imports: [
        AlertErrorComponent,
        EditionGraphDescriptionComponent,
        EditionGraphDynamicComponent,
        EditionGraphExplorerFlowComponent,
        EditionGraphLayersComponent,
        EditionGraphStaticComponent,
        TwelveToneSpinnerComponent,
    ],
})
export class EditionGraphComponent {
    /**
     * Private readonly injection variable: _document.
     *
     * It keeps the instance of the injected document.
     */
    private readonly _document = inject(DOCUMENT);

    /**
     * Private readonly injection variable: _editionGraphGeneratorService.
     *
     * It keeps the instance of the injected EditionGraphGeneratorService.
     */
    private readonly _editionGraphGeneratorService = inject(EditionGraphGeneratorService);

    /**
     * Private readonly injection variable: _editionStateService.
     *
     * It keeps the instance of the injected EditionStateService.
     */
    private readonly _editionStateService = inject(EditionStateService);

    /**
     * Private readonly injection variable: _editionViewService.
     *
     * It keeps the instance of the injected EditionViewService.
     */
    private readonly _editionViewService = inject(EditionViewService);

    /**
     * Readonly signal: viewData.
     *
     * It holds the state of the graph view data.
     */
    readonly viewData = this._editionViewService.graphViewData;

    /**
     * Readonly signal: selectedEditionComplex.
     *
     * It holds the state of the selected edition complex.
     */
    readonly selectedEditionComplex = this._editionStateService.selectedEditionComplex;

    /**
     * Readonly computed signal: curatedRdfData.
     *
     * It holds the curated RDF data of the (first) graph of the edition complex.
     */
    readonly curatedRdfData = computed(() => this.viewData()?.data?.graphData?.graph?.[0]?.rdfData);

    /**
     * Readonly computed signal: hasCuratedTriples.
     *
     * It holds whether the graph has curated triples.
     */
    readonly hasCuratedTriples = computed(() => !!this.curatedRdfData()?.triples);

    /**
     * Readonly signal: layerMode.
     *
     * It holds the selected layer mode of the graph.
     */
    readonly layerMode = signal<GraphLayerMode>('both');

    /**
     * Readonly computed signal: shownLayerMode.
     *
     * It holds the layer mode shown: the selected one, or the generated layer for graphs without curated triples.
     */
    readonly shownLayerMode = computed<GraphLayerMode>(() =>
        this.hasCuratedTriples() ? this.layerMode() : 'generated'
    );

    /**
     * Readonly resource: layeredRdfData.
     *
     * It holds the RDF data of the shown layers (undefined while the generated graph is not available).
     */
    readonly layeredRdfData = resource<GraphRdfData, GraphLayerRequest | undefined>({
        params: () => this._createLayerRequest(),
        loader: ({ params }) => this._layerRdfData(params),
    });

    /**
     * Public method: onDownloadRequest.
     *
     * It downloads the RDF data of the shown layers as Turtle file.
     *
     * @returns {void} Downloads the Turtle file.
     */
    onDownloadRequest(): void {
        const rdfData = this.layeredRdfData.value();
        const complex = this.selectedEditionComplex();
        if (!rdfData || !complex) {
            return;
        }
        const mode = this.shownLayerMode();
        // Plain spaces instead of the non-breaking spaces of the complex label
        const complexLabel = complex.complexId.short.replace(/\s/g, ' ');
        const header = `# Anton Webern Gesamtausgabe, ${complexLabel}: graph (${mode})\n\n`;
        const fileName = `${complex.complexId.route.replace(/^\//, '')}-graph-${mode}.ttl`;
        this._downloadFile(header + rdfData.triples, fileName);
    }

    /**
     * Private method: _createLayerRequest.
     *
     * It creates the input for the layered RDF data,
     * or undefined while the generated graph needed for the shown layers is not available.
     *
     * @returns {GraphLayerRequest | undefined} The input for the layered RDF data.
     */
    private _createLayerRequest(): GraphLayerRequest | undefined {
        const mode = this.shownLayerMode();
        const curated = this.curatedRdfData();
        if (mode === 'curated') {
            return { mode, curated, generated: null };
        }
        const generated = this._editionGraphGeneratorService.generatedGraph();
        return generated ? { mode, curated, generated } : undefined;
    }

    /**
     * Private method: _layerRdfData.
     *
     * It gets the RDF data of the shown layers: the curated triples unchanged,
     * the generated triples, or both merged (the curated layer wins, see `mergeLayers`),
     * with the curated queries or, without them, the general queries.
     *
     * @param {GraphLayerRequest} request The given input for the layered RDF data.
     * @returns {Promise<GraphRdfData>} A promise of the RDF data.
     */
    private async _layerRdfData({ mode, curated, generated }: GraphLayerRequest): Promise<GraphRdfData> {
        const queryList = curated?.queryList.length ? curated.queryList : [...GENERATED_GRAPH_QUERIES];
        const curatedTriples = curated?.triples ?? '';
        if (mode === 'curated' || !generated) {
            return { queryList, triples: curatedTriples };
        }
        if (mode === 'generated') {
            return { queryList, triples: await serializeTurtle(generated.quads) };
        }

        const prefixes: Record<string, string> = { ...RDF_GENERATOR_PREFIXES };
        const curatedQuads = new Parser().parse(curatedTriples, null, (prefix, iri) => {
            prefixes[prefix] = iri.value;
        });
        const triples = await serializeTurtle(mergeLayers(curatedQuads, generated.quads), '', prefixes);
        return { queryList, triples };
    }

    /**
     * Private method: _downloadFile.
     *
     * It downloads a text as Turtle file via a temporary object URL.
     *
     * @param {string} content The given content of the file.
     * @param {string} fileName The given name of the file.
     * @returns {void} Downloads the file.
     */
    private _downloadFile(content: string, fileName: string): void {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/turtle' }));
        const link = this._document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }
}
