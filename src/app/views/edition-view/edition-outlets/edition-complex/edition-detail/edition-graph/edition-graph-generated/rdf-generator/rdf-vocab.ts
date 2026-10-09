import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';

import { PrefixMap } from '../../graph-visualizer/models/rdf.model';
import { DEFAULT_PREFIXES } from '../../graph-visualizer/utils/prefix.utils';

const { namedNode } = DataFactory;

/**
 * Object constant: GENERATED_GRAPH_PREFIXES.
 *
 * It holds the namespaces used by the generated RDF data.
 * The AWG namespace is shared with the curated triples of the graph.json files,
 * so that both can be merged into one graph.
 */
export const GENERATED_GRAPH_PREFIXES: PrefixMap = Object.freeze({
    awg: DEFAULT_PREFIXES['awg'],
    dc: DEFAULT_PREFIXES['dc'],
    dcterms: DEFAULT_PREFIXES['dcterms'],
    foaf: DEFAULT_PREFIXES['foaf'],
    frbr: 'http://purl.org/vocab/frbr/core#',
    mo: DEFAULT_PREFIXES['mo'],
    oa: 'http://www.w3.org/ns/oa#',
    owl: DEFAULT_PREFIXES['owl'],
    prov: DEFAULT_PREFIXES['prov'],
    rdf: DEFAULT_PREFIXES['rdf'],
    rdfs: DEFAULT_PREFIXES['rdfs'],
    schema: 'https://schema.org/',
    skos: DEFAULT_PREFIXES['skos'],
    xsd: DEFAULT_PREFIXES['xsd'],
});

/**
 * Helper function: createNamedNodeFactory.
 *
 * It creates a function that builds named nodes in the given namespace.
 */
function createNamedNodeFactory(prefix: string): (localName: string) => NamedNode {
    const base = GENERATED_GRAPH_PREFIXES[prefix];
    return (localName: string) => namedNode(base + localName);
}

/**
 * Object constant: RDF_NAMESPACES.
 *
 * It holds the named node factories for all used namespaces.
 */
export const RDF_NAMESPACES = {
    awg: createNamedNodeFactory('awg'),
    dc: createNamedNodeFactory('dc'),
    dcterms: createNamedNodeFactory('dcterms'),
    foaf: createNamedNodeFactory('foaf'),
    frbr: createNamedNodeFactory('frbr'),
    mo: createNamedNodeFactory('mo'),
    oa: createNamedNodeFactory('oa'),
    owl: createNamedNodeFactory('owl'),
    prov: createNamedNodeFactory('prov'),
    rdf: createNamedNodeFactory('rdf'),
    rdfs: createNamedNodeFactory('rdfs'),
    schema: createNamedNodeFactory('schema'),
    skos: createNamedNodeFactory('skos'),
    xsd: createNamedNodeFactory('xsd'),
} as const;

/**
 * Object constant: AWG_CLASSES.
 *
 * It holds the classes of the AWG ontology used by the generator.
 */
export const AWG_CLASSES = {
    edition: RDF_NAMESPACES.awg('Edition'),
    series: RDF_NAMESPACES.awg('Series'),
    section: RDF_NAMESPACES.awg('Section'),
    editionComplex: RDF_NAMESPACES.awg('EditionComplex'),
    source: RDF_NAMESPACES.awg('Source'),
    folio: RDF_NAMESPACES.awg('Folio'),
    convolute: RDF_NAMESPACES.awg('Convolute'),
    sketch: RDF_NAMESPACES.awg('Sketch'),
    textEdition: RDF_NAMESPACES.awg('TextEdition'),
    workEdition: RDF_NAMESPACES.awg('WorkEdition'),
    repository: RDF_NAMESPACES.awg('Repository'),
    trademark: RDF_NAMESPACES.awg('Trademark'),
    writingInstrument: RDF_NAMESPACES.awg('WritingInstrument'),
    writingMaterial: RDF_NAMESPACES.awg('WritingMaterial'),
} as const;

/**
 * Object constant: AWG_PROPERTIES.
 *
 * It holds the properties of the AWG ontology used by the generator.
 */
export const AWG_PROPERTIES = {
    hasTrademark: RDF_NAMESPACES.awg('hasTrademark'),
    trademarkVariant: RDF_NAMESPACES.awg('trademarkVariant'),
    writingMaterial: RDF_NAMESPACES.awg('writingMaterial'),
    systems: RDF_NAMESPACES.awg('systems'),
    mentionsYear: RDF_NAMESPACES.awg('mentionsYear'),
    missing: RDF_NAMESPACES.awg('missing'),
    sharesFolioWith: RDF_NAMESPACES.awg('sharesFolioWith'),
    commentCount: RDF_NAMESPACES.awg('commentCount'),
    correctionCount: RDF_NAMESPACES.awg('correctionCount'),
    measure: RDF_NAMESPACES.awg('measure'),
    startSystem: RDF_NAMESPACES.awg('startSystem'),
    endSystem: RDF_NAMESPACES.awg('endSystem'),
} as const;

/**
 * Object constant: AWG_REPOSITORIES.
 *
 * It holds a lookup of the RISM library sigla used in the source locations.
 *
 * Note: The edition data does not provide authority identifiers (RISM Online, GND, ISIL)
 * for the repositories yet; they are therefore only referenced by their siglum.
 */
