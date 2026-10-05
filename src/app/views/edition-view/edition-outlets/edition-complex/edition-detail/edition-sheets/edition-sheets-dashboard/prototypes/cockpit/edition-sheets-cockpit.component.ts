import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
    faArrowDown,
    faChevronLeft,
    faChevronRight,
    faComment,
    faLink,
    faListCheck,
    faTableList,
} from '@fortawesome/free-solid-svg-icons';

import { EditionNavigationSheetTarget } from '@awg-views/edition-view/models/edition-navigation.model';
import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { EditionNavigationService } from '@awg-views/edition-view/services/edition-navigation.service';

import { EditionFoliosViewerSvgComponent } from '../../../edition-folios-panel/viewer/svg/edition-folios-viewer-svg.component';
import { DashboardSheet, EDITION_SHEETS_DASHBOARD_UTILS } from '../../edition-sheets-dashboard.utils';

/**
 * The CockpitRelation interface.
 *
 * It holds a related sheet (or link target) of the selected svg sheet with its label.
 */
interface CockpitRelation {
    key: string;
    label: string;
    sheetTarget: EditionNavigationSheetTarget;
}

/**
 * The EditionSheetsCockpit component (design prototype).
 *
 * It displays the context of the selected svg sheet in tiles:
 * a preview with paging and a jump to the edited music text,
 * its location on the folios, its textcritical key figures
 * and its related sheets (genesis and link boxes).
 */
@Component({
    selector: 'awg-edition-sheets-cockpit',
    templateUrl: './edition-sheets-cockpit.component.html',
    styleUrls: ['./edition-sheets-cockpit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EditionFoliosViewerSvgComponent, FaIconComponent],
})
export class EditionSheetsCockpitComponent {
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
     * It emits when the user wants to see the edited music text of the selected svg sheet.
     */
    readonly openSheetRequest = output<void>();

    /**
     * Public readonly variables: font awesome icons for the template.
     */
    readonly faArrowDown = faArrowDown;
    readonly faChevronLeft = faChevronLeft;
    readonly faChevronRight = faChevronRight;
    readonly faComment = faComment;
    readonly faLink = faLink;
    readonly faListCheck = faListCheck;
    readonly faTableList = faTableList;

    /**
     * Readonly computed signal: activeSheet.
     *
     * It holds the dashboard sheet of the selected svg sheet.
     */
    readonly activeSheet = computed<DashboardSheet | undefined>(() =>
        EDITION_SHEETS_DASHBOARD_UTILS.findDashboardSheet(this.sheets(), this.selectedSvgSheet()?.fullId)
    );

    /**
     * Readonly computed signal: siblingFullIds.
     *
     * It holds the full ids (incl. partials) of all sheets of the edition type of the selected svg sheet.
     */
    readonly siblingFullIds = computed<string[]>(() => {
        const editionType = this.activeSheet()?.editionType;

        return this.sheets()
            .filter(sheet => sheet.editionType === editionType)
            .flatMap(sheet => sheet.fullIds);
    });

    /**
     * Readonly computed signal: position.
     *
     * It holds the index of the selected svg sheet within its edition type.
     */
    readonly position = computed<number>(() => this.siblingFullIds().indexOf(this.selectedSvgSheet()?.fullId ?? ''));

    /**
     * Readonly computed signal: genesis.
     *
     * It holds the related sheets of the genesis (parent, siblings, children) of the selected svg sheet.
     */
    readonly genesis = computed(() => {
        const sheets = this.sheets();
        const active = this.activeSheet();
        const toRelation = (sheet: DashboardSheet): CockpitRelation => ({
            key: sheet.id,
            label: sheet.label,
            sheetTarget: sheet.sheetTarget,
        });

        if (!active) {
            return { parent: undefined, siblings: [], children: [] };
        }
        const parent = sheets.find(sheet => sheet.id === active.parentId);

        return {
            parent: parent ? toRelation(parent) : undefined,
            siblings: active.parentId
                ? sheets.filter(sheet => sheet.parentId === active.parentId && sheet.id !== active.id).map(toRelation)
                : [],
            children: sheets.filter(sheet => sheet.parentId === active.id).map(toRelation),
        };
    });

    /**
     * Readonly computed signal: links.
     *
     * It holds the link box targets of the selected svg sheet (with the labels of known sheets).
     */
    readonly links = computed<CockpitRelation[]>(() => {
        const sheets = this.sheets();

        return (this.activeSheet()?.linkTargets ?? []).map((sheetTarget, index) => ({
            key: `${sheetTarget.complexId}-${sheetTarget.sheetId}-${index}`,
            label:
                (sheetTarget.complexId ? `${sheetTarget.complexId}: ` : '') +
                (EDITION_SHEETS_DASHBOARD_UTILS.findDashboardSheet(sheets, sheetTarget.sheetId)?.label ??
                    sheetTarget.sheetId),
            sheetTarget,
        }));
    });

    /**
     * Public method: browse.
     *
     * It navigates to the previous or next sheet (incl. partials) of the same edition type.
     *
     * @param {1 | -1} direction The given direction (-1 for previous, 1 for next).
     * @returns {void} Navigates to the sheet.
     */
    browse(direction: 1 | -1): void {
        const sheetId = this.siblingFullIds()[this.position() + direction];
        if (sheetId) {
            this.navigate({ complexId: '', sheetId });
        }
    }

    /**
     * Public method: navigate.
     *
     * It navigates to the given sheet target (staying in the cockpit).
     *
     * @param {EditionNavigationSheetTarget} sheetTarget The given sheet target.
     * @returns {void} Navigates to the sheet.
     */
    navigate(sheetTarget: EditionNavigationSheetTarget): void {
        this._navigationService.navigateToSvgSheet(sheetTarget);
    }
}
