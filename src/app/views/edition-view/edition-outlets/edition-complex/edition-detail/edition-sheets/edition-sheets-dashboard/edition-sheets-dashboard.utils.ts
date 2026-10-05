/**
 * Utilities of the EditionSheetsDashboardComponent (design prototypes).
 *
 * They combine the svg sheets, folio convolutes and textcritics of an edition complex
 * into one enriched list of dashboard sheets, as pure functions.
 */
import { EditionNavigationSheetTarget } from '@awg-views/edition-view/models/edition-navigation.model';
import { EditionSvgSheetsList } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import {
    EDITION_TYPE_KEYS,
    EDITION_TYPE_LABEL_MAP,
    EditionTypeKey,
} from '@awg-views/edition-view/models/edition-type.model';
import { Folio, FolioConvolute } from '@awg-views/edition-view/models/folio.model';
import { Textcritics } from '@awg-views/edition-view/models/textcritics.model';

import { getFullSheetIds } from '../edition-sheets.utils';

/**
 * The DashboardFolioLocation interface.
 *
 * It holds the folios of a convolute that contain a dashboard sheet.
 */
export interface DashboardFolioLocation {
    /**
     * The id of the convolute.
     */
    convoluteId: string;

    /**
     * The label of the convolute.
     */
    convoluteLabel: string;

    /**
     * The folios of the convolute that contain the sheet.
     */
    folios: Folio[];
}

/**
 * The DashboardSheet interface.
 *
 * It holds an svg sheet enriched with its edition type,
 * textcritical key figures, folio locations and genealogy.
 */
export interface DashboardSheet {
    /**
     * The id of the sheet.
     */
    id: string;

    /**
     * The label of the sheet.
     */
    label: string;

    /**
     * The edition type of the sheet.
     */
    editionType: EditionTypeKey;

    /**
     * The label of the edition type of the sheet.
     */
    editionTypeLabel: string;

    /**
     * The full ids of the sheet (one per partial).
     */
    fullIds: string[];

    /**
     * The navigation target of the (first partial of the) sheet.
     */
    sheetTarget: EditionNavigationSheetTarget;

    /**
     * The path to the svg file of the first partial (used as thumbnail).
     */
    thumbnailSvg: string;

    /**
     * The number of partials of the sheet.
     */
    partialCount: number;

    /**
     * The number of textcritical comments of the sheet.
     */
    commentCount: number;

    /**
     * The number of evaluations of the sheet.
     */
    evaluationCount: number;

    /**
     * The flag if the sheet has a row table.
     */
    hasRowtable: boolean;

    /**
     * The navigation targets of the link boxes of the sheet.
     */
    linkTargets: EditionNavigationSheetTarget[];

    /**
     * The folio locations of the sheet.
     */
    folioLocations: DashboardFolioLocation[];

    /**
     * The manuscript of the sheet (id prefix, e.g. `M317`).
     */
    manuscript: string;

    /**
     * The id of the parent sheet (the next existing id prefix), if any.
     */
    parentId?: string;
}

/**
 * The StemmaRow interface.
 *
 * It holds a dashboard sheet as a row of a flattened stemma tree.
 */
export interface StemmaRow {
    /**
     * The dashboard sheet of the row.
     */
    sheet: DashboardSheet;

    /**
     * The depth of the row in the tree (0 for roots).
     */
    depth: number;

    /**
     * The flag if the row is the last child of its parent.
     */
    isLastChild: boolean;
}

/**
 * The StemmaGroup interface.
 *
 * It holds the flattened stemma tree of a manuscript.
 */
export interface StemmaGroup {
    /**
     * The manuscript of the group.
     */
    manuscript: string;

    /**
     * The rows of the flattened stemma tree.
     */
    rows: StemmaRow[];
}

/**
 * Function: findParentId.
 *
 * It finds the id of the parent sheet of a given sheet id,
 * i.e. the longest existing id prefix after removing `_N` segments (e.g. `M317_Sk2_1` → `M317_Sk2`).
 *
 * @param {string} id The given sheet id.
 * @param {Set<string>} existingIds The given set of existing sheet ids.
 *
 * @returns {string | undefined} The id of the parent sheet, or undefined.
 */
export function findParentId(id: string, existingIds: Set<string>): string | undefined {
    let candidate = id;

    while (/_\d+$/.test(candidate)) {
        candidate = candidate.replace(/_\d+$/, '');
        if (existingIds.has(candidate)) {
            return candidate;
        }
    }

    return undefined;
}

/**
 * Function: buildDashboardSheets.
 *
 * It builds the enriched list of dashboard sheets of an edition complex.
 *
 * @param {EditionSvgSheetsList} svgSheetsData The given svg sheets data.
 * @param {FolioConvolute[]} convolutes The given folio convolutes.
 * @param {Textcritics[]} textcritics The given (unfiltered) textcritics.
 *
 * @returns {DashboardSheet[]} The list of dashboard sheets.
 */
