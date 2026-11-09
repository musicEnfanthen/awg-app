import { describe, expect, it } from 'vitest';

import { expectToBe, expectToEqual } from '@testing/expect-helper';

import {
    complexKeyOfMnr,
    complexLocal,
    complexPartLocal,
    editedLocal,
    folioLocal,
    mnrLocal,
    paratextLocal,
    placeholderSketchLocal,
    placementLocal,
    RDF_IRI_UTILS,
    rowTableLocal,
    sectionLocal,
    segmentLetter,
    segmentLocal,
    seriesLocal,
    sheetLocal,
    sketchLocal,
    slug,
    sourceLocal,
    textVersionLocal,
} from './rdf-iri.utils';

describe('RdfIriUtils (DONE)', () => {
    describe('RDF_IRI_UTILS', () => {
        it('... should reference all IRI utils functions', () => {
            expectToEqual(RDF_IRI_UTILS, {
                complexKeyOfMnr,
                complexLocal,
                complexPartLocal,
                editedLocal,
                folioLocal,
                mnrLocal,
                paratextLocal,
                placeholderSketchLocal,
                placementLocal,
                rowTableLocal,
                sectionLocal,
                segmentLetter,
                segmentLocal,
                seriesLocal,
                sheetLocal,
                sketchLocal,
                slug,
                sourceLocal,
                textVersionLocal,
            });
        });
    });

    describe('METHODS', () => {
        describe('#slug()', () => {
            it('... should have a method `slug`', () => {
                expect(slug).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    { desc: 'letters, digits and hyphens unchanged', text: 'M317_Sk1-a', expected: 'M317_Sk1-a' },
                    { desc: 'other characters as underscores', text: 'F1–F2 (Kopie)', expected: 'F1_F2_Kopie' },
                    { desc: 'letters without diacritics', text: 'Schlüssel', expected: 'Schlussel' },
                ])('... $desc', ({ text, expected }) => {
                    const result = slug(text);

                    expectToBe(result, expected);
                });
            });
        });

        describe('#complexLocal()', () => {
            it('... should have a method `complexLocal`', () => {
                expect(complexLocal).toBeDefined();
            });

            describe('... should return the capitalized key for', () => {
                it.each([
                    { desc: 'an opus', key: 'op25', expected: 'Op25' },
                    { desc: 'an M number', key: 'm317', expected: 'M317' },
                    { desc: 'an M* number', key: 'mx409', expected: 'Mx409' },
                    { desc: 'a combined M number', key: 'm35_42', expected: 'M35_42' },
                ])('... $desc', ({ key, expected }) => {
                    const result = complexLocal(key);

                    expectToBe(result, expected);
                });
            });
        });

        describe('#mnrLocal()', () => {
            it('... should have a method `mnrLocal`', () => {
                expect(mnrLocal).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    { desc: 'M for an M number', prefix: 'M', number: '317', expected: 'M317' },
                    { desc: 'Mx for an M* number', prefix: 'M*', number: '409', expected: 'Mx409' },
                    { desc: 'an underscore for a slash', prefix: 'M', number: '35/42', expected: 'M35_42' },
                ])('... $desc', ({ prefix, number, expected }) => {
                    const result = mnrLocal(prefix, number);

                    expectToBe(result, expected);
                });
            });
        });

        describe('#complexKeyOfMnr()', () => {
            it('... should have a method `complexKeyOfMnr`', () => {
                expect(complexKeyOfMnr).toBeDefined();
            });

            it.each([
                { mnr: 'M317', expected: 'm317' },
                { mnr: 'Mx409', expected: 'mx409' },
            ])('... should return `$expected` for `$mnr`', ({ mnr, expected }) => {
                const result = complexKeyOfMnr(mnr);

                expectToBe(result, expected);
            });
        });

        describe('#sketchLocal()', () => {
            it('... should have a method `sketchLocal`', () => {
                expect(sketchLocal).toBeDefined();
            });

            it.each([
                { sketchNumber: '1', expected: 'M317_Sk1' },
                { sketchNumber: '2.1.2.1', expected: 'M317_Sk2_1_2_1' },
            ])('... should return `$expected` for sketch number `$sketchNumber`', ({ sketchNumber, expected }) => {
                const result = sketchLocal('M317', sketchNumber);

                expectToBe(result, expected);
            });
        });

        describe('#placeholderSketchLocal()', () => {
            it('... should have a method `placeholderSketchLocal`', () => {
                expect(placeholderSketchLocal).toBeDefined();
            });

            it('... should return the M number with SkX and the counter', () => {
                const result = placeholderSketchLocal('M78', 3);

                expectToBe(result, 'M78_SkX_3');
            });
        });

        describe('#rowTableLocal()', () => {
            it('... should have a method `rowTableLocal`', () => {
                expect(rowTableLocal).toBeDefined();
            });

            it('... should return the complex with SkRT', () => {
                const result = rowTableLocal('Op25');

                expectToBe(result, 'Op25_SkRT');
            });
        });

        describe('#segmentLocal()', () => {
            it('... should have a method `segmentLocal`', () => {
                expect(segmentLocal).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    { desc: 'a sketch segment', sketch: 'M317_Sk4', expected: 'M317_Sk4a' },
                    { desc: 'a row table segment', sketch: 'Op24_SkRT', expected: 'Op24_SkRTa' },
                ])('... $desc', ({ sketch, expected }) => {
                    const result = segmentLocal(sketch, 'a');

                    expectToBe(result, expected);
                });
            });
        });

        describe('#segmentLetter()', () => {
            it('... should have a method `segmentLetter`', () => {
                expect(segmentLetter).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    { desc: 'the letter of a sketch segment', sketch: 'M317_Sk4', local: 'M317_Sk4a', expected: 'a' },
                    {
                        desc: 'the letter of a row table segment',
                        sketch: 'Op24_SkRT',
                        local: 'Op24_SkRTb',
                        expected: 'b',
                    },
                    {
                        desc: 'undefined for the sketch itself',
                        sketch: 'M317_Sk4',
                        local: 'M317_Sk4',
                        expected: undefined,
                    },
                    {
                        desc: 'undefined for a sub-sketch',
                        sketch: 'M317_Sk4',
                        local: 'M317_Sk4_1',
                        expected: undefined,
                    },
                    {
                        desc: 'undefined for a higher number',
                        sketch: 'M112_Sk1',
                        local: 'M112_Sk10a',
                        expected: undefined,
                    },
                    {
                        desc: 'undefined for another sketch',
                        sketch: 'M317_Sk4',
                        local: 'M322_Sk3a',
                        expected: undefined,
                    },
                ])('... $desc', ({ sketch, local, expected }) => {
                    const result = segmentLetter(sketch, local);

                    expect(result).toBe(expected);
                });
            });
        });

        describe('#editedLocal()', () => {
            it('... should have a method `editedLocal`', () => {
                expect(editedLocal).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    { desc: 'the id of a sketch sheet', sheetId: 'M317_Sk1', expected: 'M317_Sk1' },
                    { desc: 'the id of a text sheet', sheetId: 'M317_TF1', expected: 'M317_TF1' },
                    { desc: 'the row table with the complex', sheetId: 'SkRT', expected: 'Op25_SkRT' },
                    { desc: 'a row table segment with the complex', sheetId: 'SkRTa', expected: 'Op25_SkRTa' },
                ])('... $desc', ({ sheetId, expected }) => {
                    const result = editedLocal('Op25', sheetId);

                    expectToBe(result, expected);
                });
            });
        });

        describe('#sheetLocal()', () => {
            it('... should have a method `sheetLocal`', () => {
                expect(sheetLocal).toBeDefined();
            });

            it('... should return the edited local name with `_Sheet`', () => {
                const result = sheetLocal('M317_Sk1');

                expectToBe(result, 'M317_Sk1_Sheet');
            });
        });

        describe('#textVersionLocal()', () => {
            it('... should have a method `textVersionLocal`', () => {
                expect(textVersionLocal).toBeDefined();
            });

            it.each([
                { textVersion: '2', expected: 'M317_TF2' },
                { textVersion: 'einzige', expected: 'M317_TF1' },
            ])('... should return `$expected` for text version `$textVersion`', ({ textVersion, expected }) => {
                const result = textVersionLocal('M317', textVersion);

                expectToBe(result, expected);
            });
        });

        describe('#complexPartLocal()', () => {
            it('... should have a method `complexPartLocal`', () => {
                expect(complexPartLocal).toBeDefined();
            });

            it('... should return the complex with the part number', () => {
                const result = complexPartLocal('Op25', 2);

                expectToBe(result, 'Op25_part_2');
            });
        });

        describe('#seriesLocal()', () => {
            it('... should have a method `seriesLocal`', () => {
                expect(seriesLocal).toBeDefined();
            });

            it('... should return the series route', () => {
                const result = seriesLocal('1');

                expectToBe(result, 'Series_1');
            });
        });

        describe('#sectionLocal()', () => {
            it('... should have a method `sectionLocal`', () => {
                expect(sectionLocal).toBeDefined();
            });

            it('... should return the series and section routes', () => {
                const result = sectionLocal('2', '2a');

                expectToBe(result, 'Section_2_2a');
            });
        });

        describe('#sourceLocal()', () => {
            it('... should have a method `sourceLocal`', () => {
                expect(sourceLocal).toBeDefined();
            });

            it.each([
                { fullSiglum: 'A', expected: 'Op25_source_A' },
                { fullSiglum: 'EF1–F2', expected: 'Op25_source_EF1_F2' },
            ])('... should return `$expected` for siglum `$fullSiglum`', ({ fullSiglum, expected }) => {
                const result = sourceLocal('Op25', fullSiglum);

                expectToBe(result, expected);
            });
        });

        describe('#folioLocal()', () => {
            it('... should have a method `folioLocal`', () => {
                expect(folioLocal).toBeDefined();
            });

            it('... should return the document with the folio', () => {
                const result = folioLocal('awg_doc_0047', '38v');

                expectToBe(result, 'awg_doc_0047_38v');
            });
        });

        describe('#placementLocal()', () => {
            it('... should have a method `placementLocal`', () => {
                expect(placementLocal).toBeDefined();
            });

            it('... should return the inscription with `_place_` and the folio', () => {
                const result = placementLocal('M317_Sk1', 'awg_doc_0047_38v');

                expectToBe(result, 'M317_Sk1_place_awg_doc_0047_38v');
            });
        });

        describe('#paratextLocal()', () => {
            it('... should have a method `paratextLocal`', () => {
                expect(paratextLocal).toBeDefined();
            });

            it('... should return the folio with kind and counter', () => {
                const result = paratextLocal('awg_doc_0050_7v', 'dating', 2);

                expectToBe(result, 'awg_doc_0050_7v_dating_2');
            });
        });
    });
});
