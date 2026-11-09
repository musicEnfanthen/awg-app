import { beforeEach, describe, expect, it } from 'vitest';

import { expectToEqual } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';

import { collectItems, collectParatexts, collectSources, RDF_COLLECT_UTILS } from './rdf-collect.utils';
import { createContext } from './rdf-context.utils';
import { RdfGeneratorContext, RdfGeneratorInput } from './rdf-generator.model';

const INPUT = mockRdfGeneratorData.input;

/**
 * Helper function: collectAll.
 *
 * It creates a context for the given input and collects sources, items and paratexts.
 */
function collectAll(input: RdfGeneratorInput): RdfGeneratorContext {
    const ctx = createContext(input);
    ctx.sources = collectSources(ctx);
    ctx.items = collectItems(ctx);
    ctx.paratexts = collectParatexts(ctx);
    return ctx;
}

describe('RdfCollectUtils (DONE)', () => {
    describe('RDF_COLLECT_UTILS', () => {
        it('... should reference all collect utils functions', () => {
            expectToEqual(RDF_COLLECT_UTILS, { collectItems, collectParatexts, collectSources });
        });
    });

    describe('METHODS', () => {
        let ctx: RdfGeneratorContext;

        beforeEach(() => {
            ctx = collectAll(INPUT);
        });

        describe('#collectSources()', () => {
            it('... should have a method `collectSources`', () => {
                expect(collectSources).toBeDefined();
            });

            it('... should return the listed sources with their documents', () => {
                const sources = ctx.sources.map(({ base, baseLabel, documentId, fullSiglum, local, type }) => ({
                    base,
                    baseLabel,
                    documentId,
                    fullSiglum,
                    local,
                    type,
                }));
                const expectedSources = [
                    {
                        base: 'awg_doc_0047',
                        baseLabel: 'op. 25 A',
                        documentId: 'awg_doc_0047',
                        fullSiglum: 'A',
                        local: 'Op25_source_A',
                        type: 'Skizzen zu M 317.',
                    },
                    {
                        base: 'awg_doc_0048',
                        baseLabel: 'op. 25 B',
                        documentId: 'awg_doc_0048',
                        fullSiglum: 'B',
                        local: 'Op25_source_B',
                        type: 'Autograph von M 317: Textfassung 1.',
                    },
                ];

                expectToEqual(sources, expectedSources);
            });

            it('... should return the sources without document under their own name, with a warning', () => {
                const withoutDocuments = collectAll({ ...INPUT, documents: [] });
                const bases = withoutDocuments.sources.map(source => source.base);
                const messages = withoutDocuments.warnings
                    .filter(warning => warning.rule === 'noDocument')
                    .map(warning => warning.message);

                expectToEqual(bases, ['Op25_source_A', 'Op25_source_B']);
                expectToEqual(messages, [
                    'Source A has no document in documents.json.',
                    'Source B has no document in documents.json.',
                ]);
            });

            it('... should return the descriptions without list entry and the text sources', () => {
                const partDesc = {
                    id: 'source_Aa',
                    siglum: 'A',
                    siglumAddendum: 'a',
                    type: '',
                    location: '',
                    physDesc: {},
                };
                const textSource = {
                    id: 'Jone_DF',
                    siglum: 'Jone_DF',
                    type: 'Hildegard Jone, Die Freude',
                    location: '',
                };
                const extended = collectAll({
                    ...INPUT,
                    data: {
                        ...INPUT.data,
                        sourceDesc: { sources: [...INPUT.data.sourceDesc.sources, partDesc] },
                        sourceList: { ...INPUT.data.sourceList, textSources: [textSource] },
                    },
                });
                const locals = extended.sources.map(source => source.local);

                expectToEqual(locals, ['Op25_source_A', 'Op25_source_B', 'Op25_source_Aa', 'Op25_source_Jone_DF']);
            });
        });

        describe('#collectItems()', () => {
            it('... should have a method `collectItems`', () => {
                expect(collectItems).toBeDefined();
            });

            it('... should return the sketches, row tables and placeholders with their complexes', () => {
                const items = ctx.items.map(({ complexKey, label, local, type }) => ({
                    complexKey,
                    label,
                    local,
                    type: type.value.replace(/.*#/, ''),
                }));
                const expectedItems = [
                    { complexKey: 'm317', label: 'M 317 Sk1', local: 'M317_Sk1', type: 'Sketch' },
                    { complexKey: 'op25', label: 'M 317 / M 321 RT', local: 'Op25_SkRT', type: 'RowTable' },
                    { complexKey: 'm317', label: 'M 317 Sk2', local: 'M317_Sk2', type: 'Sketch' },
                    { complexKey: undefined, label: 'M 78 Sk## (1)', local: 'M78_SkX_1', type: 'Sketch' },
                    { complexKey: undefined, label: 'M 78 Sk## (2)', local: 'M78_SkX_2', type: 'Sketch' },
                ];

                expectToEqual(items, expectedItems);
            });

            it('... should return the M numbers named by the content items of each source', () => {
                const mnrs = ctx.sources.map(source => [...source.mnrs]);

                expectToEqual(mnrs, [['M317'], ['M317', 'M78']]);
            });

            it('... should return the warnings for placeholders, sketches without complex and empty items', () => {
                const rules = ctx.warnings.map(warning => warning.rule).filter(rule => rule !== 'incompleteDate');

                expectToEqual(rules, ['noComplex', 'placeholder', 'noComplex', 'placeholder', 'emptyItem']);
            });
        });

        describe('#collectParatexts()', () => {
            it('... should have a method `collectParatexts`', () => {
                expect(collectParatexts).toBeDefined();
            });

            it('... should return the paratexts counted per folio and kind, with complex, sketch and date', () => {
                const paratexts = ctx.paratexts.map(({ accompanies, complexKey, folio, label, local, statedDate }) => ({
                    accompanies,
                    complexKey,
                    folio,
                    label,
                    local,
                    statedDate,
                }));
                const expectedParatexts = [
                    {
                        accompanies: undefined,
                        complexKey: 'm317',
                        folio: '38v',
                        label: '„Wie bin ich froh!“',
                        local: 'awg_doc_0047_38v_title_1',
                        statedDate: undefined,
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'm317',
                        folio: '38v',
                        label: 'Datierung: 4. VII. 34',
                        local: 'awg_doc_0047_38v_dating_1',
                        statedDate: '1934-07-04',
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'm317',
                        folio: '38v',
                        label: 'Datierung: M. am 30. IX.',
                        local: 'awg_doc_0047_38v_dating_2',
                        statedDate: undefined,
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'op24',
                        folio: '38v',
                        label: 'Akkoladenstrich',
                        local: 'awg_doc_0047_38v_instrumentation_1',
                        statedDate: undefined,
                    },
                    {
                        accompanies: 'M317_Sk1',
                        complexKey: 'm317',
                        folio: '38v',
                        label: 'Reihe',
                        local: 'awg_doc_0047_38v_annotation_1',
                        statedDate: undefined,
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'm317',
                        folio: '1r',
                        label: 'Datierung: 5. VIII. 34',
                        local: 'awg_doc_0048_1r_dating_1',
                        statedDate: '1934-08-05',
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'op25',
                        folio: '2r',
                        label: 'Datierung: 6. VIII. 34',
                        local: 'awg_doc_0048_2r_dating_1',
                        statedDate: '1934-08-06',
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'op25',
                        folio: '3',
                        label: 'Datierung: 30. II. 34',
                        local: 'awg_doc_0048_3_dating_1',
                        statedDate: undefined,
                    },
                    {
                        accompanies: undefined,
                        complexKey: 'op25',
                        folio: '3',
                        label: '75',
                        local: 'awg_doc_0048_3_pagination_1',
                        statedDate: undefined,
                    },
                ];

                expectToEqual(paratexts, expectedParatexts);
            });

            it('... should return the warnings for datings without complete date', () => {
                const messages = ctx.warnings
                    .filter(warning => warning.rule === 'incompleteDate')
                    .map(warning => warning.message);

                expectToEqual(messages, [
                    'Dating without complete date (source A): M. am 30. IX. auf Bl. 38v unten',
                    'Dating without complete date (source B): 30. II. 34 auf S. 3',
                ]);
            });
        });
    });
});
