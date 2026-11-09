import { DebugElement, isSignal, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataFactory, Parser } from 'n3';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';

import { detectChangesOnPush } from '@testing/detect-changes-on-push-helper';
import { createMockViewData } from '@testing/edition-data-helper';
import { EditionStateHelper } from '@testing/edition-state-helper';
import {
    expectSpyCall,
    expectToBe,
    expectToContain,
    expectToEqual,
    getAndExpectDebugElementByCss,
    getAndExpectDebugElementByDirective,
    getItemAt,
} from '@testing/expect-helper';

import { AlertErrorComponent } from '@awg-shared/alert-error/alert-error.component';
import { TwelveToneSpinnerComponent } from '@awg-shared/twelve-tone-spinner/twelve-tone-spinner.component';

import { EditionComplex } from '@awg-views/edition-view/models/edition-complex.model';
import {
    EditionDataAssetsError,
    EditionViewData,
    EditionViewDataContent,
} from '@awg-views/edition-view/models/edition-data.model';
import { Graph, GraphList, GraphQuery } from '@awg-views/edition-view/models/graph.model';
import { EditionStateService } from '@awg-views/edition-view/services/edition-state.service';
import { EditionViewService } from '@awg-views/edition-view/services/edition-view.service';

import { EditionGraphDescriptionComponent } from './edition-graph-description/edition-graph-description.component';
import { EditionGraphDynamicComponent } from './edition-graph-dynamic/edition-graph-dynamic.component';
import { EditionGraphExplorerFlowComponent } from './edition-graph-explorer/flow/edition-graph-explorer-flow.component';
import { EditionGraphGeneratorService } from './edition-graph-generator.service';
import { EditionGraphLayersComponent } from './edition-graph-layers/edition-graph-layers.component';
import { GENERATED_GRAPH_QUERIES } from './edition-graph-queries.data';
import { EditionGraphStaticComponent } from './edition-graph-static/edition-graph-static.component';
import { EditionGraphComponent } from './edition-graph.component';
import { RdfGeneratorResult } from './rdf-generator/rdf-generator.model';

const { literal, namedNode, quad } = DataFactory;

const AWG = 'https://edition.anton-webern.ch/webern-onto#';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';

/**
 * Helper function: getLabels.
 *
 * It gets the sorted labels of the given Turtle triples.
 */
function getLabels(triples: string): string[] {
    return new Parser()
        .parse(triples)
        .filter(q => q.predicate.value === RDFS_LABEL)
        .map(q => `${q.subject.value.replace(AWG, '')}: ${q.object.value}`)
        .sort();
}

