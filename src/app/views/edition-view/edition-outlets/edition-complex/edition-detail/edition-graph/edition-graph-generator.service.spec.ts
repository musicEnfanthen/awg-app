import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { isSignal, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EditionStateHelper } from '@testing/edition-state-helper';
import { expectToBe, expectToEqual } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';

import { EDITION_ASSETS_DATA } from '@awg-views/edition-view/data/edition-assets.data';
import { EDITION_ROUTE_CONSTANTS } from '@awg-views/edition-view/edition-routes.constants';
import { EditionSvgSheetsList } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { FolioConvoluteList } from '@awg-views/edition-view/models/folio.model';
import { SourceDescList } from '@awg-views/edition-view/models/source-desc.model';
import { SourceList } from '@awg-views/edition-view/models/source-list.model';
import { EditionDataService } from '@awg-views/edition-view/services/edition-data.service';
import { EditionStateService } from '@awg-views/edition-view/services/edition-state.service';

import { EditionGraphGeneratorService } from './edition-graph-generator.service';
import { RdfComplexRegistry } from './rdf-generator/rdf-generator.model';
import { generateComplexGraph } from './rdf-generator/rdf-generator.utils';

import jsonEditionComplexes from 'assets/data/edition/edition-complexes.json';

describe('EditionGraphGeneratorService (DONE)', () => {
    let service: EditionGraphGeneratorService;
    let editionStateService: EditionStateService;
    let httpTestingController: HttpTestingController;

    let sourceListSignal: WritableSignal<SourceList>;
    let sourceDescSignal: WritableSignal<SourceDescList>;
    let svgSheetsSignal: WritableSignal<EditionSvgSheetsList>;
    let folioConvoluteSignal: WritableSignal<FolioConvoluteList>;

    const { BASE_ROUTE, CONFIG } = EDITION_ASSETS_DATA;
    const expectedDocumentsUrl = `${BASE_ROUTE}${EDITION_ROUTE_CONSTANTS.EDITION.route}/documents.json`;
    const { data, documents } = mockRdfGeneratorData.input;

    /**
     * Helper function: setComplexData.
     *
     * It sets the data files of the mocked EditionDataService.
     */
    function setComplexData(): void {
        sourceListSignal.set(data.sourceList);
        sourceDescSignal.set(data.sourceDesc);
        svgSheetsSignal.set(data.svgSheets);
        folioConvoluteSignal.set(data.folioConvolute);
    }

    beforeEach(() => {
        sourceListSignal = signal(CONFIG.sourceList.fallback);
        sourceDescSignal = signal(CONFIG.sourceDesc.fallback);
        svgSheetsSignal = signal(CONFIG.svgSheets.fallback);
        folioConvoluteSignal = signal(CONFIG.folioConvolute.fallback);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: EditionDataService,
                    useValue: {
                        sourceListData: sourceListSignal.asReadonly(),
                        sourceDescData: sourceDescSignal.asReadonly(),
                        svgSheetsData: svgSheetsSignal.asReadonly(),
                        folioConvoluteData: folioConvoluteSignal.asReadonly(),
                    },
                },
            ],
        });

        service = TestBed.inject(EditionGraphGeneratorService);
        editionStateService = TestBed.inject(EditionStateService);
        httpTestingController = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        // Flush a request of the document registry that a test left open
        httpTestingController.match(expectedDocumentsUrl).forEach(request => request.flush({ documents }));
        httpTestingController.verify();
    });

    it('... should create', () => {
        expect(service).toBeTruthy();
    });

    it('... should hold the name of the document registry file', () => {
        expectToBe(EditionGraphGeneratorService.DOCUMENTS_FILE, 'documents.json');
        httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
    });

    describe('... computed signal `generatedGraph`', () => {
        it('... should hold null initially', () => {
            expectToBe(isSignal(service.generatedGraph), true);

            expectToBe(service.generatedGraph(), null);
            httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
        });

        describe('... should hold null if', () => {
            it('... the document registry is still loading', () => {
                editionStateService.updateSelectedEditionComplex(EditionStateHelper.getComplex('op25'));
                setComplexData();

                expectToBe(service.generatedGraph(), null);
                httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
            });

            it('... the document registry fails', () => {
                httpTestingController
                    .expectOne(expectedDocumentsUrl)
                    .flush('404 error', { status: 404, statusText: 'Not Found' });
                editionStateService.updateSelectedEditionComplex(EditionStateHelper.getComplex('op25'));
                setComplexData();

                expectToBe(service.generatedGraph(), null);
            });

            it('... no edition complex is selected', () => {
                httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
                setComplexData();

                expectToBe(service.generatedGraph(), null);
            });

            it('... a data file of the complex still holds its fallback', () => {
                httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
                editionStateService.updateSelectedEditionComplex(EditionStateHelper.getComplex('op25'));
                setComplexData();
                svgSheetsSignal.set(CONFIG.svgSheets.fallback);

                expectToBe(service.generatedGraph(), null);
            });
        });

        it('... should hold the generated graph of the selected edition complex', () => {
            httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
            editionStateService.updateSelectedEditionComplex(EditionStateHelper.getComplex('op25'));
            setComplexData();
            const complexes = Object.assign({}, ...jsonEditionComplexes.editionComplexes) as RdfComplexRegistry;
            const expectedGraph = generateComplexGraph({ complexKey: 'op25', complexes, documents, data });

            expectToEqual(service.generatedGraph(), expectedGraph);
        });

        it('... should have recomputed signal `generatedGraph` when the data files change', () => {
            httpTestingController.expectOne(expectedDocumentsUrl).flush({ documents });
            editionStateService.updateSelectedEditionComplex(EditionStateHelper.getComplex('op25'));
            setComplexData();
            const firstGraph = service.generatedGraph();

            sourceDescSignal.set(CONFIG.sourceDesc.fallback);
            const graphWhileLoading = service.generatedGraph();
            sourceDescSignal.set(mockRdfGeneratorData.geneticsInput.data.sourceDesc);
            const secondGraph = service.generatedGraph();

            expectToBe(graphWhileLoading, null);
            expect(firstGraph).not.toEqual(secondGraph);
        });
    });
});
