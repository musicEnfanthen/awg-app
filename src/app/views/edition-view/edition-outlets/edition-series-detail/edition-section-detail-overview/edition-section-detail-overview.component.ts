import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

import { UtilityService } from '@awg-core/services';
import { EditionOutlineSection, EditionOutlineSeries } from '@awg-views/edition-view/models';
import { EditionService } from '@awg-views/edition-view/services';

/**
 * The EditionSectionDetailOverview component.
 *
 * It contains the detail overview of a section
 * of the edition view of the app.
 */
@Component({
    selector: 'awg-edition-section-detail-overview',
    templateUrl: './edition-section-detail-overview.component.html',
    styleUrls: ['./edition-section-detail-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditionSectionDetailOverviewComponent implements OnInit {
    /**
     * Public variable: selectedSeries.
     *
     * It keeps the selected series of the edition.
     */
    selectedSeries: EditionOutlineSeries;

    /**
     * Public variable: selectedSection.
     *
     * It keeps the selected section of the edition.
     */
    selectedSection: EditionOutlineSection;

    /**
     * Constructor of the EditionSectionDetailComponent.
     *
     * It declares private instances of the EditionService,
     * and a public instance of the UtilityService.
     *
     * @param {EditionService} editionService Instance of the EditionService.
     * @param {UtilityService} utils Instance of the UtilityService.
     */
    constructor(
        private editionService: EditionService,
        public utils: UtilityService
    ) {
        // Intentionally left empty until implemented
    }

    /**
     * Angular life cycle hook: ngOnInit.
     *
     * It calls the containing methods
     * when initializing the component.
     */
    ngOnInit() {
        this.setupSectionDetailOverview();
    }

    /**
     * Public method: setupSectionDetailOverview.
     *
     * It sets up the section detail ovewview.
     *
     * @returns {void} Sets up the section detail overview.
     */
    setupSectionDetailOverview(): void {
        this.editionService.getSelectedEditionSeries().subscribe(series => (this.selectedSeries = series));
        this.editionService.getSelectedEditionSection().subscribe(section => (this.selectedSection = section));
    }
}