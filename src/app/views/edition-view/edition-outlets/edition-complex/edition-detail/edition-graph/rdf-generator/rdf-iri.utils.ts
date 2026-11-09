/**
 * Utils function: slug.
 *
 * It converts a text into a safe local name of an IRI
 * (diacritics removed, other characters than letters, digits and hyphens replaced by `_`).
 *
 * @param {string} text The given text.
 * @returns {string} The slug.
 */
export function slug(text: string): string {
    return text
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^A-Za-z0-9-]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Utils function: complexLocal.
 *
 * It gets the local name of an edition complex from its key (e.g. `op25` → `Op25`, `m35_42` → `M35_42`).
 *
 * @param {string} complexKey The given complex key.
 * @returns {string} The local name.
 */
export function complexLocal(complexKey: string): string {
    const local = slug(complexKey);
    return local.charAt(0).toUpperCase() + local.slice(1);
}

/**
 * Utils function: mnrLocal.
 *
 * It gets the local name of an M number (e.g. `M`, `317` → `M317`; `M*`, `409` → `Mx409`; `M`, `35/42` → `M35_42`).
 *
 * @param {string} prefix The given catalogue prefix (`M` or `M*`).
 * @param {string} number The given catalogue number.
 * @returns {string} The local name.
 */
export function mnrLocal(prefix: string, number: string): string {
    return `${prefix === 'M*' ? 'Mx' : 'M'}${slug(number)}`;
}

/**
 * Utils function: complexKeyOfMnr.
 *
 * It gets the key of the edition complex named by an M number (e.g. `M317` → `m317`, `Mx409` → `mx409`).
 *
 * @param {string} mnr The given local name of the M number.
 * @returns {string} The complex key.
 */
export function complexKeyOfMnr(mnr: string): string {
    return mnr.charAt(0).toLowerCase() + mnr.slice(1);
}

/**
 * Utils function: sketchLocal.
 *
 * It gets the local name of a numbered sketch (e.g. `M317`, `2.1` → `M317_Sk2_1`).
 *
 * @param {string} mnr The given local name of the M number.
 * @param {string} sketchNumber The given sketch number with dots.
 * @returns {string} The local name.
 */
export function sketchLocal(mnr: string, sketchNumber: string): string {
    return `${mnr}_Sk${sketchNumber.split('.').join('_')}`;
}

/**
 * Utils function: placeholderSketchLocal.
 *
 * It gets the local name of a sketch with a placeholder number (`Sk##`),
 * counted per M number over the complex (e.g. `M78`, 1 → `M78_SkX_1`). The name is not stable.
 *
 * @param {string} mnr The given local name of the M number.
 * @param {number} counter The given counter.
 * @returns {string} The local name.
 */
export function placeholderSketchLocal(mnr: string, counter: number): string {
    return `${mnr}_SkX_${counter}`;
}

/**
 * Utils function: rowTableLocal.
 *
 * It gets the local name of the row table of a complex (e.g. `Op25` → `Op25_SkRT`).
 *
 * @param {string} complex The given local name of the complex.
 * @returns {string} The local name.
 */
export function rowTableLocal(complex: string): string {
    return `${complex}_SkRT`;
}

/**
 * Utils function: editedLocal.
 *
 * It gets the local name of what an svg sheet edits, from its id
 * (e.g. `M317_Sk1` → `M317_Sk1`, `M317_TF1` → `M317_TF1`, `SkRT` in op. 25 → `Op25_SkRT`).
 *
 * @param {string} complex The given local name of the complex of the sheet.
 * @param {string} sheetId The given sheet id.
 * @returns {string} The local name.
 */
export function editedLocal(complex: string, sheetId: string): string {
    return sheetId.startsWith('SkRT') ? `${complex}_${sheetId}` : slug(sheetId);
}

/**
 * Utils function: sheetLocal.
 *
 * It gets the local name of a sheet from the local name of what it edits (e.g. `M317_Sk1` → `M317_Sk1_Sheet`).
 *
 * @param {string} edited The given local name of the edited sketch or text version.
 * @returns {string} The local name.
 */
export function sheetLocal(edited: string): string {
    return `${edited}_Sheet`;
}

