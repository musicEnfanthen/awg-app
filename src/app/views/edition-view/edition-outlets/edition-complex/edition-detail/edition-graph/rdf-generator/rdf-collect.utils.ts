import type { NamedNode } from '@rdfjs/types';

import type { SourceDesc, SourceDescPhysDesc } from '@awg-views/edition-view/models/source-desc.model';

import {
    complexLabel,
    documentLabel,
    getOrCreate,
    knownComplexKey,
    nextCount,
    onlyValue,
    warn,
} from './rdf-context.utils';
import {
    RdfGeneratorContext,
    RdfItemEntry,
    RdfParatextEntry,
    RdfSketchEntry,
    RdfSourceEntry,
} from './rdf-generator.model';
import {
    complexKeyOfMnr,
    editedLocal,
    folioLocal,
    mnrLocal,
    paratextLocal,
    placeholderSketchLocal,
    rowTableLocal,
    segmentLetter,
    sketchLocal,
    sourceLocal,
} from './rdf-iri.utils';
import { parseItemLabel, parseParatextText, parseReference, parseStatedDate, stripHtml } from './rdf-text.utils';
import { AWG_CLASSES, AWG_INSTANCES } from './rdf-vocab';

/**
 * Array constant: PARATEXT_FIELDS.
 *
 * It keeps the fields of a physical description that hold paratexts, with their kind and type.
 * Measure numbers count only with a position of their own on the folio.
 */
const PARATEXT_FIELDS: readonly { field: keyof SourceDescPhysDesc; kind: string; type: NamedNode }[] = [
    { field: 'titles', kind: 'title', type: AWG_INSTANCES.paratextTypeTitle },
    { field: 'dates', kind: 'dating', type: AWG_INSTANCES.paratextTypeDating },
    { field: 'paginations', kind: 'pagination', type: AWG_INSTANCES.paratextTypePagination },
    { field: 'measureNumbers', kind: 'measureNumbering', type: AWG_INSTANCES.paratextTypeMeasureNumbering },
    { field: 'instrumentations', kind: 'instrumentation', type: AWG_INSTANCES.paratextTypeInstrumentation },
    { field: 'annotations', kind: 'annotation', type: AWG_INSTANCES.paratextTypeAnnotation },
];

/**
 * Utils function: collectSources.
 *
 * It collects the sources of the complex: the source list, descriptions without list entry
 * (e.g. parts Aa–Ad of a convolute A) and text sources.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {RdfSourceEntry[]} The sources of the complex.
 */
export function collectSources(ctx: RdfGeneratorContext): RdfSourceEntry[] {
    const { complexKey, data } = ctx.input;
    const descs = data.sourceDesc?.sources ?? [];
    const listed = data.sourceList?.sources ?? [];
    const fullSiglumOf = (source: { siglum: string; siglumAddendum?: string }) =>
        `${stripHtml(source.siglum)}${stripHtml(source.siglumAddendum)}`;

    const createEntry = (
        source: { siglum: string; siglumAddendum?: string; type: string; documentId?: string },
        desc: SourceDesc | undefined,
        isTextSource: boolean
    ): RdfSourceEntry => {
        const fullSiglum = fullSiglumOf(source);
        const local = sourceLocal(ctx.complexLocal, fullSiglum);
        const document =
            ctx.documentsByUse.get(`${complexKey}:${fullSiglum}`) ??
            (source.documentId ? ctx.documentsById.get(source.documentId) : undefined);
        if (!document && !isTextSource) {
            warn(ctx, 'noDocument', `Source ${fullSiglum} has no document in documents.json.`);
        }
        const sourceLabel = `${complexLabel(ctx, complexKey)} ${fullSiglum}`;
        return {
            base: document?.id ?? local,
            baseLabel: document ? documentLabel(ctx, document) : sourceLabel,
            desc,
            documentId: document?.id,
            fullSiglum,
            local,
            mnrs: new Set(),
            siglum: stripHtml(source.siglum),
            siglumAddendum: stripHtml(source.siglumAddendum),
            type: stripHtml(source.type),
        };
    };

    const descById = new Map(descs.map(desc => [desc.id, desc]));
    const entries = listed.map(source =>
        createEntry(
            source,
            descById.get(source.linkTo) ?? descs.find(desc => fullSiglumOf(desc) === fullSiglumOf(source)),
            false
        )
    );
    const usedDescs = new Set(entries.map(entry => entry.desc));
    descs
        .filter(desc => !usedDescs.has(desc) && fullSiglumOf(desc))
        .forEach(desc => entries.push(createEntry(desc, desc, false)));
    data.sourceList?.textSources?.forEach(source => entries.push(createEntry(source, undefined, true)));

    return entries;
}

