import type { NamedNode, Quad_Object } from '@rdfjs/types';
import { DataFactory } from 'n3';

import {
    EDITION_CATALOGUE_TYPE_CONSTANTS,
    EditionCatalogueTypeConstantsKey,
} from '@awg-views/edition-view/edition-routes.constants';

import { RDF_TYPE, RDFS_LABEL } from '../graph-visualizer/utils/term.utils';
import {
    RdfComplexEntry,
    RdfDocumentEntry,
    RdfGeneratorContext,
    RdfGeneratorFacet,
    RdfGeneratorInput,
    RdfGeneratorWarningRule,
} from './rdf-generator.model';
import { complexLocal } from './rdf-iri.utils';
import { quadKey } from './rdf-quads.utils';
import { awg, AWG_SUPERCLASSES } from './rdf-vocab';

/**
 * Array constant: ALL_FACETS.
 *
 * It keeps all facets of the generated graph.
 */
const ALL_FACETS: readonly RdfGeneratorFacet[] = [
    'edition',
    'documents',
    'folios',
    'editions',
    'references',
    'genetics',
];

/**
 * Utils function: add.
 *
 * It adds a quad unless the object is missing or an empty literal.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {NamedNode} subject The given subject.
 * @param {NamedNode} predicate The given predicate.
 * @param {Quad_Object | undefined} object The given object.
 * @returns {void} Adds the quad to the context.
 */
export function add(
    ctx: RdfGeneratorContext,
    subject: NamedNode,
    predicate: NamedNode,
    object: Quad_Object | undefined
): void {
    if (!object || (object.termType === 'Literal' && !object.value)) {
        return;
    }
    const q = DataFactory.quad(subject, predicate, object);
    ctx.quads.set(quadKey(q), q);
}

/**
 * Utils function: addTypes.
 *
 * It adds a class and all its superclasses as `rdf:type`.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {NamedNode} subject The given subject.
 * @param {NamedNode} type The given class.
 * @returns {void} Adds the type quads to the context.
 */
export function addTypes(ctx: RdfGeneratorContext, subject: NamedNode, type: NamedNode): void {
    const superclasses = AWG_SUPERCLASSES.get(type) ?? [];
    [type, ...superclasses].forEach(cls => add(ctx, subject, RDF_TYPE, cls));
}

/**
 * Utils function: addLabel.
 *
 * It adds a plain `rdfs:label`.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {NamedNode} subject The given subject.
 * @param {string} label The given label.
 * @returns {void} Adds the label quad to the context.
 */
export function addLabel(ctx: RdfGeneratorContext, subject: NamedNode, label: string): void {
    add(ctx, subject, RDFS_LABEL, DataFactory.literal(label));
}

/**
 * Utils function: warn.
 *
 * It records a gap in the edition data.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {RdfGeneratorWarningRule} rule The given kind of gap.
 * @param {string} message The given description of the gap.
 * @returns {void} Adds the warning to the context.
 */
export function warn(ctx: RdfGeneratorContext, rule: RdfGeneratorWarningRule, message: string): void {
    ctx.warnings.push({ complexKey: ctx.input.complexKey, rule, message });
}

/**
 * Utils function: has.
 *
 * It checks whether a facet is generated.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {RdfGeneratorFacet} facet The given facet.
 * @returns {boolean} The result of the check.
 */
export function has(ctx: RdfGeneratorContext, facet: RdfGeneratorFacet): boolean {
    return ctx.facets.has(facet);
}

/**
 * Utils function: getOrCreate.
 *
 * It gets the value of a key, after creating and storing it if the key is missing.
 *
 * @param {Map<K, V>} map The given map.
 * @param {K} key The given key.
 * @param {() => V} create The given function creating a missing value.
 * @returns {V} The stored or created value.
 */
export function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
    let value = map.get(key);
    if (value === undefined) {
        value = create();
        map.set(key, value);
    }
    return value;
}

/**
 * Utils function: nextCount.
 *
 * It increments the counter of a key (starting at 1) and returns it.
 *
 * @param {Map<string, number>} counters The given counters.
 * @param {string} key The given key.
 * @returns {number} The incremented counter.
 */
export function nextCount(counters: Map<string, number>, key: string): number {
    const count = (counters.get(key) ?? 0) + 1;
    counters.set(key, count);
    return count;
}

/**
 * Utils function: onlyValue.
 *
 * It gets the value of a set with exactly one value.
 *
 * @param {ReadonlySet<T> | undefined} values The given set.
 * @returns {T | undefined} The only value, or undefined for none or several values.
 */
