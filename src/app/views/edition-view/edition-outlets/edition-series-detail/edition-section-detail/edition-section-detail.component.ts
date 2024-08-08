import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { UtilityService } from '@awg-core/services';
import { EditionOutlineComplexItem, EditionOutlineSection, EditionOutlineSeries } from '@awg-views/edition-view/models';
import { EditionService } from '@awg-views/edition-view/services';

/**
 * The EditionSectionDetail component.
 *
 * It contains the detail of a section
 * of the edition view of the app.
 */
@Component({
    selector: 'awg-edition-section-detail',
    templateUrl: './edition-section-detail.component.html',
    styleUrls: ['./edition-section-detail.component.scss'],
})
export class EditionSectionDetailComponent implements OnInit, OnDestroy {
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
     * Public variable: combinedMnrComplexes.
     *
     * It keeps the combined mnr complexes of the section.
     */
    combinedMnrComplexes: EditionOutlineComplexItem[] = [];

    /**
     * Private variable: _destroyed$.
     *
     * Subject to emit a truthy value in the ngOnDestroy lifecycle hook.
     */
    private _destroyed$: Subject<boolean> = new Subject<boolean>();

    /**
     * Constructor of the EditionSectionDetailComponent.
     *
     * It declares private instances of the Angular ActivatedRoute and the EditionService,
     * and a public instance of the UtilityService.
     *
     * @param {ActivatedRoute} route Instance of the ActivatedRoute.
     * @param {EditionService} editionService Instance of the EditionService.
     * @param {UtilityService} utils Instance of the UtilityService.
     */
    constructor(
        private route: ActivatedRoute,
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
        this.updateSectionFromRoute();
    }

    /**
     * Public method: updateSectionFromRoute.
     *
     * It fetches the route params to get the id of the current section and updates the edition service.
     *
     * @returns {void} Updates the edition section.
     */
    updateSectionFromRoute(): void {
        const sectionId = this.route.snapshot.paramMap.get('id');

        this.editionService
            .getSelectedEditionSeries()
            .pipe(
                takeUntil(this._destroyed$),
                filter(series => !!series)
            )
            .subscribe(series => {
                this.selectedSeries = series;
                const seriesId = series.series.route;
                this.selectedSection = this.editionService.getEditionSectionById(seriesId, sectionId);
                this.editionService.updateSelectedEditionSection(this.selectedSection);

                this.processSubComplexes();
            });
    }

    /**
     * Public method: processSubComplexes.
     *
     * It processes and sorts the sub (mnr) complexes of the selected section.
     *
     * @returns {void} Sets the combined mnr complexes.
     */
    processSubComplexes(): void {
        if (this.selectedSection && this.utils.isNotEmptyObject(this.selectedSection.complexTypes)) {
            if (this.utils.isNotEmptyArray(this.selectedSection.complexTypes.opus)) {
                const opusSubComplexes = this.selectedSection.complexTypes.opus.flatMap(opus =>
                    this.utils.isNotEmptyArray(opus.subComplexes) ? opus.subComplexes : []
                );

                this.combinedMnrComplexes = [...this.selectedSection.complexTypes.mnr, ...opusSubComplexes];

                this.combinedMnrComplexes.sort((a, b) =>
                    a.complex.titleStatement.catalogueNumber.localeCompare(b.complex.titleStatement.catalogueNumber)
                );
            }
        }
    }

    /**
     * Angular life cycle hook: ngOnDestroy.
     *
     * It calls the containing methods
     * when destroying the component.
     *
     * Destroys subscriptions.
     */
    ngOnDestroy() {
        // Emit truthy value to end all subscriptions
        this._destroyed$.next(true);

        // Now let's also complete the subject itself
        this._destroyed$.complete();
    }
}
