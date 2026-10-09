import { EditionTypeKey } from '@awg-views/edition-view/models/edition-type.model';

import { EditionRdfBundle, GapReportItem, StructuralGap } from '../edition-graph-generated.model';
import {
    asStringArray,
    complexKeyOf,
    datesOf,
    extractLinks,
    extractYears,
    parseLocation,
    physDescTexts,
    stripHtml,
    textcriticsTexts,
} from './rdf-generator.utils';
import { AWG_REPOSITORIES } from './rdf-vocab';

/**
 * Constant: MAX_EXAMPLES.
 *
 * It holds the maximum number of examples per gap.
 */
const MAX_EXAMPLES = 8;

/**
 * Constant: LEGACY_PHYS_DESC_KEYS.
 *
 * It holds keys of the physical descriptions that deviate from the model.
 */
const LEGACY_PHYS_DESC_KEYS = ['title', 'date', 'pagination', 'instrumentation', 'annotationss'];

/**
 * Object constant: STRUCTURAL_GAPS.
 *
 * It holds the gaps that cannot be counted, because the information
 * is not (yet) part of the edition data at all.
 */
export const STRUCTURAL_GAPS: readonly StructuralGap[] = [
    {
        label: 'Normdaten für Archive',
        description:
            'Archive sind nur über RISM-Sigel im Freitext von "location" greifbar; Signatur und Sammlung stehen im selben String.',
        suggestion: 'Eigene Felder repository (RISM-Online-/ISIL-ID), collection und shelfmark in source-list.json.',
    },
    {
        label: 'Normalisierte Datierungen',
        description:
            '"dates" enthält transkribierte Datumsangaben der Quellen; editorische Datierungen stehen nur in der Einleitung (HTML).',
        suggestion: 'Strukturierte Datierung pro Quelle/Skizze (z. B. EDTF: "1934-08-13", "1934-08/1934-09").',
    },
    {
        label: 'Personen jenseits der Herausgeber',
        description: 'Schreiberhände, Textdichter (z. B. Hildegard Jone), Widmungsträger oder Kopisten sind nur Prosa.',
        suggestion:
            'Personenregister mit GND-IDs (analog PERSONS_DATA) und Rollen pro Quelle (Schreiber, Textdichter, …).',
    },
    {
        label: 'Relationen zwischen Quellen',
        description:
            'Beziehungen wie "Vorlage für", "Abschrift von", "Korrekturabzug zu" stehen nur in den Quellenbewertungen; source-evaluation.json ist überall leer.',
        suggestion:
            'Typisierte Quellenrelationen (z. B. awg:isCopyOf, awg:servedAsModelFor) in source-description.json.',
    },
    {
        label: 'Genetische Relationen',
        description:
            'Die Abfolge von Skizzen (awg:precedes, awg:concomitates) ist bisher nur für op. 25 kuratiert (graph.json).',
        suggestion:
            'graph.json-Triples für weitere Komplexe oder eine Relationstabelle pro Komplex, aus der Triples generiert werden.',
    },
    {
        label: 'Werk-Normdaten',
        description:
            'Werkkomplexe haben keine GND-Werk-ID, keine Entstehungszeit, keine Besetzung und keinen Textdichter als Daten.',
        suggestion:
            'edition-complexes.json um identifiers (GND, Wikidata), dateOfCreation, instrumentation und textAuthor erweitern.',
    },
    {
        label: 'Rastrierung',
        description: 'Die Rastrierung ist nur indirekt über "systems.totalSystems" und Freitext abgebildet.',
        suggestion: 'Eigenes Feld für Rastrum/Rastralmaß im Beschreibstoff.',
    },
];

/**
 * Helper function: gap.
 *
 * It creates a gap report item with a limited number of examples.
 */
function gap(id: string, label: string, description: string, examples: string[], total: number): GapReportItem {
    return { id, label, description, count: examples.length, total, examples: examples.slice(0, MAX_EXAMPLES) };
}

/**
 * Helper function: complexLabel.
 *
 * It gets the plain label of the complex of a bundle.
 */
function complexLabel(bundle: EditionRdfBundle): string {
    return stripHtml(bundle.complex.complexId.short);
}

/**
 * Utils function: buildGapReport.
 *
 * It analyses the given edition bundles for gaps that limit the generated graph.
 *
 * @param {EditionRdfBundle[]} bundles The given edition bundles.
 * @param {string[]} unavailableComplexes The labels of edition complexes without data.
 * @param {string[]} knownComplexKeys The keys of all edition complexes in edition-complexes.json.
 * @returns {GapReportItem[]} The list of gaps (only gaps with findings).
 */
