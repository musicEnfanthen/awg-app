import { DataFactory } from 'n3';

import { add, addLabel, addTypes, complexIri, getOrCreate, ownComplexKeys, warn } from './rdf-context.utils';
import { RdfGeneratorContext, RdfSketchEntry } from './rdf-generator.model';
import { segmentLocal, sketchLocal } from './rdf-iri.utils';
import { segmentLabel } from './rdf-text.utils';
import { awg, AWG_CLASSES, AWG_PROPERTIES, EXTERNAL_TERMS } from './rdf-vocab';

/**
 * Regex constant: MAIN_NUMBER_REGEX.
 *
 * It keeps a regex for the number of a main sketch (without dotted sub-numbers).
 */
const MAIN_NUMBER_REGEX = /^\d+$/;

/**
 * Helper function: lastSegmentLetter.
 *
 * It gets the last partial letter of a sketch, or undefined if the sketch has no segments.
 */
function lastSegmentLetter(sketch: RdfSketchEntry | undefined): string | undefined {
    if (!sketch) {
        return undefined;
    }
    return [...sketch.measuresBySegment.keys()].sort().pop();
}

/**
 * Helper function: isNextLetter.
 *
 * It checks whether a partial letter directly follows another one (e.g. `a`, `b`).
 */
function isNextLetter(letter: string, next: string): boolean {
    return next.charCodeAt(0) === letter.charCodeAt(0) + 1;
}

/**
 * Helper function: addSegments.
 *
 * It adds the segments of the sketches with their complex and measures,
 * `dcterms:hasPart` from the sketch and `awg:nextSegment` between directly following partial letters.
 */
function addSegments(ctx: RdfGeneratorContext): void {
    ctx.sketches.forEach(({ item, measuresBySegment }) => {
        const segments = [...measuresBySegment].sort(([a], [b]) => a.localeCompare(b));
        segments.forEach(([letter, measureList], index) => {
            const iri = awg(segmentLocal(item.local, letter));
            const measures = measureList.join(', ');
            add(ctx, awg(item.local), EXTERNAL_TERMS.hasPart, iri);
            addTypes(ctx, iri, AWG_CLASSES.sketchSegment);
            addLabel(ctx, iri, segmentLabel(item.label, letter, measures));
            add(ctx, iri, AWG_PROPERTIES.measures, DataFactory.literal(measures));
            if (item.complexKey) {
                add(ctx, iri, AWG_PROPERTIES.belongsToComplex, complexIri(ctx, item.complexKey));
            }
            const next = segments[index + 1];
            if (next && isNextLetter(letter, next[0])) {
                add(ctx, iri, AWG_PROPERTIES.nextSegment, awg(segmentLocal(item.local, next[0])));
            }
        });
    });
}

/**
 * Helper function: addSubSketchConcomitance.
 *
 * It adds `awg:concomitates` from each dotted sub-sketch to its main sketch (e.g. Sk2.1 → Sk2, Sk2.1.1 → Sk2.1);
 * a sub-sketch whose main sketch is missing in the complex is reported.
 */
function addSubSketchConcomitance(ctx: RdfGeneratorContext): void {
    ctx.sketches.forEach(({ item, mnr, sketchNumber }) => {
        if (!mnr || !sketchNumber?.includes('.')) {
            return;
        }
        const mainNumber = sketchNumber.slice(0, sketchNumber.lastIndexOf('.'));
        const main = sketchLocal(mnr, mainNumber);
        if (!ctx.sketches.has(main)) {
            warn(ctx, 'noParentSketch', `Sub-sketch ${item.label} has no main sketch Sk${mainNumber} in the complex.`);
            return;
        }
        add(ctx, awg(item.local), AWG_PROPERTIES.concomitates, awg(main));
    });
}

/**
 * Helper function: addNumberingPrecedence.
 *
 * It adds `awg:precedes` between main sketches with directly following numbers (Sk1 → Sk2)
 * and from the last segment of a sketch to the next sketch,
 * only for the M numbers of the complex and its parts.
 */
function addNumberingPrecedence(ctx: RdfGeneratorContext): void {
    const ownKeys = ownComplexKeys(ctx);
    const numbersByMnr = new Map<string, Set<number>>();
    ctx.sketches.forEach(({ item, mnr, sketchNumber }) => {
        if (!mnr || !sketchNumber || !MAIN_NUMBER_REGEX.test(sketchNumber)) {
            return;
        }
        if (item.complexKey && ownKeys.has(item.complexKey)) {
            getOrCreate(numbersByMnr, mnr, () => new Set()).add(Number(sketchNumber));
        }
    });

    numbersByMnr.forEach((numbers, mnr) => {
        numbers.forEach(number => {
            if (!numbers.has(number + 1)) {
                return;
            }
            const current = sketchLocal(mnr, String(number));
            const next = awg(sketchLocal(mnr, String(number + 1)));
            add(ctx, awg(current), AWG_PROPERTIES.precedes, next);
            const lastLetter = lastSegmentLetter(ctx.sketches.get(current));
            if (lastLetter) {
                add(ctx, awg(segmentLocal(current, lastLetter)), AWG_PROPERTIES.precedes, next);
            }
        });
    });
}

/**
 * Utils function: addGeneticsFacet.
 *
 * It adds the sketch segments (`dcterms:hasPart`, `awg:nextSegment`) and the genetic relations
 * derived from the numbering: `awg:precedes` between main sketches and from the last segment
 * to the next sketch (M numbers of the complex only), `awg:concomitates` from dotted sub-sketches
 * to their main sketch.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {void} Adds the quads of the facet to the context.
 */
export function addGeneticsFacet(ctx: RdfGeneratorContext): void {
    addSegments(ctx);
    addSubSketchConcomitance(ctx);
    addNumberingPrecedence(ctx);
}

/**
 * Object constant: RDF_GENETICS_UTILS.
 *
 * It keeps all genetics utils functions of the generator.
 */
export const RDF_GENETICS_UTILS = {
    addGeneticsFacet,
} as const;
