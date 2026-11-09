import { DebugElement, isSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { detectChangesOnPush } from '@testing/detect-changes-on-push-helper';
import {
    expectSpyCall,
    expectToBe,
    expectToContain,
    expectToEqual,
    getAndExpectDebugElementByCss,
    getItemAt,
} from '@testing/expect-helper';

import { GraphRdfData } from '@awg-views/edition-view/models/graph.model';

import { EXPLORER_EDGE_LABELS, EXPLORER_KIND_LABELS, ExplorerFlowLink } from '../graph-explorer.model';
import { FLOW_SIZES, GRAPH_EXPLORER_UTILS } from '../graph-explorer.utils';
import { EditionGraphExplorerFlowComponent } from './edition-graph-explorer-flow.component';

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

/**
 * The Turtle data of the specs: a chain of three sketches of M 317,
 * the second with a segment and a concomitant sub-sketch.
 */
const TURTLE = `
@prefix awg: <${AWG}> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

awg:M317 a awg:EditionComplex ; rdfs:label "M 317" .
awg:M317_Sk1 a awg:Sketch ; rdfs:label "M 317 Sk1" ; awg:belongsToComplex awg:M317 ; awg:precedes awg:M317_Sk2 .
awg:M317_Sk2 a awg:Sketch ; rdfs:label "M 317 Sk2" ; awg:belongsToComplex awg:M317 ;
    dcterms:hasPart awg:M317_Sk2a ; awg:precedes awg:M317_Sk3 .
awg:M317_Sk2a a awg:Sketch, awg:SketchSegment ; rdfs:label "M 317 Sk2 T. 1–2 und eine sehr lange Beschreibung" ;
    awg:belongsToComplex awg:M317 .
awg:M317_Sk2_1 a awg:Sketch ; rdfs:label "M 317 Sk2.1" ; awg:belongsToComplex awg:M317 ; awg:concomitates awg:M317_Sk2 .
awg:M317_Sk3 a awg:Sketch ; rdfs:label "M 317 Sk3" ; awg:belongsToComplex awg:M317 .
`;

describe('EditionGraphExplorerFlowComponent (DONE)', () => {
    let component: EditionGraphExplorerFlowComponent;
    let fixture: ComponentFixture<EditionGraphExplorerFlowComponent>;
    let compDe: DebugElement;

    let expectedRdfData: GraphRdfData;

    const sk1 = `${AWG}M317_Sk1`;
    const sk2 = `${AWG}M317_Sk2`;
    const sk2a = `${AWG}M317_Sk2a`;
    const sk2Sub = `${AWG}M317_Sk2_1`;
    const sk3 = `${AWG}M317_Sk3`;

    /**
     * Helper function: getLink.
     *
     * It gets the link of the layout between two nodes.
     */
    const getLink = (source: string, target: string): ExplorerFlowLink => {
        const link = component.layout().links.find(l => l.edge.source === source && l.edge.target === target);
        if (!link) {
            throw new Error(`Expected a link from ${source} to ${target}.`);
        }
        return link;
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditionGraphExplorerFlowComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        // Test data
        expectedRdfData = { queryList: [], triples: TURTLE };

        // Create component fixture
        fixture = TestBed.createComponent(EditionGraphExplorerFlowComponent);
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
        it('... should throw due to missing required input signal `rdfData`', () => {
            expectToBe(isSignal(component.rdfData), true);

            expect(() => component.rdfData()).toThrow();
        });

        it('... should hold the sizes, labels, legend and marker kinds', () => {
            expectToEqual(component.sizes, FLOW_SIZES);
            expectToEqual(component.kindLabels, EXPLORER_KIND_LABELS);
            expectToEqual(component.edgeLabels, EXPLORER_EDGE_LABELS);
            expectToEqual(component.legend, [
                'precedes',
                'precedesScripture',
                'precedesContent',
                'concomitates',
                'nextSegment',
            ]);
            expectToEqual(component.markerKinds, ['precedes', 'precedesScripture', 'precedesContent', 'highlight']);
        });

        it('... should have `markerPrefix` to hold a unique prefix per instance', () => {
            const otherComponent = TestBed.createComponent(EditionGraphExplorerFlowComponent).componentInstance;

            expect(component.markerPrefix).toMatch(/^awg-graph-flow-\d+-arrow$/);
            expect(otherComponent.markerPrefix).not.toBe(component.markerPrefix);
        });

        it('... should have signals `zoomValue` and `zoomPercent` to hold the initial zoom', () => {
            expectToBe(isSignal(component.zoomValue), true);
            expectToBe(isSignal(component.zoomPercent), true);

            expectToBe(component.zoomValue(), 1);
            expectToBe(component.zoomPercent(), 100);
        });

        it('... should have signals `hoveredId`, `selectedId` and `focusId` to hold undefined', () => {
            expectToBe(isSignal(component.hoveredId), true);
            expectToBe(isSignal(component.selectedId), true);
            expectToBe(isSignal(component.focusId), true);

            expect(component.hoveredId()).toBeUndefined();
            expect(component.selectedId()).toBeUndefined();
            expect(component.focusId()).toBeUndefined();
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('rdfData', expectedRdfData);
            fixture.detectChanges();
        });

        it('... should have input signal `rdfData` to hold the provided RDF data', () => {
            expectToEqual(component.rdfData(), expectedRdfData);
        });

        it('... should have computed signals `explorerData` and `layout` to hold the parsed data and its layout', () => {
            const expectedData = GRAPH_EXPLORER_UTILS.parseExplorerData(TURTLE);

            expectToEqual(component.explorerData(), expectedData);
            expectToEqual(component.layout(), GRAPH_EXPLORER_UTILS.buildFlowLayout(expectedData));
        });

        it('... should have computed signal `hasInscriptions` to hold true', () => {
            expectToBe(component.hasInscriptions(), true);
        });

        it('... should have computed signal `viewNodes` to hold the nodes with width, transform and short label', () => {
            const segmentNode = component.viewNodes().find(viewNode => viewNode.node.id === sk2a);

            expectToBe(segmentNode?.width, FLOW_SIZES.nodeWidth - FLOW_SIZES.stackIndent);
            expectToBe(segmentNode?.transform, `translate(${300 + 10},${16 + 18 + 30})`);
            expectToBe(segmentNode?.shortLabel, 'M 317 Sk2 T. 1–…');
        });

        it('... should have computed signal `svgHeight` to hold the layout height', () => {
            expectToBe(component.svgHeight(), component.layout().height);
        });

        it('... should have computed signals `states` and `focusSummary` to hold undefined without focus', () => {
            expect(component.states()).toBeUndefined();
            expect(component.focusSummary()).toBeUndefined();
        });

        describe('... with a focused node', () => {
            beforeEach(() => {
                component.hoveredId.set(sk2);
            });

            it('... should have computed signal `focusId` to hold the hovered before the selected node', () => {
                component.selectedId.set(sk1);

                expectToBe(component.focusId(), sk2);
            });

            it('... should have computed signal `states` to hold the states relative to the focused node', () => {
                const states = Object.fromEntries(component.states() ?? []);

                expectToEqual(states, {
                    [sk1]: 'predecessor',
                    [sk2]: 'focus',
                    [sk2Sub]: 'related',
                    [sk3]: 'successor',
                });
            });

            it('... should have computed signal `focusSummary` to hold the label and the counts', () => {
                expectToEqual(component.focusSummary(), { label: 'M 317 Sk2', predecessors: 1, successors: 1 });
            });
        });

        describe('METHODS', () => {
            describe('#nodeState()', () => {
                it('... should have a method `nodeState`', () => {
                    expect(component.nodeState).toBeDefined();
                });

                it('... should return none without focus', () => {
                    const state = component.nodeState(sk1);

                    expectToBe(state, 'none');
                });

                it('... should return the state of a node and dimmed for unrelated nodes', () => {
                    component.hoveredId.set(sk1);

                    const states = [sk1, sk2, sk2a].map(id => component.nodeState(id));

                    expectToEqual(states, ['focus', 'successor', 'dimmed']);
                });
            });

            describe('#linkState()', () => {
                it('... should have a method `linkState`', () => {
                    expect(component.linkState).toBeDefined();
                });

                it('... should return none without focus', () => {
                    const state = component.linkState(getLink(sk1, sk2));

                    expectToBe(state, 'none');
                });

                it('... should return focus, the chain state or dimmed with focus', () => {
                    component.hoveredId.set(sk1);

                    const states = [getLink(sk1, sk2), getLink(sk2, sk3), getLink(sk2Sub, sk2)].map(link =>
                        component.linkState(link)
                    );

                    expectToEqual(states, ['focus', 'successor', 'dimmed']);
                });
            });

            describe('#linkMarker()', () => {
                it('... should have a method `linkMarker`', () => {
                    expect(component.linkMarker).toBeDefined();
                });

                it.each([
                    { kind: 'precedes', state: 'none', expected: 'precedes' },
                    { kind: 'precedesContent', state: 'dimmed', expected: 'precedesContent' },
                    { kind: 'precedes', state: 'focus', expected: 'highlight' },
                ] as const)(
                    '... should return the $expected marker for $kind in state $state',
                    ({ kind, state, expected }) => {
                        const marker = component.linkMarker(kind, state);

                        expectToBe(marker, `url(#${component.markerPrefix}-${expected})`);
                    }
                );

                it('... should return null for links without arrow', () => {
                    const markers = [
                        component.linkMarker('concomitates', 'none'),
                        component.linkMarker('nextSegment', 'focus'),
                    ];

                    expectToEqual(markers, [null, null]);
                });
            });

            describe('#onSelect()', () => {
                it('... should have a method `onSelect`', () => {
                    expect(component.onSelect).toBeDefined();
                });

                it('... should select a node and deselect it again', () => {
                    component.onSelect(sk1);
                    const selected = component.selectedId();
                    component.onSelect(sk1);

                    expectToBe(selected, sk1);
                    expect(component.selectedId()).toBeUndefined();
                });
            });

            describe('#resetZoom()', () => {
                it('... should have a method `resetZoom`', () => {
                    expect(component.resetZoom).toBeDefined();
                });

                it('... should reset the zoom via the SvgZoomDirective', () => {
                    const resetSpy = vi.spyOn(component.svgZoom(), 'reset').mockImplementation(() => undefined);

                    component.resetZoom();

                    expectSpyCall(resetSpy, 1);
                });
            });
        });

        describe('VIEW', () => {
            it('... should contain the heading of the writing process', () => {
                const headingDes = getAndExpectDebugElementByCss(compDe, 'div.awg-graph-flow > h4', 1, 1);
                const headingEl: HTMLHeadingElement = headingDes[0].nativeElement;

                expectToBe(headingEl.textContent.trim(), 'Schreibprozess');
            });

            it('... should contain one lane and one node per inscription', () => {
                getAndExpectDebugElementByCss(compDe, 'g.awg-graph-flow-lane', 1, 1);
                getAndExpectDebugElementByCss(compDe, 'g.awg-graph-flow-node', 5, 5);
            });

            it('... should contain one link per edge, with arrows only for precedences', () => {
                const linkDes = getAndExpectDebugElementByCss(compDe, 'path.awg-graph-flow-link', 3 + 5, 3 + 5);
                const markers = linkDes
                    .slice(0, 3)
                    .map(de => (de.nativeElement as SVGPathElement).getAttribute('marker-end'));

                expectToEqual(markers, [
                    `url(#${component.markerPrefix}-precedes)`,
                    `url(#${component.markerPrefix}-precedes)`,
                    null,
                ]);
            });

            it('... should contain a legend entry per edge kind', () => {
                const legendDes = getAndExpectDebugElementByCss(compDe, 'div.awg-graph-flow-legend > span', 5, 5);
                const legendEl: HTMLSpanElement = getItemAt(legendDes, 4).nativeElement;

                expectToBe(legendEl.textContent.trim(), 'nächstes Segment');
            });

            it('... should contain the hint without focus and the summary with focus', async () => {
                const getSummaryEl = (): HTMLSpanElement =>
                    getAndExpectDebugElementByCss(compDe, 'span.awg-graph-flow-summary', 1, 1)[0].nativeElement;
                const hint = getSummaryEl().textContent;

                component.hoveredId.set(sk2);
                await detectChangesOnPush(fixture);

                expectToContain(hint, 'Niederschrift überfahren oder anklicken');
                expectToContain(getSummaryEl().textContent, 'M 317 Sk2');
            });

            it('... should set `hoveredId` on mouseenter of a node and reset it on mouseleave of the svg', () => {
                const nodeDes = getAndExpectDebugElementByCss(compDe, 'g.awg-graph-flow-node', 5, 5);
                const svgDes = getAndExpectDebugElementByCss(compDe, 'svg.awg-graph-flow-svg', 1, 1);

                nodeDes[0].triggerEventHandler('mouseenter');
                const hovered = component.hoveredId();
                svgDes[0].triggerEventHandler('mouseleave');

                expectToBe(hovered, sk1);
                expect(component.hoveredId()).toBeUndefined();
            });

            it('... should call `onSelect` on click of a node', () => {
                const selectSpy = vi.spyOn(component, 'onSelect');
                const nodeDes = getAndExpectDebugElementByCss(compDe, 'g.awg-graph-flow-node', 5, 5);

                nodeDes[0].triggerEventHandler('click');

                expectSpyCall(selectSpy, 1, sk1);
            });

            it('... should call `resetZoom` on click of the reset button', () => {
                const resetSpy = vi.spyOn(component, 'resetZoom').mockImplementation(() => undefined);
                const buttonDes = getAndExpectDebugElementByCss(compDe, 'div.awg-graph-flow-toolbar > button', 1, 1);
                const buttonEl: HTMLButtonElement = buttonDes[0].nativeElement;

                buttonEl.click();

                expectSpyCall(resetSpy, 1);
                expectToContain(buttonEl.textContent, '100 %');
            });

            it('... should contain a hint instead of the flow without inscriptions', async () => {
                fixture.componentRef.setInput('rdfData', { queryList: [], triples: '' });
                await detectChangesOnPush(fixture);

                getAndExpectDebugElementByCss(compDe, 'svg.awg-graph-flow-svg', 0, 0);
                getAndExpectDebugElementByCss(compDe, 'p.awg-graph-flow-empty', 1, 1);
                expectToBe(component.hasInscriptions(), false);
            });
        });
    });
});
