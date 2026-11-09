import type { Quad } from '@rdfjs/types';
import { beforeAll, describe, expect, it } from 'vitest';

import { expectToEqual } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';
import { getRdfNode, shortenIri } from '@testing/rdf-generator-helper';

import { collectItems, collectSketches, collectSources } from './rdf-collect.utils';
import { createContext } from './rdf-context.utils';
import { RdfGeneratorContext } from './rdf-generator.model';
import { addGeneticsFacet, RDF_GENETICS_UTILS } from './rdf-genetics.utils';

/**
 * Helper function: createGeneticsContext.
 *
 * It creates the context of the genetics mock input with its sources, items and sketches.
 */
function createGeneticsContext(): RdfGeneratorContext {
    const ctx = createContext(mockRdfGeneratorData.geneticsInput);
    ctx.sources = collectSources(ctx);
    ctx.items = collectItems(ctx);
    ctx.sketches = collectSketches(ctx);
    return ctx;
}

/**
 * Helper function: getEdges.
 *
 * It gets the edges of a predicate as `subject object` strings (prefixed), sorted.
 */
function getEdges(quads: readonly Quad[], predicate: string): string[] {
    return quads
        .filter(q => shortenIri(q.predicate.value) === predicate)
        .map(q => `${shortenIri(q.subject.value)} ${shortenIri(q.object.value)}`)
        .sort();
}

describe('RdfGeneticsUtils (DONE)', () => {
    describe('RDF_GENETICS_UTILS', () => {
        it('... should reference all genetics utils functions', () => {
            expectToEqual(RDF_GENETICS_UTILS, { addGeneticsFacet });
        });
    });

    describe('METHODS', () => {
        describe('#addGeneticsFacet()', () => {
            let ctx: RdfGeneratorContext;
            let quads: Quad[];

            beforeAll(() => {
                ctx = createGeneticsContext();
                addGeneticsFacet(ctx);
                quads = [...ctx.quads.values()];
            });

            it('... should have a method `addGeneticsFacet`', () => {
                expect(addGeneticsFacet).toBeDefined();
            });

            it('... should return a segment with its complex, measures, label and next segment', () => {
                const segment = getRdfNode(quads, 'M317_Sk2b');
                const expectedSegment = {
                    'awg:belongsToComplex': ['awg:M317'],
                    'awg:measures': ['3–4, 5'],
                    'awg:nextSegment': ['awg:M317_Sk2c'],
                    'rdf:type': ['awg:Inscription', 'awg:Sketch', 'awg:SketchSegment'],
                    'rdfs:label': ['M 317 Sk2 T. 3–4, 5'],
                };

                expectToEqual(segment, expectedSegment);
            });

            it('... should return a last segment without measures labelled by its partial letter', () => {
                const segment = getRdfNode(quads, 'M317_Sk2c');
                const expectedSegment = {
                    'awg:belongsToComplex': ['awg:M317'],
                    'awg:precedes': ['awg:M317_Sk3'],
                    'rdf:type': ['awg:Inscription', 'awg:Sketch', 'awg:SketchSegment'],
                    'rdfs:label': ['M 317 Sk2c'],
                };

                expectToEqual(segment, expectedSegment);
            });

            it('... should return the segments of sketches and row tables as parts, without text sheet pages', () => {
                const parts = getEdges(quads, 'dcterms:hasPart');
                const expectedParts = [
                    'awg:M317_Sk2 awg:M317_Sk2a',
                    'awg:M317_Sk2 awg:M317_Sk2b',
                    'awg:M317_Sk2 awg:M317_Sk2c',
                    'awg:M320_Sk1 awg:M320_Sk1a',
                    'awg:M320_Sk1 awg:M320_Sk1c',
                    'awg:M321_Sk1 awg:M321_Sk1a',
                    'awg:Op25_SkRT awg:Op25_SkRTa',
                    'awg:Op25_SkRT awg:Op25_SkRTb',
                ];

                expectToEqual(parts, expectedParts);
            });

            it('... should return the next segment only between directly following partial letters', () => {
                const nextSegments = getEdges(quads, 'awg:nextSegment');
                const expectedNextSegments = [
                    'awg:M317_Sk2a awg:M317_Sk2b',
                    'awg:M317_Sk2b awg:M317_Sk2c',
                    'awg:Op25_SkRTa awg:Op25_SkRTb',
                ];

                expectToEqual(nextSegments, expectedNextSegments);
            });

            it('... should return the concomitance of dotted sub-sketches with their main sketch', () => {
                const concomitances = getEdges(quads, 'awg:concomitates');
                const expectedConcomitances = [
                    'awg:M317_Sk2_1 awg:M317_Sk2',
                    'awg:M317_Sk2_1_1 awg:M317_Sk2_1',
                    'awg:M320_Sk1_1 awg:M320_Sk1',
                ];

                expectToEqual(concomitances, expectedConcomitances);
            });

            it('... should return the precedence of directly numbered sketches and last segments of own M numbers', () => {
                const precedences = getEdges(quads, 'awg:precedes');
                const expectedPrecedences = [
                    'awg:M317_Sk1 awg:M317_Sk2',
                    'awg:M317_Sk2 awg:M317_Sk3',
                    'awg:M317_Sk2c awg:M317_Sk3',
                ];

                expectToEqual(precedences, expectedPrecedences);
            });

            it('... should return a warning for a sub-sketch without main sketch', () => {
                const warnings = ctx.warnings.filter(warning => warning.rule === 'noParentSketch');
                const expectedWarnings = [
                    {
                        complexKey: 'op25',
                        rule: 'noParentSketch',
                        message: 'Sub-sketch M 317 Sk4.2.1 has no main sketch Sk4.2 in the complex.',
                    },
                ];

                expectToEqual(warnings, expectedWarnings);
            });
        });
    });
});