/**
 * Utils function: textVersionLocal.
 *
 * It gets the local name of a text version (e.g. `M317`, `2` → `M317_TF2`);
 * the „only version“ (`einzige`) is TF1.
 *
 * @param {string} mnr The given local name of the M number.
 * @param {string} textVersion The given text version (number or `einzige`).
 * @returns {string} The local name.
 */
export function textVersionLocal(mnr: string, textVersion: string): string {
    return `${mnr}_TF${/^\d+$/.test(textVersion) ? textVersion : '1'}`;
}

/**
 * Utils function: complexPartLocal.
 *
 * It gets the local name of a part position of a composite complex (e.g. `Op25`, 2 → `Op25_part_2`).
 *
 * @param {string} complex The given local name of the composite complex.
 * @param {number} partNumber The given part number.
 * @returns {string} The local name.
 */
export function complexPartLocal(complex: string, partNumber: number): string {
    return `${complex}_part_${partNumber}`;
}

/**
 * Utils function: seriesLocal.
 *
 * It gets the local name of a series from its route (e.g. `1` → `Series_1`).
 *
 * @param {string} series The given series route.
 * @returns {string} The local name.
 */
export function seriesLocal(series: string): string {
    return `Series_${slug(series)}`;
}

/**
 * Utils function: sectionLocal.
 *
 * It gets the local name of a section from the routes of series and section (e.g. `1`, `5` → `Section_1_5`).
 *
 * @param {string} series The given series route.
 * @param {string} section The given section route.
 * @returns {string} The local name.
 */
export function sectionLocal(series: string, section: string): string {
    return `Section_${slug(series)}_${slug(section)}`;
}

/**
 * Utils function: sourceLocal.
 *
 * It gets the local name of a source of a complex (e.g. `Op25`, `A` → `Op25_source_A`).
 *
 * @param {string} complex The given local name of the complex.
 * @param {string} fullSiglum The given siglum with its addendum.
 * @returns {string} The local name.
 */
export function sourceLocal(complex: string, fullSiglum: string): string {
    return `${complex}_source_${slug(fullSiglum)}`;
}

/**
 * Utils function: folioLocal.
 *
 * It gets the local name of a folio from the local name of its document (e.g. `awg_doc_0047`, `38v` → `awg_doc_0047_38v`).
 *
 * @param {string} base The given local name of the document (or of the source without document).
 * @param {string} folio The given folio.
 * @returns {string} The local name.
 */
export function folioLocal(base: string, folio: string): string {
    return `${base}_${slug(folio)}`;
}

/**
 * Utils function: placementLocal.
 *
 * It gets the local name of the placement of an inscription on a folio
 * (e.g. `M317_Sk1`, `awg_doc_0047_38v` → `M317_Sk1_place_awg_doc_0047_38v`).
 *
 * @param {string} inscription The given local name of the inscription.
 * @param {string} folio The given local name of the folio.
 * @returns {string} The local name.
 */
export function placementLocal(inscription: string, folio: string): string {
    return `${inscription}_place_${folio}`;
}

/**
 * Utils function: paratextLocal.
 *
 * It gets the local name of a paratext from its folio (or document), kind and counter
 * (e.g. `awg_doc_0050_7v`, `dating`, 1 → `awg_doc_0050_7v_dating_1`).
 *
 * @param {string} base The given local name of the folio (or of the document if the folio is unknown).
 * @param {string} kind The given paratext kind.
 * @param {number} counter The given counter per folio and kind.
 * @returns {string} The local name.
 */
export function paratextLocal(base: string, kind: string, counter: number): string {
    return `${base}_${kind}_${counter}`;
}

/**
 * Object constant: RDF_IRI_UTILS.
 *
 * It keeps all IRI utils functions of the generator.
 */
export const RDF_IRI_UTILS = {
    complexKeyOfMnr,
    complexLocal,
    complexPartLocal,
    editedLocal,
    folioLocal,
    mnrLocal,
    paratextLocal,
    placeholderSketchLocal,
    placementLocal,
    rowTableLocal,
    sectionLocal,
    seriesLocal,
    sheetLocal,
    sketchLocal,
    slug,
    sourceLocal,
    textVersionLocal,
} as const;
