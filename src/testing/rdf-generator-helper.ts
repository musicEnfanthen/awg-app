import type { Quad } from '@rdfjs/types';

/**
 * Object constant: SHORT_NAMESPACES.
 *
 * It keeps the namespaces that the RDF generator helpers shorten to prefixes.
 */
const SHORT_NAMESPACES: readonly [string, string][] = [
    ['https://edition.anton-webern.ch/webern-onto#', 'awg:'],
    ['http://purl.org/dc/terms/', 'dcterms:'],
    ['http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf:'],
    ['http://www.w3.org/2000/01/rdf-schema#', 'rdfs:'],
];

/**
 * Test helper function: shortenIri.
 *
 * It shortens an IRI of the AWG, DCMI, RDF or RDFS namespace to a prefixed name;
 * other values (e.g. literals) stay unchanged.
 *
 * Exposed to be called from tests.
 *
 * @param {string} value The given IRI or value.
 * @returns {string} The prefixed name or the unchanged value.
 * @example shortenIri('https://edition.anton-webern.ch/webern-onto#M317') // 'awg:M317'
 */
export function shortenIri(value: string): string {
    const match = SHORT_NAMESPACES.find(([namespace]) => value.startsWith(namespace));
    return match ? match[1] + value.slice(match[0].length) : value;
}

/**
 * Test helper function: getRdfNode.
 *
 * It gets the sorted object values of a node in the AWG namespace by prefixed predicate,
 * so that a test can compare a whole node with one expected object.
 *
 * Exposed to be called from tests.
 *
 * @param {readonly Quad[]} quads The given quads.
 * @param {string} local The local name of the node in the AWG namespace.
 * @returns {Record<string, string[]>} The object values by prefixed predicate.
 * @example getRdfNode(quads, 'M317_Sk1') // { 'rdf:type': ['awg:Inscription', 'awg:Sketch'], 'rdfs:label': ['M 317 Sk1'] }
 */
export function getRdfNode(quads: readonly Quad[], local: string): Record<string, string[]> {
    const node: Record<string, string[]> = {};
    quads
        .filter(q => shortenIri(q.subject.value) === `awg:${local}`)
        .forEach(q => {
            const values = (node[shortenIri(q.predicate.value)] ??= []);
            values.push(shortenIri(q.object.value));
            values.sort();
        });
    return node;
}
