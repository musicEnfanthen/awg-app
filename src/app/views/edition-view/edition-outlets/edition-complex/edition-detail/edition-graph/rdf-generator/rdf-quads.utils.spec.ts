import { DataFactory, Parser } from 'n3';
import { describe, expect, it } from 'vitest';

import { expectToBe, expectToEqual } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';

import { generateComplexGraph } from './rdf-generator.utils';
import { quadKey, RDF_QUADS_UTILS, serializeTurtle, sortQuads } from './rdf-quads.utils';

const { literal, namedNode, quad } = DataFactory;

const AWG = 'https://edition.anton-webern.ch/webern-onto#';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';

describe('RdfQuadsUtils (DONE)', () => {
    describe('RDF_QUADS_UTILS', () => {
        it('... should reference all quad utils functions', () => {
            expectToEqual(RDF_QUADS_UTILS, { quadKey, serializeTurtle, sortQuads });
        });
    });

    describe('METHODS', () => {
        describe('#quadKey()', () => {
            it('... should have a method `quadKey`', () => {
                expect(quadKey).toBeDefined();
            });

            it('... should return subject, predicate and the key of the object', () => {
                const labelQuad = quad(namedNode(`${AWG}M317`), namedNode(RDFS_LABEL), literal('M 317'));

                const key = quadKey(labelQuad);

                expectToBe(key, `${AWG}M317 ${RDFS_LABEL} "M 317"`);
            });
        });

        describe('#sortQuads()', () => {
            it('... should have a method `sortQuads`', () => {
                expect(sortQuads).toBeDefined();
            });

            it('... should return the quads sorted by subject, predicate and object', () => {
                const label = namedNode(RDFS_LABEL);
                const sketch2 = quad(namedNode(`${AWG}M317_Sk2`), label, literal('M 317 Sk2'));
                const sketch1b = quad(namedNode(`${AWG}M317_Sk1`), label, literal('b'));
                const sketch1a = quad(namedNode(`${AWG}M317_Sk1`), label, literal('a'));

                const sorted = sortQuads([sketch2, sketch1b, sketch1a]);

                expectToEqual(sorted, [sketch1a, sketch1b, sketch2]);
            });
        });

        describe('#serializeTurtle()', () => {
            it('... should have a method `serializeTurtle`', () => {
                expect(serializeTurtle).toBeDefined();
            });

            it('... should return Turtle with header and prefixes that parses to the same quads', async () => {
                const { quads } = generateComplexGraph(mockRdfGeneratorData.input);

                const turtle = await serializeTurtle(quads, '# Generated\n');
                const firstLines = turtle.split('\n').slice(0, 2);
                const parsed = new Parser().parse(turtle);

                expectToEqual(firstLines, ['# Generated', `@prefix awg: <${AWG}>.`]);
                expectToBe(parsed.length, quads.length);
            });
        });
    });
});
