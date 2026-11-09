import { HttpClient } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { of as observableOf } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { EDITION_ASSETS_DATA } from '@awg-views/edition-view/data/edition-assets.data';
import { EDITION_ROUTE_CONSTANTS } from '@awg-views/edition-view/edition-routes.constants';
import { EditionDataService } from '@awg-views/edition-view/services/edition-data.service';
import { EditionStateService } from '@awg-views/edition-view/services/edition-state.service';

import { RdfComplexRegistry, RdfDocumentEntry, RdfGeneratorResult } from './rdf-generator/rdf-generator.model';
import { generateComplexGraph } from './rdf-generator/rdf-generator.utils';

import jsonEditionComplexes from 'assets/data/edition/edition-complexes.json';

/**
 * The EditionGraphGenerator service.
 *
 * It loads the input of the RDF generator (complex registry, document registry
 * and the data files of the selected edition complex) and generates its graph.
 *
 * Provided in: `root`
 */
@Service()
export class EditionGraphGeneratorService {
    /**
     * Static readonly variable: DOCUMENTS_FILE.
     *
     * It keeps the name of the document registry file.
     */
    static readonly DOCUMENTS_FILE = 'documents.json';

    /**
     * Private readonly injection variable: _editionDataService.
     *
     * It keeps the instance of the injected EditionDataService.
     */
    private readonly _editionDataService = inject(EditionDataService);

    /**
     * Private readonly injection variable: _editionStateService.
     *
     * It keeps the instance of the injected EditionStateService.
     */
    private readonly _editionStateService = inject(EditionStateService);

    /**
     * Private readonly injection variable: _http.
     *
     * It keeps the instance of the injected HttpClient.
     */
    private readonly _http = inject(HttpClient);

    /**
     * Private readonly variable: _complexes.
     *
     * It keeps the registry of the edition complexes by key.
     */
    private readonly _complexes = Object.assign({}, ...jsonEditionComplexes.editionComplexes) as RdfComplexRegistry;

    /**
     * Private readonly signal: _documents.
     *
     * It holds the document registry, or null while it loads or if it fails.
     */
    private readonly _documents = toSignal(
        this._http
            .get<{ documents: RdfDocumentEntry[] }>(
                `${EDITION_ASSETS_DATA.BASE_ROUTE}${EDITION_ROUTE_CONSTANTS.EDITION.route}/${EditionGraphGeneratorService.DOCUMENTS_FILE}`
            )
            .pipe(
                map(registry => registry.documents),
                catchError(() => observableOf(null))
            ),
        { initialValue: null }
    );

    /**
     * Readonly computed signal: generatedGraph.
     *
     * It holds the generated graph of the selected edition complex,
     * or null while its data files or the document registry are not loaded.
     */
    readonly generatedGraph = computed<RdfGeneratorResult | null>(() => {
        const { CONFIG } = EDITION_ASSETS_DATA;
        const complex = this._editionStateService.selectedEditionComplex();
        const documents = this._documents();
        const sourceList = this._editionDataService.sourceListData();
        const sourceDesc = this._editionDataService.sourceDescData();
        const svgSheets = this._editionDataService.svgSheetsData();
        const folioConvolute = this._editionDataService.folioConvoluteData();

        const isLoaded =
            sourceList !== CONFIG.sourceList.fallback &&
            sourceDesc !== CONFIG.sourceDesc.fallback &&
            svgSheets !== CONFIG.svgSheets.fallback &&
            folioConvolute !== CONFIG.folioConvolute.fallback;
        if (!complex || !documents || !isLoaded) {
            return null;
        }

        return generateComplexGraph({
            complexKey: complex.complexId.route.replace(/^\//, ''),
            complexes: this._complexes,
            documents,
            data: { folioConvolute, sourceDesc, sourceList, svgSheets },
        });
    });
}
