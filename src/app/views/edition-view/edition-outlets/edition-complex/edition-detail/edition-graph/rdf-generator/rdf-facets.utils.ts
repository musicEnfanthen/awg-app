import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';

import { EDITION_ROUTE_CONSTANTS, EditionRouteConstantsKey } from '@awg-views/edition-view/edition-routes.constants';
import type { EditionTypeKey } from '@awg-views/edition-view/models/edition-type.model';
import type { SourceDescPhysDesc } from '@awg-views/edition-view/models/source-desc.model';

import {
    add,
    addLabel,
    addTypes,
    complexEntry,
    complexIri,
    complexLabel,
    documentLabel,
    knownComplexKey,
    warn,
} from './rdf-context.utils';
import { RdfGeneratorContext, RdfSourceEntry } from './rdf-generator.model';
import {
    complexKeyOfMnr,
    complexLocal,
    complexPartLocal,
    editedLocal,
    folioLocal,
    placementLocal,
    sectionLocal,
    seriesLocal,
    sheetLocal,
    textVersionLocal,
} from './rdf-iri.utils';
import { stripHtml } from './rdf-text.utils';
import { awg, AWG_CLASSES, AWG_INSTANCES, AWG_PROPERTIES, EXTERNAL_TERMS } from './rdf-vocab';

/**
 * Object constant: SHEET_CLASSES.
 *
 * It keeps the classes of the svg sheets by edition type, with the label suffix of the sheet.
 */
const SHEET_CLASSES: Readonly<Record<EditionTypeKey, { type: NamedNode; label: string }>> = {
    sketchEditions: { type: AWG_CLASSES.sketchEdition, label: 'Skizzenedition' },
    textEditions: { type: AWG_CLASSES.textEdition, label: 'Textedition' },
    workEditions: { type: AWG_CLASSES.workEdition, label: 'Werkedition' },
};

/**
 * Object constant: CATALOGUE_TYPES.
 *
 * It keeps the catalogue type concepts by catalogue type key.
 */
const CATALOGUE_TYPES: Readonly<Record<string, NamedNode>> = {
    MNR: AWG_INSTANCES.catalogueTypeMnr,
    MNR_X: AWG_INSTANCES.catalogueTypeMnrX,
    OPUS: AWG_INSTANCES.catalogueTypeOpus,
};

/**
 * Regex constant: LINK_TAG_REGEX.
 *
 * It keeps a regex for the opening anchor tags of internal edition links.
 */
const LINK_TAG_REGEX = /<a\b[^>]*>/gi;

/**
 * Regex constant: TEXT_VERSION_ID_REGEX.
 *
 * It keeps a regex for the id of a text version sheet (e.g. `M317_TF1`, `Mx409_TF1`, `M35_42_TF1`).
 */
const TEXT_VERSION_ID_REGEX = /^(Mx?\d+(?:_\d+)?)_TF\d+$/;

/**
 * Helper function: physDescTexts.
 *
 * It collects the HTML strings of a physical description except the corrections (textcritics).
 */
function physDescTexts(physDesc: SourceDescPhysDesc | undefined): string[] {
    if (!physDesc) {
        return [];
    }
    const { conditions, titles, dates, paginations, measureNumbers, instrumentations, annotations, contents } =
        physDesc;
    const texts = [conditions, titles, dates, paginations, measureNumbers, instrumentations, annotations].flatMap(
        list => list ?? []
    );
    contents?.forEach(content => {
        texts.push(content.item ?? '', content.itemDescription ?? '');
        content.folios?.forEach(folio => {
            texts.push(folio.folioDescription ?? '');
            folio.systemGroups?.flat().forEach(system => texts.push(system.systemDescription ?? ''));
        });
    });
    return texts;
}

/**
 * Helper function: addSection.
 *
 * It adds a section with its series and the complete edition (facet edition).
 */
