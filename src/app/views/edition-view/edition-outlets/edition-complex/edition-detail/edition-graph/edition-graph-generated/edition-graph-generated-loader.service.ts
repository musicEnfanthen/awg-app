import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';

import { catchError, forkJoin, from, map, mergeMap, Observable, of as observableOf, scan, shareReplay } from 'rxjs';

import { EDITION_ASSETS_DATA } from '@awg-views/edition-view/data/edition-assets.data';
import { EditionComplex } from '@awg-views/edition-view/models/edition-complex.model';
import { EditionComplexDataAssetsKeys } from '@awg-views/edition-view/models/edition-data.model';
import { EditionSvgSheetsList } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { FolioConvoluteList } from '@awg-views/edition-view/models/folio.model';
import { GraphList } from '@awg-views/edition-view/models/graph.model';
import { EditionOutlineComplexItem } from '@awg-views/edition-view/models/edition-outline.model';
import { SourceDescList } from '@awg-views/edition-view/models/source-desc.model';
import { SourceList } from '@awg-views/edition-view/models/source-list.model';
import { TextcriticsList } from '@awg-views/edition-view/models/textcritics.model';
import { EditionComplexesService } from '@awg-views/edition-view/services/edition-complexes.service';
import { EditionDataService } from '@awg-views/edition-view/services/edition-data.service';
import { EditionOutlineService } from '@awg-views/edition-view/services/edition-outline.service';
import { EditionStateService } from '@awg-views/edition-view/services/edition-state.service';

import { EditionRdfBundle, EditionRdfLoadState } from './edition-graph-generated.model';
import { stripHtml } from './rdf-generator/rdf-generator.utils';

/**
 * Constant: CONCURRENT_COMPLEX_REQUESTS.
 *
 * It holds the number of edition complexes that are loaded in parallel.
 */
const CONCURRENT_COMPLEX_REQUESTS = 6;

/**
 * Helper function: curatedTriplesOf.
 *
 * It joins the curated triples of all graphs of a graph list.
 */
function curatedTriplesOf(graphList: GraphList | undefined): string {
    return (graphList?.graph ?? [])
        .map(graph => graph.rdfData?.triples ?? '')
        .filter(triples => triples.trim())
        .join('\n\n');
}

/**
 * The EditionGraphGeneratedLoader service.
 *
 * It provides the edition data bundles for the generated graph:
 * for the currently selected edition complex (from the {@link EditionDataService})
 * or for all available edition complexes of the edition (loaded on demand).
 *
 * Note: Errors of single files are swallowed (with fallback values),
 * so that the error state of the {@link EditionDataService} is not affected.
 */
@Injectable({
    providedIn: 'root',
})
export class EditionGraphGeneratedLoaderService {
    private readonly _http = inject(HttpClient);
    private readonly _editionComplexesService = inject(EditionComplexesService);
    private readonly _editionDataService = inject(EditionDataService);
    private readonly _editionOutlineService = inject(EditionOutlineService);
    private readonly _editionStateService = inject(EditionStateService);

    /**
     * Private variable: _editionLoad$.
     *
     * It caches the loading of the whole edition.
     */
    private _editionLoad$: Observable<EditionRdfLoadState> | null = null;

    /**
     * Readonly computed signal: currentBundle.
     *
     * It holds the data bundle of the currently selected edition complex.
     */
    readonly currentBundle = computed<EditionRdfBundle | null>(() => {
        const complex = this._editionStateService.selectedEditionComplex();
        if (!complex) {
            return null;
        }
        return {
            complex,
            sourceList: this._editionDataService.sourceListData(),
            sourceDesc: this._editionDataService.sourceDescData(),
            svgSheets: this._editionDataService.svgSheetsData(),
            folioConvolute: this._editionDataService.folioConvoluteData(),
            textcritics: this._editionDataService.textcriticsData(),
            curatedTriples: curatedTriplesOf(this._editionDataService.graphData()),
        };
    });

    /**
     * Readonly computed signal: availableComplexes.
     *
     * It holds all edition complexes that are enabled in the edition outline
     * (falls back to all edition complexes if the outline is not initialized).
     */
    readonly availableComplexes = computed<EditionComplex[]>(() => {
        const items = this._editionOutlineService
            .editionOutline()
            .flatMap(series => series.sections.filter(section => !section.disabled))
            .flatMap(section => this._flattenComplexItems(section.content?.sectionComplexes ?? []))
            .filter(item => !item.disabled && item.complex)
            .map(item => item.complex);

        const unique = new Map(items.map(complex => [complex.complexId.route, complex]));
        return unique.size ? [...unique.values()] : Object.values(this._editionComplexesService.editionComplexesList());
    });

