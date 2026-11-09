import { DataFactory } from 'n3';
import { describe, expect, it } from 'vitest';

import { expectToBe, expectToEqual } from './expect-helper';
import { getRdfNode, shortenIri } from './rdf-generator-helper';

const { literal, namedNode, quad } = DataFactory;

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

describe('RdfGeneratorHelper (DONE)', () => {
    describe('#shortenIri()', () => {
        it('... should have a method `shortenIri`', () => {
            expect(shortenIri).toBeDefined();
        });

        describe('... should return', () => {
            it.each([
                { desc: 'an AWG IRI as prefixed name', value: `${AWG}M317`, expected: 'awg:M317' },
                {
                    desc: 'a DCMI IRI as prefixed name',
                    value: 'http://purl.org/dc/terms/title',
                    expected: 'dcterms:title',
                },
                {
                    desc: 'an RDF IRI as prefixed name',
                    value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                    expected: 'rdf:type',
                },
                {
                    desc: 'an RDFS IRI as prefixed name',
                    value: 'http://www.w3.org/2000/01/rdf-schema#label',
                    expected: 'rdfs:label',
                },
                { desc: 'other values unchanged', value: 'M 317 Sk1', expected: 'M 317 Sk1' },
            ])('... $desc', ({ value, expected }) => {
                const result = shortenIri(value);

                expectToBe(result, expected);
            });
        });
    });

    describe('#getRdfNode()', () => {
        const sketch = namedNode(`${AWG}M317_Sk1`);
        const type = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
        const label = namedNode('http://www.w3.org/2000/01/rdf-schema#label');
        const quads = [
            quad(sketch, type, namedNode(`${AWG}Sketch`)),
            quad(sketch, type, namedNode(`${AWG}Inscription`)),
            quad(sketch, label, literal('M 317 Sk1')),
            quad(namedNode(`${AWG}M317_Sk2`), label, literal('M 317 Sk2')),
        ];

        it('... should have a method `getRdfNode`', () => {
            expect(getRdfNode).toBeDefined();
        });

        it('... should return the sorted values of the node by prefixed predicate', () => {
            const node = getRdfNode(quads, 'M317_Sk1');

            expectToEqual(node, { 'rdf:type': ['awg:Inscription', 'awg:Sketch'], 'rdfs:label': ['M 317 Sk1'] });
        });

        it('... should return an empty object for an unknown node', () => {
            const node = getRdfNode(quads, 'M317_Sk3');

            expectToEqual(node, {});
        });
    });
});