describe('EditionGraphComponent (DONE)', () => {
    let component: EditionGraphComponent;
    let fixture: ComponentFixture<EditionGraphComponent>;
    let compDe: DebugElement;

    let editionStateService: EditionStateService;

    let mockViewDataSignal: WritableSignal<EditionViewData<'graph'>>;
    let mockGeneratedGraphSignal: WritableSignal<RdfGeneratorResult | null>;
    let expectedGeneratedGraph: RdfGeneratorResult;
    let expectedCuratedQuery: GraphQuery;
    let expectedViewDataContent: EditionViewDataContent<'graph'>;
    let expectedDefaultViewDataContent: EditionViewDataContent<'graph'>;
    let expectedGraphDataOp25: GraphList;
    let expectedComplex: EditionComplex;

    beforeEach(async () => {
        // Mock services
        expectedDefaultViewDataContent = { graphData: new GraphList() };
        mockViewDataSignal = signal(createMockViewData(expectedDefaultViewDataContent));
        mockGeneratedGraphSignal = signal(null);

        await TestBed.configureTestingModule({
            imports: [EditionGraphComponent],
            providers: [
                { provide: EditionViewService, useValue: { graphViewData: mockViewDataSignal.asReadonly() } },
                {
                    provide: EditionGraphGeneratorService,
                    useValue: { generatedGraph: mockGeneratedGraphSignal.asReadonly() },
                },
            ],
        })
            .overrideComponent(AlertErrorComponent, { set: { template: '', imports: [] } })
            .overrideComponent(EditionGraphDescriptionComponent, { set: { template: '', imports: [] } })
            .overrideComponent(EditionGraphDynamicComponent, { set: { template: '', imports: [] } })
            .overrideComponent(EditionGraphExplorerFlowComponent, { set: { template: '', imports: [] } })
            .overrideComponent(EditionGraphLayersComponent, { set: { template: '', imports: [] } })
            .overrideComponent(EditionGraphStaticComponent, { set: { template: '', imports: [] } })
            .overrideComponent(TwelveToneSpinnerComponent, { set: { template: '', imports: [] } })
            .compileComponents();
    });

    beforeEach(() => {
        // Inject services
        editionStateService = TestBed.inject(EditionStateService);

        // Test data
        expectedComplex = EditionStateHelper.getComplex('op25');

        expectedGraphDataOp25 = new GraphList();
        expectedGraphDataOp25.graph = [new Graph(), new Graph()];
        const firstGraph = getItemAt(expectedGraphDataOp25.graph, 0);
        firstGraph.id = 'test-graph-id-op25-1';
        firstGraph.description = ['Description for test-graph-id-op25-1'];
        firstGraph.staticImage = 'OP25';
        firstGraph.rdfData.triples = [
            `@prefix awg: <${AWG}>.`,
            `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.`,
            'awg:M317_Sk1 rdfs:label "M 317 Sk1 (Verlaufsskizze)".',
        ].join(' ');
        expectedCuratedQuery = {
            queryType: 'select',
            queryLabel: 'Kuratiert',
            queryString: 'SELECT * WHERE { ?s ?p ?o }',
        };
        firstGraph.rdfData.queryList = [expectedCuratedQuery];
        const secondGraph = getItemAt(expectedGraphDataOp25.graph, 1);
        secondGraph.id = 'test-graph-id-op25-2';
        secondGraph.rdfData.triples = 'example:test example:has example:Success';
        secondGraph.staticImage = 'OP12';

        const label = namedNode(RDFS_LABEL);
        expectedGeneratedGraph = {
            complexKey: 'op25',
            quads: [
                quad(namedNode(`${AWG}M317_Sk1`), label, literal('M 317 Sk1')),
                quad(namedNode(`${AWG}M317_Sk2`), label, literal('M 317 Sk2')),
            ],
            warnings: [],
        };

        // Create component fixture
        fixture = TestBed.createComponent(EditionGraphComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    describe('BEFORE initial data binding', () => {
        it('... should have signal `viewData` to hold the default fallback data', () => {
            expectToBe(isSignal(component.viewData), true);

            expectToEqual(component.viewData(), createMockViewData(expectedDefaultViewDataContent));
        });

        it('... should have signal `selectedEditionComplex` to hold null', () => {
            expectToBe(isSignal(component.selectedEditionComplex), true);

            expectToBe(component.selectedEditionComplex(), null);
        });

        it('... should have computed signal `curatedRdfData` to hold undefined', () => {
            expectToBe(isSignal(component.curatedRdfData), true);

            expect(component.curatedRdfData()).toBeUndefined();
        });

        it('... should have computed signal `hasCuratedTriples` to hold false', () => {
            expectToBe(isSignal(component.hasCuratedTriples), true);

            expectToBe(component.hasCuratedTriples(), false);
        });

        it('... should have signal `layerMode` to hold both layers', () => {
            expectToBe(isSignal(component.layerMode), true);

            expectToBe(component.layerMode(), 'both');
        });

        it('... should have computed signal `shownLayerMode` to hold the generated layer', () => {
            expectToBe(isSignal(component.shownLayerMode), true);

            expectToBe(component.shownLayerMode(), 'generated');
        });

        it('... should have resource `layeredRdfData` to hold undefined without generated graph', () => {
            expect(component.layeredRdfData.value()).toBeUndefined();
        });

        describe('VIEW', () => {
            it('... should contain one outer `div`', () => {
                getAndExpectDebugElementByCss(compDe, 'div', 1, 1);
            });

            it('... should contain no AlertErrorComponent (hollow)', () => {
                const divDes = getAndExpectDebugElementByCss(compDe, 'div', 1, 1);

                getAndExpectDebugElementByDirective(divDes[0], AlertErrorComponent, 0, 0);
            });

            it('... should contain no TwelveToneSpinnerComponent (hollow)', () => {
                const divDes = getAndExpectDebugElementByCss(compDe, 'div', 1, 1);

                getAndExpectDebugElementByDirective(divDes[0], TwelveToneSpinnerComponent, 0, 0);
            });

            it('... should contain no div.awg-edition-graph-view yet', () => {
                getAndExpectDebugElementByCss(compDe, 'div.awg-edition-graph-view', 0, 0);
            });
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            expectedViewDataContent = { graphData: expectedGraphDataOp25 };
            mockViewDataSignal.set(
                createMockViewData(expectedViewDataContent, {
                    isLoading: false,
                    error: null,
                })
            );
            editionStateService.updateSelectedEditionComplex(expectedComplex);
            mockGeneratedGraphSignal.set(expectedGeneratedGraph);

            // Trigger initial data binding
            fixture.detectChanges();
        });

        it('... should have signal `viewData` to hold the expected data', () => {
            expectToEqual(component.viewData(), createMockViewData(expectedViewDataContent));
        });

        it('... should have computed signal `curatedRdfData` to hold the RDF data of the first graph', () => {
            expectToEqual(component.curatedRdfData(), getItemAt(expectedGraphDataOp25.graph, 0).rdfData);
        });

        it('... should have computed signal `hasCuratedTriples` to hold true', () => {
            expectToBe(component.hasCuratedTriples(), true);
        });

        it('... should have computed signal `shownLayerMode` to hold the selected layer mode', () => {
            component.layerMode.set('curated');

            expectToBe(component.shownLayerMode(), 'curated');
        });

        describe('... resource `layeredRdfData`', () => {
            it('... should hold the merged layers with the curated queries for both layers', async () => {
                await fixture.whenStable();
                const rdfData = component.layeredRdfData.value();

                expectToEqual(getLabels(rdfData?.triples ?? ''), [
                    'M317_Sk1: M 317 Sk1 (Verlaufsskizze)',
                    'M317_Sk2: M 317 Sk2',
                ]);
                expectToEqual(rdfData?.queryList, [expectedCuratedQuery]);
            });

            it('... should hold the unchanged curated RDF data for the curated layer', async () => {
                component.layerMode.set('curated');
                await fixture.whenStable();

                expectToEqual(component.layeredRdfData.value(), getItemAt(expectedGraphDataOp25.graph, 0).rdfData);
            });

            it('... should hold the generated triples for the generated layer', async () => {
                component.layerMode.set('generated');
                await fixture.whenStable();
                const rdfData = component.layeredRdfData.value();

                expectToEqual(getLabels(rdfData?.triples ?? ''), ['M317_Sk1: M 317 Sk1', 'M317_Sk2: M 317 Sk2']);
            });

            it('... should hold the generated triples with the general queries without curated triples', async () => {
                const uncuratedGraphData = new GraphList();
                uncuratedGraphData.graph = [new Graph()];
                mockViewDataSignal.set(
                    createMockViewData({ graphData: uncuratedGraphData }, { isLoading: false, error: null })
                );
                await fixture.whenStable();
                const rdfData = component.layeredRdfData.value();

                expectToBe(component.shownLayerMode(), 'generated');
                expectToEqual(getLabels(rdfData?.triples ?? ''), ['M317_Sk1: M 317 Sk1', 'M317_Sk2: M 317 Sk2']);
                expectToEqual(rdfData?.queryList, [...GENERATED_GRAPH_QUERIES]);
            });

            it('... should hold undefined while the generated graph is not available', async () => {
                mockGeneratedGraphSignal.set(null);
                await fixture.whenStable();

                expect(component.layeredRdfData.value()).toBeUndefined();
            });
        });

        describe('#onDownloadRequest()', () => {
            let createObjectUrlSpy: Mock<(blob: Blob) => string>;
            let revokeObjectUrlSpy: Mock<(url: string) => void>;
            let clickSpy: ReturnType<typeof vi.spyOn>;

            beforeEach(() => {
                createObjectUrlSpy = vi.fn<(blob: Blob) => string>(() => 'blob:test');
                revokeObjectUrlSpy = vi.fn<(url: string) => void>();
                URL.createObjectURL = createObjectUrlSpy;
                URL.revokeObjectURL = revokeObjectUrlSpy;
                clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
            });

            it('... should have a method `onDownloadRequest`', () => {
                expect(component.onDownloadRequest).toBeDefined();
            });

            it('... should download the shown layers as Turtle file with a header', async () => {
                await fixture.whenStable();

                component.onDownloadRequest();
                const [blob] = getItemAt(createObjectUrlSpy.mock.calls, 0);
                const link = getItemAt<HTMLAnchorElement>(clickSpy.mock.contexts, 0);
                const content = await blob.text();

                expectSpyCall(clickSpy, 1);
                expectSpyCall(revokeObjectUrlSpy, 1, 'blob:test');
                expectToBe(link.download, 'op25-graph-both.ttl');
                expectToBe(blob.type, 'text/turtle');
                expectToContain(content, '# Anton Webern Gesamtausgabe, op. 25: graph (both)\n\n@prefix awg:');
            });

            it('... should do nothing while the shown layers are not available', async () => {
                mockGeneratedGraphSignal.set(null);
                await fixture.whenStable();

                component.onDownloadRequest();

                expectSpyCall(createObjectUrlSpy, 0);
                expectSpyCall(clickSpy, 0);
            });
        });

        describe('VIEW', () => {
            it('... should render nothing if viewData is not available', async () => {
                mockViewDataSignal.set(null as any);

                await detectChangesOnPush(fixture);

                const divDes = getAndExpectDebugElementByCss(compDe, 'div', 1, 1);
                getAndExpectDebugElementByDirective(divDes[0], AlertErrorComponent, 0, 0);
                getAndExpectDebugElementByDirective(divDes[0], TwelveToneSpinnerComponent, 0, 0);
                getAndExpectDebugElementByCss(divDes[0], 'div.awg-edition-graph-view', 0, 0);
            });

            describe('on error', () => {
                const expectedErrorObject: EditionDataAssetsError = {
                    key: 'graph',
                    error: { status: 404, statusText: 'Data not found' },
                };

                beforeEach(async () => {
                    // Mock error state
                    mockViewDataSignal.set(
                        createMockViewData(expectedViewDataContent, {
                            isLoading: false,
                            error: expectedErrorObject,
                        })
                    );

                    await detectChangesOnPush(fixture);
                });

                it('... should not contain graph view or spinner, but one AlertErrorComponent (hollow)', () => {
                    const divDes = getAndExpectDebugElementByCss(compDe, 'div', 1, 1);

                    getAndExpectDebugElementByCss(divDes[0], 'div.awg-edition-graph-view', 0, 0);
                    getAndExpectDebugElementByDirective(divDes[0], TwelveToneSpinnerComponent, 0, 0);

                    getAndExpectDebugElementByDirective(divDes[0], AlertErrorComponent, 1, 1);
                });

                it('... should pass down error object to AlertErrorComponent', () => {
                    const alertErrorDes = getAndExpectDebugElementByDirective(compDe, AlertErrorComponent, 1, 1);
                    const alertErrorCmp = alertErrorDes[0].injector.get(AlertErrorComponent);

                    expectToEqual(alertErrorCmp.errorObject(), expectedErrorObject);
                });
            });

            describe('on loading', () => {
                beforeEach(async () => {
                    // Mock loading state
                    mockViewDataSignal.set(
                        createMockViewData(expectedViewDataContent, { isLoading: true, error: null })
                    );

                    await detectChangesOnPush(fixture);
                });
                it('... should not contain graph view or alert, but one TwelveToneSpinnerComponent (hollow)', () => {
                    getAndExpectDebugElementByCss(compDe, 'div.awg-edition-graph-view', 0, 0);
                    getAndExpectDebugElementByDirective(compDe, AlertErrorComponent, 0, 0);

                    getAndExpectDebugElementByDirective(compDe, TwelveToneSpinnerComponent, 1, 1);
                });

                it('... should have default spinnerText on TwelveToneSpinnerComponent', () => {
                    const spinnerDes = getAndExpectDebugElementByDirective(compDe, TwelveToneSpinnerComponent, 1, 1);
                    const spinnerCmp = spinnerDes[0].injector.get(TwelveToneSpinnerComponent);

                    expectToBe(spinnerCmp.spinnerText(), 'loading');
                });
            });

            describe('on view data available', () => {
                beforeEach(async () => {
                    // Mock data state
                    mockViewDataSignal.set(
                        createMockViewData(expectedViewDataContent, {
                            isLoading: false,
                            error: null,
                        })
                    );

                    await detectChangesOnPush(fixture);
                });

                it('... should contain one div.awg-edition-graph-view', () => {
                    getAndExpectDebugElementByCss(compDe, 'div.awg-edition-graph-view', 1, 1);
                });

                it('... should not contain a div in div.awg-edition-graph-view if graph data is not provided', async () => {
                    const noGraphData = new GraphList();
                    noGraphData.graph = [];

                    mockViewDataSignal.set(
                        createMockViewData(
                            { graphData: noGraphData },
                            {
                                isLoading: false,
                                error: null,
                            }
                        )
                    );

                    await detectChangesOnPush(fixture);

                    const viewDivDes = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-graph-view', 1, 1);
                    getAndExpectDebugElementByCss(viewDivDes[0], 'div', 0, 0);
                });

                it('... should contain the graph intro paragraph exactly once', () => {
                    const pDes = getAndExpectDebugElementByCss(
                        compDe,
                        'div.awg-edition-graph-view > p.awg-graph-intro',
                        1,
                        1
                    );
                    const pEl: HTMLParagraphElement = pDes[0].nativeElement;

                    expectToContain(pEl.textContent, 'So weit vorhanden');
                    getAndExpectDebugElementByCss(pDes[0], 'span.text-danger', 1, 1);
                });

                it('... should contain one div per graph in div.awg-edition-graph-view', () => {
                    getAndExpectDebugElementByCss(compDe, 'div.awg-edition-graph-view > div', 2, 2);
                });

                describe('EditionGraphDescriptionComponent (hollow)', () => {
                    it('... should contain one EditionGraphDescriptionComponent per graph', () => {
                        getAndExpectDebugElementByDirective(compDe, EditionGraphDescriptionComponent, 2, 2);
                    });

                    it('... should pass down `graph` and `editionComplex` to each EditionGraphDescriptionComponent', () => {
                        const descriptionDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphDescriptionComponent,
                            2,
                            2
                        );

                        descriptionDes.forEach((de, index) => {
                            const descriptionCmp = de.injector.get(EditionGraphDescriptionComponent);

                            expectToEqual(descriptionCmp.graph(), expectedGraphDataOp25.graph[index]);
                            expectToEqual(descriptionCmp.editionComplex(), expectedComplex);
                        });
                    });
                });

                describe('EditionGraphLayersComponent (hollow)', () => {
                    it('... should contain one EditionGraphLayersComponent for the first graph', () => {
                        getAndExpectDebugElementByDirective(compDe, EditionGraphLayersComponent, 1, 1);
                    });

                    it('... should pass down `layerMode` and `hasCuratedTriples` to EditionGraphLayersComponent', () => {
                        const layersDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphLayersComponent,
                            1,
                            1
                        );
                        const layersCmp = layersDes[0].injector.get(EditionGraphLayersComponent);

                        expectToBe(layersCmp.layerMode(), 'both');
                        expectToBe(layersCmp.hasCuratedTriples(), true);
                    });

                    it('... should set `layerMode` when EditionGraphLayersComponent changes it', () => {
                        const layersDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphLayersComponent,
                            1,
                            1
                        );
                        const layersCmp = layersDes[0].injector.get(EditionGraphLayersComponent);

                        layersCmp.layerMode.set('generated');

                        expectToBe(component.layerMode(), 'generated');
                    });

                    it('... should call `onDownloadRequest` on a download request of EditionGraphLayersComponent', () => {
                        const downloadSpy = vi
                            .spyOn(component, 'onDownloadRequest')
                            .mockImplementation(() => undefined);
                        const layersDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphLayersComponent,
                            1,
                            1
                        );
                        const layersCmp = layersDes[0].injector.get(EditionGraphLayersComponent);

                        layersCmp.downloadRequest.emit();

                        expectSpyCall(downloadSpy, 1);
                    });
                });

                describe('EditionGraphDynamicComponent (hollow)', () => {
                    it('... should contain one EditionGraphDynamicComponent per graph', async () => {
                        await fixture.whenStable();

                        getAndExpectDebugElementByDirective(compDe, EditionGraphDynamicComponent, 2, 2);
                    });

                    it('... should pass down the layered `rdfData` to the first and the own `rdfData` to the other EditionGraphDynamicComponents', async () => {
                        await fixture.whenStable();
                        const dynamicDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphDynamicComponent,
                            2,
                            2
                        );
                        const dynamicCmps = dynamicDes.map(de => de.injector.get(EditionGraphDynamicComponent));

                        expectToEqual(dynamicCmps[0]?.rdfData(), component.layeredRdfData.value());
                        expectToEqual(dynamicCmps[1]?.rdfData(), getItemAt(expectedGraphDataOp25.graph, 1).rdfData);
                    });

                    it('... should contain a TwelveToneSpinnerComponent (hollow) instead of the first EditionGraphDynamicComponent while the layers are not available', async () => {
                        mockGeneratedGraphSignal.set(null);
                        await fixture.whenStable();

                        getAndExpectDebugElementByDirective(compDe, TwelveToneSpinnerComponent, 1, 1);
                        getAndExpectDebugElementByDirective(compDe, EditionGraphDynamicComponent, 1, 1);
                    });
                });

                describe('EditionGraphExplorerFlowComponent (hollow)', () => {
                    it('... should contain one EditionGraphExplorerFlowComponent for the first graph', async () => {
                        await fixture.whenStable();

                        getAndExpectDebugElementByDirective(compDe, EditionGraphExplorerFlowComponent, 1, 1);
                    });

                    it('... should pass down the layered `rdfData` to EditionGraphExplorerFlowComponent', async () => {
                        await fixture.whenStable();
                        const flowDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphExplorerFlowComponent,
                            1,
                            1
                        );
                        const flowCmp = flowDes[0].injector.get(EditionGraphExplorerFlowComponent);

                        expectToEqual(flowCmp.rdfData(), component.layeredRdfData.value());
                    });

                    it('... should contain no EditionGraphExplorerFlowComponent while the layers are not available', async () => {
                        mockGeneratedGraphSignal.set(null);
                        await fixture.whenStable();

                        getAndExpectDebugElementByDirective(compDe, EditionGraphExplorerFlowComponent, 0, 0);
                    });
                });

                describe('EditionGraphStaticComponent (hollow)', () => {
                    it('... should contain one EditionGraphStaticComponent per graph', () => {
                        getAndExpectDebugElementByDirective(compDe, EditionGraphStaticComponent, 2, 2);
                    });

                    it('... should pass down `imageKey` to each EditionGraphStaticComponent', () => {
                        const staticDes = getAndExpectDebugElementByDirective(
                            compDe,
                            EditionGraphStaticComponent,
                            2,
                            2
                        );

                        staticDes.forEach((de, index) => {
                            const staticCmp = de.injector.get(EditionGraphStaticComponent);
                            const expectedGraph = getItemAt(expectedGraphDataOp25.graph, index);

                            expectToBe(staticCmp.imageKey(), expectedGraph.staticImage);
                        });
                    });
                });
            });
        });
    });
});
