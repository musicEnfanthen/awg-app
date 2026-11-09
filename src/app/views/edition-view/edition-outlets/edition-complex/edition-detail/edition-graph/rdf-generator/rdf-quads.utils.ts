import type { Quad } from '@rdfjs/types';
import { Writer } from 'n3';

import { RdfTerm } from '../graph-visualizer/models/rdf.model';
import { termKey } from '../graph-visualizer/utils/term.utils';
import { RDF_GENERATOR_PREFIXES } from './rdf-vocab';

/**
 * Utils function: quadKey.
 *
 * It gets a unique key for a quad (also for sorting).
 * Generated quads hold only named nodes, blank nodes and literals as objects.
 *
 * @param {Quad} q The given quad.
 * @returns {string} The key of the quad.
 */
export function quadKey(q: Quad): string {
    return `${q.subject.value} ${q.predicate.value} ${termKey(q.object as RdfTerm)}`;
}

/**
 * Utils function: sortQuads.
 *
 * It sorts quads by subject, predicate and object (deterministic output).
 *
 * @param {Iterable<Quad>} quads The given quads.
 * @returns {Quad[]} The sorted quads.
 */
export function sortQuads(quads: Iterable<Quad>): Quad[] {
    const keyed = [...quads].map(q => ({ key: quadKey(q), q }));
    keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    return keyed.map(({ q }) => q);
}

/**
 * Utils function: serializeTurtle.
 *
 * It serializes quads as Turtle with the prefixes of the generator.
 *
 * @param {readonly Quad[]} quads The given quads (sorted).
 * @param {string} [header] The optional comment header.
 * @returns {Promise<string>} A promise of the Turtle string.
 */
export function serializeTurtle(quads: readonly Quad[], header = ''): Promise<string> {
    const writer = new Writer({ prefixes: { ...RDF_GENERATOR_PREFIXES } });
    writer.addQuads([...quads]);
    return new Promise((resolve, reject) => {
        writer.end((error: Error | null, result: string) => (error ? reject(error) : resolve(header + result)));
    });
}

/**
 * Object constant: RDF_QUADS_UTILS.
 *
 * It keeps all quad utils functions of the generator.
 */
export const RDF_QUADS_UTILS = {
    quadKey,
    serializeTurtle,
    sortQuads,
} as const;
