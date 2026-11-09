import type { NamedNode, Quad } from '@rdfjs/types';

import type { EditionComplexJsonData } from '@awg-views/edition-view/models/edition-complex.model';
import type { EditionSvgSheetsList } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import type { FolioConvoluteList } from '@awg-views/edition-view/models/folio.model';
import type { SourceDesc, SourceDescContent, SourceDescList } from '@awg-views/edition-view/models/source-desc.model';
import type { SourceList } from '@awg-views/edition-view/models/source-list.model';

/**
 * The RdfGeneratorFacet type.
 *
 * It represents a switchable part of the generated graph:
 * the edition structure (`edition`), sources, documents, sketches and paratexts (`documents`),
 * folios and placements (`folios`), sheets and text versions (`editions`)
 * and links in the source descriptions (`references`).
 */
export type RdfGeneratorFacet = 'edition' | 'documents' | 'folios' | 'editions' | 'references';

/**
 * The RdfComplexEntry type.
 *
 * It represents a single edition complex as in the registry edition-complexes.json.
 */
export type RdfComplexEntry = Pick<
    NonNullable<EditionComplexJsonData[string]>,
    'titleStatement' | 'pubStatement' | 'parts'
>;

/**
 * The RdfComplexRegistry type.
 *
 * It represents all edition complexes by their key (e.g. `op25`).
 */
export type RdfComplexRegistry = Readonly<Record<string, RdfComplexEntry>>;

/**
 * The RdfDocumentEntry interface.
 *
 * It represents a single document of the registry documents.json.
 */
export interface RdfDocumentEntry {
    /**
     * The id of the document (e.g. `awg_doc_0047`).
     */
    id: string;

    /**
     * The id of the convolute document this document is a part of.
     */
    partOf?: string;

    /**
     * The sources of the edition complexes that describe this document.
     */
    usedBy: { complex: string; siglum: string }[];
}

/**
 * The RdfComplexData interface.
 *
 * It represents the data files of a single edition complex used by the generator.
 */
export interface RdfComplexData {
    folioConvolute: FolioConvoluteList;
    sourceDesc: SourceDescList;
    sourceList: SourceList;
    svgSheets: EditionSvgSheetsList;
}

/**
 * The RdfGeneratorInput interface.
 *
 * It represents the input of the generator for a single edition complex.
 */
export interface RdfGeneratorInput {
    /**
     * The key of the edition complex (e.g. `op25`).
     */
    complexKey: string;

    /**
     * The registry of all edition complexes.
     */
    complexes: RdfComplexRegistry;

    /**
     * The data files of the edition complex.
     */
    data: RdfComplexData;

    /**
     * The registry of all documents.
     */
    documents: readonly RdfDocumentEntry[];

    /**
     * The facets to generate (all if omitted).
     */
    facets?: ReadonlySet<RdfGeneratorFacet>;
}

/**
 * The RdfGeneratorWarningRule type.
 *
 * It represents the kind of a gap in the edition data found during generation.
 */
export type RdfGeneratorWarningRule =
    | 'emptyItem'
    | 'folioConflict'
    | 'labelConflict'
    | 'incompleteDate'
    | 'noComplex'
    | 'noDocument'
    | 'noFolio'
    | 'placeholder'
    | 'unknownConvolute'
    | 'unknownItem'
    | 'unresolvedReference';

/**
 * The RdfGeneratorWarning interface.
 *
 * It represents a gap in the edition data found during generation.
 */
export interface RdfGeneratorWarning {
    /**
     * The key of the edition complex (e.g. `op25`).
     */
    complexKey: string;

    /**
     * The kind of the gap.
     */
    rule: RdfGeneratorWarningRule;

    /**
     * The description of the gap (with the affected data).
     */
    message: string;
}

/**
 * The RdfGeneratorResult interface.
 *
 * It represents the generated quads and the gaps found in the edition data.
 */
export interface RdfGeneratorResult {
    /**
     * The key of the edition complex (several keys, comma-separated, for merged graphs).
     */
    complexKey: string;

    /**
     * The generated quads, sorted by subject, predicate and object.
     */
    quads: Quad[];

    /**
     * The gaps in the edition data found during generation.
     */
    warnings: RdfGeneratorWarning[];
}

/**
 * The RdfItemLabel type.
 *
 * It represents the parsed label of a content item of a source description.
 */
export type RdfItemLabel =
    | { kind: 'sketch'; prefix: string; number: string; sketchNumber: string }
    | { kind: 'placeholder'; prefix: string; number: string }
    | { kind: 'mnr'; prefix: string; number: string }
    | { kind: 'rowTable' }
    | { kind: 'empty' }
    | { kind: 'unknown' };

