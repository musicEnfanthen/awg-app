import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBookOpen, faChartGantt, faRotate, faTableCells, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap/accordion';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap/tooltip';

import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { Folio, FolioConvolute } from '@awg-views/edition-view/models/folio.model';

import { EditionFoliosLegendComponent } from './legend/edition-folios-legend.component';
import { EditionFoliosFlipComponent } from './prototypes/flip/edition-folios-flip.component';
import { EditionFoliosPagingComponent } from './prototypes/paging/edition-folios-paging.component';
import { EditionFoliosSystemMapComponent } from './prototypes/system-map/edition-folios-system-map.component';
import { EditionFoliosViewerComponent } from './viewer/edition-folios-viewer.component';

/**
 * The FoliosViewMode type.
 *
 * It holds the available view modes of the folios panel
 * (`grid` is the default viewer, the others are design prototypes).
 */
type FoliosViewMode = 'grid' | 'paging' | 'flip' | 'systemMap';

/**
 * The FoliosViewOption interface.
 *
 * It holds a view mode of the folios panel with its label and icon.
 */
interface FoliosViewOption {
    mode: FoliosViewMode;
    label: string;
    icon: IconDefinition;
}

/**
 * The EditionFoliosPanel component.
 *
 * It contains the folios panel (convolute overview)
 * of the edition view of the app
 * with the {@link EditionFoliosViewerComponent}
 * and the {@link EditionFoliosLegendComponent}.
 */
@Component({
    selector: 'awg-edition-folios-panel',
    templateUrl: './edition-folios-panel.component.html',
    styleUrls: ['./edition-folios-panel.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        EditionFoliosFlipComponent,
        EditionFoliosLegendComponent,
        EditionFoliosPagingComponent,
        EditionFoliosSystemMapComponent,
        EditionFoliosViewerComponent,
        FaIconComponent,
        NgbAccordionModule,
        NgbTooltip,
        RouterLink,
    ],
})
export class EditionFoliosPanelComponent {
    /**
     * Readonly input signal: selectedConvolute.
     *
     * It holds the selected convolute.
     */
    readonly selectedConvolute = input.required<FolioConvolute>();

    /**
     * Readonly input signal: selectedSvgSheet.
     *
     * It holds the selected svg sheet (id, full id and selected content).
     */
    readonly selectedSvgSheet = input.required<EditionSvgSheetSelection | undefined>();

    /**
     * Readonly computed signal: folios.
     *
     * It holds the folios of the selected convolute.
     */
    readonly folios = computed<Folio[]>(() => this.selectedConvolute().folios ?? []);

    /**
     * Readonly computed signal: reportFragment.
     *
     * It holds the fragment of the source description
     * of the selected convolute in the critical report.
     */
    readonly reportFragment = computed<string>(() => `source_${this.selectedConvolute().convoluteId}`);

    /**
     * Readonly variable: viewOptions.
     *
     * It holds the selectable view modes of the folios panel.
     */
    readonly viewOptions: FoliosViewOption[] = [
        { mode: 'grid', label: 'Raster', icon: faTableCells },
        { mode: 'paging', label: 'Blättern', icon: faBookOpen },
        { mode: 'flip', label: 'Wenden', icon: faRotate },
        { mode: 'systemMap', label: 'Systemkarte', icon: faChartGantt },
    ];

    /**
     * Readonly signal: viewMode.
     *
     * It holds the selected view mode of the folios panel.
     */
    readonly viewMode = signal<FoliosViewMode>('grid');
}
