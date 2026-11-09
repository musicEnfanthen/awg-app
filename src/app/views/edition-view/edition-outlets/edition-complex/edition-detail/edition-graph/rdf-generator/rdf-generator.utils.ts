import type { NamedNode, Quad } from '@rdfjs/types';

import { collectItems, collectParatexts, collectSketches, collectSources } from './rdf-collect.utils';
import { RDFS_LABEL } from '../graph-visualizer/utils/term.utils';
import { createContext, getOrCreate, has } from './rdf-context.utils';
import {
    addDocumentsFacet,
    addEditionFacet,
    addEditionsFacet,
    addFoliosFacet,
    addReferencesFacet,
} from './rdf-facets.utils';
import {
    RdfGeneratorInput,
    RdfGeneratorResult,
    RdfGeneratorWarning,
    RdfGeneratorWarningRule,
} from './rdf-generator.model';
import { addGeneticsFacet } from './rdf-genetics.utils';
import { quadKey, sortQuads } from './rdf-quads.utils';
import { AWG_PROPERTIES, RDF_GENERATOR_PREFIXES } from './rdf-vocab';

/**
 * Array constant: SINGLE_VALUED_FOLIO_PROPERTIES.
 *
 * It keeps the folio properties with one value per folio; conflicting values of shared documents are dropped.
 */
const SINGLE_VALUED_FOLIO_PROPERTIES: readonly NamedNode[] = [
    AWG_PROPERTIES.systemCount,
    AWG_PROPERTIES.height,
    AWG_PROPERTIES.width,
];

/**
 * Helper function: slotKey.
 *
 * It gets the key of the subject and predicate of a quad.
 */
function slotKey(q: Quad): string {
    return `${q.subject.value} ${q.predicate.value}`;
}

/**
 * Helper function: conflictWarning.
 *
 * It gets the warning for conflicting values of a slot (subject and predicate, or node), with the complexes stating them.
 */
function conflictWarning(
    rule: RdfGeneratorWarningRule,
    description: string,
    slot: string,
    complexesByValue: ReadonlyMap<string, ReadonlySet<string>>
): RdfGeneratorWarning {
    const complexKeys = new Set<string>();
    const values: string[] = [];
    complexesByValue.forEach((keys, value) => {
        keys.forEach(key => complexKeys.add(key));
        values.push(`${value} (${[...keys].join(', ')})`);
    });
    return {
        complexKey: [...complexKeys].join(', '),
        rule,
        message: `${description} ${slot.replace(RDF_GENERATOR_PREFIXES.awg, 'awg:')}: ${values.join(' vs. ')}`,
    };
}

/**
 * Helper function: labelConflictWarnings.
 *
 * It gets a warning for each node with different labels from several complexes
 * (a sign that two complexes use the same IRI for different things).
 */
function labelConflictWarnings(results: readonly RdfGeneratorResult[]): RdfGeneratorWarning[] {
    const complexesByLabelByNode = new Map<string, Map<string, Set<string>>>();
    results.forEach(result => {
        result.quads
            .filter(q => q.predicate.equals(RDFS_LABEL))
            .forEach(q => {
                const complexesByLabel = getOrCreate(
                    complexesByLabelByNode,
                    q.subject.value,
                    () => new Map<string, Set<string>>()
                );
                getOrCreate(complexesByLabel, q.object.value, () => new Set<string>()).add(result.complexKey);
            });
    });
    return [...complexesByLabelByNode]
        .filter(([, complexesByLabel]) => complexesByLabel.size > 1)
        .map(([node, complexesByLabel]) =>
            conflictWarning('labelConflict', 'Different labels for', node, complexesByLabel)
        );
}

/**
 * Utils function: generateComplexGraph.
 *
 * It generates the RDF graph of a single edition complex from its data files
 * and reports the gaps in the edition data found on the way.
 *
 * @param {RdfGeneratorInput} input The given input (complex, registries and data files).
 * @returns {RdfGeneratorResult} The sorted quads and the warnings.
 */
