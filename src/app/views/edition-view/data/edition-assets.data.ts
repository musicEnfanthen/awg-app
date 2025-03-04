/**
 * Object constant: EDITION_ASSETS_DATA.
 *
 * It is used in the context of the edition view
 * to store data of the edition assets.
 */
export const EDITION_ASSETS_DATA = {
    /**
     * The base route to the edition assets JSON files.
     */
    BASE_ROUTE: 'assets/data/edition',

    /**
     * The names of the edition assets JSON files.
     */
    FILES: {
        complexesFile: 'edition-complexes.json',
        folioConvoluteFile: 'folio-convolute.json',
        graphFile: 'graph.json',
        introFile: 'intro.json',
        prefaceFile: 'preface.json',
        rowTablesFile: 'row-tables.json',
        sourceCorrectionsImagesFile: 'source-corrections-images.json',
        sourceDescriptionListFile: 'source-description.json',
        sourceEvaluationListFile: 'source-evaluation.json',
        sourceListFile: 'source-list.json',
        svgSheetsFile: 'svg-sheets.json',
        textcriticsFile: 'textcritics.json',
    },
} as const;
