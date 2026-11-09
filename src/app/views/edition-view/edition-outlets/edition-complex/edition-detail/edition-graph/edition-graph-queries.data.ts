import { GraphQuery } from '@awg-views/edition-view/models/graph.model';

/**
 * String constant: QUERY_PREFIXES.
 *
 * It keeps the prefix block of the example queries (as in the curated graphs).
 */
const QUERY_PREFIXES = `PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX awg: <https://edition.anton-webern.ch/webern-onto#>
`;

/**
 * Array constant: GENERATED_GRAPH_QUERIES.
 *
 * It keeps the example queries for generated graphs without curated queries;
 * they use only general terms of the AWG ontology, no IRIs of a single complex.
 */
export const GENERATED_GRAPH_QUERIES: readonly GraphQuery[] = [
    {
        queryType: 'construct',
        queryLabel: 'Finde alle RDF-Triples',
        queryString: `${QUERY_PREFIXES}
CONSTRUCT
WHERE {
    ?subject ?predicate ?object .
}`,
    },
    {
        queryType: 'construct',
        queryLabel: 'Finde alle genetischen Relationen',
        queryString: `${QUERY_PREFIXES}
CONSTRUCT {
    ?subject ?relation ?object .
}
WHERE {
    ?subject ?relation ?object .
    FILTER (?relation = awg:precedes || ?relation = awg:precedesScripture || ?relation = awg:precedesContent || ?relation = awg:concomitates)
}`,
    },
    {
        queryType: 'construct',
        queryLabel: 'Finde alle Skizzensegmente und ihre Folge',
        queryString: `${QUERY_PREFIXES}
CONSTRUCT {
    ?sketch dcterms:hasPart ?segment .
    ?segment awg:nextSegment ?next .
}
WHERE {
    ?segment a awg:SketchSegment .
    ?sketch dcterms:hasPart ?segment .
    OPTIONAL { ?segment awg:nextSegment ?next . }
}`,
    },
    {
        queryType: 'select',
        queryLabel: 'Finde alle RDF-Triples',
        queryString: `${QUERY_PREFIXES}
SELECT *
WHERE {
    ?subject ?predicate ?object .
}`,
    },
    {
        queryType: 'select',
        queryLabel: 'Finde alle Ressource-Klassen und zähle deren Vorkommen',
        queryString: `${QUERY_PREFIXES}
SELECT ?resource_class (COUNT (?resource_class) AS ?count)
WHERE {
    ?resource a ?resource_class .
}
GROUP BY ?resource_class
ORDER BY ?count
LIMIT 100`,
    },
    {
        queryType: 'select',
        queryLabel: 'Finde alle Skizzen mit Komplex und Blatt',
        queryString: `${QUERY_PREFIXES}
SELECT ?sketch ?label ?complex ?folio
WHERE {
    ?sketch a awg:Sketch ; rdfs:label ?label .
    OPTIONAL { ?sketch awg:belongsToComplex ?complex . }
    OPTIONAL { ?sketch awg:writtenOn ?folio . }
}
ORDER BY ?label`,
    },
    {
        queryType: 'select',
        queryLabel: 'Finde alle Datierungen in zeitlicher Reihenfolge',
        queryString: `${QUERY_PREFIXES}
SELECT ?dating ?label ?date ?folio
WHERE {
    ?dating awg:paratextType awg:paratextType_dating ; awg:statedDate ?date .
    OPTIONAL { ?dating rdfs:label ?label . }
    OPTIONAL { ?dating awg:writtenOn ?folio . }
}
ORDER BY ?date`,
    },
];