export function generateComplexGraph(input: RdfGeneratorInput): RdfGeneratorResult {
    const ctx = createContext(input);
    ctx.sources = collectSources(ctx);
    ctx.items = collectItems(ctx);
    ctx.sketches = collectSketches(ctx);
    ctx.paratexts = collectParatexts(ctx);

    if (has(ctx, 'documents')) {
        addDocumentsFacet(ctx);
    }
    if (has(ctx, 'folios')) {
        addFoliosFacet(ctx);
    }
    if (has(ctx, 'editions')) {
        addEditionsFacet(ctx);
    }
    if (has(ctx, 'references')) {
        addReferencesFacet(ctx);
    }
    if (has(ctx, 'genetics')) {
        addGeneticsFacet(ctx);
    }
    if (has(ctx, 'edition')) {
        addEditionFacet(ctx);
    }

    return { complexKey: input.complexKey, quads: sortQuads(ctx.quads.values()), warnings: ctx.warnings };
}

/**
 * Utils function: mergeGraphs.
 *
 * It merges the generated graphs of several complexes without duplicates.
 * Conflicting values of single-valued folio properties (shared documents) are dropped and reported.
 *
 * @param {readonly RdfGeneratorResult[]} results The given results per complex.
 * @returns {RdfGeneratorResult} The merged quads and all warnings.
 */
export function mergeGraphs(results: readonly RdfGeneratorResult[]): RdfGeneratorResult {
    const quads = new Map<string, Quad>();
    const singleValued = new Set(SINGLE_VALUED_FOLIO_PROPERTIES.map(property => property.value));
    // Per subject and single-valued property: the complexes stating each value
    const complexesByValueBySlot = new Map<string, Map<string, Set<string>>>();

    results.forEach(result => {
        result.quads.forEach(q => {
            quads.set(quadKey(q), q);
            if (singleValued.has(q.predicate.value)) {
                const complexesByValue = getOrCreate(
                    complexesByValueBySlot,
                    slotKey(q),
                    () => new Map<string, Set<string>>()
                );
                getOrCreate(complexesByValue, q.object.value, () => new Set<string>()).add(result.complexKey);
            }
        });
    });

    const conflicts = [...complexesByValueBySlot].filter(([, complexesByValue]) => complexesByValue.size > 1);
    const conflictSlots = new Set(conflicts.map(([slot]) => slot));
    quads.forEach((q, key) => {
        if (conflictSlots.has(slotKey(q))) {
            quads.delete(key);
        }
    });

    return {
        complexKey: results.map(result => result.complexKey).join(', '),
        quads: sortQuads(quads.values()),
        warnings: [
            ...results.flatMap(result => result.warnings),
            ...conflicts.map(([slot, complexesByValue]) =>
                conflictWarning('folioConflict', 'Conflicting values dropped for', slot, complexesByValue)
            ),
            ...labelConflictWarnings(results),
        ],
    };
}

/**
 * Utils function: mergeLayers.
 *
 * It merges the curated and the generated layer of a graph without duplicates.
 * The curated layer wins where both state the same: generated labels and complexes are dropped
 * for nodes with curated ones, and a generated `awg:precedes` is dropped where the curated layer
 * states a more specific precedence between the same nodes.
 *
 * @param {readonly Quad[]} curated The given quads of the curated layer.
 * @param {readonly Quad[]} generated The given quads of the generated layer.
 * @returns {Quad[]} The merged quads, sorted.
 */
export function mergeLayers(curated: readonly Quad[], generated: readonly Quad[]): Quad[] {
    const { belongsToComplex, precedes, precedesContent, precedesScripture } = AWG_PROPERTIES;
    const curatedSlots = new Set<string>();
    const curatedPrecedences = new Set<string>();
    curated.forEach(q => {
        if (q.predicate.equals(RDFS_LABEL) || q.predicate.equals(belongsToComplex)) {
            curatedSlots.add(slotKey(q));
        } else if (q.predicate.equals(precedesContent) || q.predicate.equals(precedesScripture)) {
            curatedPrecedences.add(`${q.subject.value} ${q.object.value}`);
        }
    });

    const isOverridden = (q: Quad): boolean =>
        curatedSlots.has(slotKey(q)) ||
        (q.predicate.equals(precedes) && curatedPrecedences.has(`${q.subject.value} ${q.object.value}`));

    const quads = new Map<string, Quad>();
    curated.forEach(q => quads.set(quadKey(q), q));
    generated.filter(q => !isOverridden(q)).forEach(q => quads.set(quadKey(q), q));
    return sortQuads(quads.values());
}

/**
 * Object constant: RDF_GENERATOR_UTILS.
 *
 * It keeps all public functions of the generator.
 */
export const RDF_GENERATOR_UTILS = {
    generateComplexGraph,
    mergeGraphs,
    mergeLayers,
} as const;
