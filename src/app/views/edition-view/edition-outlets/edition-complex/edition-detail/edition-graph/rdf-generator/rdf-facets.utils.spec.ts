import type { Quad } from '@rdfjs/types';
import { beforeAll, describe, expect, it } from 'vitest';

import { expectToEqual } from '@testing/expect-helper';
import { mockRdfGeneratorData } from '@testing/mock-data';
import { getRdfNode, shortenIri } from '@testing/rdf-generator-helper';

import { collectItems, collectParatexts, collectSketches, collectSources } from './rdf-collect.utils';
import { createContext } from './rdf-context.utils';
import {
    addDocumentsFacet,
    addEditionFacet,
    addEditionsFacet,
    addFoliosFacet,
    addReferencesFacet,
    RDF_FACETS_UTILS,
} from './rdf-facets.utils';
import { RdfGeneratorContext, RdfGeneratorInput } from './rdf-generator.model';

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

/**
 * Helper function: generateFacetQuads.
 *
 * It collects the mock input (by default the input of the facets) and adds a single facet.
 */
function generateFacetQuads(
    addFacet: (ctx: RdfGeneratorContext) => void,
    input: RdfGeneratorInput = mockRdfGeneratorData.input
): Quad[] {
    const ctx = createContext(input);
    ctx.sources = collectSources(ctx);
    ctx.items = collectItems(ctx);
    ctx.sketches = collectSketches(ctx);
    ctx.paratexts = collectParatexts(ctx);
    addFacet(ctx);
    return [...ctx.quads.values()];
}