    /**
     * Readonly computed signal: unavailableComplexes.
     *
     * It holds the labels of all edition complexes that are not available (yet).
     */
    readonly unavailableComplexes = computed<string[]>(() => {
        const available = new Set(this.availableComplexes().map(complex => complex.complexId.route));
        return Object.values(this._editionComplexesService.editionComplexesList())
            .filter(complex => !available.has(complex.complexId.route))
            .map(complex => stripHtml(complex.complexId.short));
    });

    /**
     * Readonly computed signal: complexLabels.
     *
     * It holds a lookup of the plain labels of all edition complexes by key.
     */
    readonly complexLabels = computed<Record<string, string>>(() =>
        Object.fromEntries(
            Object.entries(this._editionComplexesService.editionComplexesList()).map(([key, complex]) => [
                key.toLowerCase(),
                stripHtml(complex.complexId.short),
            ])
        )
    );

    /**
     * Public method: loadEdition.
     *
     * It loads the data bundles of all available edition complexes
     * and emits the progressing load state. The result is cached.
     *
     * @returns {Observable<EditionRdfLoadState>} The progressing load state.
     */
    loadEdition(): Observable<EditionRdfLoadState> {
        if (!this._editionLoad$) {
            const complexes = this.availableComplexes();
            const total = complexes.length;
            const initial: EditionRdfLoadState = { loaded: 0, total, bundles: [], done: total === 0 };

            this._editionLoad$ = from(complexes).pipe(
                mergeMap(complex => this._loadBundle(complex), CONCURRENT_COMPLEX_REQUESTS),
                scan((state: EditionRdfLoadState, bundle: EditionRdfBundle) => {
                    const loaded = state.loaded + 1;
                    return { loaded, total, bundles: [...state.bundles, bundle], done: loaded === total };
                }, initial),
                map(state => (state.done ? { ...state, bundles: this._sortBundles(state.bundles) } : state)),
                shareReplay({ bufferSize: 1, refCount: false })
            );
        }
        return this._editionLoad$;
    }

    /**
     * Private method: _loadBundle.
     *
     * It loads all data files that are needed for the RDF generation of a single edition complex.
     */
    private _loadBundle(complex: EditionComplex): Observable<EditionRdfBundle> {
        return forkJoin({
            sourceList: this._fetch<SourceList>(complex, 'sourceList'),
            sourceDesc: this._fetch<SourceDescList>(complex, 'sourceDesc'),
            svgSheets: this._fetch<EditionSvgSheetsList>(complex, 'svgSheets'),
            folioConvolute: this._fetch<FolioConvoluteList>(complex, 'folioConvolute'),
            textcritics: this._fetch<TextcriticsList>(complex, 'textcritics'),
            graph: this._fetch<GraphList>(complex, 'graph'),
        }).pipe(
            map(({ graph, ...data }) => ({
                complex,
                ...data,
                curatedTriples: curatedTriplesOf(graph),
            }))
        );
    }

    /**
     * Private method: _fetch.
     *
     * It fetches a single data file of an edition complex (with fallback on error).
     */
    private _fetch<T>(complex: EditionComplex, assetsKey: EditionComplexDataAssetsKeys): Observable<T> {
        const config = EDITION_ASSETS_DATA.CONFIG[assetsKey];
        const assetPath =
            EDITION_ASSETS_DATA.BASE_ROUTE +
            complex.pubStatement.labeledSectionRoute.route.join('/') +
            complex.complexId.route;

        return this._http
            .get<T>(`${assetPath}/${config.file}`)
            .pipe(catchError(() => observableOf(config.fallback as T)));
    }

    /**
     * Private method: _flattenComplexItems.
     *
     * It flattens the edition outline complex items with their sub complexes.
     */
    private _flattenComplexItems(items: readonly EditionOutlineComplexItem[]): EditionOutlineComplexItem[] {
        return items.flatMap(item => [item, ...this._flattenComplexItems(item.subComplexes ?? [])]);
    }

    /**
     * Private method: _sortBundles.
     *
     * It sorts the bundles in the order of the available edition complexes.
     */
    private _sortBundles(bundles: EditionRdfBundle[]): EditionRdfBundle[] {
        const order = new Map(this.availableComplexes().map((complex, index) => [complex.complexId.route, index]));
        return [...bundles].sort(
            (a, b) => (order.get(a.complex.complexId.route) ?? 0) - (order.get(b.complex.complexId.route) ?? 0)
        );
    }
}
