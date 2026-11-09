import type { RdfItemLabel, RdfParatextText, RdfReference } from './rdf-generator.model';

/**
 * Object constant: NAMED_ENTITIES.
 *
 * It keeps the named HTML entities of the edition data with their characters
 * (`&ngsp;` is Angular's non-collapsing space and becomes a plain space).
 */
const NAMED_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: String.fromCodePoint(0xa0),
    ngsp: ' ',
    quot: '"',
});

/**
 * Regex constant: ENTITY_REGEX.
 *
 * It keeps a regex for named, decimal and hexadecimal HTML entities.
 */
const ENTITY_REGEX = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi;

/**
 * Regex constant: SKETCH_LABEL_REGEX.
 *
 * It keeps a regex for the label of a numbered sketch (e.g. `M 317 Sk2.1`, `M* 411 Sk1`, `M 35/42 Sk1`).
 */
const SKETCH_LABEL_REGEX = /^(M\*?)\s*(\d+(?:\/\d+)?)\s+Sk(\d+(?:\.\d+)*)$/;

/**
 * Regex constant: PLACEHOLDER_LABEL_REGEX.
 *
 * It keeps a regex for the label of a sketch with a placeholder number (e.g. `M 78 Sk##`).
 */
const PLACEHOLDER_LABEL_REGEX = /^(M\*?)\s*(\d+(?:\/\d+)?)\s+Sk#+$/;

/**
 * Regex constant: MNR_LABEL_REGEX.
 *
 * It keeps a regex for the label of an item that is a whole M number (e.g. `M 112`).
 */
const MNR_LABEL_REGEX = /^(M\*?)\s*(\d+(?:\/\d+)?)$/;

/**
 * Regex constant: ROW_TABLE_LABEL_REGEX.
 *
 * It keeps a regex for the label of a row table (e.g. `M 317 / M321 / M 322 RT`).
 */
const ROW_TABLE_LABEL_REGEX = /(?:^|\s)RT(?:\s|$)/;

/**
 * Regex constant: SKETCH_REF_REGEX.
 *
 * It keeps a regex for a sketch named in a paratext reference
 * (e.g. `M 321 Sk8 T. 21B–26B`, or `Sk1` without M number).
 */
const SKETCH_REF_REGEX = /^(?:(M\*?)\s*(\d+(?:\/\d+)?)\s+)?Sk(\d+(?:\.\d+)*)/;

/**
 * Regex constant: OPUS_REF_REGEX.
 *
 * It keeps a regex for an opus named in a paratext reference (e.g. `op. 24/1`).
 */
const OPUS_REF_REGEX = /^op\.\s*(\d+)/;

/**
 * Regex constant: POSITION_REGEX.
 *
 * It keeps a regex for the position of a paratext on a folio or page (e.g. `auf Bl. 38v`, `auf S. 5`).
 */
const POSITION_REGEX = /\s*\bauf (Bl|S)\.\s*([^\s,;()]+)/;

/**
 * Regex constant: RELATION_REGEX.
 *
 * It keeps a regex for the reference of a paratext to a sketch or opus (e.g. `(zu M 317 Sk3.1.3)`, `(nach Sk1)`).
 */
const RELATION_REGEX = /\s*\((zu|nach) ([^)]*)\)/;

/**
 * Regex constant: DAY_MONTH_REGEX.
 *
 * It keeps a regex for a day with a roman month (e.g. `4. VII.`, `24. X[.]`, `31[.] I[.]`).
 */
const DAY_MONTH_REGEX = /(\d{1,2})(?:\.|\[\.\])?\s*(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)(?:\.|\[\.\])/g;

/**
 * Regex constant: YEAR_REGEX.
 *
 * It keeps a regex for a two- or four-digit year at the start of a text.
 */
const YEAR_REGEX = /^\s*(\d{4}|\d{2})(?!\d)/;

/**
 * Object constant: ROMAN_MONTHS.
 *
 * It keeps the numbers of the roman months.
 */
const ROMAN_MONTHS: Readonly<Record<string, number>> = Object.freeze({
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
});

/**
 * Helper function: codePointOrEntity.
 *
 * It gets the character of a code point, or the unchanged entity if the code point is invalid.
 */
function codePointOrEntity(entity: string, codePoint: number): string {
    return codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
}

/**
 * Utils function: decodeEntities.
 *
 * It decodes the named, decimal and hexadecimal HTML entities of a text; unknown entities stay unchanged.
 *
 * @param {string} text The given text.
 * @returns {string} The decoded text.
 */
export function decodeEntities(text: string): string {
    return text.replace(ENTITY_REGEX, (entity: string, decimal?: string, hex?: string, name?: string) => {
        if (decimal) {
            return codePointOrEntity(entity, Number.parseInt(decimal, 10));
        }
        if (hex) {
            return codePointOrEntity(entity, Number.parseInt(hex, 16));
        }
        return NAMED_ENTITIES[name?.toLowerCase() ?? ''] ?? entity;
    });
}

/**
 * Utils function: stripHtml.
 *
 * It converts an HTML string of the edition data into plain text:
 * line breaks and snippet placeholders (`##KEY##`) become spaces, other tags are removed,
 * entities decoded and whitespace collapsed.
 *
 * @param {string | undefined} html The given HTML string.
 * @returns {string} The plain text.
 */