describe('RdfFacetsUtils (DONE)', () => {
    describe('RDF_FACETS_UTILS', () => {
        it('... should reference all facet utils functions', () => {
            expectToEqual(RDF_FACETS_UTILS, {
                addDocumentsFacet,
                addEditionFacet,
                addEditionsFacet,
                addFoliosFacet,
                addReferencesFacet,
            });
        });
    });

    describe('METHODS', () => {
        describe('#addEditionFacet()', () => {
            let quads: Quad[];

            beforeAll(() => {
                quads = generateFacetQuads(addEditionFacet);
            });

            it('... should have a method `addEditionFacet`', () => {
                expect(addEditionFacet).toBeDefined();
            });

            it('... should return only the complex, its parts and the edition structure', () => {
                const subjects = [...new Set(quads.map(q => shortenIri(q.subject.value)))].sort();
                const expectedSubjects = [
                    'awg:AWG',
                    'awg:M317',
                    'awg:M317_TF2',
                    'awg:Op25',
                    'awg:Op25_part_1',
                    'awg:Section_1_5',
                    'awg:Series_1',
                ];

                expectToEqual(subjects, expectedSubjects);
            });

            it('... should return the composite complex with its catalogue data, section and parts', () => {
                const complex = getRdfNode(quads, 'Op25');
                const expectedComplex = {
                    'awg:catalogueNumber': ['25'],
                    'awg:catalogueType': ['awg:catalogueType_OPUS'],
                    'dcterms:hasPart': ['awg:M317'],
                    'dcterms:isPartOf': ['awg:Section_1_5'],
                    'dcterms:title': ['Drei Lieder'],
                    'rdf:type': ['awg:CompositeEditionComplex', 'awg:EditionComplex'],
                    'rdfs:label': ['op. 25'],
                };

                expectToEqual(complex, expectedComplex);
            });

            it('... should return the part position with the text version of the work edition', () => {
                const part = getRdfNode(quads, 'Op25_part_1');
                const expectedPart = {
                    'awg:partComplex': ['awg:M317'],
                    'awg:partNumber': ['1'],
                    'awg:partOfComplex': ['awg:Op25'],
                    'awg:workEditionTextVersion': ['awg:M317_TF2'],
                    'rdf:type': ['awg:ComplexPart'],
                    'rdfs:label': ['op. 25, Teil 1: M 317'],
                };

                expectToEqual(part, expectedPart);
            });

            it('... should return the text version of the work edition with its complex', () => {
                const textVersion = getRdfNode(quads, 'M317_TF2');

                expectToEqual(textVersion, { 'awg:belongsToComplex': ['awg:M317'], 'rdf:type': ['awg:TextVersion'] });
            });

            it('... should return the section, series and complete edition', () => {
                const structure = {
                    section: getRdfNode(quads, 'Section_1_5'),
                    series: getRdfNode(quads, 'Series_1'),
                    edition: getRdfNode(quads, 'AWG'),
                };
                const expectedStructure = {
                    section: {
                        'dcterms:isPartOf': ['awg:Series_1'],
                        'dcterms:title': ['Abteilung 5 (Klavierlieder)'],
                        'rdf:type': ['awg:Section'],
                        'rdfs:label': ['AWG I/5'],
                    },
                    series: {
                        'dcterms:isPartOf': ['awg:AWG'],
                        'dcterms:title': ['Serie I (Werke mit Opuszahlen)'],
                        'rdf:type': ['awg:Series'],
                        'rdfs:label': ['Serie I'],
                    },
                    edition: {
                        'rdf:type': ['awg:CompleteEdition'],
                        'rdfs:label': ['Anton Webern Gesamtausgabe'],
                    },
                };

                expectToEqual(structure, expectedStructure);
            });
        });

        describe('#addDocumentsFacet()', () => {
            let quads: Quad[];

            beforeAll(() => {
                quads = generateFacetQuads(addDocumentsFacet);
            });

            it('... should have a method `addDocumentsFacet`', () => {
                expect(addDocumentsFacet).toBeDefined();
            });

            it('... should return the sources with siglum, type, complex and document', () => {
                const source = getRdfNode(quads, 'Op25_source_A');
                const document = getRdfNode(quads, 'awg_doc_0047');
                const expectedSource = {
                    'awg:belongsToComplex': ['awg:Op25'],
                    'awg:hasDocument': ['awg:awg_doc_0047'],
                    'awg:siglum': ['A'],
                    'awg:sourceType': ['Skizzen zu M 317.'],
                    'rdf:type': ['awg:Source'],
                    'rdfs:label': ['op. 25 A'],
                };

                expectToEqual(source, expectedSource);
                expectToEqual(document, { 'rdf:type': ['awg:Document'], 'rdfs:label': ['op. 25 A'] });
            });

            it('... should return the sketches with their M number complex', () => {
                const sketch = getRdfNode(quads, 'M317_Sk1');
                const expectedSketch = {
                    'awg:belongsToComplex': ['awg:M317'],
                    'rdf:type': ['awg:Inscription', 'awg:Sketch'],
                    'rdfs:label': ['M 317 Sk1'],
                };

                expectToEqual(sketch, expectedSketch);
            });

            it('... should return the row table of the complex with its supertypes', () => {
                const rowTable = getRdfNode(quads, 'Op25_SkRT');
                const expectedRowTable = {
                    'awg:belongsToComplex': ['awg:Op25'],
                    'rdf:type': ['awg:Inscription', 'awg:RowTable', 'awg:Sketch'],
                    'rdfs:label': ['M 317 / M 321 RT'],
                };

                expectToEqual(rowTable, expectedRowTable);
            });

            it('... should return placeholders counted per M number', () => {
                const placeholders = [getRdfNode(quads, 'M78_SkX_1'), getRdfNode(quads, 'M78_SkX_2')];
                const types = ['awg:Inscription', 'awg:Sketch'];

                expectToEqual(placeholders, [
                    { 'rdf:type': types, 'rdfs:label': ['M 78 Sk## (1)'] },
                    { 'rdf:type': types, 'rdfs:label': ['M 78 Sk## (2)'] },
                ]);
            });

            it('... should return the paratexts counted per folio and kind, with the only M number of the source', () => {
                const title = getRdfNode(quads, 'awg_doc_0047_38v_title_1');
                const expectedTitle = {
                    'awg:belongsToComplex': ['awg:M317'],
                    'awg:paratextType': ['awg:paratextType_title'],
                    'rdf:type': ['awg:Inscription', 'awg:Paratext'],
                    'rdfs:label': ['„Wie bin ich froh!“'],
                };

                expectToEqual(title, expectedTitle);
            });

            it('... should return a stated date only for complete datings', () => {
                const datings = [
                    getRdfNode(quads, 'awg_doc_0047_38v_dating_1'),
                    getRdfNode(quads, 'awg_doc_0047_38v_dating_2'),
                ];
                const common = {
                    'awg:belongsToComplex': ['awg:M317'],
                    'awg:paratextType': ['awg:paratextType_dating'],
                    'rdf:type': ['awg:Inscription', 'awg:Paratext'],
                };

                expectToEqual(datings, [
                    { ...common, 'awg:statedDate': ['1934-07-04'], 'rdfs:label': ['Datierung: 4. VII. 34'] },
                    { ...common, 'rdfs:label': ['Datierung: M. am 30. IX.'] },
                ]);
            });

            it('... should return no paratexts for measure numbers without position', () => {
                const measureNumbers = quads.filter(q => q.object.value === `${AWG}paratextType_measureNumbering`);

                expectToEqual(measureNumbers, []);
            });
        });

        describe('#addFoliosFacet()', () => {
            let quads: Quad[];

            beforeAll(() => {
                quads = generateFacetQuads(addFoliosFacet);
            });

            it('... should have a method `addFoliosFacet`', () => {
                expect(addFoliosFacet).toBeDefined();
            });

            it('... should return the folios with their document and convolute data', () => {
                const folio = getRdfNode(quads, 'awg_doc_0047_38v');
                const expectedFolio = {
                    'awg:height': ['270'],
                    'awg:systemCount': ['16'],
                    'awg:width': ['335'],
                    'dcterms:isPartOf': ['awg:awg_doc_0047'],
                    'rdf:type': ['awg:Folio'],
                    'rdfs:label': ['op. 25 A, Bl. 38v'],
                };

                expectToEqual(folio, expectedFolio);
            });

            it('... should return the pages of paratexts as pages', () => {
                const page = getRdfNode(quads, 'awg_doc_0048_3');

                expectToEqual(page['rdfs:label'], ['op. 25 B, S. 3']);
            });

            it('... should return the placements of the sketches with systems and measures', () => {
                const placement = getRdfNode(quads, 'M317_Sk1_place_awg_doc_0047_38v');
                const expectedPlacement = {
                    'awg:measures': ['1–2, 3'],
                    'awg:onFolio': ['awg:awg_doc_0047_38v'],
                    'awg:placementOf': ['awg:M317_Sk1'],
                    'awg:systems': ['1b, 3'],
                    'rdf:type': ['awg:Placement'],
                    'rdfs:label': ['M 317 Sk1, Bl. 38v'],
                };

                expectToEqual(placement, expectedPlacement);
            });

            it('... should return the folios of sketches and paratexts', () => {
                const inscriptions = [getRdfNode(quads, 'M317_Sk1'), getRdfNode(quads, 'awg_doc_0047_38v_title_1')];
                const writtenOn = { 'awg:writtenOn': ['awg:awg_doc_0047_38v'] };

                expectToEqual(inscriptions, [writtenOn, writtenOn]);
            });

            describe('... with segments', () => {
                let segmentQuads: Quad[];

                beforeAll(() => {
                    segmentQuads = generateFacetQuads(addFoliosFacet, mockRdfGeneratorData.geneticsInput);
                });

                it('... should return the folio of segments placed on exactly one folio of the convolutes', () => {
                    const segments = [getRdfNode(segmentQuads, 'M317_Sk2a'), getRdfNode(segmentQuads, 'Op25_SkRTa')];
                    const writtenOn = { 'awg:writtenOn': ['awg:awg_doc_0047_38v'] };

                    expectToEqual(segments, [writtenOn, writtenOn]);
                });

                it('... should return no folio for segments on several folios and for sketches of the convolutes', () => {
                    const inscriptions = [getRdfNode(segmentQuads, 'M317_Sk2b'), getRdfNode(segmentQuads, 'M317_Sk1')];

                    expectToEqual(inscriptions, [{}, {}]);
                });
            });
        });

        describe('#addEditionsFacet()', () => {
            let quads: Quad[];

            beforeAll(() => {
                quads = generateFacetQuads(addEditionsFacet);
            });

            it('... should have a method `addEditionsFacet`', () => {
                expect(addEditionsFacet).toBeDefined();
            });

            it('... should return the sheets with what they edit', () => {
                const sheets = [
                    getRdfNode(quads, 'M317_Sk1_Sheet'),
                    getRdfNode(quads, 'Op25_SkRT_Sheet'),
                    getRdfNode(quads, 'M317_TF1_Sheet'),
                ];
                const sketchEdition = ['awg:EditedMusicText', 'awg:SketchEdition'];

                expectToEqual(sheets, [
                    {
                        'awg:edits': ['awg:M317_Sk1'],
                        'rdf:type': sketchEdition,
                        'rdfs:label': ['M 317 Sk1 (Skizzenedition)'],
                    },
                    {
                        'awg:edits': ['awg:Op25_SkRT'],
                        'rdf:type': sketchEdition,
                        'rdfs:label': ['M 317 / M 321 RT (Skizzenedition)'],
                    },
                    {
                        'awg:edits': ['awg:M317_TF1'],
                        'rdf:type': ['awg:EditedMusicText', 'awg:TextEdition'],
                        'rdfs:label': ['M 317 Textfassung 1 (Textedition)'],
                    },
                ]);
            });

            it('... should return the text versions with their complex and transmitting sources', () => {
                const textVersion = getRdfNode(quads, 'M317_TF1');
                const expectedTextVersion = {
                    'awg:belongsToComplex': ['awg:M317'],
                    'awg:transmittedBy': ['awg:Op25_source_B'],
                    'rdf:type': ['awg:TextVersion'],
                    'rdfs:label': ['M 317 Textfassung 1'],
                };

                expectToEqual(textVersion, expectedTextVersion);
            });

            describe('... with segments', () => {
                let segmentQuads: Quad[];

                beforeAll(() => {
                    segmentQuads = generateFacetQuads(addEditionsFacet, mockRdfGeneratorData.geneticsInput);
                });

                it('... should return the sheets of the svg partials as parts of the sketch sheets', () => {
                    const sheets = [
                        getRdfNode(segmentQuads, 'M317_Sk2a_Sheet'),
                        getRdfNode(segmentQuads, 'M317_Sk2c_Sheet'),
                        getRdfNode(segmentQuads, 'Op25_SkRTb_Sheet'),
                    ];
                    const sketchEdition = ['awg:EditedMusicText', 'awg:SketchEdition'];

                    expectToEqual(sheets, [
                        {
                            'awg:edits': ['awg:M317_Sk2a'],
                            'dcterms:isPartOf': ['awg:M317_Sk2_Sheet'],
                            'rdf:type': sketchEdition,
                            'rdfs:label': ['M 317 Sk2 T. 1–2 (Skizzenedition)'],
                        },
                        {
                            'awg:edits': ['awg:M317_Sk2c'],
                            'dcterms:isPartOf': ['awg:M317_Sk2_Sheet'],
                            'rdf:type': sketchEdition,
                            'rdfs:label': ['M 317 Sk2c (Skizzenedition)'],
                        },
                        {
                            'awg:edits': ['awg:Op25_SkRTb'],
                            'dcterms:isPartOf': ['awg:Op25_SkRT_Sheet'],
                            'rdf:type': sketchEdition,
                            'rdfs:label': ['M 317 / M 321 RTb (Skizzenedition)'],
                        },
                    ]);
                });

                it('... should return no sheets for segments of system links and for pages of text sheets', () => {
                    const sheets = [
                        getRdfNode(segmentQuads, 'M320_Sk1a_Sheet'),
                        getRdfNode(segmentQuads, 'M317_TF1a_Sheet'),
                    ];

                    expectToEqual(sheets, [{}, {}]);
                });
            });
        });

        describe('#addReferencesFacet()', () => {
            it('... should have a method `addReferencesFacet`', () => {
                expect(addReferencesFacet).toBeDefined();
            });

            it('... should return the internal links of the source descriptions', () => {
                const quads = generateFacetQuads(addReferencesFacet);
                const source = getRdfNode(quads, 'Op25_source_A');

                expectToEqual(source, { 'dcterms:references': ['awg:M317_Sk1_Sheet'] });
            });
        });
    });
});