function addSection(ctx: RdfGeneratorContext, series: string, section: string): void {
    const seriesConstant = EDITION_ROUTE_CONSTANTS[`SERIES_${series}` as EditionRouteConstantsKey];
    const sectionConstant = EDITION_ROUTE_CONSTANTS[`SECTION_${section.toUpperCase()}` as EditionRouteConstantsKey];
    const seriesShort = seriesConstant?.short ?? series;
    const sectionShort = sectionConstant?.short ?? section;
    const edition = AWG_INSTANCES.completeEdition;
    const seriesIri = awg(seriesLocal(series));
    const sectionIri = awg(sectionLocal(series, section));

    addTypes(ctx, edition, AWG_CLASSES.completeEdition);
    addLabel(ctx, edition, 'Anton Webern Gesamtausgabe');

    addTypes(ctx, seriesIri, AWG_CLASSES.series);
    addLabel(ctx, seriesIri, `Serie ${seriesShort}`);
    add(ctx, seriesIri, EXTERNAL_TERMS.title, DataFactory.literal(seriesConstant?.full ?? ''));
    add(ctx, seriesIri, EXTERNAL_TERMS.isPartOf, edition);

    addTypes(ctx, sectionIri, AWG_CLASSES.section);
    addLabel(ctx, sectionIri, `AWG ${seriesShort}/${sectionShort}`);
    add(ctx, sectionIri, EXTERNAL_TERMS.title, DataFactory.literal(sectionConstant?.full ?? ''));
    add(ctx, sectionIri, EXTERNAL_TERMS.isPartOf, seriesIri);
}

/**
 * Helper function: addComplex.
 *
 * It adds an edition complex with its catalogue data and section (facet edition).
 */
function addComplex(ctx: RdfGeneratorContext, complexKey: string): void {
    const entry = complexEntry(ctx, complexKey);
    const iri = awg(complexLocal(complexKey));
    if (!entry) {
        addTypes(ctx, iri, AWG_CLASSES.editionComplex);
        addLabel(ctx, iri, complexKey);
        return;
    }
    const { titleStatement, pubStatement, parts } = entry;
    addTypes(ctx, iri, parts?.length ? AWG_CLASSES.compositeEditionComplex : AWG_CLASSES.editionComplex);
    addLabel(ctx, iri, complexLabel(ctx, complexKey));
    add(ctx, iri, EXTERNAL_TERMS.title, DataFactory.literal(stripHtml(titleStatement.title)));
    add(ctx, iri, AWG_PROPERTIES.catalogueType, CATALOGUE_TYPES[titleStatement.catalogueType.toUpperCase()]);
    add(ctx, iri, AWG_PROPERTIES.catalogueNumber, DataFactory.literal(titleStatement.catalogueNumber));
    if (pubStatement.series && pubStatement.section) {
        add(ctx, iri, EXTERNAL_TERMS.isPartOf, awg(sectionLocal(pubStatement.series, pubStatement.section)));
        addSection(ctx, pubStatement.series, pubStatement.section);
    }
}

/**
 * Helper function: addTextVersion.
 *
 * It adds the type of a text version and its complex.
 */
function addTextVersion(ctx: RdfGeneratorContext, local: string, mnr: string): void {
    const iri = awg(local);
    addTypes(ctx, iri, AWG_CLASSES.textVersion);
    const complexKey = knownComplexKey(ctx, complexKeyOfMnr(mnr));
    if (complexKey) {
        add(ctx, iri, AWG_PROPERTIES.belongsToComplex, complexIri(ctx, complexKey));
    }
}

/**
 * Utils function: addEditionFacet.
 *
 * It adds the complex, its parts (positions, part complexes, text versions of the work edition)
 * and the complexes referenced by the other facets.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {void} Adds the quads of the facet to the context.
 */
