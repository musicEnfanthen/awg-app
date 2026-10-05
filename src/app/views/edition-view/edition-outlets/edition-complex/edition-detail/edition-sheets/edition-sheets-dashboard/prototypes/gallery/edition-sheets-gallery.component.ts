import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faComment, faLayerGroup, faMagnifyingGlass, faTableList } from '@fortawesome/free-solid-svg-icons';

import { ClickDirective } from '@awg-shared/click/click.directive';

import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import {
    EDITION_TYPE_KEYS,
    EDITION_TYPE_LABEL_MAP,
    EditionTypeKey,
} from '@awg-views/edition-view/models/edition-type.model';
import { EditionNavigationService } from '@awg-views/edition-view/services/edition-navigation.service';

import { DashboardSheet } from '../../edition-sheets-dashboard.utils';

/**
 * The GallerySection interface.
 *
 * It holds the (filtered) dashboard sheets of an edition type.
 */
interface GallerySection {
    editionType: EditionTypeKey;
    label: string;
    sheets: DashboardSheet[];
}

/**
 * The EditionSheetsGallery component (design prototype).
 *
 * It displays all svg sheets of the edition complex as cards with a preview of the edited music text,
 * grouped by edition type and filterable by label, edition type and textcritical comments.
 */
@Component({
    selector: 'awg-edition-sheets-gallery',
    templateUrl: './edition-sheets-gallery.component.html',
    styleUrls: ['./edition-sheets-gallery.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ClickDirective, FaIconComponent],
})
export class EditionSheetsGalleryComponent {
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
    readonly faComment = faComment;
    readonly faLayerGroup = faLayerGroup;
    readonly faMagnifyingGlass = faMagnifyingGlass;
    readonly faTableList = faTableList;

    /**
     * Readonly signal: query.
     *
     * It holds the search query for the sheet labels.
     */
    readonly query = signal<string>('');

    /**
     * Readonly signal: typeFilter.
     *
     * It holds the selected edition type filter (or `all`).
     */
    readonly typeFilter = signal<EditionTypeKey | 'all'>('all');

    /**
     * Readonly signal: onlyCommented.
     *
     * It holds the flag if only sheets with textcritical comments are shown.
     */
    readonly onlyCommented = signal<boolean>(false);

    /**
     * Readonly computed signal: typeOptions.
     *
     * It holds the edition types that have sheets, with their labels and counts.
     */
    readonly typeOptions = computed(() =>
        EDITION_TYPE_KEYS.map(editionType => ({
            editionType,
            label: EDITION_TYPE_LABEL_MAP[editionType],
            count: this.sheets().filter(sheet => sheet.editionType === editionType).length,
        })).filter(option => option.count > 0)
    );

    /**
     * Readonly computed signal: sections.
     *
     * It holds the filtered dashboard sheets grouped by edition type.
     */
    readonly sections = computed<GallerySection[]>(() => {
        const query = this.query().trim().toLowerCase();
        const typeFilter = this.typeFilter();
        const onlyCommented = this.onlyCommented();

        const filtered = this.sheets().filter(
            sheet =>
                (typeFilter === 'all' || sheet.editionType === typeFilter) &&
                (!onlyCommented || sheet.commentCount > 0) &&
                (!query || sheet.label.toLowerCase().includes(query))
        );

        return EDITION_TYPE_KEYS.map(editionType => ({
            editionType,
            label: EDITION_TYPE_LABEL_MAP[editionType],
            sheets: filtered.filter(sheet => sheet.editionType === editionType),
        })).filter(section => section.sheets.length > 0);
    });

    /**
     * Readonly computed signal: activeSheetId.
     *
     * It holds the id of the selected svg sheet (without partial).
     */
    readonly activeSheetId = computed<string>(() => this.selectedSvgSheet()?.id ?? '');

    /**
     * Public method: onQueryInput.
     *
     * It sets the search query from a given input event.
     *
     * @param {Event} event The given input event.
     * @returns {void} Sets the query signal.
     */
    onQueryInput(event: Event): void {
        this.query.set((event.target as HTMLInputElement).value);
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
