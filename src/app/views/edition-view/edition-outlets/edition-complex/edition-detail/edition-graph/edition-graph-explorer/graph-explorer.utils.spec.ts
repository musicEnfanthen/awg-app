import { beforeAll, describe, expect, it } from 'vitest';

import { expectToBe, expectToContain, expectToEqual, getItemAt } from '@testing/expect-helper';

import { GraphList } from '@awg-views/edition-view/models/graph.model';

import { ExplorerData, ExplorerEdgeKind, ExplorerFlowLayout } from './graph-explorer.model';
import {
    buildFlowLayout,
    concomitantsOf,
    flowNodeWidth,
    GRAPH_EXPLORER_UTILS,
    isGeneticKind,
    isPrecedesKind,
    parseExplorerData,
    rankNodes,
    stackParents,
    stackRoot,
    transitiveClosure,
} from './graph-explorer.utils';

import graphDataOp25 from 'assets/data/edition/series/1/section/5/op25/graph.json';

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

/**
 * The Turtle data of the specs: complexes, a continuity draft with two segments, a sub-sketch
 * concomitating a segment and the sketch, a row table, a sketch of an M number without complex,
 * two paratexts (one with a genetic relation) and an old precedence IRI.
 */
const TURTLE = `
@prefix awg: <${AWG}> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

awg:Op25 a awg:EditionComplex, awg:CompositeEditionComplex ; rdfs:label "op. 25" ; dcterms:hasPart awg:M317 .
awg:M317 a awg:EditionComplex ; rdfs:label "M 317" .
awg:Op25_SkRT a awg:Inscription, awg:Sketch, awg:RowTable ; rdfs:label "op. 25 RT" ; awg:belongsToComplex awg:Op25 .
awg:M317_Sk1 a awg:Inscription, awg:Sketch ; rdfs:label "M 317 Sk1" ; awg:belongsToComplex awg:M317 ;
    awg:precedes awg:M317_Sk2 .
awg:M317_Sk2 a awg:Inscription, awg:Sketch, awg:ContinuityDraft ; rdfs:label "M 317 Sk2" ;
    awg:belongsToComplex awg:M317 ; dcterms:hasPart awg:M317_Sk2a, awg:M317_Sk2b .
awg:M317_Sk2a a awg:Inscription, awg:Sketch, awg:SketchSegment ; rdfs:label "M 317 Sk2 T. 1–2" ;
    awg:belongsToComplex awg:M317 ; awg:nextSegment awg:M317_Sk2b .
awg:M317_Sk2b a awg:Inscription, awg:Sketch, awg:SketchSegment ; rdfs:label "M 317 Sk2 T. 3" ;
    awg:belongsToComplex awg:M317 ; awg:precedes awg:M317_Sk3 .
awg:M317_Sk2_1 a awg:Inscription, awg:Sketch ; rdfs:label "M 317 Sk2.1" ; awg:belongsToComplex awg:M317 ;
    awg:concomitates awg:M317_Sk2, awg:M317_Sk2a .
awg:M317_Sk3 a awg:Inscription, awg:Sketch ; rdfs:label "M 317 Sk3" ; awg:belongsToComplex awg:M317 ;
    awg:precedes_scripture awg:M317_Sk1 .
awg:M78_Sk1 a awg:Inscription, awg:Sketch ; rdfs:label "M 78 Sk1" .
awg:doc_1r_title_1 a awg:Paratext ; rdfs:label "Titel" ; awg:precedesScripture awg:M317_Sk1 .
awg:doc_1r_dating_1 a awg:Paratext ; rdfs:label "Datierung" ; awg:accompanies awg:M317_Sk1 .
`;

/**
 * Helper function: local.
 *
 * It gets the local name of an AWG IRI.
 */
function local(iri: string): string {
    return iri.replace(AWG, '');
}

/**
 * Helper function: locals.
 *
 * It gets the sorted local names of a set of AWG IRIs.
 */
function locals(iris: Iterable<string>): string[] {
    return [...iris].map(local).sort();
}

/**
 * Helper function: createData.
 *
 * It creates explorer data of sketches without complex from the given edges.
 */