export function addEditionFacet(ctx: RdfGeneratorContext): void {
    const { complexKey } = ctx.input;
    const iri = complexIri(ctx, complexKey);

    complexEntry(ctx, complexKey)?.parts?.forEach((part, index) => {
        const partNumber = index + 1;
        const partIri = awg(complexPartLocal(ctx.complexLocal, partNumber));
        const partComplexIri = complexIri(ctx, part.complex);
        add(ctx, iri, EXTERNAL_TERMS.hasPart, partComplexIri);
        addTypes(ctx, partIri, AWG_CLASSES.complexPart);
        addLabel(
            ctx,
            partIri,
            `${complexLabel(ctx, complexKey)}, Teil ${partNumber}: ${complexLabel(ctx, part.complex)}`
        );
        add(ctx, partIri, AWG_PROPERTIES.partOfComplex, iri);
        add(ctx, partIri, AWG_PROPERTIES.partComplex, partComplexIri);
        add(
            ctx,
            partIri,
            AWG_PROPERTIES.partNumber,
            DataFactory.literal(String(partNumber), EXTERNAL_TERMS.xsdInteger)
        );
        if (part.textVersion) {
            const textVersion = textVersionLocal(complexLocal(part.complex), part.textVersion);
            add(ctx, partIri, AWG_PROPERTIES.workEditionTextVersion, awg(textVersion));
            addTextVersion(ctx, textVersion, complexLocal(part.complex));
        }
    });

    [...ctx.referencedComplexes].forEach(key => addComplex(ctx, key));
}

/**
 * Utils function: addDocumentsFacet.
 *
 * It adds the sources with their documents, the sketches and row tables of the content items
 * and the paratexts.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {void} Adds the quads of the facet to the context.
 */
export function addDocumentsFacet(ctx: RdfGeneratorContext): void {
    ctx.sources.forEach(source => {
        const iri = awg(source.local);
        addTypes(ctx, iri, AWG_CLASSES.source);
        addLabel(ctx, iri, `${complexLabel(ctx, ctx.input.complexKey)} ${source.fullSiglum}`);
        add(ctx, iri, AWG_PROPERTIES.siglum, DataFactory.literal(source.siglum));
        add(ctx, iri, AWG_PROPERTIES.siglumAddendum, DataFactory.literal(source.siglumAddendum));
        add(ctx, iri, AWG_PROPERTIES.sourceType, DataFactory.literal(source.type));
        add(ctx, iri, AWG_PROPERTIES.belongsToComplex, complexIri(ctx, ctx.input.complexKey));

        const document = source.documentId ? ctx.documentsById.get(source.documentId) : undefined;
        if (document) {
            const documentIri = awg(document.id);
            add(ctx, iri, AWG_PROPERTIES.hasDocument, documentIri);
            addTypes(ctx, documentIri, AWG_CLASSES.document);
            addLabel(ctx, documentIri, documentLabel(ctx, document));
            if (document.partOf) {
                const container = ctx.documentsById.get(document.partOf);
                const containerIri = awg(document.partOf);
                add(ctx, documentIri, EXTERNAL_TERMS.isPartOf, containerIri);
                addTypes(ctx, containerIri, AWG_CLASSES.document);
                if (container) {
                    addLabel(ctx, containerIri, documentLabel(ctx, container));
                }
            }
        }
    });

    ctx.items.forEach(item => {
        const iri = awg(item.local);
        addTypes(ctx, iri, item.type);
        addLabel(ctx, iri, item.label);
        if (item.complexKey) {
            add(ctx, iri, AWG_PROPERTIES.belongsToComplex, complexIri(ctx, item.complexKey));
        }
    });

    ctx.paratexts.forEach(paratext => {
        const iri = awg(paratext.local);
        addTypes(ctx, iri, AWG_CLASSES.paratext);
        addLabel(ctx, iri, paratext.label);
        add(ctx, iri, AWG_PROPERTIES.paratextType, paratext.type);
        add(ctx, iri, AWG_PROPERTIES.belongsToComplex, complexIri(ctx, paratext.complexKey));
        if (paratext.accompanies) {
            add(ctx, iri, AWG_PROPERTIES.accompanies, awg(paratext.accompanies));
        }
        if (paratext.statedDate) {
            add(ctx, iri, AWG_PROPERTIES.statedDate, DataFactory.literal(paratext.statedDate, EXTERNAL_TERMS.xsdDate));
        }
    });
}