export const AWG_REPOSITORIES: Readonly<Record<string, { name: string; place: string }>> = Object.freeze({
    'A-Wn': { name: 'Österreichische Nationalbibliothek', place: 'Wien' },
    'A-Wst': { name: 'Wienbibliothek im Rathaus', place: 'Wien' },
    'A-Wue': { name: 'Universal Edition, Archiv', place: 'Wien' },
    'CH-Bps': { name: 'Paul Sacher Stiftung', place: 'Basel' },
    'GB-Lbl': { name: 'The British Library', place: 'London' },
    'US-NYpm': { name: 'The Morgan Library & Museum', place: 'New York' },
    'US-Wc': { name: 'Library of Congress', place: 'Washington, D.C.' },
});

/**
 * Object constant: ONTOLOGY_ALIGNMENT.
 *
 * It holds the alignment of the AWG ontology with established ontologies
 * as a list of [subject, predicate, object] triples in prefixed notation.
 * Plain strings in object position are German labels.
 */
export const ONTOLOGY_ALIGNMENT: readonly (readonly [string, string, string])[] = [
    // Classes
    ['awg:EditionComplex', 'rdfs:subClassOf', 'mo:MusicalWork'],
    ['awg:EditionComplex', 'rdfs:subClassOf', 'frbr:Work'],
    ['awg:EditionComplex', 'rdfs:label', 'Werkkomplex'],
    ['awg:Edition', 'rdfs:subClassOf', 'schema:CreativeWorkSeries'],
    ['awg:Edition', 'rdfs:label', 'Edition'],
    ['awg:Series', 'rdfs:subClassOf', 'schema:CreativeWorkSeries'],
    ['awg:Series', 'rdfs:label', 'Serie'],
    ['awg:Section', 'rdfs:subClassOf', 'schema:CreativeWorkSeries'],
    ['awg:Section', 'rdfs:label', 'Abteilung'],
    ['awg:Source', 'rdfs:subClassOf', 'frbr:Item'],
    ['awg:Source', 'rdfs:subClassOf', 'schema:ArchiveComponent'],
    ['awg:Source', 'rdfs:label', 'Quelle'],
    ['awg:Convolute', 'rdfs:subClassOf', 'frbr:Item'],
    ['awg:Convolute', 'rdfs:label', 'Konvolut'],
    ['awg:Folio', 'rdfs:subClassOf', 'frbr:Item'],
    ['awg:Folio', 'rdfs:label', 'Blatt'],
    ['awg:Sketch', 'rdfs:subClassOf', 'frbr:Expression'],
    ['awg:Sketch', 'rdfs:label', 'Skizze'],
    ['awg:TextEdition', 'rdfs:subClassOf', 'frbr:Expression'],
    ['awg:TextEdition', 'rdfs:label', 'Textedition'],
    ['awg:WorkEdition', 'rdfs:subClassOf', 'frbr:Expression'],
    ['awg:WorkEdition', 'rdfs:label', 'Werkedition'],
    ['awg:Repository', 'rdfs:subClassOf', 'schema:ArchiveOrganization'],
    ['awg:Repository', 'rdfs:label', 'Archiv'],
    ['awg:Trademark', 'rdfs:subClassOf', 'skos:Concept'],
    ['awg:Trademark', 'rdfs:label', 'Papiermarke'],
    ['awg:WritingInstrument', 'rdfs:subClassOf', 'skos:Concept'],
    ['awg:WritingInstrument', 'rdfs:label', 'Schreibmittel'],
    ['awg:WritingMaterial', 'rdfs:subClassOf', 'skos:Concept'],
    ['awg:WritingMaterial', 'rdfs:label', 'Beschreibstoff'],
    // Properties
    ['awg:precedes', 'rdf:type', 'owl:TransitiveProperty'],
    ['awg:precedes_scripture', 'rdfs:subPropertyOf', 'awg:precedes'],
    ['awg:precedes_content', 'rdfs:subPropertyOf', 'awg:precedes'],
    ['awg:concomitates_unsure', 'rdfs:subPropertyOf', 'awg:concomitates'],
    ['awg:hasTrademark', 'rdfs:subPropertyOf', 'dcterms:relation'],
    ['awg:hasTrademark', 'rdfs:label', 'hat Papiermarke'],
    ['awg:writingMaterial', 'rdfs:subPropertyOf', 'dcterms:format'],
    ['awg:writingMaterial', 'rdfs:label', 'Beschreibstoff'],
    ['awg:mentionsYear', 'rdfs:subPropertyOf', 'dcterms:temporal'],
    ['awg:mentionsYear', 'rdfs:label', 'nennt Jahr (heuristisch)'],
    ['awg:sharesFolioWith', 'rdfs:subPropertyOf', 'dcterms:relation'],
    ['awg:sharesFolioWith', 'rdf:type', 'owl:SymmetricProperty'],
    ['awg:sharesFolioWith', 'rdfs:label', 'teilt Blätter mit'],
    ['awg:systems', 'rdfs:label', 'Anzahl Systeme'],
    ['awg:commentCount', 'rdfs:label', 'Anzahl textkritischer Anmerkungen'],
    ['awg:correctionCount', 'rdfs:label', 'Anzahl Korrekturen'],
];
