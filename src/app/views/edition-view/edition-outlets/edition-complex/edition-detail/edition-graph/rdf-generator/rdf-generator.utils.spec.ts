import { DataFactory } from 'n3';
import { beforeAll, describe, expect, it } from 'vitest';

import { expectToBe, expectToContain, expectToEqual, getItemAt } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';
import { getRdfNode, shortenIri } from '@testing/rdf-generator-helper';

import { RdfGeneratorResult } from './rdf-generator.model';
import { generateComplexGraph, mergeGraphs, mergeLayers, RDF_GENERATOR_UTILS } from './rdf-generator.utils';

const { literal, namedNode, quad } = DataFactory;

const AWG = 'https://edition.anton-webern.ch/webern-onto#';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

const INPUT = mockRdfGeneratorData.input;

describe('RdfGeneratorUtils (DONE)', () => {
    describe('RDF_GENERATOR_UTILS', () => {
        it('... should reference all public generator functions', () => {
            expectToEqual(RDF_GENERATOR_UTILS, { generateComplexGraph, mergeGraphs, mergeLayers });
        });
    });

    describe('METHODS', () => {
        describe('#generateComplexGraph()', () => {
            it('... should have a method `generateComplexGraph`', () => {
                expect(generateComplexGraph).toBeDefined();
            });

            describe('... with all facets', () => {
                let result: RdfGeneratorResult;

                beforeAll(() => {
                    result = generateComplexGraph(INPUT);
                });

                it('... should return the complex key and the quads sorted by subject', () => {
                    const subjects = result.quads.map(q => q.subject.value);
                    const sortedSubjects = [...subjects].sort();

                    expectToBe(result.complexKey, 'op25');
                    expectToEqual(subjects, sortedSubjects);
                });

                it('... should return the same quads on every run', () => {
                    const secondRun = generateComplexGraph(INPUT);

                    expectToEqual(secondRun.quads, result.quads);
                });

                it('... should return the complexes referenced by the other facets', () => {
                    const referencedComplex = getRdfNode(result.quads, 'Op24');
                    const expectedComplex = {
                        'awg:catalogueNumber': ['24'],
                        'awg:catalogueType': ['awg:catalogueType_OPUS'],
                        'dcterms:isPartOf': ['awg:Section_1_1'],
                        'dcterms:title': ['Konzert'],
                        'rdf:type': ['awg:EditionComplex'],
                        'rdfs:label': ['op. 24'],
                    };

                    expectToEqual(referencedComplex, expectedComplex);
                });

                it('... should return the warnings for the gaps in the data', () => {
                    const rules = result.warnings.map(warning => warning.rule).sort();
                    const complexKeys = new Set(result.warnings.map(warning => warning.complexKey));
                    const expectedRules = [
                        'emptyItem',
                        'incompleteDate',
                        'incompleteDate',
                        'noComplex',
                        'noComplex',
                        'placeholder',
                        'placeholder',
                        'unknownConvolute',
                        'unresolvedReference',
                    ];

                    expectToEqual(rules, expectedRules);
                    expectToEqual([...complexKeys], ['op25']);
                });
            });

            it('... should return only the given facets', () => {
                const editionOnly = generateComplexGraph({ ...INPUT, facets: new Set(['edition']) });
                const subjects = new Set(editionOnly.quads.map(q => shortenIri(q.subject.value)));
                const sourceSubjects = [...subjects].filter(subject => subject.includes('_source_'));

                expectToEqual(sourceSubjects, []);
            });

            it('... should return the complexes referenced only by the genetics facet', () => {
                const geneticsOnly = generateComplexGraph({
                    ...mockRdfGeneratorData.geneticsInput,
                    facets: new Set(['genetics', 'edition']),
                });
                const segmentComplex = getRdfNode(geneticsOnly.quads, 'M321');

                expectToEqual(segmentComplex['rdfs:label'], ['M 321']);
            });
        });

        describe('#mergeGraphs()', () => {
            it('... should return a warning for nodes with different labels from several complexes', () => {
                const sketch = namedNode(`${AWG}M78_SkX_1`);
                const labelPredicate = namedNode(RDFS_LABEL);
                const m113Result: RdfGeneratorResult = {
                    complexKey: 'm113',
                    quads: [quad(sketch, labelPredicate, literal('M 78 Sk## (1)'))],
                    warnings: [],
                };
                const m78Result: RdfGeneratorResult = {
                    complexKey: 'm78',
                    quads: [quad(sketch, labelPredicate, literal('M 78 Sk### (1)'))],
                    warnings: [],
                };

                const merged = mergeGraphs([m113Result, m78Result]);

                expectToEqual(merged.warnings, [
                    {
                        complexKey: 'm113, m78',
                        rule: 'labelConflict',
                        message: 'Different labels for awg:M78_SkX_1: M 78 Sk## (1) (m113) vs. M 78 Sk### (1) (m78)',
                    },
                ]);
            });

            const folio = namedNode(`${AWG}awg_doc_0047_38v`);
            const systemCount = namedNode(`${AWG}systemCount`);
            const height = namedNode(`${AWG}height`);
            const label = namedNode(RDFS_LABEL);
            const integer = namedNode(`${XSD}integer`);
            const decimal = namedNode(`${XSD}decimal`);

            const first: RdfGeneratorResult = {
                complexKey: 'op23',
                quads: [
                    quad(folio, label, literal('Bl. 38v')),
                    quad(folio, systemCount, literal('16', integer)),
                    quad(folio, height, literal('270', decimal)),
                ],
                warnings: [{ complexKey: 'op23', rule: 'placeholder', message: 'Placeholder' }],
            };
            const second: RdfGeneratorResult = {
                complexKey: 'op25',
                quads: [
                    quad(folio, label, literal('Bl. 38v')),
                    quad(folio, systemCount, literal('14', integer)),
                    quad(folio, height, literal('270', decimal)),
                ],
                warnings: [],
            };

            it('... should have a method `mergeGraphs`', () => {
                expect(mergeGraphs).toBeDefined();
            });

            it('... should return the merged quads without duplicates and conflicting folio values', () => {
                const merged = mergeGraphs([first, second]);
                const mergedFolio = getRdfNode(merged.quads, 'awg_doc_0047_38v');

                expectToBe(merged.complexKey, 'op23, op25');
                expectToEqual(mergedFolio, { 'awg:height': ['270'], 'rdfs:label': ['Bl. 38v'] });
            });

            it('... should return the warnings of all graphs with a warning for each conflict', () => {
                const merged = mergeGraphs([first, second]);
                const rules = merged.warnings.map(warning => warning.rule);
                const conflict = getItemAt(merged.warnings, 1);

                expectToEqual(rules, ['placeholder', 'folioConflict']);
                expectToBe(conflict.complexKey, 'op23, op25');
                expectToContain(conflict.message, 'awg:awg_doc_0047_38v');
                expectToContain(conflict.message, '16 (op23) vs. 14 (op25)');
            });
        });

        describe('#mergeLayers()', () => {
            const sk1 = namedNode(`${AWG}M317_Sk1`);
            const sk2 = namedNode(`${AWG}M317_Sk2`);
            const sk3 = namedNode(`${AWG}M317_Sk3`);
            const label = namedNode(RDFS_LABEL);
            const belongsToComplex = namedNode(`${AWG}belongsToComplex`);
            const precedes = namedNode(`${AWG}precedes`);
            const curatedSk1 = [
                quad(sk1, label, literal('M 317 Sk1 (Verlaufsskizze)')),
                quad(sk1, belongsToComplex, namedNode(`${AWG}Op25`)),
                quad(sk1, namedNode(`${AWG}precedesScripture`), sk2),
                quad(sk2, namedNode(`${AWG}precedesContent`), sk3),
            ];

            it('... should have a method `mergeLayers`', () => {
                expect(mergeLayers).toBeDefined();
            });

            it('... should return the curated labels and complexes instead of the generated ones', () => {
                const generated = [
                    quad(sk1, label, literal('M 317 Sk1')),
                    quad(sk1, belongsToComplex, namedNode(`${AWG}M317`)),
                    quad(sk2, label, literal('M 317 Sk2')),
                ];

                const merged = mergeLayers(curatedSk1, generated);
                const mergedSketches = [getRdfNode(merged, 'M317_Sk1'), getRdfNode(merged, 'M317_Sk2')];

                expectToEqual(mergedSketches, [
                    {
                        'awg:belongsToComplex': ['awg:Op25'],
                        'awg:precedesScripture': ['awg:M317_Sk2'],
                        'rdfs:label': ['M 317 Sk1 (Verlaufsskizze)'],
                    },
                    { 'awg:precedesContent': ['awg:M317_Sk3'], 'rdfs:label': ['M 317 Sk2'] },
                ]);
            });

            it('... should return no generated precedence where the curated layer states a more specific one', () => {
                const generated = [quad(sk1, precedes, sk2), quad(sk2, precedes, sk3), quad(sk1, precedes, sk3)];

                const merged = mergeLayers(curatedSk1, generated);
                const precedences = merged
                    .filter(q => q.predicate.equals(precedes))
                    .map(q => `${shortenIri(q.subject.value)} ${shortenIri(q.object.value)}`);

                expectToEqual(precedences, ['awg:M317_Sk1 awg:M317_Sk3']);
            });

            it('... should return the union of both layers without duplicates, sorted', () => {
                const generated = [quad(sk3, label, literal('M 317 Sk3')), ...curatedSk1];

                const merged = mergeLayers(curatedSk1, generated);
                const subjects = merged.map(q => shortenIri(q.subject.value));

                expectToEqual(subjects, [
                    'awg:M317_Sk1',
                    'awg:M317_Sk1',
                    'awg:M317_Sk1',
                    'awg:M317_Sk2',
                    'awg:M317_Sk3',
                ]);
            });
        });
    });
});
