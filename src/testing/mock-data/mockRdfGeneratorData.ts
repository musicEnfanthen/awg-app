import { RdfComplexRegistry, RdfDocumentEntry, RdfGeneratorInput } from '@awg-graph/rdf-generator/rdf-generator.model';

/**
 * The registry of the mocked edition complexes (op. 24, op. 25 with part M 317, M 317).
 */
const COMPLEXES: RdfComplexRegistry = {
    op24: {
        titleStatement: { title: 'Konzert', catalogueType: 'OPUS', catalogueNumber: '24' },
        pubStatement: { series: '1', section: '1' },
    },
    op25: {
        titleStatement: { title: '<em>Drei Lieder</em>', catalogueType: 'OPUS', catalogueNumber: '25' },
        pubStatement: { series: '1', section: '5' },
        parts: [{ complex: 'm317', textVersion: '2' }],
    },
    m317: {
        titleStatement: { title: '„Wie bin ich froh!“', catalogueType: 'MNR', catalogueNumber: '317' },
        pubStatement: { series: '1', section: '5' },
    },
};

/**
 * The mocked document registry (sources A and B of op. 25).
 */
const DOCUMENTS: RdfDocumentEntry[] = [
    { id: 'awg_doc_0047', usedBy: [{ complex: 'op25', siglum: 'A' }] },
    { id: 'awg_doc_0048', usedBy: [{ complex: 'op25', siglum: 'B' }] },
];

/**
 * The mocked generator input for op. 25: source A with a sketch, a row table and paratexts on Bl. 38v,
 * source B with a text version, sketches and placeholders on two folios, svg sheets and folio convolutes.
 */
const INPUT: RdfGeneratorInput = {
    complexKey: 'op25',
    complexes: COMPLEXES,
    documents: DOCUMENTS,
    data: {
        sourceList: {
            sources: [
                {
                    siglum: 'A',
                    type: 'Skizzen zu M 317.',
                    location: 'CH-Bps',
                    hasDescription: true,
                    linkTo: 'source_A',
                },
                {
                    siglum: 'B',
                    type: 'Autograph von M 317: Textfassung 1.',
                    location: 'CH-Bps',
                    hasDescription: true,
                    linkTo: 'source_B',
                },
            ],
        },
        sourceDesc: {
            sources: [
                {
                    id: 'source_A',
                    siglum: 'A',
                    type: '',
                    location: '',
                    physDesc: {
                        titles: ['„Wie bin ich froh!“ auf Bl. 38v oben links'],
                        dates: ['4. VII. 34 auf Bl. 38v oben', 'M. am 30. IX. auf Bl. 38v unten'],
                        instrumentations: ['Akkoladenstrich auf Bl. 38v System 1–4 (zu op. 24/1)'],
                        annotations: [
                            "Reihe auf Bl. 38v System 5 (zu M 317 Sk1), siehe <a data-complex-id='op25' data-sheet-id='M317_Sk1'>Sk1</a> und <a data-complex-id='m999' data-sheet-id='M999_Sk1'>M 999 Sk1</a>",
                        ],
                        measureNumbers: ['Taktzahlen 1–2 in M 317 Sk1'],
                        contents: [
                            {
                                item: 'M 317 Sk1',
                                itemLinkTo: { complexId: 'op25', sheetId: 'M317_Sk1' },
                                folios: [
                                    {
                                        folio: '38v',
                                        systemGroups: [
                                            [{ system: '1b', measure: '1–2' }],
                                            [{ system: '3', measure: '3' }],
                                        ],
                                    },
                                ],
                            },
                            { item: 'M 317 / M321 RT', folios: [{ folio: '38v' }] },
                        ],
                    },
                },
                {
                    id: 'source_B',
                    siglum: 'B',
                    type: '',
                    location: '',
                    physDesc: {
                        dates: ['5. VIII. 34 auf Bl. 1r oben', '6. VIII. 34 auf Bl. 2r oben', '30. II. 34 auf S. 3'],
                        paginations: ['75 auf S. 3 oben rechts'],
                        contents: [
                            { item: 'M 317', itemLinkTo: { complexId: 'op25', sheetId: 'M317_TF1' } },
                            { item: 'M 317 Sk2', folios: [{ folio: '1r' }, { folio: '2r' }] },
                            { item: 'M 78 Sk##', folios: [{ folio: '2r' }] },
                            { item: 'M 78 Sk##' },
                            { item: '' },
                        ],
                    },
                },
            ],
        },
        svgSheets: {
            sheets: {
                workEditions: [],
                textEditions: [{ id: 'M317_TF1', label: 'M 317 Textfassung 1', content: [] }],
                sketchEditions: [
                    { id: 'M317_Sk1', label: 'M 317 Sk1', content: [] },
                    { id: 'SkRT', label: 'M 317 / M 321 RT', content: [] },
                ],
            },
        },
        folioConvolute: {
            convolutes: [
                {
                    convoluteId: 'A',
                    convoluteLabel: 'A',
                    folios: [{ folioId: '38v', systems: '16', dimensions: { height: 270, width: 335 }, content: [] }],
                },
                {
                    convoluteId: 'X',
                    convoluteLabel: 'X',
                    folios: [{ folioId: '1r', systems: '12', dimensions: { height: 0, width: 0 }, content: [] }],
                },
            ],
        },
    },
};

/**
 * The mocked data of the RDF generator.
 */
export const mockRdfGeneratorData = {
    complexes: COMPLEXES,
    documents: DOCUMENTS,
    input: INPUT,
};
