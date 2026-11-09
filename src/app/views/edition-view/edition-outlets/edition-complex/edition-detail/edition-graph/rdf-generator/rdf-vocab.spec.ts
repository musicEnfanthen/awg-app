import type { NamedNode } from '@rdfjs/types';
import { describe, expect, it } from 'vitest';

import { expectToBe, expectToEqual } from '@testing/expect-helper';

import {
    awg,
    AWG_CLASSES,
    AWG_INSTANCES,
    AWG_PROPERTIES,
    AWG_SUPERCLASSES,
    EXTERNAL_TERMS,
    RDF_GENERATOR_PREFIXES,
} from './rdf-vocab';

const AWG = 'https://edition.anton-webern.ch/webern-onto#';

/**
 * Helper function: shortName.
 *
 * It gets the prefixed name of a term in the AWG namespace.
 */
function shortName(term: NamedNode): string {
    return term.value.replace(AWG, 'awg:');
}

describe('RdfVocab (DONE)', () => {
    describe('constants', () => {
        it('... should have `RDF_GENERATOR_PREFIXES` with the AWG namespace of the curated graph', () => {
            expectToBe(RDF_GENERATOR_PREFIXES.awg, AWG);
        });

        it('... should have all `AWG_CLASSES`, `AWG_PROPERTIES` and `AWG_INSTANCES` in the AWG namespace', () => {
            const terms = [
                ...Object.values(AWG_CLASSES),
                ...Object.values(AWG_PROPERTIES),
                ...Object.values(AWG_INSTANCES),
            ];
            const termsOutsideAwg = terms.filter(term => !term.value.startsWith(AWG));

            expectToEqual(termsOutsideAwg, []);
        });

        it('... should have all `EXTERNAL_TERMS` outside the AWG namespace', () => {
            const externalTermsInAwg = Object.values(EXTERNAL_TERMS).filter(term => term.value.startsWith(AWG));

            expectToEqual(externalTermsInAwg, []);
        });

        it('... should have `AWG_SUPERCLASSES` to hold the superclasses of the ontology', () => {
            const superclasses = Object.fromEntries(
                [...AWG_SUPERCLASSES].map(([cls, supers]) => [shortName(cls), supers.map(shortName)])
            );
            const expectedSuperclasses = {
                'awg:CompositeEditionComplex': ['awg:EditionComplex'],
                'awg:Sketch': ['awg:Inscription'],
                'awg:SketchSegment': ['awg:Sketch', 'awg:Inscription'],
                'awg:RowTable': ['awg:Sketch', 'awg:Inscription'],
                'awg:Paratext': ['awg:Inscription'],
                'awg:SketchEdition': ['awg:EditedMusicText'],
                'awg:TextEdition': ['awg:EditedMusicText'],
                'awg:WorkEdition': ['awg:EditedMusicText'],
            };

            expectToEqual(superclasses, expectedSuperclasses);
        });
    });

    describe('METHODS', () => {
        describe('#awg()', () => {
            it('... should have a method `awg`', () => {
                expect(awg).toBeDefined();
            });

            it('... should return the named node of the local name in the AWG namespace', () => {
                const node = awg('M317_Sk1');

                expectToBe(node.termType, 'NamedNode');
                expectToBe(node.value, `${AWG}M317_Sk1`);
            });
        });
    });
});
