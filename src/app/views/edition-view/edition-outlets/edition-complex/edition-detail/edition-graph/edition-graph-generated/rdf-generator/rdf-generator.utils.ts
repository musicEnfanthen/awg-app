import type { NamedNode, Quad, Quad_Object, Quad_Subject } from '@rdfjs/types';
import { DataFactory, Parser, Writer } from 'n3';

import { EDITION_TRADEMARKS_DATA } from '@awg-views/edition-view/data/edition-trademarks.data';
import { EditionSvgSheet } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { EditionTypeKey } from '@awg-views/edition-view/models/edition-type.model';
import { SourceDesc, SourceDescPhysDesc } from '@awg-views/edition-view/models/source-desc.model';
import { Source, TextSource } from '@awg-views/edition-view/models/source.model';
import { Textcritics } from '@awg-views/edition-view/models/textcritics.model';

import {
    EditionRdfBundle,
    GeneratedGraphFacet,
    GeneratedGraphOptions,
    GeneratedGraphResult,
    GeneratedGraphStats,
} from '../edition-graph-generated.model';
import { buildGeneratedQueries } from './rdf-queries.data';
import {
    AWG_CLASSES,
    AWG_PROPERTIES,
    AWG_REPOSITORIES,
    GENERATED_GRAPH_PREFIXES,
    ONTOLOGY_ALIGNMENT,
    RDF_NAMESPACES,
} from './rdf-vocab';

const { literal, namedNode, quad } = DataFactory;

/**
 * Constant: EDITION_BASE_URL.
 *
 * It holds the base URL of the online edition.
 */
const EDITION_BASE_URL = 'https://edition.anton-webern.ch';

/**
 * Constant: MAX_LITERAL_LENGTH.
 *
 * It holds the maximum length of free-text literals (longer texts are truncated).
 */
const MAX_LITERAL_LENGTH = 240;

/**
 * Regex constant: LINK_TAG_REGEX.
 *
 * It matches opening anchor tags inside HTML strings.
 */
const LINK_TAG_REGEX = /<a\b[^>]*>/gi;

/**
 * Regex constant: YEAR_REGEX.
 *
 * It matches four-digit years between 1880 and 1959 (lifetime of Webern plus reception).
 */
const YEAR_REGEX = /\b(18[89]\d|19[0-5]\d)\b/g;

/**
 * Regex constant: RISM_SIGLUM_REGEX.
 *
 * It matches a RISM library siglum like `CH-Bps` or `US-NYpm`.
 */
const RISM_SIGLUM_REGEX = /\b([A-Z]{1,3}-[A-Z][A-Za-z]*)\b/;

/**
 * Object constant: SHEET_CLASSES.
 *
 * It maps the edition types of the svg sheets to the AWG classes.
 */
const SHEET_CLASSES: Record<EditionTypeKey, NamedNode> = {
    workEditions: AWG_CLASSES.workEdition,
    textEditions: AWG_CLASSES.textEdition,
    sketchEditions: AWG_CLASSES.sketch,
};

/**
 * Helper function: termKey.
 *
 * It gets a unique key for an RDF term.
 */
function termKey(term: Quad_Object): string {
    if (term.termType === 'Literal') {
        return `L:${term.value}@${term.language}^${term.datatype.value}`;
    }
    return `${term.termType}:${term.value}`;
}

/**
 * Helper function: decodeEntities.
 *
 * It decodes HTML entities (with a textarea in the browser, which does not execute any markup).
 */
function decodeEntities(text: string): string {
    if (!text.includes('&')) {
        return text;
    }
    if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
}

/**
 * The QuadSink class.
 *
 * It collects quads and drops duplicates.
 */
class QuadSink {
    readonly quads: Quad[] = [];
    private readonly _keys = new Set<string>();

    add(subject: Quad_Subject, predicate: NamedNode, object: Quad_Object | undefined | null): void {
        if (!object || (object.termType === 'Literal' && !object.value)) {
            return;
        }
        const key = `${subject.value}|${predicate.value}|${termKey(object)}`;
        if (this._keys.has(key)) {
            return;
        }
        this._keys.add(key);
        this.quads.push(quad(subject, predicate, object));
    }

    addQuads(quads: Quad[]): void {
        quads.forEach(q => this.add(q.subject, q.predicate as NamedNode, q.object));
    }
}

/**
 * The BundleContext interface.
 *
 * It holds the lookup tables of a single edition complex during generation.
 */
interface BundleContext {
    readonly bundle: EditionRdfBundle;
    readonly key: string;
    readonly iri: NamedNode;
    readonly label: string;
    readonly sources: Map<string, NamedNode>;
}

/**
 * The SourceEntry interface.
 *
 * It merges a source of the source list with its (optional) source description.
 */
interface SourceEntry {
    readonly iri: NamedNode;
    readonly source: Pick<Source, 'siglum' | 'siglumAddendum' | 'missing' | 'type' | 'location'>;
    readonly desc?: SourceDesc;
    readonly isTextSource: boolean;
}