export function stripHtml(html: string | undefined): string {
    if (!html) {
        return '';
    }
    const withoutTags = html.replace(/##[^#]*##|<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
    return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/**
 * Utils function: segmentLabel.
 *
 * It gets the label of a sketch segment: the sketch label with the measures of the segment
 * (e.g. `M 317 Sk4 T. 1A–3A`), or with its partial letter if the data name no measures (e.g. `M 317 Sk4a`).
 *
 * @param {string} sketchLabel The given label of the sketch.
 * @param {string} letter The given partial letter of the segment.
 * @param {string} measures The given measures of the segment.
 * @returns {string} The label.
 */
export function segmentLabel(sketchLabel: string, letter: string, measures: string): string {
    return measures ? `${sketchLabel} T. ${measures}` : `${sketchLabel}${letter}`;
}

/**
 * Utils function: parseItemLabel.
 *
 * It parses the plain label of a content item of a source description.
 *
 * @param {string} label The given plain label.
 * @returns {RdfItemLabel} The parsed label.
 */
export function parseItemLabel(label: string): RdfItemLabel {
    if (!label) {
        return { kind: 'empty' };
    }
    const sketch = SKETCH_LABEL_REGEX.exec(label);
    if (sketch) {
        return { kind: 'sketch', prefix: sketch[1] ?? '', number: sketch[2] ?? '', sketchNumber: sketch[3] ?? '' };
    }
    const placeholder = PLACEHOLDER_LABEL_REGEX.exec(label);
    if (placeholder) {
        return { kind: 'placeholder', prefix: placeholder[1] ?? '', number: placeholder[2] ?? '' };
    }
    const mnr = MNR_LABEL_REGEX.exec(label);
    if (mnr) {
        return { kind: 'mnr', prefix: mnr[1] ?? '', number: mnr[2] ?? '' };
    }
    if (ROW_TABLE_LABEL_REGEX.test(label)) {
        return { kind: 'rowTable' };
    }
    return { kind: 'unknown' };
}

/**
 * Utils function: parseParatextText.
 *
 * It splits the plain text of a paratext entry into its wording, folio and reference
 * (e.g. `8. X. 34 auf Bl. 7v System 12–13 (zu M 321 Sk8 T. 21B–26B)`).
 *
 * @param {string} text The given plain text.
 * @returns {RdfParatextText} The parsed text.
 */
export function parseParatextText(text: string): RdfParatextText {
    const position = POSITION_REGEX.exec(text);
    const relation = RELATION_REGEX.exec(text);
    const wording = position ? text.slice(0, position.index) : text;

    return {
        content: wording.replace(RELATION_REGEX, '').trim(),
        folio: position?.[2],
        isPage: position?.[1] === 'S',
        reference: relation?.[2]?.trim(),
    };
}

/**
 * Utils function: parseReference.
 *
 * It parses the reference of a paratext (e.g. `M 321 Sk8 T. 21B–26B`, `Sk1`, `op. 24/1`).
 *
 * @param {string} reference The given reference.
 * @returns {RdfReference | null} The parsed reference, or null if it names neither a sketch nor an opus.
 */
export function parseReference(reference: string): RdfReference | null {
    const opus = OPUS_REF_REGEX.exec(reference);
    if (opus) {
        return { kind: 'opus', number: opus[1] ?? '' };
    }
    const sketch = SKETCH_REF_REGEX.exec(reference);
    if (sketch) {
        return {
            kind: 'sketch',
            prefix: sketch[1],
            number: sketch[2],
            sketchNumber: sketch[3] ?? '',
        };
    }
    return null;
}

/**
 * Utils function: parseStatedDate.
 *
 * It gets the date stated by a dating as `xsd:date` (e.g. `4. VII. 34` → `1934-07-04`).
 * Dates without day or year, with corrections (`→`) and entries with several dates give no date.
 *
 * @param {string} text The given wording of the dating.
 * @returns {string | null} The date (YYYY-MM-DD), or null if the text states no single complete date.
 */
export function parseStatedDate(text: string): string | null {
    if (text.includes('→')) {
        return null;
    }
    const matches = [...text.matchAll(DAY_MONTH_REGEX)];
    const match = matches[0];
    if (matches.length !== 1 || !match) {
        return null;
    }
    const year = YEAR_REGEX.exec(text.slice(match.index + match[0].length))?.[1];
    const day = Number(match[1]);
    const month = ROMAN_MONTHS[match[2] ?? ''];
    if (!year || !month) {
        return null;
    }
    const fullYear = year.length === 2 ? `19${year}` : year;
    const date = new Date(Date.UTC(Number(fullYear), month - 1, day));
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null;
    }
    return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Object constant: RDF_TEXT_UTILS.
 *
 * It keeps all text utils functions of the generator.
 */
export const RDF_TEXT_UTILS = {
    decodeEntities,
    parseItemLabel,
    parseParatextText,
    parseReference,
    parseStatedDate,
    segmentLabel,
    stripHtml,
} as const;
