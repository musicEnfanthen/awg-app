import { GraphQuery } from '@awg-views/edition-view/models/graph.model';

import { GeneratedGraphScope } from '../edition-graph-generated.model';
import { GENERATED_GRAPH_PREFIXES } from './rdf-vocab';

/**
 * Constant: PREFIX_BLOCK.
 *
 * It holds the SPARQL prefix declarations for all generated queries.
 */
const PREFIX_BLOCK = Object.entries(GENERATED_GRAPH_PREFIXES)
    .map(([prefix, iri]) => `PREFIX ${prefix}: <${iri}>`)
    .join('\n');

/**
 * Helper function: q.
 *
 * It creates a graph query with the prefix block.
 */
function q(queryType: 'construct' | 'select', queryLabel: string, body: string): GraphQuery {
    return { queryType, queryLabel, queryString: `${PREFIX_BLOCK}\n\n${body.trim()}` };
}

/**
 * Object constant: QUERIES.
 *
 * It holds the generated example queries.
 */
const QUERIES = {
    allTriples: q(
        'construct',
        'Alle generierten Triples',
        `
CONSTRUCT { ?s ?p ?o . }
WHERE { ?s ?p ?o . }`
    ),
    complexNetwork: q(
        'construct',
        'Netzwerk der Werkkomplexe (Querverweise, gemeinsame Blätter)',
        `
CONSTRUCT {
    ?a dcterms:references ?b .
    ?c awg:sharesFolioWith ?d .
    ?a rdfs:label ?la .
    ?b rdfs:label ?lb .
    ?c rdfs:label ?lc .
    ?d rdfs:label ?ld .
}
WHERE {
    {
        ?a a awg:EditionComplex ;
           dcterms:references ?b .
        ?b a awg:EditionComplex .
        OPTIONAL { ?a rdfs:label ?la . }
        OPTIONAL { ?b rdfs:label ?lb . }
    } UNION {
        ?c awg:sharesFolioWith ?d .
        OPTIONAL { ?c rdfs:label ?lc . }
        OPTIONAL { ?d rdfs:label ?ld . }
    }
}`
    ),
    editionStructure: q(
        'construct',
        'Editionsstruktur: Serien, Abteilungen, Werkkomplexe',
        `
CONSTRUCT {
    ?part dcterms:isPartOf ?whole .
    ?part rdfs:label ?lp .
    ?whole rdfs:label ?lw .
}
WHERE {
    ?part dcterms:isPartOf ?whole .
    { ?whole a awg:Edition . } UNION { ?whole a awg:Series . } UNION { ?whole a awg:Section . }
    OPTIONAL { ?part rdfs:label ?lp . }
    OPTIONAL { ?whole rdfs:label ?lw . }
}`
    ),
    sourcesAndArchives: q(
        'construct',
        'Werkkomplexe, Quellen und Archive',
        `
CONSTRUCT {
    ?source dcterms:isPartOf ?complex .
    ?source schema:holdingArchive ?repo .
    ?source rdfs:label ?ls .
    ?complex rdfs:label ?lc .
    ?repo rdfs:label ?lr .
}
WHERE {
    ?source a awg:Source ;
            dcterms:isPartOf ?complex .
    OPTIONAL { ?source schema:holdingArchive ?repo . OPTIONAL { ?repo rdfs:label ?lr . } }
    OPTIONAL { ?source rdfs:label ?ls . }
    OPTIONAL { ?complex rdfs:label ?lc . }
}`
    ),
    sheetsAndFolios: q(
        'construct',
        'Editionen, Blätter und Quellen (Überlieferung)',
        `
CONSTRUCT {
    ?sheet prov:wasDerivedFrom ?folio .
    ?folio dcterms:isPartOf ?carrier .
    ?sheet rdfs:label ?lsh .
    ?folio rdfs:label ?lf .
    ?carrier rdfs:label ?lc .
}
WHERE {
    ?sheet prov:wasDerivedFrom ?folio .
    ?folio a awg:Folio ;
           dcterms:isPartOf ?carrier .
    OPTIONAL { ?sheet rdfs:label ?lsh . }
    OPTIONAL { ?folio rdfs:label ?lf . }
    OPTIONAL { ?carrier rdfs:label ?lc . }
}`
    ),
    trademarks: q(
        'construct',
        'Gemeinsame Papiermarken der Quellen',
        `
CONSTRUCT {
    ?source awg:hasTrademark ?tm .
    ?source rdfs:label ?ls .
    ?tm rdfs:label ?lt .
}
WHERE {
    ?source awg:hasTrademark ?tm .
    OPTIONAL { ?source rdfs:label ?ls . }
    OPTIONAL { ?tm rdfs:label ?lt . }
}`
    ),
    instruments: q(
        'construct',
        'Schreibmittel der Quellen',
        `
CONSTRUCT {
    ?source dcterms:medium ?medium .
    ?source rdfs:label ?ls .
    ?medium rdfs:label ?lm .
}
WHERE {
    ?source dcterms:medium ?medium .
    OPTIONAL { ?source rdfs:label ?ls . }
    OPTIONAL { ?medium rdfs:label ?lm . }
}`
    ),
    editors: q(
        'construct',
        'Herausgeber, Normdaten und Werkkomplexe',
        `
CONSTRUCT {
    ?complex schema:editor ?person .
    ?person owl:sameAs ?authority .
    ?complex rdfs:label ?lc .
    ?person rdfs:label ?lp .
}
WHERE {
    ?complex schema:editor ?person .
    OPTIONAL { ?person owl:sameAs ?authority . }
    OPTIONAL { ?complex rdfs:label ?lc . }
    OPTIONAL { ?person rdfs:label ?lp . }
}`
    ),
    sheetReferences: q(
        'construct',
        'Querverweise zwischen Skizzen und Editionen',
        `
CONSTRUCT {
    ?a dcterms:references ?b .
    ?a rdfs:label ?la .
    ?b rdfs:label ?lb .
}
WHERE {
    ?a dcterms:references ?b ;
       a ?type .
    FILTER (?type = awg:Sketch || ?type = awg:TextEdition || ?type = awg:WorkEdition || ?type = awg:Source)
    OPTIONAL { ?a rdfs:label ?la . }
    OPTIONAL { ?b rdfs:label ?lb . }
}`
    ),
    genetic: q(
        'construct',
        'Genetische Relationen (aus kuratierten Triples)',
        `
CONSTRUCT {
    ?a awg:precedes ?b1 .
    ?a awg:precedes_scripture ?b2 .
    ?a awg:precedes_content ?b3 .
    ?a awg:concomitates ?b4 .
    ?a awg:concomitates_unsure ?b5 .
    ?a rdfs:label ?la .
}
WHERE {
    { ?a awg:precedes ?b1 . }
    UNION { ?a awg:precedes_scripture ?b2 . }
    UNION { ?a awg:precedes_content ?b3 . }
    UNION { ?a awg:concomitates ?b4 . }
    UNION { ?a awg:concomitates_unsure ?b5 . }
    OPTIONAL { ?a rdfs:label ?la . }
}`
    ),
    sourceTable: q(
        'select',
        'Tabelle: Quellen mit Archiv und Signatur',
        `
SELECT ?complex ?siglum ?archive ?shelfmark
WHERE {
    ?source a awg:Source ;
            dcterms:identifier ?siglum ;
            dcterms:isPartOf ?c .
    ?c rdfs:label ?complex .
    OPTIONAL { ?source schema:holdingArchive ?repo . ?repo rdfs:label ?archive . }
    OPTIONAL { ?source schema:identifier ?shelfmark . }
}
ORDER BY ?complex ?siglum`
    ),
    commentCounts: q(
        'select',
        'Tabelle: Textkritische Anmerkungen pro Edition',
        `
SELECT ?sheet ?label ?count
WHERE {
    ?sheet awg:commentCount ?count .
    OPTIONAL { ?sheet rdfs:label ?label . }
}
ORDER BY DESC(?count)`
    ),
    years: q(
        'select',
        'Tabelle: In Quellen genannte Jahre',
        `
SELECT ?year (COUNT(?source) AS ?sources)
WHERE { ?source awg:mentionsYear ?year . }
GROUP BY ?year
ORDER BY ?year`
    ),
    mostReferenced: q(
        'select',
        'Tabelle: Meistverwiesene Werkkomplexe',
        `
SELECT ?target ?label (COUNT(?origin) AS ?count)
WHERE {
    ?origin dcterms:references ?target .
    ?target a awg:EditionComplex .
    OPTIONAL { ?target rdfs:label ?label . }
}
GROUP BY ?target ?label
ORDER BY DESC(?count)`
    ),
    gapMaterials: q(
        'select',
        'Lücke: Quellen ohne strukturierten Beschreibstoff',
        `
SELECT ?complex ?siglum
WHERE {
    ?source a awg:Source ;
            dcterms:identifier ?siglum ;
            dcterms:isPartOf ?c .
    ?c rdfs:label ?complex .
    OPTIONAL { ?source awg:writingMaterial ?material . }
    FILTER (!BOUND(?material))
}
ORDER BY ?complex ?siglum`
    ),
    gapYears: q(
        'select',
        'Lücke: Quellen ohne erkennbare Jahresangabe',
        `
SELECT ?complex ?siglum
WHERE {
    ?source a awg:Source ;
            dcterms:identifier ?siglum ;
            dcterms:isPartOf ?c .
    ?c rdfs:label ?complex .
    OPTIONAL { ?source awg:mentionsYear ?year . }
    FILTER (!BOUND(?year))
}
ORDER BY ?complex ?siglum`
    ),
    classes: q(
        'select',
        'Tabelle: Klassen und ihre Vorkommen',
        `
SELECT ?class (COUNT(?resource) AS ?count)
WHERE { ?resource a ?class . }
GROUP BY ?class
ORDER BY DESC(?count)`
    ),
} as const;

/**
 * Utils function: buildGeneratedQueries.
 *
 * It builds the list of example queries for the generated graph.
 * The first query is the initial query of the graph visualizer:
 * all triples for a single complex, the network of complexes for the whole edition.
 *
 * @param {GeneratedGraphScope} scope The given scope of the generated graph.
 * @returns {GraphQuery[]} The list of queries.
 */
export function buildGeneratedQueries(scope: GeneratedGraphScope): GraphQuery[] {
    const shared = [
        QUERIES.sourcesAndArchives,
        QUERIES.sheetsAndFolios,
        QUERIES.trademarks,
        QUERIES.instruments,
        QUERIES.editors,
        QUERIES.sheetReferences,
        QUERIES.genetic,
        QUERIES.sourceTable,
        QUERIES.commentCounts,
        QUERIES.years,
        QUERIES.mostReferenced,
        QUERIES.gapMaterials,
        QUERIES.gapYears,
        QUERIES.classes,
    ];
    return scope === 'edition'
        ? [QUERIES.complexNetwork, QUERIES.editionStructure, ...shared, QUERIES.allTriples]
        : [QUERIES.allTriples, QUERIES.complexNetwork, QUERIES.editionStructure, ...shared];
}
