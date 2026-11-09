import type { Quad } from '@rdfjs/types';
import { Parser, Writer } from 'n3';
import { beforeAll, describe, it } from 'vitest';

import { expectToEqual, getItemAt } from '@testing/expect-helper';
import snapshotOp25 from '@testing/snapshots/rdf-generator-op25.json';

import { GraphList } from '@awg-views/edition-view/models/graph.model';

import { RdfComplexRegistry } from './rdf-generator.model';
import { generateComplexGraph } from './rdf-generator.utils';

import documentsData from 'assets/data/edition/documents.json';
import editionComplexesData from 'assets/data/edition/edition-complexes.json';
import folioConvoluteOp25 from 'assets/data/edition/series/1/section/5/op25/folio-convolute.json';
import graphDataOp25 from 'assets/data/edition/series/1/section/5/op25/graph.json';
import sourceDescOp25 from 'assets/data/edition/series/1/section/5/op25/source-description.json';
import sourceListOp25 from 'assets/data/edition/series/1/section/5/op25/source-list.json';
import svgSheetsOp25 from 'assets/data/edition/series/1/section/5/op25/svg-sheets.json';

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

/**
 * Array constant: PARATEXTS_OUTSIDE_PHYSDESC.
 *
 * It keeps the curated paratexts of op. 25 that the source descriptions do not list
 * (they are described in the textcritics only).
 */
const PARATEXTS_OUTSIDE_PHYSDESC = [
    'awg_doc_0047_38v_dating_1',
    'awg_doc_0047_38v_instrumentation_2',
    'awg_doc_0047_38v_instrumentation_3',
    'awg_doc_0047_38v_pagination_1',
    'awg_doc_0047_39r_dating_1',
    'awg_doc_0047_39r_pagination_1',
];

/**
 * Helper function: segmentLocals.
 *
 * It gets the local names of the segments of a sketch by their partial letters.
 */
function segmentLocals(sketch: string, letters: string): string[] {
    return [...letters].map(letter => `${sketch}${letter}`);
}

/**
 * Array constant: SEGMENTS_WITHOUT_PARTIALS.
 *
 * It keeps the curated segments of op. 25 whose sketches have neither svg partials
 * nor system links in the data (no sketch sheets online).
 */
const SEGMENTS_WITHOUT_PARTIALS = [
    segmentLocals('M321_Sk3', 'ab'),
    segmentLocals('M321_Sk6', 'abcd'),
    segmentLocals('M321_Sk8', 'abcdefghijk'),
    segmentLocals('M322_Sk4', 'abcdefghij'),
].flat();

/**
 * Helper function: toNTriples.
 *
 * It serializes quads as N-Triples lines.
 */
function toNTriples(quads: Quad[]): Promise<string[]> {
    const writer = new Writer({ format: 'N-Triples' });
    writer.addQuads(quads);
    return new Promise((resolve, reject) =>
        writer.end((error: Error | null, result: string) =>
            error ? reject(error) : resolve(result.split('\n').filter(Boolean))
        )
    );
}

describe('RdfGeneratorUtils (integration with the op. 25 data) (DONE)', () => {
    let quads: Quad[];

    beforeAll(() => {
        const complexes = Object.assign({}, ...editionComplexesData.editionComplexes) as RdfComplexRegistry;

        quads = generateComplexGraph({
            complexKey: 'op25',
            complexes,
            documents: documentsData.documents,
            data: {
                folioConvolute: folioConvoluteOp25,
                sourceDesc: sourceDescOp25,
                sourceList: sourceListOp25,
                svgSheets: svgSheetsOp25,
            },
        }).quads;
    });

    it('... should return the N-Triples of the op. 25 snapshot', async () => {
        const triples = await toNTriples(quads);

        expectToEqual(triples, snapshotOp25.triples);
    });

    it('... should return all curated nodes except segments without partials and paratexts outside the source descriptions', () => {
        const curatedTurtle = getItemAt((graphDataOp25 as GraphList).graph, 0).rdfData.triples;
        const curatedSubjects = new Set(
            new Parser()
                .parse(curatedTurtle)
                .map(q => q.subject.value.replace(AWG, ''))
                .filter(local => !/^(stmt|person)_/.test(local))
        );
        const generatedSubjects = new Set(quads.map(q => q.subject.value.replace(AWG, '')));

        const missing = [...curatedSubjects].filter(local => !generatedSubjects.has(local)).sort();
        const expectedMissing = [...SEGMENTS_WITHOUT_PARTIALS, ...PARATEXTS_OUTSIDE_PHYSDESC].sort();

        expectToEqual(missing, expectedMissing);
    });
});