/**
 * Utils function: collectItems.
 *
 * It resolves the content items of the source descriptions to sketches and row tables.
 * Placeholders (`Sk##`) are counted per M number over the complex.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {RdfItemEntry[]} The inscriptions of the content items.
 */
export function collectItems(ctx: RdfGeneratorContext): RdfItemEntry[] {
    const placeholderCounters = new Map<string, number>();
    const items: RdfItemEntry[] = [];

    ctx.sources.forEach(source => {
        source.desc?.physDesc?.contents?.forEach(content => {
            const label = stripHtml(content.item);
            const parsed = parseItemLabel(label);

            switch (parsed.kind) {
                case 'sketch':
                case 'placeholder': {
                    const mnr = mnrLocal(parsed.prefix, parsed.number);
                    source.mnrs.add(mnr);
                    const complexKey =
                        knownComplexKey(ctx, complexKeyOfMnr(mnr)) ??
                        knownComplexKey(ctx, content.itemLinkTo?.complexId);
                    if (!complexKey) {
                        warn(ctx, 'noComplex', `Sketch ${label} (source ${source.fullSiglum}) has no complex.`);
                    }
                    if (parsed.kind === 'sketch') {
                        items.push({
                            complexKey,
                            content,
                            label,
                            local: sketchLocal(mnr, parsed.sketchNumber),
                            source,
                            type: AWG_CLASSES.sketch,
                        });
                        break;
                    }
                    const counter = nextCount(placeholderCounters, mnr);
                    const local = placeholderSketchLocal(mnr, counter);
                    warn(ctx, 'placeholder', `Placeholder ${label} (source ${source.fullSiglum}) as ${local}.`);
                    items.push({
                        complexKey,
                        content,
                        label: `${label} (${counter})`,
                        local,
                        source,
                        type: AWG_CLASSES.sketch,
                    });
                    break;
                }
                case 'rowTable':
                    items.push({
                        complexKey: ctx.input.complexKey,
                        content,
                        label: label.replace(/\bM(\*?)(?=\d)/g, 'M$1 '),
                        local: rowTableLocal(ctx.complexLocal),
                        source,
                        type: AWG_CLASSES.rowTable,
                    });
                    break;
                case 'mnr':
                    source.mnrs.add(mnrLocal(parsed.prefix, parsed.number));
                    break;
                case 'empty':
                    warn(ctx, 'emptyItem', `Source ${source.fullSiglum} has a content item without label.`);
                    break;
                case 'unknown':
                    warn(ctx, 'unknownItem', `Content item ${label} (source ${source.fullSiglum}) is not a sketch.`);
                    break;
            }
        });
    });
    return items;
}

/**
 * Helper function: createSketchEntry.
 *
 * It creates the entry of a sketch or row table, with M number and sketch number of a numbered sketch.
 */
function createSketchEntry(item: RdfItemEntry): RdfSketchEntry {
    const parsed = parseItemLabel(item.label);
    if (parsed.kind !== 'sketch') {
        return { item, measuresBySegment: new Map() };
    }
    return {
        item,
        measuresBySegment: new Map(),
        mnr: mnrLocal(parsed.prefix, parsed.number),
        sketchNumber: parsed.sketchNumber,
    };
}

/**
 * Helper function: addSegmentMeasure.
 *
 * It records a segment of a sketch named by a sheet id, with the measures of a system if given.
 */
function addSegmentMeasure(
    ctx: RdfGeneratorContext,
    sketch: RdfSketchEntry,
    sheetId: string | undefined,
    measure?: string
): void {
    if (!sheetId) {
        return;
    }
    const letter = segmentLetter(sketch.item.local, editedLocal(ctx.complexLocal, sheetId));
    if (!letter) {
        return;
    }
    const measures = getOrCreate(sketch.measuresBySegment, letter, () => []);
    const plainMeasure = stripHtml(measure);
    if (plainMeasure && !measures.includes(plainMeasure)) {
        measures.push(plainMeasure);
    }
}

/**
 * Utils function: collectSketches.
 *
 * It collects the sketches and row tables of the content items once each, with their segments:
 * the partials of the svg sketch sheets and the sheet ids of the content items and their systems
 * (`itemLinkTo`, `linkTo`), with the measures of those systems.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {Map<string, RdfSketchEntry>} The sketches by local name.
 */
