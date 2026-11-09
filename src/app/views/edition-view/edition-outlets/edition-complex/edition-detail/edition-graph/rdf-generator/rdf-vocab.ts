import type { NamedNode } from '@rdfjs/types';
import { DataFactory } from 'n3';

/**
 * Object constant: RDF_GENERATOR_PREFIXES.
 *
 * It keeps the namespaces of the generated RDF data.
 * The AWG namespace is shared with the curated graph and the ontology (ontology.ttl).
 */
export const RDF_GENERATOR_PREFIXES = Object.freeze({
    awg: 'https://edition.anton-webern.ch/webern-onto#',
    dcterms: 'http://purl.org/dc/terms/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
});

/**
 * Helper function: awg.
 *
 * It gets the named node of a local name in the AWG namespace.
 *
 * @param {string} localName The given local name.
 * @returns {NamedNode} The named node.
 */
export function awg(localName: string): NamedNode {
    return DataFactory.namedNode(RDF_GENERATOR_PREFIXES.awg + localName);
}

/**
 * Object constant: AWG_CLASSES.
 *
 * It keeps the classes of the AWG ontology used by the generator.
 */
export const AWG_CLASSES = {
    completeEdition: awg('CompleteEdition'),
    series: awg('Series'),
    section: awg('Section'),
    editionComplex: awg('EditionComplex'),
    compositeEditionComplex: awg('CompositeEditionComplex'),
    complexPart: awg('ComplexPart'),
    inscription: awg('Inscription'),
    sketch: awg('Sketch'),
    sketchSegment: awg('SketchSegment'),
    rowTable: awg('RowTable'),
    paratext: awg('Paratext'),
    textVersion: awg('TextVersion'),
    editedMusicText: awg('EditedMusicText'),
    sketchEdition: awg('SketchEdition'),
    textEdition: awg('TextEdition'),
    workEdition: awg('WorkEdition'),
    document: awg('Document'),
    source: awg('Source'),
    folio: awg('Folio'),
    placement: awg('Placement'),
} as const;

/**
 * Object constant: AWG_SUPERCLASSES.
 *
 * It keeps the superclasses of the AWG classes (as in ontology.ttl).
 * The generator materializes them as `rdf:type`,
 * because the rdfstore fork evaluates `rdfs:subClassOf*` paths only one step deep.
 */
export const AWG_SUPERCLASSES: ReadonlyMap<NamedNode, readonly NamedNode[]> = new Map([
    [AWG_CLASSES.compositeEditionComplex, [AWG_CLASSES.editionComplex]],
    [AWG_CLASSES.sketch, [AWG_CLASSES.inscription]],
    [AWG_CLASSES.sketchSegment, [AWG_CLASSES.sketch, AWG_CLASSES.inscription]],
    [AWG_CLASSES.rowTable, [AWG_CLASSES.sketch, AWG_CLASSES.inscription]],
    [AWG_CLASSES.paratext, [AWG_CLASSES.inscription]],
    [AWG_CLASSES.sketchEdition, [AWG_CLASSES.editedMusicText]],
    [AWG_CLASSES.textEdition, [AWG_CLASSES.editedMusicText]],
    [AWG_CLASSES.workEdition, [AWG_CLASSES.editedMusicText]],
]);

/**
 * Object constant: AWG_PROPERTIES.
 *
 * It keeps the properties of the AWG ontology used by the generator.
 */
export const AWG_PROPERTIES = {
    accompanies: awg('accompanies'),
    belongsToComplex: awg('belongsToComplex'),
    catalogueNumber: awg('catalogueNumber'),
    catalogueType: awg('catalogueType'),
    concomitates: awg('concomitates'),
    edits: awg('edits'),
    hasDocument: awg('hasDocument'),
    height: awg('height'),
    measures: awg('measures'),
    nextSegment: awg('nextSegment'),
    onFolio: awg('onFolio'),
    paratextType: awg('paratextType'),
    partComplex: awg('partComplex'),
    partNumber: awg('partNumber'),
    partOfComplex: awg('partOfComplex'),
    placementOf: awg('placementOf'),
    precedes: awg('precedes'),
    precedesContent: awg('precedesContent'),
    precedesScripture: awg('precedesScripture'),
    siglum: awg('siglum'),
    siglumAddendum: awg('siglumAddendum'),
    sourceType: awg('sourceType'),
    statedDate: awg('statedDate'),
    systemCount: awg('systemCount'),
    systems: awg('systems'),
    transmittedBy: awg('transmittedBy'),
    width: awg('width'),
    workEditionTextVersion: awg('workEditionTextVersion'),
    writtenOn: awg('writtenOn'),
} as const;

/**
 * Object constant: AWG_INSTANCES.
 *
 * It keeps the instances and concepts of the AWG ontology used by the generator.
 */
export const AWG_INSTANCES = {
    completeEdition: awg('AWG'),
    catalogueTypeMnr: awg('catalogueType_MNR'),
    catalogueTypeMnrX: awg('catalogueType_MNR_X'),
    catalogueTypeOpus: awg('catalogueType_OPUS'),
    paratextTypeAnnotation: awg('paratextType_annotation'),
    paratextTypeDating: awg('paratextType_dating'),
    paratextTypeInstrumentation: awg('paratextType_instrumentation'),
    paratextTypeMeasureNumbering: awg('paratextType_measureNumbering'),
    paratextTypePagination: awg('paratextType_pagination'),
    paratextTypeTitle: awg('paratextType_title'),
} as const;

/**
 * Object constant: EXTERNAL_TERMS.
 *
 * It keeps the terms of external vocabularies used by the generator.
 */
export const EXTERNAL_TERMS = {
    hasPart: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.dcterms}hasPart`),
    isPartOf: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.dcterms}isPartOf`),
    references: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.dcterms}references`),
    title: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.dcterms}title`),
    xsdDate: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.xsd}date`),
    xsdDecimal: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.xsd}decimal`),
    xsdInteger: DataFactory.namedNode(`${RDF_GENERATOR_PREFIXES.xsd}integer`),
} as const;
