import { DataFactory } from 'n3';
import { beforeEach, describe, expect, it } from 'vitest';

import { expectToBe, expectToEqual } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';
import { getRdfNode } from '@testing/rdf-generator-helper';

import {
    add,
    addLabel,
    addTypes,
    complexEntry,
    complexIri,
    complexLabel,
    createContext,
    documentLabel,
    getOrCreate,
    has,
    knownComplexKey,
    nextCount,
    onlyValue,
    RDF_CONTEXT_UTILS,
    warn,
} from './rdf-context.utils';
import { RdfGeneratorContext } from './rdf-generator.model';
import { AWG_CLASSES, awg } from './rdf-vocab';

const { literal } = DataFactory;

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

describe('RdfContextUtils (DONE)', () => {
    let ctx: RdfGeneratorContext;

    beforeEach(() => {
        ctx = createContext(mockRdfGeneratorData.input);
    });

    describe('RDF_CONTEXT_UTILS', () => {
        it('... should reference all context utils functions', () => {
            expectToEqual(RDF_CONTEXT_UTILS, {
                add,
                addLabel,
                addTypes,
                complexEntry,
                complexIri,
                complexLabel,
                createContext,
                documentLabel,
                getOrCreate,
                has,
                knownComplexKey,
                nextCount,
                onlyValue,
                warn,
            });
        });
    });

    describe('METHODS', () => {
        describe('#createContext()', () => {
            it('... should have a method `createContext`', () => {
                expect(createContext).toBeDefined();
            });

            it('... should return the context with the complex, all facets and the document lookups', () => {
                const lookups = {
                    complexLocal: ctx.complexLocal,
                    documentsById: [...ctx.documentsById.keys()],
                    documentsByUse: [...ctx.documentsByUse.keys()],
                    facets: [...ctx.facets],
                };
                const expectedLookups = {
                    complexLocal: 'Op25',
                    documentsById: ['awg_doc_0047', 'awg_doc_0048'],
                    documentsByUse: ['op25:A', 'op25:B'],
                    facets: ['edition', 'documents', 'folios', 'editions', 'references'],
                };

                expectToEqual(lookups, expectedLookups);
            });

            it('... should return the context with the given facets', () => {
                const editionContext = createContext({ ...mockRdfGeneratorData.input, facets: new Set(['edition']) });

                expectToEqual([...editionContext.facets], ['edition']);
            });

            it('... should return the context without quads, warnings and collected entries', () => {
                const state = {
                    items: ctx.items,
                    paratexts: ctx.paratexts,
                    quads: ctx.quads.size,
                    referencedComplexes: ctx.referencedComplexes.size,
                    sources: ctx.sources,
                    warnings: ctx.warnings,
                };

                expectToEqual(state, {
                    items: [],
                    paratexts: [],
                    quads: 0,
                    referencedComplexes: 0,
                    sources: [],
                    warnings: [],
                });
            });
        });

        describe('#add()', () => {
            it('... should have a method `add`', () => {
                expect(add).toBeDefined();
            });

            it('... should add a quad once', () => {
                const label = awg('label');

                add(ctx, awg('M317'), label, literal('M 317'));
                add(ctx, awg('M317'), label, literal('M 317'));

                expectToBe(ctx.quads.size, 1);
            });

            it('... should do nothing for a missing object or an empty literal', () => {
                add(ctx, awg('M317'), awg('label'), undefined);
                add(ctx, awg('M317'), awg('label'), literal(''));

                expectToBe(ctx.quads.size, 0);
            });
        });

        describe('#addTypes()', () => {
            it('... should have a method `addTypes`', () => {
                expect(addTypes).toBeDefined();
            });

            it('... should add the class with all its superclasses', () => {
                addTypes(ctx, awg('Op25_SkRT'), AWG_CLASSES.rowTable);
                const node = getRdfNode([...ctx.quads.values()], 'Op25_SkRT');

                expectToEqual(node, { 'rdf:type': ['awg:Inscription', 'awg:RowTable', 'awg:Sketch'] });
            });
        });

        describe('#addLabel()', () => {
            it('... should have a method `addLabel`', () => {
                expect(addLabel).toBeDefined();
            });

            it('... should add a plain label', () => {
                addLabel(ctx, awg('M317'), 'M 317');
                const node = getRdfNode([...ctx.quads.values()], 'M317');

                expectToEqual(node, { 'rdfs:label': ['M 317'] });
            });
        });

        describe('#warn()', () => {
            it('... should have a method `warn`', () => {
                expect(warn).toBeDefined();
            });

            it('... should add a warning for the complex', () => {
                warn(ctx, 'placeholder', 'Placeholder M 78 Sk##');

                expectToEqual(ctx.warnings, [
                    { complexKey: 'op25', rule: 'placeholder', message: 'Placeholder M 78 Sk##' },
                ]);
            });
        });

        describe('#has()', () => {
            it('... should have a method `has`', () => {
                expect(has).toBeDefined();
            });

            it.each([
                { facets: undefined, expected: true },
                { facets: new Set(['edition'] as const), expected: false },
            ])('... should return $expected for facet documents with facets $facets', ({ facets, expected }) => {
                const facetContext = createContext({ ...mockRdfGeneratorData.input, facets });

                const result = has(facetContext, 'documents');

                expectToBe(result, expected);
            });
        });

        describe('#getOrCreate()', () => {
            it('... should have a method `getOrCreate`', () => {
                expect(getOrCreate).toBeDefined();
            });

            it('... should return the stored value of an existing key', () => {
                const stored = new Set(['op25']);
                const map = new Map([['38v', stored]]);

                const value = getOrCreate(map, '38v', () => new Set<string>());

                expectToBe(value, stored);
            });

            it('... should return and store a created value for a missing key', () => {
                const map = new Map<string, Set<string>>();

                const value = getOrCreate(map, '38v', () => new Set<string>());
                const stored = map.get('38v');

                expectToBe(stored, value);
            });
        });

        describe('#nextCount()', () => {
            it('... should have a method `nextCount`', () => {
                expect(nextCount).toBeDefined();
            });

            it('... should return the counter of a key starting at 1', () => {
                const counters = new Map<string, number>();

                const counts = [nextCount(counters, 'M78'), nextCount(counters, 'M78'), nextCount(counters, 'M66')];

                expectToEqual(counts, [1, 2, 1]);
            });
        });

        describe('#onlyValue()', () => {
            it('... should have a method `onlyValue`', () => {
                expect(onlyValue).toBeDefined();
            });

            it.each([
                { desc: 'the value of a set with one value', values: new Set(['M317']), expected: 'M317' },
                {
                    desc: 'undefined for a set with several values',
                    values: new Set(['M317', 'M78']),
                    expected: undefined,
                },
                { desc: 'undefined for an empty set', values: new Set<string>(), expected: undefined },
                { desc: 'undefined for a missing set', values: undefined, expected: undefined },
            ])('... should return $desc', ({ values, expected }) => {
                const result = onlyValue(values);

                expect(result).toBe(expected);
            });
        });

        describe('#complexEntry()', () => {
            it('... should have a method `complexEntry`', () => {
                expect(complexEntry).toBeDefined();
            });

            it('... should return the registry entry of a complex', () => {
                const entry = complexEntry(ctx, 'm317');

                expectToBe(entry, mockRdfGeneratorData.complexes['m317']);
            });
        });

        describe('#complexLabel()', () => {
            it('... should have a method `complexLabel`', () => {
                expect(complexLabel).toBeDefined();
            });

            it.each([
                { complexKey: 'op25', expected: 'op. 25' },
                { complexKey: 'm317', expected: 'M 317' },
                { complexKey: 'm999', expected: 'm999' },
            ])('... should return `$expected` for `$complexKey`', ({ complexKey, expected }) => {
                const label = complexLabel(ctx, complexKey);

                expectToBe(label, expected);
            });
        });

        describe('#knownComplexKey()', () => {
            it('... should have a method `knownComplexKey`', () => {
                expect(knownComplexKey).toBeDefined();
            });

            it.each([
                { complexKey: 'm317', expected: 'm317' },
                { complexKey: 'm320', expected: undefined },
                { complexKey: undefined, expected: undefined },
            ])('... should return $expected for $complexKey', ({ complexKey, expected }) => {
                const result = knownComplexKey(ctx, complexKey);

                expect(result).toBe(expected);
            });
        });

        describe('#complexIri()', () => {
            it('... should have a method `complexIri`', () => {
                expect(complexIri).toBeDefined();
            });

            it('... should return the IRI of the complex and record it as referenced', () => {
                const iri = complexIri(ctx, 'op24');

                expectToBe(iri.value, `${AWG}Op24`);
                expectToEqual([...ctx.referencedComplexes], ['op24']);
            });
        });

        describe('#documentLabel()', () => {
            it('... should have a method `documentLabel`', () => {
                expect(documentLabel).toBeDefined();
            });

            it.each([
                { desc: 'the source of one complex', usedBy: [{ complex: 'op25', siglum: 'A' }], expected: 'op. 25 A' },
                {
                    desc: 'the sources of several complexes',
                    usedBy: [
                        { complex: 'op24', siglum: 'B' },
                        { complex: 'op25', siglum: 'C' },
                    ],
                    expected: 'op. 24 B = op. 25 C',
                },
                { desc: 'the id without sources', usedBy: [], expected: 'awg_doc_0099' },
            ])('... should return $desc', ({ usedBy, expected }) => {
                const label = documentLabel(ctx, { id: 'awg_doc_0099', usedBy });

                expectToBe(label, expected);
            });
        });
    });
});