function createData(edges: [string, ExplorerEdgeKind, string][]): ExplorerData {
    const ids = new Set(edges.flatMap(([source, , target]) => [source, target]));
    return {
        nodes: new Map([...ids].map(id => [id, { id, label: id, kind: 'sketch' }])),
        edges: edges.map(([source, kind, target]) => ({ source, kind, target })),
    };
}

describe('GraphExplorerUtils (DONE)', () => {
    let data: ExplorerData;

    beforeAll(() => {
        data = parseExplorerData(TURTLE);
    });

    describe('GRAPH_EXPLORER_UTILS', () => {
        it('... should reference all utils functions', () => {
            expectToEqual(GRAPH_EXPLORER_UTILS, {
                buildFlowLayout,
                concomitantsOf,
                flowNodeWidth,
                isGeneticKind,
                isPrecedesKind,
                parseExplorerData,
                rankNodes,
                stackParents,
                stackRoot,
                transitiveClosure,
            });
        });
    });

    describe('METHODS', () => {
        describe('#parseExplorerData()', () => {
            it('... should have a method `parseExplorerData`', () => {
                expect(parseExplorerData).toBeDefined();
            });

            it('... should return empty explorer data for invalid Turtle', () => {
                const invalidData = parseExplorerData('awg:Sk1 awg:precedes');

                expectToBe(invalidData.nodes.size, 0);
                expectToEqual(invalidData.edges, []);
            });

            it('... should return the nodes with the kind of their most specific class', () => {
                const kinds = [...data.nodes.values()].map(node => [local(node.id), node.kind]);

                expectToEqual(kinds, [
                    ['Op25', 'complex'],
                    ['M317', 'complex'],
                    ['Op25_SkRT', 'rowTable'],
                    ['M317_Sk1', 'sketch'],
                    ['M317_Sk2', 'continuityDraft'],
                    ['M317_Sk2a', 'segment'],
                    ['M317_Sk2b', 'segment'],
                    ['M317_Sk2_1', 'sketch'],
                    ['M317_Sk3', 'sketch'],
                    ['M78_Sk1', 'sketch'],
                    ['doc_1r_title_1', 'paratext'],
                ]);
            });

            it('... should return no paratexts without a genetic relation', () => {
                expectToBe(data.nodes.has(`${AWG}doc_1r_dating_1`), false);
            });

            it('... should return the complex and the sketch of a segment with its label', () => {
                const segment = data.nodes.get(`${AWG}M317_Sk2a`);

                expectToEqual(segment, {
                    id: `${AWG}M317_Sk2a`,
                    label: 'M 317 Sk2 T. 1–2',
                    kind: 'segment',
                    complex: `${AWG}M317`,
                    sketch: `${AWG}M317_Sk2`,
                });
            });

            it('... should return the complex of a sketch only via `awg:belongsToComplex`', () => {
                const complexes = [...data.nodes.values()].map(node => [
                    local(node.id),
                    node.complex && local(node.complex),
                ]);

                expectToEqual(getItemAt(complexes, 1), ['M317', undefined]);
                expectToEqual(getItemAt(complexes, 2), ['Op25_SkRT', 'Op25']);
            });

            it('... should return the genetic relations and the segment order of the model, without old IRIs', () => {
                const edges = data.edges.map(edge => `${local(edge.source)} ${edge.kind} ${local(edge.target)}`);

                expectToEqual(edges, [
                    'M317_Sk1 precedes M317_Sk2',
                    'M317_Sk2a nextSegment M317_Sk2b',
                    'M317_Sk2b precedes M317_Sk3',
                    'M317_Sk2_1 concomitates M317_Sk2',
                    'M317_Sk2_1 concomitates M317_Sk2a',
                    'doc_1r_title_1 precedesScripture M317_Sk1',
                ]);
            });
        });

        describe('#isPrecedesKind()', () => {
            it('... should have a method `isPrecedesKind`', () => {
                expect(isPrecedesKind).toBeDefined();
            });

            it.each([
                { kind: 'precedes', expected: true },
                { kind: 'precedesScripture', expected: true },
                { kind: 'precedesContent', expected: true },
                { kind: 'concomitates', expected: false },
                { kind: 'nextSegment', expected: false },
            ] satisfies { kind: ExplorerEdgeKind; expected: boolean }[])(
                '... should return $expected for $kind',
                ({ kind, expected }) => {
                    const result = isPrecedesKind(kind);

                    expectToBe(result, expected);
                }
            );
        });

        describe('#isGeneticKind()', () => {
            it('... should have a method `isGeneticKind`', () => {
                expect(isGeneticKind).toBeDefined();
            });

            it.each([
                { kind: 'precedes', expected: true },
                { kind: 'concomitates', expected: true },
                { kind: 'nextSegment', expected: false },
            ] satisfies { kind: ExplorerEdgeKind; expected: boolean }[])(
                '... should return $expected for $kind',
                ({ kind, expected }) => {
                    const result = isGeneticKind(kind);

                    expectToBe(result, expected);
                }
            );
        });

        describe('#concomitantsOf()', () => {
            it('... should have a method `concomitantsOf`', () => {
                expect(concomitantsOf).toBeDefined();
            });

            it('... should return the concomitant nodes in both directions', () => {
                const ofMain = concomitantsOf(data, `${AWG}M317_Sk2`);
                const ofDependent = concomitantsOf(data, `${AWG}M317_Sk2_1`);

                expectToEqual(locals(ofMain), ['M317_Sk2_1']);
                expectToEqual(locals(ofDependent), ['M317_Sk2', 'M317_Sk2a']);
            });
        });

        describe('#stackParents()', () => {
            it('... should have a method `stackParents`', () => {
                expect(stackParents).toBeDefined();
            });

            it('... should return the concomitated main inscription (segments first), else the sketch of a segment', () => {
                const parents = [...stackParents(data)].map(([id, parent]) => `${local(id)} → ${local(parent)}`);

                expectToEqual(parents, ['M317_Sk2_1 → M317_Sk2a', 'M317_Sk2a → M317_Sk2', 'M317_Sk2b → M317_Sk2']);
            });

            it('... should return no parent that closes a cycle', () => {
                const cycleData = createData([
                    ['A', 'concomitates', 'B'],
                    ['B', 'concomitates', 'A'],
                ]);

                const parents = stackParents(cycleData);

                expectToEqual([...parents], [['A', 'B']]);
            });
        });

        describe('#stackRoot()', () => {
            it('... should have a method `stackRoot`', () => {
                expect(stackRoot).toBeDefined();
            });

            it('... should return the main inscription at the root of a stack', () => {
                const root = stackRoot(stackParents(data), `${AWG}M317_Sk2_1`);

                expectToBe(local(root), 'M317_Sk2');
            });
        });

        describe('#transitiveClosure()', () => {
            it('... should have a method `transitiveClosure`', () => {
                expect(transitiveClosure).toBeDefined();
            });

            it('... should return the transitive predecessors and successors via the precedence family', () => {
                const { predecessors, successors } = transitiveClosure(data, `${AWG}M317_Sk2`);

                expectToEqual(locals(predecessors), ['M317_Sk1', 'doc_1r_title_1']);
                expectToEqual(locals(successors), []);
            });

            it('... should return no predecessors via the segment order', () => {
                const { predecessors } = transitiveClosure(data, `${AWG}M317_Sk3`);

                expectToEqual(locals(predecessors), ['M317_Sk2b']);
            });
        });

        describe('#rankNodes()', () => {
            it('... should have a method `rankNodes`', () => {
                expect(rankNodes).toBeDefined();
            });

            it('... should return the ranks of the main inscriptions, with stacked nodes counting for their root', () => {
                const ranks = [...rankNodes(data)].map(([id, rank]) => `${local(id)} ${rank}`).sort();

                expectToEqual(ranks, [
                    'M317_Sk1 1',
                    'M317_Sk2 2',
                    'M317_Sk3 3',
                    'M78_Sk1 0',
                    'Op25_SkRT 0',
                    'doc_1r_title_1 0',
                ]);
            });

            it('... should return finite ranks for a cycle', () => {
                const cycleData = createData([
                    ['A', 'precedes', 'B'],
                    ['B', 'precedes', 'A'],
                ]);

                const ranks = rankNodes(cycleData);

                expectToEqual([...ranks].sort(), [
                    ['A', 2],
                    ['B', 1],
                ]);
            });
        });

        describe('#flowNodeWidth()', () => {
            it('... should have a method `flowNodeWidth`', () => {
                expect(flowNodeWidth).toBeDefined();
            });

            it.each([
                { depth: 0, expected: 126 },
                { depth: 2, expected: 106 },
                { depth: 10, expected: 72 },
            ])('... should return $expected for depth $depth', ({ depth, expected }) => {
                const width = flowNodeWidth(depth);

                expectToBe(width, expected);
            });
        });

        describe('#buildFlowLayout()', () => {
            let layout: ExplorerFlowLayout;

            beforeAll(() => {
                layout = buildFlowLayout(data);
            });

            it('... should have a method `buildFlowLayout`', () => {
                expect(buildFlowLayout).toBeDefined();
            });

            it('... should return one lane per complex, then per M number without complex, unassigned last', () => {
                const laneLabels = layout.lanes.map(lane => lane.label);

                expectToEqual(laneLabels, ['op. 25', 'M 317', 'M 78', 'Ohne Zuordnung']);
            });

            it('... should return the segments and concomitant sketches stacked below their main inscription', () => {
                const stack = layout.nodes
                    .filter(flowNode => local(flowNode.node.id).startsWith('M317_Sk2'))
                    .map(flowNode => `${local(flowNode.node.id)}@${flowNode.depth}`);

                expectToEqual(stack, ['M317_Sk2@0', 'M317_Sk2a@1', 'M317_Sk2_1@2', 'M317_Sk2b@1']);
            });

            it('... should return the main inscriptions of a lane in columns by rank', () => {
                const xs = ['M317_Sk1', 'M317_Sk2', 'M317_Sk3'].map(
                    id => layout.nodes.find(flowNode => local(flowNode.node.id) === id)?.x
                );

                expectToEqual(xs, [173, 363, 553]);
            });

            it('... should return a link per edge with an elbow, a vertical line or a curve', () => {
                const paths = new Map(
                    layout.links.map(link => [`${local(link.edge.source)} ${local(link.edge.target)}`, link.path])
                );

                expectToContain(paths.get('M317_Sk2_1 M317_Sk2a'), ' H');
                expect(paths.get('M317_Sk2a M317_Sk2b')).toMatch(/^M[\d.]+,[\d.]+ V[\d.]+$/);
                expectToContain(paths.get('M317_Sk1 M317_Sk2'), ' C');
                expectToBe(layout.links.length, data.edges.length);
            });

            it('... should return the size of the layout', () => {
                expectToBe(layout.width, 110 + 3 * 190 + 16);
                expect(layout.height).toBeGreaterThan(0);
            });
        });

        describe('... with the curated op. 25 graph', () => {
            it('... should return the nodes and edges of the curated graph by kind', () => {
                const curatedData = parseExplorerData(getItemAt((graphDataOp25 as GraphList).graph, 0).rdfData.triples);
                const count = <T extends string>(values: T[]): Partial<Record<T, number>> =>
                    values.reduce<Partial<Record<T, number>>>((counts, value) => {
                        counts[value] = (counts[value] ?? 0) + 1;
                        return counts;
                    }, {});

                const nodeKinds = count([...curatedData.nodes.values()].map(node => node.kind));
                const edgeKinds = count(curatedData.edges.map(edge => edge.kind));

                expectToEqual(nodeKinds, {
                    complex: 5,
                    sketch: 40,
                    rowTable: 2,
                    continuityDraft: 3,
                    segment: 34,
                    paratext: 15,
                });
                expectToEqual(edgeKinds, {
                    precedesScripture: 2,
                    precedesContent: 1,
                    concomitates: 47,
                    precedes: 38,
                    nextSegment: 28,
                });
            });
        });
    });
});