export function onlyValue<T>(values: ReadonlySet<T> | undefined): T | undefined {
    return values?.size === 1 ? [...values][0] : undefined;
}

/**
 * Utils function: complexEntry.
 *
 * It gets the registry entry of a complex by its key.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {string} complexKey The given complex key.
 * @returns {RdfComplexEntry | undefined} The registry entry, or undefined if unknown.
 */
export function complexEntry(ctx: RdfGeneratorContext, complexKey: string): RdfComplexEntry | undefined {
    return ctx.input.complexes[complexKey];
}

/**
 * Utils function: ownComplexKeys.
 *
 * It gets the keys of the complex and its parts, whose data hold the complete sketch inventory.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {Set<string>} The keys of the complex and its parts.
 */
export function ownComplexKeys(ctx: RdfGeneratorContext): Set<string> {
    const keys = new Set([ctx.input.complexKey]);
    complexEntry(ctx, ctx.input.complexKey)?.parts?.forEach(part => keys.add(part.complex));
    return keys;
}

/**
 * Utils function: complexLabel.
 *
 * It gets the label of a complex as in the app (e.g. `op. 25`, `M 317`, `M* 409`), or its key if unknown.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {string} complexKey The given complex key.
 * @returns {string} The label of the complex.
 */
export function complexLabel(ctx: RdfGeneratorContext, complexKey: string): string {
    const entry = complexEntry(ctx, complexKey);
    if (!entry) {
        return complexKey;
    }
    const { catalogueType, catalogueNumber } = entry.titleStatement;
    const typeKey = catalogueType.toUpperCase() as EditionCatalogueTypeConstantsKey;
    return `${EDITION_CATALOGUE_TYPE_CONSTANTS[typeKey]?.short ?? catalogueType} ${catalogueNumber}`;
}

/**
 * Utils function: knownComplexKey.
 *
 * It gets the complex key if the complex exists in the registry.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {string | undefined} complexKey The given complex key.
 * @returns {string | undefined} The complex key, or undefined if not in the registry.
 */
export function knownComplexKey(ctx: RdfGeneratorContext, complexKey: string | undefined): string | undefined {
    return complexKey && complexEntry(ctx, complexKey) ? complexKey : undefined;
}

/**
 * Utils function: complexIri.
 *
 * It gets the IRI of a complex by its key and records it as referenced.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {string} complexKey The given complex key.
 * @returns {NamedNode} The IRI of the complex.
 */
export function complexIri(ctx: RdfGeneratorContext, complexKey: string): NamedNode {
    ctx.referencedComplexes.add(complexKey);
    return awg(complexLocal(complexKey));
}

/**
 * Utils function: documentLabel.
 *
 * It gets the label of a document from the sources that describe it (e.g. `op. 3 G = op. 4 A`).
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @param {RdfDocumentEntry} document The given document of the registry.
 * @returns {string} The label of the document.
 */
export function documentLabel(ctx: RdfGeneratorContext, document: RdfDocumentEntry): string {
    return document.usedBy.map(use => `${complexLabel(ctx, use.complex)} ${use.siglum}`).join(' = ') || document.id;
}

/**
 * Utils function: createContext.
 *
 * It creates the state of the generation of a single complex, with the lookups of the document registry.
 *
 * @param {RdfGeneratorInput} input The given input of the generator.
 * @returns {RdfGeneratorContext} The empty context.
 */
export function createContext(input: RdfGeneratorInput): RdfGeneratorContext {
    const documents = input.documents ?? [];
    const documentsByUse = new Map<string, RdfDocumentEntry>();
    documents.forEach(document => {
        document.usedBy.forEach(use => documentsByUse.set(`${use.complex}:${use.siglum}`, document));
    });
    return {
        complexLocal: complexLocal(input.complexKey),
        documentsById: new Map(documents.map(document => [document.id, document])),
        documentsByUse,
        facets: input.facets ?? new Set(ALL_FACETS),
        input,
        items: [],
        paratexts: [],
        quads: new Map(),
        referencedComplexes: new Set(),
        sketches: new Map(),
        sources: [],
        warnings: [],
    };
}

/**
 * Object constant: RDF_CONTEXT_UTILS.
 *
 * It keeps all context utils functions of the generator.
 */
export const RDF_CONTEXT_UTILS = {
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
    ownComplexKeys,
    warn,
} as const;