/**
 * Utils function: stripHtml.
 *
 * It converts an HTML string of the edition data into plain text:
 * tags and snippet placeholders (`##KEY##`) are removed, entities decoded
 * and whitespace collapsed.
 *
 * @param {string} html The given HTML string.
 * @returns {string} The plain text.
 */
export function stripHtml(html: string | undefined | null): string {
    if (!html) {
        return '';
    }
    const withoutTags = html
        .replace(/##[^#]*##/g, ' ')
        .replace(/<[^>]*>/g, ' ')
        .trim();
    return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/**
 * Helper function: truncate.
 *
 * It truncates a text to the maximum literal length.
 */
function truncate(text: string): string {
    return text.length > MAX_LITERAL_LENGTH ? `${text.slice(0, MAX_LITERAL_LENGTH - 1)}…` : text;
}

/**
 * Utils function: slug.
 *
 * It converts a text into a safe local name for an IRI.
 *
 * @param {string} text The given text.
 * @returns {string} The slug.
 */
export function slug(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z0-9-]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Utils function: complexIri.
 *
 * It gets the IRI of an edition complex by its key (e.g. `op25` → `awg:Op25`),
 * matching the IRIs of the curated triples.
 *
 * @param {string} key The given complex key.
 * @returns {NamedNode} The IRI of the edition complex.
 */
export function complexIri(key: string): NamedNode {
    const local = slug(key);
    return RDF_NAMESPACES.awg(local.charAt(0).toUpperCase() + local.slice(1));
}

/**
 * Utils function: sheetIri.
 *
 * It gets the IRI of an edition sheet by its id (e.g. `M317_Sk1` → `awg:M317_Sk1`),
 * matching the IRIs of the curated triples.
 *
 * @param {string} sheetId The given sheet id.
 * @returns {NamedNode} The IRI of the sheet.
 */
export function sheetIri(sheetId: string): NamedNode {
    return RDF_NAMESPACES.awg(slug(sheetId));
}

/**
 * Utils function: complexKeyOf.
 *
 * It gets the key of an edition complex from its route (e.g. `/op25` → `op25`).
 *
 * @param {EditionRdfBundle} bundle The given bundle.
 * @returns {string} The complex key.
 */
export function complexKeyOf(bundle: EditionRdfBundle): string {
    return bundle.complex.complexId.route.replace(/^\//, '');
}

/**
 * Utils function: parseLocation.
 *
 * It splits a location string of a source into RISM siglum and shelfmark.
 *
 * @param {string} location The given location string.
 * @returns {{ siglum?: string; shelfmark?: string; text: string }} The parsed location.
 */
export function parseLocation(location: string): { siglum?: string; shelfmark?: string; text: string } {
    const text = stripHtml(location);
    const match = RISM_SIGLUM_REGEX.exec(text);
    if (!match) {
        return { text };
    }
    const shelfmark = text
        .slice(match.index + match[1].length)
        .replace(/^[\s,:]+/, '')
        .replace(/\.$/, '')
        .trim();
    return { siglum: match[1], shelfmark: shelfmark || undefined, text };
}

/**
 * Utils function: extractYears.
 *
 * It extracts (plausible) years from a list of texts.
 *
 * @param {string[]} texts The given texts.
 * @returns {string[]} The unique years found.
 */
export function extractYears(texts: string[]): string[] {
    const years = new Set<string>();
    texts.forEach(text => {
        for (const match of stripHtml(text).matchAll(YEAR_REGEX)) {
            years.add(match[1]);
        }
    });
    return [...years].sort();
}

/**
 * Utils function: asStringArray.
 *
 * It normalizes a value of the edition data that should be a list of strings,
 * but is sometimes given as single string (legacy data).
 *
 * @param {unknown} value The given value.
 * @returns {string[]} The list of (non-empty) strings.
 */
export function asStringArray(value: unknown): string[] {
    const list = Array.isArray(value) ? value : [value];
    return list.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
}

/**
 * Utils function: datesOf.
 *
 * It gets the dates of a physical description (also from the legacy key `date`).
 *
 * @param {SourceDescPhysDesc} physDesc The given physical description.
 * @returns {string[]} The dates.
 */
export function datesOf(physDesc: SourceDescPhysDesc | undefined): string[] {
    const legacy = (physDesc as { date?: string | string[] } | undefined)?.date;
    return asStringArray(physDesc?.dates ?? legacy);
}

/**
 * Utils function: extractLinks.
 *
 * It extracts the internal edition links (`data-complex-id`, `data-sheet-id`)
 * from an HTML string.
 *
 * @param {string} html The given HTML string.
 * @returns {{ complexId: string; sheetId: string }[]} The links found.
 */
export function extractLinks(html: string | undefined): { complexId: string; sheetId: string }[] {
    if (!html || !html.includes('data-')) {
        return [];
    }
    const links: { complexId: string; sheetId: string }[] = [];
    for (const [tag] of html.matchAll(LINK_TAG_REGEX)) {
        const complexId = /data-complex-id=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
        const sheetId = /data-sheet-id=["']([^"']*)["']/.exec(tag)?.[1] ?? '';
        if (complexId || sheetId) {
            links.push({ complexId, sheetId });
        }
    }
    return links;
}

/**
 * Utils function: physDescTexts.
 *
 * It collects all HTML strings of a physical description (used for the link extraction).
 */
export function physDescTexts(physDesc: SourceDescPhysDesc | undefined): string[] {
    if (!physDesc) {
        return [];
    }
    const texts: string[] = [];
    Object.values(physDesc).forEach(value => texts.push(...asStringArray(value)));
    physDesc.contents?.forEach(content => {
        texts.push(content.item ?? '', content.itemDescription ?? '');
        content.folios?.forEach(folio => {
            texts.push(folio.folioDescription ?? '');
            folio.systemGroups?.flat().forEach(system => texts.push(system.systemDescription ?? ''));
        });
    });
    return texts;
}

/**
 * Utils function: textcriticsTexts.
 *
 * It collects all HTML strings of a textcritics entry (used for the link extraction).
 */
export function textcriticsTexts(textcritics: Textcritics): string[] {
    return [
        ...(textcritics.evaluations ?? []),
        textcritics.commentary?.preamble ?? '',
        ...(textcritics.commentary?.comments ?? []).flatMap(block => [
            block.blockHeader ?? '',
            ...(block.blockComments ?? []).map(comment => comment.comment),
        ]),
    ];
}

/**
 * Helper function: commentsOf.
 *
 * It flattens all comments of a textcritics entry.
 */
function commentsOf(textcritics: Textcritics) {
    return (textcritics.commentary?.comments ?? []).flatMap(block => block.blockComments ?? []);
}

/**
 * Helper function: siglumKey.
 *
 * It gets the lookup key of a siglum with its addendum.
 */
function siglumKey(siglum: string, addendum?: string): string {
    return stripHtml(`${siglum ?? ''}${addendum ?? ''}`);
}

/**
 * The RdfGenerator class.
 *
 * It generates the quads for a list of edition bundles.
 */
class RdfGenerator {
    private readonly _sink = new QuadSink();
    private readonly _facets: ReadonlySet<GeneratedGraphFacet>;
    private readonly _complexLabels: Readonly<Record<string, string>>;

    constructor(
        private readonly _bundles: EditionRdfBundle[],
        private readonly _options: GeneratedGraphOptions,
        complexLabels: Readonly<Record<string, string>>
    ) {
        this._facets = _options.facets;
        this._complexLabels = complexLabels;
    }

    generate(): Quad[] {
        if (this._has('ontology')) {
            this._addOntology();
        }
        this._bundles.forEach(bundle => this._addBundle(bundle));
        if (this._options.includeCurated) {
            this._addCurated();
        }
        return this._sink.quads;
    }

    private _has(facet: GeneratedGraphFacet): boolean {
        return this._facets.has(facet);
    }

    private _add(subject: Quad_Subject, predicate: NamedNode, object: Quad_Object | undefined | null): void {
        this._sink.add(subject, predicate, object);
    }

    private _label(subject: Quad_Subject, text: string | undefined): void {
        const plain = stripHtml(text);
        if (plain) {
            this._add(subject, RDF_NAMESPACES.rdfs('label'), literal(plain));
        }
    }

    private _expand(prefixed: string): NamedNode {
        const [prefix, local] = prefixed.split(':');
        return namedNode(GENERATED_GRAPH_PREFIXES[prefix] + local);
    }

    // ONTOLOGY
    private _addOntology(): void {
        ONTOLOGY_ALIGNMENT.forEach(([s, p, o]) => {
            const object: Quad_Object = p === 'rdfs:label' ? literal(o, 'de') : this._expand(o);
            this._add(this._expand(s), this._expand(p), object);
        });
    }

    // CURATED TRIPLES
    private _addCurated(): void {
        this._bundles.forEach(bundle => {
            if (!bundle.curatedTriples?.trim()) {
                return;
            }
            try {
                this._sink.addQuads(new Parser().parse(bundle.curatedTriples));
            } catch (error) {
                console.warn(`[RdfGenerator] Curated triples of ${complexKeyOf(bundle)} could not be parsed.`, error);
            }
        });
    }

    // BUNDLE
    private _addBundle(bundle: EditionRdfBundle): void {
        const key = complexKeyOf(bundle);
        const ctx: BundleContext = {
            bundle,
            key,
            iri: complexIri(key),
            label: stripHtml(bundle.complex.complexId.short),
            sources: new Map<string, NamedNode>(),
        };

        if (this._has('edition')) {
            this._addEdition(ctx);
        }
        if (this._has('persons')) {
            this._addPersons(ctx);
        }

        const sourceEntries = this._collectSources(ctx);
        if (this._has('sources')) {
            sourceEntries.forEach(entry => this._addSource(ctx, entry));
        }
        if (this._has('materials')) {
            sourceEntries.forEach(entry => this._addMaterials(entry));
        }
        if (this._has('folios')) {
            this._addFolios(ctx);
        }
        if (this._has('sheets')) {
            this._addSheets(ctx, sourceEntries);
        }
        this._addTextcritics(ctx, sourceEntries);
        if (this._has('references')) {
            this._addReferences(ctx, sourceEntries);
        }
    }

    // EDITION
    private _addEdition(ctx: BundleContext): void {
        const { complex } = ctx.bundle;
        const { series, section } = complex.pubStatement;
        const edition = RDF_NAMESPACES.awg('AWG');
        const seriesIri = RDF_NAMESPACES.awg(`Series_${slug(series.route)}`);
        const sectionIri = RDF_NAMESPACES.awg(`Series_${slug(series.route)}_Section_${slug(section.route)}`);

        this._add(edition, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.edition);
        this._label(edition, 'Anton Webern Gesamtausgabe');
        this._add(edition, RDF_NAMESPACES.schema('url'), literal(EDITION_BASE_URL, RDF_NAMESPACES.xsd('anyURI')));

        if (series.route) {
            this._add(seriesIri, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.series);
            this._label(seriesIri, `Serie ${series.short}`);
            this._add(seriesIri, RDF_NAMESPACES.dcterms('title'), literal(stripHtml(series.full)));
            this._add(seriesIri, RDF_NAMESPACES.dcterms('isPartOf'), edition);
        }
        if (section.route) {
            this._add(sectionIri, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.section);
            this._label(sectionIri, `AWG ${series.short}/${section.short}`);
            this._add(sectionIri, RDF_NAMESPACES.dcterms('title'), literal(stripHtml(section.full)));
            this._add(sectionIri, RDF_NAMESPACES.dcterms('isPartOf'), seriesIri);
        }

        this._addComplexNode(ctx.key, ctx.label);
        this._add(ctx.iri, RDF_NAMESPACES.rdf('type'), RDF_NAMESPACES.mo('MusicalWork'));
        this._add(ctx.iri, RDF_NAMESPACES.dcterms('title'), literal(stripHtml(complex.titleStatement.title)));
        this._add(ctx.iri, RDF_NAMESPACES.dcterms('identifier'), literal(ctx.label));
        if (complex.titleStatement.catalogueType.full === 'Opus') {
            this._add(ctx.iri, RDF_NAMESPACES.mo('opus'), literal(complex.titleStatement.catalogueNumber));
        }
        if (section.route) {
            this._add(ctx.iri, RDF_NAMESPACES.dcterms('isPartOf'), sectionIri);
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(complex.respStatement.lastModified)) {
            this._add(
                ctx.iri,
                RDF_NAMESPACES.dcterms('modified'),
                literal(complex.respStatement.lastModified, RDF_NAMESPACES.xsd('date'))
            );
        }
        this._add(
            ctx.iri,
            RDF_NAMESPACES.schema('url'),
            literal(EDITION_BASE_URL + complex.baseRoute, RDF_NAMESPACES.xsd('anyURI'))
        );
    }

    private _addComplexNode(key: string, label?: string): NamedNode {
        const iri = complexIri(key);
        this._add(iri, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.editionComplex);
        const known = this._complexLabels[key.toLowerCase()];
        const hasLookup = Object.keys(this._complexLabels).length > 0;
        this._label(iri, label ?? known ?? (hasLookup ? `${key} (nicht verzeichnet)` : key));
        return iri;
    }

    // PERSONS
    private _addPersons(ctx: BundleContext): void {
        ctx.bundle.complex.respStatement.editors.forEach(editor => {
            const person = RDF_NAMESPACES.awg(`person_${slug(editor.name)}`);
            this._add(person, RDF_NAMESPACES.rdf('type'), RDF_NAMESPACES.foaf('Person'));
            this._add(person, RDF_NAMESPACES.foaf('name'), literal(editor.name));
            this._label(person, editor.name);
            if (editor.homepage) {
                this._add(
                    person,
                    RDF_NAMESPACES.foaf('homepage'),
                    literal(editor.homepage, RDF_NAMESPACES.xsd('anyURI'))
                );
            }
            const ids = editor.identifiers;
            if (ids?.gnd) {
                this._add(person, RDF_NAMESPACES.owl('sameAs'), namedNode(`https://d-nb.info/gnd/${ids.gnd}`));
            }
            if (ids?.viaf) {
                this._add(person, RDF_NAMESPACES.owl('sameAs'), namedNode(`https://viaf.org/viaf/${ids.viaf}`));
            }
            if (ids?.orcid) {
                this._add(person, RDF_NAMESPACES.owl('sameAs'), namedNode(`https://orcid.org/${ids.orcid}`));
            }
            this._add(ctx.iri, RDF_NAMESPACES.schema('editor'), person);
        });
    }

    // SOURCES
    private _collectSources(ctx: BundleContext): SourceEntry[] {
        const { sourceList, sourceDesc } = ctx.bundle;
        const local = complexIri(ctx.key).value.replace(GENERATED_GRAPH_PREFIXES['awg'], '');
        const descById = new Map((sourceDesc?.sources ?? []).map(desc => [desc.id, desc]));
        const usedDescIds = new Set<string>();
        const entries: SourceEntry[] = [];

        const register = (iri: NamedNode, siglum: string, addendum: string | undefined, ids: string[]): void => {
            [siglumKey(siglum, addendum), stripHtml(siglum), ...ids].forEach(id => {
                if (id && !ctx.sources.has(id)) {
                    ctx.sources.set(id, iri);
                }
            });
        };

        (sourceList?.sources ?? []).forEach((source: Source) => {
            const desc = source.linkTo ? descById.get(source.linkTo) : undefined;
            const id = source.linkTo || `source_${siglumKey(source.siglum, source.siglumAddendum)}`;
            const iri = RDF_NAMESPACES.awg(`${local}_${slug(id)}`);
            if (desc) {
                usedDescIds.add(desc.id);
            }
            register(iri, source.siglum, source.siglumAddendum, [source.linkTo]);
            entries.push({ iri, source, desc, isTextSource: false });
        });

        (sourceDesc?.sources ?? [])
            .filter(desc => !usedDescIds.has(desc.id))
            .forEach(desc => {
                const iri = RDF_NAMESPACES.awg(`${local}_${slug(desc.id)}`);
                register(iri, desc.siglum, desc.siglumAddendum, [desc.id]);
                entries.push({ iri, source: desc, desc, isTextSource: false });
            });

        (sourceList?.textSources ?? []).forEach((source: TextSource) => {
            const iri = RDF_NAMESPACES.awg(`${local}_text_${slug(source.id)}`);
            register(iri, source.siglum, source.siglumAddendum, [source.id]);
            entries.push({ iri, source: { ...source, missing: false }, isTextSource: true });
        });

        return entries;
    }

    private _addSource(ctx: BundleContext, entry: SourceEntry): void {
        const { iri, source, desc } = entry;
        const siglum = siglumKey(source.siglum, source.siglumAddendum);

        this._add(iri, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.source);
        this._label(iri, `${siglum} (${ctx.label})`);
        this._add(iri, RDF_NAMESPACES.dcterms('identifier'), literal(siglum));
        this._add(iri, RDF_NAMESPACES.dcterms('isPartOf'), ctx.iri);
        this._add(iri, RDF_NAMESPACES.dcterms('type'), literal(truncate(stripHtml(source.type))));
        if (entry.isTextSource) {
            this._add(iri, RDF_NAMESPACES.dcterms('subject'), literal('Textquelle', 'de'));
        }
        if (source.missing) {
            this._add(iri, AWG_PROPERTIES.missing, literal('true', RDF_NAMESPACES.xsd('boolean')));
        }

        const location = parseLocation(source.location);
        if (location.siglum) {
            const repo = this._addRepository(location.siglum);
            this._add(iri, RDF_NAMESPACES.schema('holdingArchive'), repo);
            if (location.shelfmark) {
                this._add(iri, RDF_NAMESPACES.schema('identifier'), literal(location.shelfmark));
            }
        } else if (location.text) {
            this._add(iri, RDF_NAMESPACES.dcterms('bibliographicCitation'), literal(truncate(location.text)));
        }

        const dates = datesOf(desc?.physDesc);
        dates.forEach(date => this._add(iri, RDF_NAMESPACES.dcterms('date'), literal(truncate(stripHtml(date)))));
        extractYears(dates).forEach(year =>
            this._add(iri, AWG_PROPERTIES.mentionsYear, literal(year, RDF_NAMESPACES.xsd('gYear')))
        );
    }

    private _addRepository(siglum: string): NamedNode {
        const repo = RDF_NAMESPACES.awg(`repo_${slug(siglum)}`);
        const known = AWG_REPOSITORIES[siglum];
        this._add(repo, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.repository);
        this._add(repo, RDF_NAMESPACES.rdf('type'), RDF_NAMESPACES.schema('ArchiveOrganization'));
        this._label(repo, known ? `${known.name} (${siglum})` : siglum);
        this._add(repo, RDF_NAMESPACES.schema('identifier'), literal(siglum));
        if (known) {
            this._add(repo, RDF_NAMESPACES.schema('name'), literal(known.name));
            this._add(repo, RDF_NAMESPACES.schema('location'), literal(known.place));
        }
        return repo;
    }

    // MATERIALS
    private _addMaterials(entry: SourceEntry): void {
        const physDesc = entry.desc?.physDesc;
        if (!physDesc) {
            return;
        }
        const instruments = physDesc.writingInstruments;
        [...asStringArray(instruments?.main), ...asStringArray(instruments?.secondary)].forEach(instrument => {
            const text = stripHtml(instrument);
            if (!text) {
                return;
            }
            const concept = RDF_NAMESPACES.awg(`instr_${slug(text)}`);
            this._add(concept, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.writingInstrument);
            this._add(concept, RDF_NAMESPACES.skos('prefLabel'), literal(text, 'de'));
            this._label(concept, text);
            this._add(entry.iri, RDF_NAMESPACES.dcterms('medium'), concept);
        });

        (physDesc.writingMaterials ?? []).forEach(material => {
            const materialType = stripHtml(material.materialType);
            if (materialType) {
                const concept = RDF_NAMESPACES.awg(`mat_${slug(materialType)}`);
                this._add(concept, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.writingMaterial);
                this._add(concept, RDF_NAMESPACES.skos('prefLabel'), literal(materialType, 'de'));
                this._label(concept, materialType);
                this._add(entry.iri, AWG_PROPERTIES.writingMaterial, concept);
            }
            const variant = material.trademark?.variant;
            if (variant) {
                const data = (EDITION_TRADEMARKS_DATA as Record<string, { short: string; full: string }>)[variant];
                const tmLabel = data ? stripHtml(data.short) : variant;
                const concept = RDF_NAMESPACES.awg(`tm_${slug(tmLabel)}`);
                this._add(concept, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.trademark);
                this._add(concept, RDF_NAMESPACES.skos('prefLabel'), literal(tmLabel));
                this._label(concept, tmLabel);
                if (data) {
                    this._add(concept, RDF_NAMESPACES.skos('definition'), literal(stripHtml(data.full), 'de'));
                }
                this._add(entry.iri, AWG_PROPERTIES.hasTrademark, concept);
                this._add(entry.iri, AWG_PROPERTIES.trademarkVariant, literal(variant));
            }
            if (material.systems?.totalSystems) {
                this._add(
                    entry.iri,
                    AWG_PROPERTIES.systems,
                    literal(String(material.systems.totalSystems), RDF_NAMESPACES.xsd('integer'))
                );
            }
            const dimensions = material.dimensions;
            if (dimensions?.height?.value) {
                this._add(
                    entry.iri,
                    RDF_NAMESPACES.schema('height'),
                    literal(`${dimensions.height.value} ${dimensions.unit ?? ''}`.trim())
                );
            }
            if (dimensions?.width?.value) {
                this._add(
                    entry.iri,
                    RDF_NAMESPACES.schema('width'),
                    literal(`${dimensions.width.value} ${dimensions.unit ?? ''}`.trim())
                );
            }
        });
    }

    // FOLIOS
    private _addFolios(ctx: BundleContext): void {
        const local = complexIri(ctx.key).value.replace(GENERATED_GRAPH_PREFIXES['awg'], '');

        (ctx.bundle.folioConvolute?.convolutes ?? []).forEach(convolute => {
            let parent = ctx.sources.get(stripHtml(convolute.convoluteId));
            if (!parent) {
                parent = RDF_NAMESPACES.awg(`${local}_conv_${slug(convolute.convoluteId)}`);
                this._add(parent, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.convolute);
                this._label(parent, `${convolute.convoluteLabel || convolute.convoluteId} (${ctx.label})`);
                this._add(parent, RDF_NAMESPACES.dcterms('isPartOf'), ctx.iri);
            }

            (convolute.folios ?? []).forEach(folio => {
                const folioIri = RDF_NAMESPACES.awg(`${local}_${slug(convolute.convoluteId)}_${slug(folio.folioId)}`);
                this._add(folioIri, RDF_NAMESPACES.rdf('type'), AWG_CLASSES.folio);
                this._label(folioIri, `${convolute.convoluteId} Bl. ${folio.folioId} (${ctx.label})`);
                this._add(folioIri, RDF_NAMESPACES.dcterms('isPartOf'), parent);
                if (folio.systems) {
                    this._add(
                        folioIri,
                        AWG_PROPERTIES.systems,
                        literal(String(folio.systems), RDF_NAMESPACES.xsd('integer'))
                    );
                }
                if (folio.dimensions?.height) {
                    this._add(folioIri, RDF_NAMESPACES.schema('height'), literal(`${folio.dimensions.height} mm`));
                    this._add(folioIri, RDF_NAMESPACES.schema('width'), literal(`${folio.dimensions.width} mm`));
                }
                (folio.content ?? []).forEach(content => {
                    if (!content.sheetId) {
                        return;
                    }
                    const sheet = sheetIri(content.sheetId);
                    this._add(sheet, RDF_NAMESPACES.prov('wasDerivedFrom'), folioIri);
                    // Edition complexes that share the same folios
                    const contentKey = (content.complexId || ctx.key).toLowerCase();
                    if (this._has('edition') && contentKey !== ctx.key.toLowerCase()) {
                        this._addComplexNode(ctx.key, ctx.label);
                        this._add(ctx.iri, AWG_PROPERTIES.sharesFolioWith, this._addComplexNode(contentKey));
                    }
                    if (!this._has('sheets')) {
                        return;
                    }
                    this._label(sheet, siglumKey(content.sigle, content.sigleAddendum) || content.sheetId);
                    if (content.complexId) {
                        this._add(sheet, RDF_NAMESPACES.dcterms('isPartOf'), this._addComplexNode(content.complexId));
                    }
                });
            });
        });
    }

    // SHEETS
    private _addSheets(ctx: BundleContext, sourceEntries: SourceEntry[]): void {
        const sheets = ctx.bundle.svgSheets?.sheets;
        if (sheets) {
            (Object.keys(SHEET_CLASSES) as EditionTypeKey[]).forEach(editionType => {
                (sheets[editionType] ?? []).forEach((sheet: EditionSvgSheet) => {
                    const iri = sheetIri(sheet.id);
                    this._add(iri, RDF_NAMESPACES.rdf('type'), SHEET_CLASSES[editionType]);
                    this._label(iri, sheet.label || sheet.id);
                    this._add(iri, RDF_NAMESPACES.dcterms('identifier'), literal(sheet.id));
                    this._add(iri, RDF_NAMESPACES.dcterms('isPartOf'), ctx.iri);
                    (sheet.content ?? []).forEach(content => {
                        const source = content.convolute ? ctx.sources.get(stripHtml(content.convolute)) : undefined;
                        this._add(iri, RDF_NAMESPACES.prov('wasDerivedFrom'), source);
                        if (content.svg) {
                            this._add(
                                iri,
                                RDF_NAMESPACES.schema('image'),
                                literal(content.svg, RDF_NAMESPACES.xsd('anyURI'))
                            );
                        }
                    });
                });
            });
        }

        // Items of the source descriptions that link to a sheet
        sourceEntries.forEach(entry => {
            (entry.desc?.physDesc?.contents ?? []).forEach(content => {
                const sheetId = content.itemLinkTo?.sheetId;
                if (sheetId) {
                    this._add(sheetIri(sheetId), RDF_NAMESPACES.prov('wasDerivedFrom'), entry.iri);
                }
            });
        });
    }

    // TEXTCRITICS
    private _addTextcritics(ctx: BundleContext, sourceEntries: SourceEntry[]): void {
        const withComments = this._has('comments');
        const withCounts = this._has('sheets') || withComments;

        (ctx.bundle.textcritics?.textcritics ?? []).forEach(textcritics => {
            const target = sheetIri(textcritics.id);
            const comments = commentsOf(textcritics);
            if (withCounts) {
                this._label(target, textcritics.label || textcritics.id);
                this._add(target, RDF_NAMESPACES.dcterms('isPartOf'), ctx.iri);
                this._add(
                    target,
                    AWG_PROPERTIES.commentCount,
                    literal(String(comments.length), RDF_NAMESPACES.xsd('integer'))
                );
            }
            if (withComments) {
                comments.forEach((comment, index) =>
                    this._addAnnotation(
                        comment.svgGroupId || `${textcritics.id}_comment_${index + 1}`,
                        target,
                        comment.comment,
                        comment.measure
                    )
                );
            }
        });

        sourceEntries.forEach(entry => {
            const corrections = entry.desc?.physDesc?.corrections ?? [];
            if (!corrections.length) {
                return;
            }
            const all = corrections.flatMap(correction => commentsOf(correction));
            if (withCounts) {
                this._add(
                    entry.iri,
                    AWG_PROPERTIES.correctionCount,
                    literal(String(all.length), RDF_NAMESPACES.xsd('integer'))
                );
            }
            if (withComments) {
                corrections.forEach(correction =>
                    commentsOf(correction).forEach((comment, index) =>
                        this._addAnnotation(
                            comment.svgGroupId || `${correction.id}_${index + 1}`,
                            entry.iri,
                            comment.comment,
                            comment.measure
                        )
                    )
                );
            }
        });
    }

    private _addAnnotation(id: string, target: NamedNode, body: string, measure: string): void {
        const annotation = RDF_NAMESPACES.awg(slug(id));
        const text = truncate(stripHtml(body));
        this._add(annotation, RDF_NAMESPACES.rdf('type'), RDF_NAMESPACES.oa('Annotation'));
        this._add(annotation, RDF_NAMESPACES.oa('motivatedBy'), RDF_NAMESPACES.oa('commenting'));
        this._add(annotation, RDF_NAMESPACES.oa('hasTarget'), target);
        this._add(annotation, RDF_NAMESPACES.oa('bodyValue'), literal(text));
        this._label(annotation, measure ? `T. ${stripHtml(measure)}: ${text.slice(0, 40)}` : text.slice(0, 50));
        this._add(annotation, AWG_PROPERTIES.measure, literal(stripHtml(measure)));
    }

    // REFERENCES
    private _addReferences(ctx: BundleContext, sourceEntries: SourceEntry[]): void {
        (ctx.bundle.textcritics?.textcritics ?? []).forEach(textcritics => {
            const subject = sheetIri(textcritics.id);
            textcriticsTexts(textcritics).forEach(text => this._addLinks(ctx, subject, text));
            (textcritics.linkBoxes ?? []).forEach(linkBox =>
                this._addReference(ctx, subject, linkBox.linkTo.complexId, linkBox.linkTo.sheetId)
            );
        });

        sourceEntries.forEach(entry => {
            const physDesc = entry.desc?.physDesc;
            physDescTexts(physDesc).forEach(text => this._addLinks(ctx, entry.iri, text));
            (physDesc?.corrections ?? []).forEach(correction =>
                textcriticsTexts(correction).forEach(text => this._addLinks(ctx, entry.iri, text))
            );
        });
    }

    private _addLinks(ctx: BundleContext, subject: NamedNode, html: string): void {
        extractLinks(html).forEach(link => this._addReference(ctx, subject, link.complexId, link.sheetId));
    }

    private _addReference(ctx: BundleContext, subject: NamedNode, complexId: string, sheetId: string): void {
        const targetKey = (complexId || ctx.key).toLowerCase();
        const isForeign = targetKey !== ctx.key.toLowerCase();

        if (sheetId) {
            const target = sheetIri(sheetId);
            if (!target.equals(subject)) {
                this._add(subject, RDF_NAMESPACES.dcterms('references'), target);
            }
            if (isForeign) {
                this._label(target, sheetId);
                this._add(target, RDF_NAMESPACES.dcterms('isPartOf'), this._addComplexNode(targetKey));
            }
        } else if (isForeign) {
            this._add(subject, RDF_NAMESPACES.dcterms('references'), this._addComplexNode(targetKey));
        }

        // Aggregated reference on the level of the edition complexes
        if (isForeign) {
            this._addComplexNode(ctx.key, ctx.label);
            this._add(ctx.iri, RDF_NAMESPACES.dcterms('references'), this._addComplexNode(targetKey));
        }
    }
}

/**
 * Utils function: generateQuads.
 *
 * It generates the quads for the given edition bundles and options.
 *
 * @param {EditionRdfBundle[]} bundles The given edition bundles.
 * @param {GeneratedGraphOptions} options The given generator options.
 * @param {Record<string, string>} complexLabels A lookup of labels for all edition complexes by key.
 * @returns {Quad[]} The generated quads.
 */
export function generateQuads(
    bundles: EditionRdfBundle[],
    options: GeneratedGraphOptions,
    complexLabels: Readonly<Record<string, string>> = {}
): Quad[] {
    return new RdfGenerator(bundles, options, complexLabels).generate();
}

/**
 * Utils function: serializeTurtle.
 *
 * It serializes the given quads as Turtle (sorted by subject).
 *
 * @param {Quad[]} quads The given quads.
 * @param {string} header An optional comment header.
 * @returns {Promise<string>} The Turtle string.
 */
export function serializeTurtle(quads: Quad[], header = ''): Promise<string> {
    const sorted = [...quads].sort((a, b) => a.subject.value.localeCompare(b.subject.value));
    const writer = new Writer({ prefixes: { ...GENERATED_GRAPH_PREFIXES } });
    writer.addQuads(sorted);

    return new Promise((resolve, reject) => {
        writer.end((error: Error | null, result: string) => {
            if (error) {
                reject(error);
            } else {
                resolve(header + result);
            }
        });
    });
}

/**
 * Utils function: computeStats.
 *
 * It computes the key figures of the given quads.
 *
 * @param {Quad[]} quads The given quads.
 * @returns {GeneratedGraphStats} The key figures.
 */
export function computeStats(quads: Quad[]): GeneratedGraphStats {
    const typeIri = RDF_NAMESPACES.rdf('type').value;
    const count = (...classes: NamedNode[]): number => {
        const values = new Set(classes.map(c => c.value));
        return new Set(
            quads.filter(q => q.predicate.value === typeIri && values.has(q.object.value)).map(q => q.subject.value)
        ).size;
    };
    return {
        triples: quads.length,
        complexes: count(AWG_CLASSES.editionComplex),
        sources: count(AWG_CLASSES.source),
        sheets: count(AWG_CLASSES.sketch, AWG_CLASSES.textEdition, AWG_CLASSES.workEdition),
        annotations: count(RDF_NAMESPACES.oa('Annotation')),
        references: quads.filter(q => q.predicate.value === RDF_NAMESPACES.dcterms('references').value).length,
    };
}

/**
 * Utils function: generateRdfData.
 *
 * It generates the complete RDF data (triples and queries) for the graph visualizer.
 *
 * @param {EditionRdfBundle[]} bundles The given edition bundles.
 * @param {GeneratedGraphOptions} options The given generator options.
 * @param {Record<string, string>} complexLabels A lookup of labels for all edition complexes by key.
 * @returns {Promise<GeneratedGraphResult>} The generated RDF data with its key figures.
 */
export async function generateRdfData(
    bundles: EditionRdfBundle[],
    options: GeneratedGraphOptions,
    complexLabels: Readonly<Record<string, string>> = {}
): Promise<GeneratedGraphResult> {
    const quads = generateQuads(bundles, options, complexLabels);
    const scopeLabel =
        options.scope === 'edition'
            ? `gesamte Edition (${bundles.length} Werkkomplexe)`
            : bundles.map(bundle => stripHtml(bundle.complex.complexId.short)).join(', ');
    const header =
        `# Automatisch erzeugt aus den Editionsdaten der Anton Webern Gesamtausgabe\n` +
        `# Umfang: ${scopeLabel}\n` +
        `# Facetten: ${[...options.facets].join(', ')}${options.includeCurated ? ', kuratierte Triples' : ''}\n\n`;
    const triples = await serializeTurtle(quads, header);

    return {
        rdfData: { triples, queryList: buildGeneratedQueries(options.scope) },
        stats: computeStats(quads),
    };
}

/**
 * Object constant: RDF_GENERATOR_UTILS.
 *
 * It bundles the utils of the RDF generator.
 */
export const RDF_GENERATOR_UTILS = {
    complexIri,
    complexKeyOf,
    computeStats,
    asStringArray,
    datesOf,
    extractLinks,
    extractYears,
    generateQuads,
    generateRdfData,
    parseLocation,
    physDescTexts,
    serializeTurtle,
    sheetIri,
    slug,
    stripHtml,
    textcriticsTexts,
} as const;
