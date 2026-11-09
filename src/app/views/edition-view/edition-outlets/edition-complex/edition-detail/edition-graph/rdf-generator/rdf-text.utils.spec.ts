import { describe, expect, it } from 'vitest';

import { expectToBe, expectToEqual } from '@testing/expect-helper';

import type { RdfItemLabel, RdfReference } from './rdf-generator.model';

import {
    decodeEntities,
    parseItemLabel,
    parseParatextText,
    parseReference,
    parseStatedDate,
    RDF_TEXT_UTILS,
    segmentLabel,
    stripHtml,
} from './rdf-text.utils';

describe('RdfTextUtils (DONE)', () => {
    describe('RDF_TEXT_UTILS', () => {
        it('... should reference all text utils functions', () => {
            expectToEqual(RDF_TEXT_UTILS, {
                decodeEntities,
                parseItemLabel,
                parseParatextText,
                parseReference,
                parseStatedDate,
                segmentLabel,
                stripHtml,
            });
        });
    });

    describe('METHODS', () => {
        describe('#decodeEntities()', () => {
            it('... should have a method `decodeEntities`', () => {
                expect(decodeEntities).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    {
                        desc: 'named entities decoded',
                        text: 'J.E. &amp; Co. &lt;1&gt; &quot;a&quot;',
                        expected: 'J.E. & Co. <1> "a"',
                    },
                    {
                        desc: 'a non-breaking space for `&nbsp;`',
                        text: 'op.&nbsp;25',
                        expected: `op.${String.fromCodePoint(0xa0)}25`,
                    },
                    { desc: 'a plain space for `&ngsp;`', text: 'a&ngsp;b', expected: 'a b' },
                    {
                        desc: 'decimal entities decoded',
                        text: '&#123;1A&#125; &#9837;',
                        expected: `{1A} ${String.fromCodePoint(9837)}`,
                    },
                    { desc: 'hexadecimal entities decoded', text: '&#x266F;', expected: String.fromCodePoint(0x266f) },
                    { desc: 'unknown entities unchanged', text: '&unknown;', expected: '&unknown;' },
                    { desc: 'invalid code points unchanged', text: '&#x110000;', expected: '&#x110000;' },
                ])('... $desc', ({ text, expected }) => {
                    const result = decodeEntities(text);

                    expectToBe(result, expected);
                });
            });
        });

        describe('#stripHtml()', () => {
            it('... should have a method `stripHtml`', () => {
                expect(stripHtml).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    { desc: 'an empty string for undefined', html: undefined, expected: '' },
                    {
                        desc: 'the text without tags',
                        html: '<em>Drei Lieder</em> op. 25',
                        expected: 'Drei Lieder op. 25',
                    },
                    { desc: 'spaces for line breaks', html: 'Reihen<br />Trio', expected: 'Reihen Trio' },
                    { desc: 'spaces for snippet placeholders', html: 'Papier##JE##mit', expected: 'Papier mit' },
                    {
                        desc: 'collapsed whitespace with decoded entities',
                        html: '  op.&nbsp;25 \n A ',
                        expected: 'op. 25 A',
                    },
                ])('... $desc', ({ html, expected }) => {
                    const result = stripHtml(html);

                    expectToBe(result, expected);
                });
            });
        });

        describe('#parseItemLabel()', () => {
            it('... should have a method `parseItemLabel`', () => {
                expect(parseItemLabel).toBeDefined();
            });

            describe('... should return', () => {
                it.each<{ desc: string; label: string; expected: RdfItemLabel }>([
                    {
                        desc: 'a sketch',
                        label: 'M 317 Sk2.1',
                        expected: { kind: 'sketch', prefix: 'M', number: '317', sketchNumber: '2.1' },
                    },
                    {
                        desc: 'a sketch of an M* number',
                        label: 'M* 411 Sk1',
                        expected: { kind: 'sketch', prefix: 'M*', number: '411', sketchNumber: '1' },
                    },
                    {
                        desc: 'a sketch of a combined M number',
                        label: 'M 35/42 Sk1.1',
                        expected: { kind: 'sketch', prefix: 'M', number: '35/42', sketchNumber: '1.1' },
                    },
                    {
                        desc: 'a placeholder',
                        label: 'M 78 Sk##',
                        expected: { kind: 'placeholder', prefix: 'M', number: '78' },
                    },
                    {
                        desc: 'a three-digit placeholder',
                        label: 'M 78 Sk###',
                        expected: { kind: 'placeholder', prefix: 'M', number: '78' },
                    },
                    { desc: 'a whole M number', label: 'M 112', expected: { kind: 'mnr', prefix: 'M', number: '112' } },
                    { desc: 'a row table', label: 'M 317 / M321 / M 322 RT', expected: { kind: 'rowTable' } },
                    { desc: 'empty for an empty label', label: '', expected: { kind: 'empty' } },
                    { desc: 'unknown for other labels', label: 'Skizzen', expected: { kind: 'unknown' } },
                ])('... $desc', ({ label, expected }) => {
                    const result = parseItemLabel(label);

                    expectToEqual(result, expected);
                });
            });
        });

        describe('#parseParatextText()', () => {
            it('... should have a method `parseParatextText`', () => {
                expect(parseParatextText).toBeDefined();
            });

            describe('... should return', () => {
                it.each([
                    {
                        desc: 'wording, folio and reference after the position',
                        text: '8. X. 34 auf Bl. 7v System 12–13 (zu M 321 Sk8 T. 21B–26B)',
                        expected: {
                            content: '8. X. 34',
                            folio: '7v',
                            isPage: false,
                            reference: 'M 321 Sk8 T. 21B–26B',
                        },
                    },
                    {
                        desc: 'wording, folio and reference before the position',
                        text: 'Taktzahl 52 (zu op. 24/1) auf Bl. 39r oben links mit schwarzem Buntstift',
                        expected: { content: 'Taktzahl 52', folio: '39r', isPage: false, reference: 'op. 24/1' },
                    },
                    {
                        desc: 'the page as folio',
                        text: '75 auf S. 3 oben rechts',
                        expected: { content: '75', folio: '3', isPage: true },
                    },
                    {
                        desc: 'only the wording without position',
                        text: 'siehe Titel',
                        expected: { content: 'siehe Titel', isPage: false },
                    },
                ])('... $desc', ({ text, expected }) => {
                    const result = parseParatextText(text);

                    expectToEqual(result, expected);
                });
            });
        });

        describe('#parseReference()', () => {
            it('... should have a method `parseReference`', () => {
                expect(parseReference).toBeDefined();
            });

            describe('... should return', () => {
                it.each<{ desc: string; reference: string; expected: RdfReference | null }>([
                    {
                        desc: 'a sketch with M number',
                        reference: 'M 321 Sk8 T. 21B–26B',
                        expected: { kind: 'sketch', prefix: 'M', number: '321', sketchNumber: '8' },
                    },
                    {
                        desc: 'a sub-sketch with M number',
                        reference: 'M 317 Sk3.1.3',
                        expected: { kind: 'sketch', prefix: 'M', number: '317', sketchNumber: '3.1.3' },
                    },
                    {
                        desc: 'a sketch without M number',
                        reference: 'Sk1',
                        expected: { kind: 'sketch', sketchNumber: '1' },
                    },
                    { desc: 'an opus', reference: 'op. 24/1', expected: { kind: 'opus', number: '24' } },
                    { desc: 'null for other references', reference: 'T. 12', expected: null },
                ])('... $desc', ({ reference, expected }) => {
                    const result = parseReference(reference);

                    expectToEqual(result, expected);
                });
            });
        });

        describe('#parseStatedDate()', () => {
            it('... should have a method `parseStatedDate`', () => {
                expect(parseStatedDate).toBeDefined();
            });

            describe('... should return the date of', () => {
                it.each([
                    { desc: 'a two-digit year', text: '4. VII. 34', expected: '1934-07-04' },
                    { desc: 'a four-digit year', text: '13. I. 1915', expected: '1915-01-13' },
                    { desc: 'editorial points', text: '31[.] I[.] 1915', expected: '1915-01-31' },
                    { desc: 'a place before the date', text: 'Maria Enzersdorf | 14. VII. 33', expected: '1933-07-14' },
                    { desc: 'a final dating', text: '15. XI[.] 34', expected: '1934-11-15' },
                ])('... $desc', ({ text, expected }) => {
                    const result = parseStatedDate(text);

                    expectToBe(result, expected);
                });
            });

            describe('... should return null for', () => {
                it.each([
                    { desc: 'a date without year', text: 'M. am 30. IX. nach Zürich abgereist.' },
                    { desc: 'a date without day', text: '[x]. IV. 33.' },
                    { desc: 'a year only', text: '1925/26' },
                    { desc: 'a corrected date', text: '9[→10.] IV. 1917 | Wien' },
                    {
                        desc: 'several dates',
                        text: '34 M. am 9[.] XII. aus Z. | M. am 10. I. 35 operiert | 21. I. erkrankt',
                    },
                    { desc: 'a reference', text: 'siehe Titel' },
                    { desc: 'an impossible date', text: '30. II. 34' },
                ])('... $desc', ({ text }) => {
                    const result = parseStatedDate(text);

                    expectToBe(result, null);
                });
            });
        });

        describe('#segmentLabel()', () => {
            it('... should have a method `segmentLabel`', () => {
                expect(segmentLabel).toBeDefined();
            });

            describe('... should return the label of a segment', () => {
                it.each([
                    { desc: 'with its measures', measures: '1A–3A', expected: 'M 317 Sk4 T. 1A–3A' },
                    { desc: 'with its partial letter without measures', measures: '', expected: 'M 317 Sk4a' },
                ])('... $desc', ({ measures, expected }) => {
                    const label = segmentLabel('M 317 Sk4', 'a', measures);

                    expectToBe(label, expected);
                });
            });
        });
    });
});