/**
 * Helper function: joinPlain.
 *
 * It joins the non-empty plain texts of a list.
 */
function joinPlain(texts: (string | undefined)[]): string {
    return texts
        .map(text => stripHtml(text))
        .filter(Boolean)
        .join(', ');
}

/**
 * Helper function: addFolio.
 *
 * It adds a folio of a document (or of a source without document) and returns its local name.
 */
function addFolio(ctx: RdfGeneratorContext, source: RdfSourceEntry, folio: string, isPage = false): string {
    const local = folioLocal(source.base, folio);
    const iri = awg(local);
    addTypes(ctx, iri, AWG_CLASSES.folio);
    addLabel(ctx, iri, `${source.baseLabel}, ${isPage ? 'S.' : 'Bl.'} ${folio}`);
    add(ctx, iri, EXTERNAL_TERMS.isPartOf, awg(source.base));
    return local;
}

/**
 * Utils function: addFoliosFacet.
 *
 * It adds the folios with their placements of sketches and paratexts,
 * and the number of staves and dimensions from the folio convolutes.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {void} Adds the quads of the facet to the context.
 */
export function addFoliosFacet(ctx: RdfGeneratorContext): void {
    ctx.items.forEach(item => {
        item.content.folios?.forEach(folio => {
            if (!folio.folio) {
                return;
            }
            const folioName = addFolio(ctx, item.source, folio.folio, folio.isPage);
            const placement = awg(placementLocal(item.local, folioName));
            const systems = (folio.systemGroups ?? []).flat();
            add(ctx, awg(item.local), AWG_PROPERTIES.writtenOn, awg(folioName));
            addTypes(ctx, placement, AWG_CLASSES.placement);
            addLabel(ctx, placement, `${item.label}, ${folio.isPage ? 'S.' : 'Bl.'} ${folio.folio}`);
            add(ctx, placement, AWG_PROPERTIES.placementOf, awg(item.local));
            add(ctx, placement, AWG_PROPERTIES.onFolio, awg(folioName));
            add(
                ctx,
                placement,
                AWG_PROPERTIES.systems,
                DataFactory.literal(joinPlain(systems.map(system => system.system)))
            );
            add(
                ctx,
                placement,
                AWG_PROPERTIES.measures,
                DataFactory.literal(joinPlain(systems.map(system => system.measure)))
            );
        });
    });

    ctx.paratexts.forEach(paratext => {
        if (paratext.folio) {
            const folioName = addFolio(ctx, paratext.source, paratext.folio, paratext.isPage);
            add(ctx, awg(paratext.local), AWG_PROPERTIES.writtenOn, awg(folioName));
        }
    });

    ctx.input.data.folioConvolute?.convolutes?.forEach(convolute => {
        if (!convolute.folios?.length) {
            return;
        }
        const source = ctx.sources.find(entry => entry.fullSiglum === stripHtml(convolute.convoluteId));
        if (!source) {
            warn(ctx, 'unknownConvolute', `Folio convolute ${convolute.convoluteId} has no source.`);
            return;
        }
        convolute.folios.forEach(folio => {
            const iri = awg(addFolio(ctx, source, folio.folioId));
            if (/^\d+$/.test(folio.systems)) {
                add(
                    ctx,
                    iri,
                    AWG_PROPERTIES.systemCount,
                    DataFactory.literal(folio.systems, EXTERNAL_TERMS.xsdInteger)
                );
            }
            if (folio.dimensions?.height > 0 && folio.dimensions?.width > 0) {
                add(
                    ctx,
                    iri,
                    AWG_PROPERTIES.height,
                    DataFactory.literal(String(folio.dimensions.height), EXTERNAL_TERMS.xsdDecimal)
                );
                add(
                    ctx,
                    iri,
                    AWG_PROPERTIES.width,
                    DataFactory.literal(String(folio.dimensions.width), EXTERNAL_TERMS.xsdDecimal)
                );
            }
        });
    });
}