export function buildGapReport(
    bundles: EditionRdfBundle[],
    unavailableComplexes: string[] = [],
    knownComplexKeys: string[] = []
): GapReportItem[] {
    const descs = bundles.flatMap(bundle =>
        (bundle.sourceDesc?.sources ?? []).map(desc => ({
            bundle,
            desc,
            name: `${complexLabel(bundle)} ${desc.siglum}${desc.siglumAddendum ?? ''}`,
        }))
    );
    const sources = bundles.flatMap(bundle =>
        (bundle.sourceList?.sources ?? []).map(source => ({
            bundle,
            source,
            name: `${complexLabel(bundle)} ${source.siglum}${source.siglumAddendum ?? ''}`,
        }))
    );

    // Sheets and their folios
    const folioSheetIds = new Set(
        bundles.flatMap(bundle =>
            (bundle.folioConvolute?.convolutes ?? []).flatMap(convolute =>
                (convolute.folios ?? []).flatMap(folio => (folio.content ?? []).map(content => content.sheetId))
            )
        )
    );
    const sheets = bundles.flatMap(bundle =>
        (['sketchEditions', 'textEditions', 'workEditions'] as EditionTypeKey[]).flatMap(type =>
            (bundle.svgSheets?.sheets?.[type] ?? []).map(sheet => ({ bundle, sheet, type }))
        )
    );
    const sketches = sheets.filter(entry => entry.type === 'sketchEditions');

    // Convolutes
    const convolutes = bundles.flatMap(bundle =>
        (bundle.folioConvolute?.convolutes ?? []).map(convolute => ({ bundle, convolute }))
    );
    const unmatchedConvolutes = convolutes.filter(({ bundle, convolute }) => {
        const sigla = new Set(
            [...(bundle.sourceList?.sources ?? []), ...(bundle.sourceDesc?.sources ?? [])].map(source =>
                stripHtml(source.siglum)
            )
        );
        return !sigla.has(stripHtml(convolute.convoluteId));
    });

    // Links to edition complexes that are not listed in edition-complexes.json
    const known = new Set(knownComplexKeys.map(key => key.toLowerCase()));
    const unknownRefs = new Map<string, Set<string>>();
    if (known.size) {
        bundles.forEach(bundle => {
            const texts = [
                ...(bundle.textcritics?.textcritics ?? []).flatMap(textcritics => textcriticsTexts(textcritics)),
                ...(bundle.sourceDesc?.sources ?? []).flatMap(desc => physDescTexts(desc.physDesc)),
            ];
            const linkedIds = texts.flatMap(text => extractLinks(text)).map(link => link.complexId);
            const folioIds = (bundle.folioConvolute?.convolutes ?? []).flatMap(convolute =>
                (convolute.folios ?? []).flatMap(folio => (folio.content ?? []).map(content => content.complexId))
            );
            const linkBoxIds = (bundle.textcritics?.textcritics ?? []).flatMap(textcritics =>
                (textcritics.linkBoxes ?? []).map(linkBox => linkBox.linkTo.complexId)
            );
            [...linkedIds, ...folioIds, ...linkBoxIds]
                .map(key => (key ?? '').toLowerCase())
                .filter(key => key && !known.has(key))
                .forEach(key => {
                    const origins = unknownRefs.get(key) ?? new Set<string>();
                    origins.add(complexLabel(bundle));
                    unknownRefs.set(key, origins);
                });
        });
    }
    const allComplexKeys = new Set([...known, ...bundles.map(complexKeyOf)]);

    const report: GapReportItem[] = [
        gap(
            'materials',
            'Quellen ohne strukturierten Beschreibstoff',
            'Ohne "writingMaterials" fehlen Papiermarke, Format und Systemanzahl; die Information steht nur in "writingMaterialStrings" (HTML).',
            descs.filter(({ desc }) => !desc.physDesc?.writingMaterials?.length).map(({ name }) => name),
            descs.length
        ),
        gap(
            'instruments',
            'Quellen ohne Schreibmittel',
            'Ohne "writingInstruments" entfallen die Verbindungen über Tinte/Bleistift.',
            descs.filter(({ desc }) => !desc.physDesc?.writingInstruments?.main).map(({ name }) => name),
            descs.length
        ),
        gap(
            'locations',
            'Fundorte ohne bekanntes RISM-Sigel',
            'Der Fundort lässt sich keinem Archiv-Knoten zuordnen (Drucke, verschollene Quellen oder unbekannte Sigel).',
            sources
                .filter(({ source }) => {
                    const siglum = parseLocation(source.location).siglum;
                    return !siglum || !AWG_REPOSITORIES[siglum];
                })
                .map(({ name, source }) => `${name}: ${stripHtml(source.location) || '—'}`),
            sources.length
        ),
        gap(
            'descriptions',
            'Quellen ohne Quellenbeschreibung',
            'Quellen der Quellenübersicht ohne Eintrag in source-description.json.',
            sources.filter(({ source }) => !source.hasDescription).map(({ name }) => name),
            sources.length
        ),
        gap(
            'dates',
            'Quellen ohne erkennbare Jahresangabe',
            'In "dates" wurde kein Jahr gefunden; eine zeitliche Einordnung im Graphen ist nicht möglich.',
            descs.filter(({ desc }) => !extractYears(datesOf(desc.physDesc)).length).map(({ name }) => name),
            descs.length
        ),
        gap(
            'folios',
            'Skizzen ohne Blattzuordnung',
            'Die Skizze erscheint in keinem Folio von folio-convolute.json und hängt im Graphen nur am Werkkomplex.',
            sketches
                .filter(({ sheet }) => !folioSheetIds.has(sheet.id))
                .map(({ bundle, sheet }) => `${complexLabel(bundle)}: ${sheet.id}`),
            sketches.length
        ),
        gap(
            'convolutes',
            'Konvolute ohne passende Quelle',
            'Die convoluteId entspricht keiner Quellensigle; die Blätter werden an einen eigenen Konvolut-Knoten gehängt.',
            unmatchedConvolutes.map(
                ({ bundle, convolute }) =>
                    `${complexLabel(bundle)}: ${convolute.convoluteId} (${convolute.folios?.length ?? 0} Bl.)`
            ),
            convolutes.length
        ),
        gap(
            'emptyConvolutes',
            'Leere Konvolute',
            'Konvolute ohne Folios (z. B. Platzhalter "A-C-D").',
            convolutes
                .filter(({ convolute }) => !convolute.folios?.length)
                .map(({ bundle, convolute }) => `${complexLabel(bundle)}: ${convolute.convoluteId}`),
            convolutes.length
        ),
        gap(
            'genetic',
            'Werkkomplexe ohne genetische Relationen',
            'Es gibt keine kuratierten Triples (graph.json) mit awg:precedes/awg:concomitates.',
            bundles
                .filter(bundle => !/awg:(precedes|concomitates)/.test(bundle.curatedTriples ?? ''))
                .map(complexLabel),
            bundles.length
        ),
        gap(
            'lastModified',
            'Werkkomplexe ohne gültiges Bearbeitungsdatum',
            '"lastModified" ist kein ISO-Datum (z. B. "---").',
            bundles
                .filter(bundle => !/^\d{4}-\d{2}-\d{2}$/.test(bundle.complex.respStatement.lastModified))
                .map(complexLabel),
            bundles.length
        ),
        gap(
            'legacyKeys',
            'Abweichende Schlüssel in Quellenbeschreibungen',
            `Schlüssel außerhalb des Modells (${LEGACY_PHYS_DESC_KEYS.join(', ')}) werden von der App teils nicht angezeigt.`,
            descs
                .filter(({ desc }) => Object.keys(desc.physDesc ?? {}).some(key => LEGACY_PHYS_DESC_KEYS.includes(key)))
                .map(
                    ({ name, desc }) =>
                        `${name}: ${Object.keys(desc.physDesc)
                            .filter(key => LEGACY_PHYS_DESC_KEYS.includes(key))
                            .join(', ')}`
                ),
            descs.length
        ),
        gap(
            'fragmentedInstruments',
            'Fragmentierte Schreibmittel-Angaben',
            'Einträge in "writingInstruments" mit unausgeglichenen Klammern, vermutlich fälschlich an einem Komma getrennt; sie erzeugen unsinnige Schreibmittel-Knoten.',
            descs.flatMap(({ desc, name }) =>
                [
                    ...asStringArray(desc.physDesc?.writingInstruments?.main),
                    ...asStringArray(desc.physDesc?.writingInstruments?.secondary),
                ]
                    .filter(entry => (entry.match(/\(/g) ?? []).length !== (entry.match(/\)/g) ?? []).length)
                    .map(entry => `${name}: "${entry}"`)
            ),
            descs.length
        ),
        gap(
            'stringValues',
            'Einzelwerte statt Listen in Quellenbeschreibungen',
            'Felder, die laut Modell Listen sind, enthalten einen String (oft leer, z. B. "date": "").',
            descs
                .filter(({ desc }) =>
                    Object.entries(desc.physDesc ?? {}).some(
                        ([key, value]) => typeof value === 'string' && key !== 'writingInstruments'
                    )
                )
                .map(
                    ({ name, desc }) =>
                        `${name}: ${Object.entries(desc.physDesc)
                            .filter(([, value]) => typeof value === 'string')
                            .map(([key]) => key)
                            .join(', ')}`
                ),
            descs.length
        ),
        gap(
            'unknownComplexRefs',
            'Verweise auf nicht verzeichnete Werkkomplexe',
            'Links (data-complex-id, linkBoxes) oder Folio-Belegungen verweisen auf Komplexe, die in edition-complexes.json fehlen; sie erscheinen im Graphen als "(nicht verzeichnet)".',
            [...unknownRefs.entries()]
                .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                .map(([key, origins]) => `${key} ← ${[...origins].join(', ')}`),
            unknownRefs.size + allComplexKeys.size
        ),
        gap(
            'unavailable',
            'Werkkomplexe ohne Datenordner',
            'In edition-complexes.json verzeichnet, aber (noch) nicht freigeschaltet bzw. ohne Daten.',
            unavailableComplexes,
            unavailableComplexes.length + bundles.length
        ),
    ];

    return report.filter(item => item.count > 0);
}

/**
 * Object constant: RDF_GAPS_UTILS.
 *
 * It bundles the utils of the gap analysis.
 */
export const RDF_GAPS_UTILS = {
    buildGapReport,
} as const;
