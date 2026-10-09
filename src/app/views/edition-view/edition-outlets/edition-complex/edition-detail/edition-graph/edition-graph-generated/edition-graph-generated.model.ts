import { EditionComplex } from '@awg-views/edition-view/models/edition-complex.model';
import { EditionSvgSheetsList } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { FolioConvoluteList } from '@awg-views/edition-view/models/folio.model';
import { GraphRdfData } from '@awg-views/edition-view/models/graph.model';
import { SourceDescList } from '@awg-views/edition-view/models/source-desc.model';
import { SourceList } from '@awg-views/edition-view/models/source-list.model';
import { TextcriticsList } from '@awg-views/edition-view/models/textcritics.model';

/**
 * The GeneratedGraphScope type.
 *
 * It represents the scope of the generated graph:
 * the currently selected edition complex or the whole edition.
 */
export type GeneratedGraphScope = 'complex' | 'edition';

/**
 * The GeneratedGraphFacet type.
 *
 * It represents a switchable facet of the generated RDF data.
 */
export type GeneratedGraphFacet =
    'ontology' | 'edition' | 'persons' | 'sources' | 'materials' | 'folios' | 'sheets' | 'comments' | 'references';

/**
 * The GeneratedGraphFacetOption interface.
 *
 * It represents a selectable facet option in the UI.
 */
export interface GeneratedGraphFacetOption {
    readonly key: GeneratedGraphFacet;
    readonly label: string;
    readonly description: string;
}

/**
 * The EditionRdfBundle interface.
 *
 * It bundles all edition data of a single edition complex
 * that is used to generate RDF data.
 */
export interface EditionRdfBundle {
    readonly complex: EditionComplex;
    readonly sourceList: SourceList;
    readonly sourceDesc: SourceDescList;
    readonly svgSheets: EditionSvgSheetsList;
    readonly folioConvolute: FolioConvoluteList;
    readonly textcritics: TextcriticsList;
    readonly curatedTriples: string;
}

/**
 * The EditionRdfLoadState interface.
 *
 * It represents the (progressing) state of loading the data of the whole edition.
 */
export interface EditionRdfLoadState {
    readonly loaded: number;
    readonly total: number;
    readonly bundles: EditionRdfBundle[];
    readonly done: boolean;
}

/**
 * The GeneratedGraphOptions interface.
 *
 * It represents the options of the RDF generator.
 */
export interface GeneratedGraphOptions {
    readonly scope: GeneratedGraphScope;
    readonly facets: ReadonlySet<GeneratedGraphFacet>;
    readonly includeCurated: boolean;
}

/**
 * The GeneratedGraphStats interface.
 *
 * It represents some key figures of the generated RDF data.
 */
export interface GeneratedGraphStats {
    readonly triples: number;
    readonly complexes: number;
    readonly sources: number;
    readonly sheets: number;
    readonly annotations: number;
    readonly references: number;
}

/**
 * The GeneratedGraphResult interface.
 *
 * It represents the result of the RDF generator.
 */
export interface GeneratedGraphResult {
    readonly rdfData: GraphRdfData;
    readonly stats: GeneratedGraphStats;
}

/**
 * The GapReportItem interface.
 *
 * It represents a single gap in the edition data
 * that limits the generated graph.
 */
export interface GapReportItem {
    readonly id: string;
    readonly label: string;
    readonly description: string;
    readonly count: number;
    readonly total: number;
    readonly examples: string[];
}

/**
 * The StructuralGap interface.
 *
 * It represents a gap in the edition data
 * that cannot be counted, because the information is missing structurally.
 */
export interface StructuralGap {
    readonly label: string;
    readonly description: string;
    readonly suggestion: string;
}

/**
 * Object constant: GENERATED_GRAPH_FACETS.
 *
 * It holds the selectable facets of the generated graph.
 */
export const GENERATED_GRAPH_FACETS: readonly GeneratedGraphFacetOption[] = [
    {
        key: 'ontology',
        label: 'Ontologie',
        description: 'Anbindung der AWG-Klassen an FRBR, Music Ontology, schema.org u. a.',
    },
    { key: 'edition', label: 'Edition', description: 'Werkkomplexe, Serien, Abteilungen' },
    { key: 'persons', label: 'Personen', description: 'Herausgeber mit GND/VIAF/ORCID' },
    { key: 'sources', label: 'Quellen', description: 'Quellen, Archive, Signaturen, Datierungen' },
    { key: 'materials', label: 'Beschreibstoff', description: 'Papiermarken, Schreibmittel, Formate' },
    { key: 'folios', label: 'Folios', description: 'Blätter und ihre Belegung mit Skizzen' },
    { key: 'sheets', label: 'Editionen', description: 'Skizzen- und Texteditionen' },
    { key: 'comments', label: 'Kommentare', description: 'Textkritische Anmerkungen als Web Annotations' },
    { key: 'references', label: 'Querverweise', description: 'Verweise zwischen Skizzen und Werkkomplexen' },
] as const;

/**
 * Object constant: DEFAULT_GENERATED_GRAPH_FACETS.
 *
 * It holds the facets that are selected by default
 * (comments are excluded because of their large number).
 */
export const DEFAULT_GENERATED_GRAPH_FACETS: readonly GeneratedGraphFacet[] = [
    'ontology',
    'edition',
    'persons',
    'sources',
    'materials',
    'folios',
    'sheets',
    'references',
];