/**
 * Utils function: addEditionsFacet.
 *
 * It adds the sheets with what they edit (sketches, row tables, text versions)
 * and the sources transmitting the text versions.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {void} Adds the quads of the facet to the context.
 */
export function addEditionsFacet(ctx: RdfGeneratorContext): void {
    const sheets = ctx.input.data.svgSheets?.sheets;
    (Object.keys(SHEET_CLASSES) as EditionTypeKey[]).forEach(editionType => {
        sheets?.[editionType]?.forEach(sheet => {
            const edited = editedLocal(ctx.complexLocal, sheet.id);
            const iri = awg(sheetLocal(edited));
            const label = stripHtml(sheet.label) || sheet.id;
            addTypes(ctx, iri, SHEET_CLASSES[editionType].type);
            addLabel(ctx, iri, `${label} (${SHEET_CLASSES[editionType].label})`);
            add(ctx, iri, AWG_PROPERTIES.edits, awg(edited));

            const textVersionMnr = TEXT_VERSION_ID_REGEX.exec(sheet.id)?.[1];
            if (editionType !== 'sketchEditions' && textVersionMnr) {
                addTextVersion(ctx, edited, textVersionMnr);
                addLabel(ctx, awg(edited), label);
            }
        });
    });

    ctx.sources.forEach(source => {
        source.desc?.physDesc?.contents?.forEach(content => {
            const sheetId = content.itemLinkTo?.sheetId ?? '';
            const textVersionMnr = TEXT_VERSION_ID_REGEX.exec(sheetId)?.[1];
            if (textVersionMnr) {
                addTextVersion(ctx, sheetId, textVersionMnr);
                add(ctx, awg(sheetId), AWG_PROPERTIES.transmittedBy, awg(source.local));
            }
        });
    });
}

/**
 * Utils function: addReferencesFacet.
 *
 * It adds the internal edition links of the physical descriptions (without corrections)
 * as `dcterms:references` from the source to the linked sheet or complex.
 *
 * @param {RdfGeneratorContext} ctx The given generator context.
 * @returns {void} Adds the quads of the facet to the context.
 */
export function addReferencesFacet(ctx: RdfGeneratorContext): void {
    ctx.sources.forEach(source => {
        physDescTexts(source.desc?.physDesc).forEach(html => {
            for (const [tag] of html.matchAll(LINK_TAG_REGEX)) {
                const linkedComplex = /data-complex-id=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
                const linkedSheet = /data-sheet-id=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
                const complexKey = linkedComplex ? knownComplexKey(ctx, linkedComplex) : ctx.input.complexKey;
                if (!complexKey) {
                    warn(
                        ctx,
                        'unresolvedReference',
                        `Link to unknown complex ${linkedComplex} (source ${source.fullSiglum}).`
                    );
                    continue;
                }
                const target = linkedSheet
                    ? awg(sheetLocal(editedLocal(complexLocal(complexKey), linkedSheet)))
                    : linkedComplex
                      ? complexIri(ctx, complexKey)
                      : undefined;
                add(ctx, awg(source.local), EXTERNAL_TERMS.references, target);
            }
        });
    });
}

/**
 * Object constant: RDF_FACETS_UTILS.
 *
 * It keeps all facet utils functions of the generator.
 */
export const RDF_FACETS_UTILS = {
    addDocumentsFacet,
    addEditionFacet,
    addEditionsFacet,
    addFoliosFacet,
    addReferencesFacet,
} as const;
