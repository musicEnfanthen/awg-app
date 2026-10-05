import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faGaugeHigh, faSitemap, faTableCells, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap/accordion';

import {
    EditionSvgSheetSelection,
    EditionSvgSheetsList,
} from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { FolioConvoluteList } from '@awg-views/edition-view/models/folio.model';
import { TextcriticsList } from '@awg-views/edition-view/models/textcritics.model';

import { DashboardSheet, EDITION_SHEETS_DASHBOARD_UTILS } from './edition-sheets-dashboard.utils';
import { EditionSheetsCockpitComponent } from './prototypes/cockpit/edition-sheets-cockpit.component';
import { EditionSheetsGalleryComponent } from './prototypes/gallery/edition-sheets-gallery.component';
import { EditionSheetsStemmaComponent } from './prototypes/stemma/edition-sheets-stemma.component';

/**
 * The SheetsDashboardViewMode type.
 *
 * It holds the available view modes (design prototypes) of the sheets dashboard.
 */
type SheetsDashboardViewMode = 'gallery' | 'stemma' | 'cockpit';

/**
 * The SheetsDashboardViewOption interface.
 *
 * It holds a view mode of the sheets dashboard with its label and icon.
 */
interface SheetsDashboardViewOption {
    mode: SheetsDashboardViewMode;
    label: string;
    icon: IconDefinition;
}

/**
 * The EditionSheetsDashboard component (design prototypes).
 *
 * It contains a switchable dashboard above the sheets panel
 * of the edition view of the app
 * with the {@link EditionSheetsGalleryComponent},
 * the {@link EditionSheetsStemmaComponent}
 * and the {@link EditionSheetsCockpitComponent}.
 */
@Component({
    selector: 'awg-edition-sheets-dashboard',
    templateUrl: './edition-sheets-dashboard.component.html',
    styleUrls: ['./edition-sheets-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        EditionSheetsCockpitComponent,
        EditionSheetsGalleryComponent,
        EditionSheetsStemmaComponent,
        FaIconComponent,
        NgbAccordionModule,
    ],
})
export class EditionSheetsDashboardComponent {
    /**
     * Readonly input signal: svgSheetsData.
     *
     * It holds the svg sheets data.
     */
    readonly svgSheetsData = input.required<EditionSvgSheetsList | null>();

    /**
     * Readonly input signal: folioConvoluteData.
     *
     * It holds the folio convolute data.
     */
    readonly folioConvoluteData = input.required<FolioConvoluteList | null>();

    /**
     * Readonly input signal: textcriticsData.
     *
     * It holds the (unfiltered) textcritics data.
     */
    readonly textcriticsData = input.required<TextcriticsList | null>();

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
     * Readonly computed signal: sheets.
     *
     * It holds the enriched list of dashboard sheets.
     */
    readonly sheets = computed<DashboardSheet[]>(() => {
        const svgSheetsData = this.svgSheetsData();

        return svgSheetsData
            ? EDITION_SHEETS_DASHBOARD_UTILS.buildDashboardSheets(
                  svgSheetsData,
                  this.folioConvoluteData()?.convolutes ?? [],
                  this.textcriticsData()?.textcritics ?? []
              )
            : [];
    });

    /**
     * Readonly variable: viewOptions.
     *
     * It holds the selectable view modes of the sheets dashboard.
     */
    readonly viewOptions: SheetsDashboardViewOption[] = [
        { mode: 'gallery', label: 'Galerie', icon: faTableCells },
        { mode: 'stemma', label: 'Genese', icon: faSitemap },
        { mode: 'cockpit', label: 'Kontext', icon: faGaugeHigh },
    ];

    /**
     * Readonly signal: viewMode.
     *
     * It holds the selected view mode of the sheets dashboard.
     */
    readonly viewMode = signal<SheetsDashboardViewMode>('gallery');
}