export function collectSketches(ctx: RdfGeneratorContext): Map<string, RdfSketchEntry> {
    const sketches = new Map<string, RdfSketchEntry>();

    ctx.items.forEach(item => {
        const sketch = getOrCreate(sketches, item.local, () => createSketchEntry(item));
        addSegmentMeasure(ctx, sketch, item.content.itemLinkTo?.sheetId);
        item.content.folios?.forEach(folio => {
            folio.systemGroups?.flat().forEach(system => {
                addSegmentMeasure(ctx, sketch, system.linkTo, system.measure);
            });
        });
    });

    ctx.input.data.svgSheets?.sheets?.sketchEditions?.forEach(sheet => {
        const sketch = sketches.get(editedLocal(ctx.complexLocal, sheet.id));
        sheet.content?.forEach(content => {
            if (sketch && content.partial) {
                addSegmentMeasure(ctx, sketch, `${sheet.id}${content.partial}`);
            }
        });
    });

    return sketches;
}

/**
 * Utils function: collectParatexts.
 *
 * It resolves the paratexts of the physical descriptions (titles, datings, paginations,
 * positioned measure numbers, instrument indications, annotations), counted per folio and kind.
 * Without a reference, a paratext belongs to the complex of the only M number of the source,
 * else to the only complex of all sketches on its folio, else to the complex of the data.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {RdfParatextEntry[]} The paratexts of the physical descriptions.
 */
export function collectParatexts(ctx: RdfGeneratorContext): RdfParatextEntry[] {
    const paratexts: RdfParatextEntry[] = [];

    ctx.sources.forEach(source => {
        const counters = new Map<string, number>();
        const uniqueMnr = onlyValue(source.mnrs);
        const sourceComplexKey = knownComplexKey(ctx, uniqueMnr && complexKeyOfMnr(uniqueMnr));

        // Complexes of the sketches per folio; a sketch without complex adds `undefined`
        const complexesByFolio = new Map<string, Set<string | undefined>>();
        ctx.items
            .filter(item => item.source === source)
            .forEach(item => {
                item.content.folios?.forEach(({ folio }) => {
                    if (folio) {
                        getOrCreate(complexesByFolio, folio, () => new Set()).add(item.complexKey);
                    }
                });
            });
        const folioComplexKey = (folio: string | undefined): string | undefined =>
            folio ? onlyValue(complexesByFolio.get(folio)) : undefined;

        PARATEXT_FIELDS.forEach(({ field, kind, type }) => {
            const entries = source.desc?.physDesc?.[field];
            if (!Array.isArray(entries)) {
                return;
            }
            entries.forEach(entry => {
                if (typeof entry !== 'string') {
                    return;
                }
                const text = stripHtml(entry);
                const parsed = parseParatextText(text);
                if (kind === 'measureNumbering' && !parsed.folio) {
                    return;
                }
                if (!parsed.folio) {
                    warn(ctx, 'noFolio', `Paratext without folio (source ${source.fullSiglum}): ${text}`);
                }
                const base = parsed.folio ? folioLocal(source.base, parsed.folio) : source.base;
                const counter = nextCount(counters, `${base} ${kind}`);

                let complexKey = sourceComplexKey ?? folioComplexKey(parsed.folio) ?? ctx.input.complexKey;
                let accompanies: string | undefined;
                const reference = parsed.reference ? parseReference(parsed.reference) : null;
                if (reference?.kind === 'opus') {
                    complexKey = knownComplexKey(ctx, `op${reference.number}`) ?? complexKey;
                } else if (reference?.kind === 'sketch') {
                    const mnr =
                        reference.prefix && reference.number ? mnrLocal(reference.prefix, reference.number) : uniqueMnr;
                    if (mnr) {
                        accompanies = sketchLocal(mnr, reference.sketchNumber);
                        complexKey = knownComplexKey(ctx, complexKeyOfMnr(mnr)) ?? complexKey;
                    }
                }
                if (parsed.reference && !accompanies && reference?.kind !== 'opus') {
                    warn(ctx, 'unresolvedReference', `Reference not resolved (source ${source.fullSiglum}): ${text}`);
                }

                const statedDate = kind === 'dating' ? parseStatedDate(parsed.content) : null;
                if (kind === 'dating' && !statedDate) {
                    warn(ctx, 'incompleteDate', `Dating without complete date (source ${source.fullSiglum}): ${text}`);
                }

                paratexts.push({
                    accompanies,
                    complexKey,
                    folio: parsed.folio,
                    isPage: parsed.isPage,
                    label: kind === 'dating' ? `Datierung: ${parsed.content}` : parsed.content,
                    local: paratextLocal(base, kind, counter),
                    source,
                    statedDate: statedDate ?? undefined,
                    type,
                });
            });
        });
    });
    return paratexts;
}

/**
 * Object constant: RDF_COLLECT_UTILS.
 *
 * It keeps all collect utils functions of the generator.
 */
export const RDF_COLLECT_UTILS = {
    collectItems,
    collectParatexts,
    collectSketches,
    collectSources,
} as const;