/**
 * The RdfParatextText interface.
 *
 * It represents the parsed text of a paratext entry of a physical description.
 */
export interface RdfParatextText {
    /**
     * The wording of the paratext, without position and reference.
     */
    content: string;

    /**
     * The folio (or page) the paratext is written on.
     */
    folio?: string;

    /**
     * Whether the folio is a page (`auf S. …`).
     */
    isPage?: boolean;

    /**
     * The reference to a sketch or opus (physDesc „zu …“ or „nach …“).
     */
    reference?: string;
}

/**
 * The RdfReference type.
 *
 * It represents the parsed reference of a paratext.
 */
export type RdfReference =
    { kind: 'sketch'; prefix?: string; number?: string; sketchNumber: string } | { kind: 'opus'; number: string };

/**
 * The RdfSourceEntry interface.
 *
 * It represents a source of the complex during generation.
 */
export interface RdfSourceEntry {
    /**
     * The local name of the document, or of the source without document.
     */
    base: string;

    /**
     * The label of the document, or of the source without document.
     */
    baseLabel: string;

    /**
     * The source description.
     */
    desc?: SourceDesc;

    /**
     * The id of the document.
     */
    documentId?: string;

    /**
     * The siglum with its addendum (e.g. `A`, `EH`).
     */
    fullSiglum: string;

    /**
     * The local name of the source.
     */
    local: string;

    /**
     * The local names of the M numbers named by the content items (for references without M number).
     */
    mnrs: Set<string>;

    /**
     * The siglum.
     */
    siglum: string;

    /**
     * The siglum addendum.
     */
    siglumAddendum: string;

    /**
     * The source type.
     */
    type: string;
}

/**
 * The RdfItemEntry interface.
 *
 * It represents a content item of a source description that is an inscription (sketch or row table).
 */
export interface RdfItemEntry {
    /**
     * The key of the complex the inscription belongs to.
     */
    complexKey?: string;

    /**
     * The content item.
     */
    content: SourceDescContent;

    /**
     * The label of the inscription.
     */
    label: string;

    /**
     * The local name of the inscription.
     */
    local: string;

    /**
     * The source of the content item.
     */
    source: RdfSourceEntry;

    /**
     * The class of the inscription.
     */
    type: NamedNode;
}

/**
 * The RdfParatextEntry interface.
 *
 * It represents a paratext of a physical description.
 */
export interface RdfParatextEntry {
    /**
     * The local name of the accompanied sketch.
     */
    accompanies?: string;

    /**
     * The key of the complex the paratext belongs to.
     */
    complexKey: string;

    /**
     * The folio the paratext is written on.
     */
    folio?: string;

    /**
     * Whether the folio is a page.
     */
    isPage?: boolean;

    /**
     * The label of the paratext.
     */
    label: string;

    /**
     * The local name of the paratext.
     */
    local: string;

    /**
     * The source of the paratext.
     */
    source: RdfSourceEntry;

    /**
     * The date stated by a dating (YYYY-MM-DD).
     */
    statedDate?: string;

    /**
     * The paratext type concept.
     */
    type: NamedNode;
}

/**
 * The RdfGeneratorContext interface.
 *
 * It represents the state of the generation of a single complex.
 */
export interface RdfGeneratorContext {
    /**
     * The local name of the complex.
     */
    readonly complexLocal: string;

    /**
     * The registry documents by id.
     */
    readonly documentsById: ReadonlyMap<string, RdfDocumentEntry>;

    /**
     * The registry documents by complex and siglum (e.g. `op25:A`).
     */
    readonly documentsByUse: ReadonlyMap<string, RdfDocumentEntry>;

    /**
     * The facets to generate.
     */
    readonly facets: ReadonlySet<RdfGeneratorFacet>;

    /**
     * The input of the generator.
     */
    readonly input: RdfGeneratorInput;

    /**
     * The generated quads by key (without duplicates).
     */
    readonly quads: Map<string, Quad>;

    /**
     * The keys of the complexes referenced by the generated quads.
     */
    readonly referencedComplexes: Set<string>;

    /**
     * The gaps in the edition data found during generation.
     */
    readonly warnings: RdfGeneratorWarning[];

    /**
     * The inscriptions of the content items.
     */
    items: RdfItemEntry[];

    /**
     * The paratexts of the physical descriptions.
     */
    paratexts: RdfParatextEntry[];

    /**
     * The sources of the complex.
     */
    sources: RdfSourceEntry[];
}