export function buildDashboardSheets(
    svgSheetsData: EditionSvgSheetsList,
    convolutes: FolioConvolute[],
    textcritics: Textcritics[]
): DashboardSheet[] {
    const existingIds = new Set(
        EDITION_TYPE_KEYS.flatMap(editionType => (svgSheetsData.sheets[editionType] ?? []).map(sheet => sheet.id))
    );

    return EDITION_TYPE_KEYS.flatMap(editionType =>
        (svgSheetsData.sheets[editionType] ?? []).map(sheet => {
            const fullIds = getFullSheetIds(sheet);
            const textcritic = textcritics.find(entry => entry.id === sheet.id);
            const comments = textcritic?.commentary?.comments ?? [];
            const sheetIds = new Set([sheet.id, ...fullIds]);

            const folioLocations = convolutes
                .map(convolute => ({
                    convoluteId: convolute.convoluteId,
                    convoluteLabel: convolute.convoluteLabel,
                    folios: (convolute.folios ?? []).filter(folio =>
                        folio.content.some(content => sheetIds.has(content.sheetId))
                    ),
                }))
                .filter(location => location.folios.length > 0);

            return {
                id: sheet.id,
                label: sheet.label,
                editionType,
                editionTypeLabel: EDITION_TYPE_LABEL_MAP[editionType],
                fullIds,
                sheetTarget: { complexId: '', sheetId: fullIds[0] },
                thumbnailSvg: sheet.content[0]?.svg ?? '',
                partialCount: sheet.content.length,
                commentCount: comments.reduce((sum, block) => sum + block.blockComments.length, 0),
                evaluationCount: textcritic?.evaluations?.length ?? 0,
                hasRowtable: !!textcritic?.rowtable,
                linkTargets: (textcritic?.linkBoxes ?? []).map(linkBox => linkBox.linkTo),
                folioLocations,
                manuscript: sheet.id.split('_')[0],
                parentId: findParentId(sheet.id, existingIds),
            };
        })
    );
}

/**
 * Function: buildStemmaGroups.
 *
 * It builds the flattened stemma trees (one per manuscript) of the given dashboard sheets,
 * keeping the original order of the sheets (depth-first).
 *
 * @param {DashboardSheet[]} sheets The given dashboard sheets.
 *
 * @returns {StemmaGroup[]} The stemma groups.
 */
export function buildStemmaGroups(sheets: DashboardSheet[]): StemmaGroup[] {
    const childrenById = new Map<string, DashboardSheet[]>();
    for (const sheet of sheets) {
        if (sheet.parentId) {
            childrenById.set(sheet.parentId, [...(childrenById.get(sheet.parentId) ?? []), sheet]);
        }
    }

    const groups = new Map<string, StemmaRow[]>();
    const visit = (sheet: DashboardSheet, depth: number, isLastChild: boolean, rows: StemmaRow[]): void => {
        rows.push({ sheet, depth, isLastChild });
        const children = childrenById.get(sheet.id) ?? [];
        children.forEach((child, index) => visit(child, depth + 1, index === children.length - 1, rows));
    };

    for (const sheet of sheets.filter(entry => !entry.parentId)) {
        const rows = groups.get(sheet.manuscript) ?? [];
        visit(sheet, 0, true, rows);
        groups.set(sheet.manuscript, rows);
    }

    return [...groups.entries()].map(([manuscript, rows]) => ({ manuscript, rows }));
}

/**
 * Function: findDashboardSheet.
 *
 * It finds the dashboard sheet that contains the given full sheet id.
 *
 * @param {DashboardSheet[]} sheets The given dashboard sheets.
 * @param {string | undefined} fullId The given full sheet id.
 *
 * @returns {DashboardSheet | undefined} The found dashboard sheet, or undefined.
 */
export function findDashboardSheet(sheets: DashboardSheet[], fullId: string | undefined): DashboardSheet | undefined {
    return fullId ? sheets.find(sheet => sheet.fullIds.includes(fullId)) : undefined;
}

/**
 * Function: findLineage.
 *
 * It finds the lineage (ancestors incl. the sheet itself, root first) of a given dashboard sheet.
 *
 * @param {DashboardSheet[]} sheets The given dashboard sheets.
 * @param {DashboardSheet | undefined} sheet The given dashboard sheet.
 *
 * @returns {DashboardSheet[]} The lineage of the sheet.
 */
export function findLineage(sheets: DashboardSheet[], sheet: DashboardSheet | undefined): DashboardSheet[] {
    const lineage: DashboardSheet[] = [];
    let current = sheet;

    while (current) {
        lineage.unshift(current);
        const parentId = current.parentId;
        current = parentId ? sheets.find(entry => entry.id === parentId) : undefined;
    }

    return lineage;
}

/**
 * Utils constants: EDITION_SHEETS_DASHBOARD_UTILS.
 *
 * It keeps a namespace reference to the edition sheets dashboard utils methods.
 */
export const EDITION_SHEETS_DASHBOARD_UTILS = {
    buildDashboardSheets,
    buildStemmaGroups,
    findDashboardSheet,
    findLineage,
    findParentId,
} as const;
