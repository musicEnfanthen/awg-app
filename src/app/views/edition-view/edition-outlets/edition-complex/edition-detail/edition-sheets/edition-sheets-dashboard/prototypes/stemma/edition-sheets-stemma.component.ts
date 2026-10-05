import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronDown, faChevronRight, faFlagCheckered, faTableList } from '@fortawesome/free-solid-svg-icons';

import { ClickDirective } from '@awg-shared/click/click.directive';

import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { EditionNavigationService } from '@awg-views/edition-view/services/edition-navigation.service';

import { DashboardSheet, EDITION_SHEETS_DASHBOARD_UTILS, StemmaGroup } from '../../edition-sheets-dashboard.utils';

/**
 * Constant: MAX_COMMENT_DOT_SIZE.
 *
 * It keeps the maximal size (in px) of the comment dots of the stemma nodes.
 */
const MAX_COMMENT_DOT_SIZE = 14;

/**
 * The EditionSheetsStemma component (design prototype).
 *
 * It displays the genesis of the svg sheets as stemma trees per manuscript,
 * derived from the hierarchical sheet ids (e.g. `Sk2` → `Sk2.1` → `Sk2.1.2`),
 * leading to the text and work editions.
 * The lineage of the selected svg sheet is highlighted.
 */
@Component({
    selector: 'awg-edition-sheets-stemma',
    templateUrl: './edition-sheets-stemma.component.html',
    styleUrls: ['./edition-sheets-stemma.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ClickDirective, FaIconComponent],
})
export class EditionSheetsStemmaComponent {
    /**
     * Private readonly injection variable: _navigationService.
     *
     * It keeps the instance of the injected EditionNavigationService.
     */
    private readonly _navigationService = inject(EditionNavigationService);

    /**
     * Readonly input signal: sheets.
     *
     * It holds the enriched list of dashboard sheets.
     */
    readonly sheets = input.required<DashboardSheet[]>();

    /**
     * Readonly input signal: selectedSvgSheet.
     *
     * It holds the selected svg sheet (id, full id and selected content).
     */
    readonly selectedSvgSheet = input.required<EditionSvgSheetSelection | undefined>();

    /**
     * Readonly output signal: openSheetRequest.
     *
     * It emits after a sheet has been selected to show its edited music text.
     */
    readonly openSheetRequest = output<void>();

    /**
     * Public readonly variables: font awesome icons for the template.
     */
    readonly faChevronDown = faChevronDown;
    readonly faChevronRight = faChevronRight;
    readonly faFlagCheckered = faFlagCheckered;
    readonly faTableList = faTableList;

    /**
     * Readonly signal: collapsedManuscripts.
     *
     * It holds the manuscripts whose stemma trees are collapsed.
     */
    readonly collapsedManuscripts = signal<ReadonlySet<string>>(new Set());

    /**
     * Readonly computed signal: stemmaGroups.
     *
     * It holds the stemma trees of the sketch editions, one per manuscript.
     */
    readonly stemmaGroups = computed<StemmaGroup[]>(() =>
        EDITION_SHEETS_DASHBOARD_UTILS.buildStemmaGroups(
            this.sheets().filter(sheet => sheet.editionType === 'sketchEditions')
        )
    );

    /**
     * Readonly computed signal: targetSheets.
     *
     * It holds the text and work editions (the targets of the genesis).
     */
    readonly targetSheets = computed<DashboardSheet[]>(() =>
        this.sheets().filter(sheet => sheet.editionType !== 'sketchEditions')
    );

    /**
     * Readonly computed signal: activeSheet.
     *
     * It holds the dashboard sheet of the selected svg sheet.
     */
    readonly activeSheet = computed<DashboardSheet | undefined>(() =>
        EDITION_SHEETS_DASHBOARD_UTILS.findDashboardSheet(this.sheets(), this.selectedSvgSheet()?.fullId)
    );

    /**
     * Readonly computed signal: activeLineage.
     *
     * It holds the lineage (root first) of the selected svg sheet.
     */
    readonly activeLineage = computed<DashboardSheet[]>(() =>
        EDITION_SHEETS_DASHBOARD_UTILS.findLineage(this.sheets(), this.activeSheet())
    );

    /**
     * Readonly computed signal: activeLineageIds.
     *
     * It holds the ids of the lineage of the selected svg sheet.
     */
    readonly activeLineageIds = computed<ReadonlySet<string>>(
        () => new Set(this.activeLineage().map(sheet => sheet.id))
    );

    /**
     * Readonly computed signal: maxCommentCount.
     *
     * It holds the highest number of textcritical comments of all sheets (to scale the comment dots).
     */
    readonly maxCommentCount = computed<number>(() => Math.max(1, ...this.sheets().map(sheet => sheet.commentCount)));

    /**
     * Public method: getCommentDotSize.
     *
     * It gets the size (in px) of the comment dot of a given dashboard sheet.
     *
     * @param {DashboardSheet} sheet The given dashboard sheet.
     * @returns {number} The size of the comment dot.
     */
    getCommentDotSize(sheet: DashboardSheet): number {
        return Math.max(4, Math.round(Math.sqrt(sheet.commentCount / this.maxCommentCount()) * MAX_COMMENT_DOT_SIZE));
    }

    /**
     * Public method: toggleManuscript.
     *
     * It collapses or expands the stemma tree of a given manuscript.
     *
     * @param {string} manuscript The given manuscript.
     * @returns {void} Toggles the collapsed state of the manuscript.
     */
    toggleManuscript(manuscript: string): void {
        this.collapsedManuscripts.update(collapsed => {
            const next = new Set(collapsed);
            if (next.has(manuscript)) {
                next.delete(manuscript);
            } else {
                next.add(manuscript);
            }
            return next;
        });
    }

    /**
     * Public method: openSheet.
     *
     * It navigates to the given dashboard sheet and requests to show its edited music text.
     *
     * @param {DashboardSheet} sheet The given dashboard sheet.
     * @returns {void} Navigates to the sheet.
     */
    openSheet(sheet: DashboardSheet): void {
        this._navigationService.navigateToSvgSheet(sheet.sheetTarget);
        this.openSheetRequest.emit();
    }
}
