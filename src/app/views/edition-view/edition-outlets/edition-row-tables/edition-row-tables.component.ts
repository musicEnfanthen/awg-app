import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { EditionRowTablesList } from '@awg-views/edition-view/models';
import { EditionDataService, EditionStateService } from '@awg-views/edition-view/services';

/**
 * The EditionRowTables component.
 *
 * It contains the row tables overview
 * of the edition view of the app.
 */
@Component({
    selector: 'awg-edition-row-tables',
    templateUrl: './edition-row-tables.component.html',
    styleUrls: ['./edition-row-tables.component.scss'],
})
export class EditionRowTablesComponent implements OnDestroy, OnInit {
    /**
     * Public variable: rowTablesData$.
     *
     * It keeps an observable of the data of the edition row tables.
     */
    rowTablesData$: Observable<EditionRowTablesList>;

    /**
     * Constructor of the EditionRowTablesComponent.
     *
     * It declares private instances of the EditionStateService and EditionDataService.
     *
     * @param {EditionStateService} editionStateService Instance of the EditionStateService.
     * @param {EditionDataService} editionDataService Instance of the EditionDataService.
     */
    constructor(
        private editionStateService: EditionStateService,
        private editionDataService: EditionDataService
    ) {}

    /**
     * Angular life cycle hook: ngOnInit.
     *
     * It calls the containing methods
     * when initializing the component.
     */
    ngOnInit(): void {
        this.editionStateService.updateIsRowTableView(true);
        this.rowTablesData$ = this.editionDataService.getEditionRowTablesData();
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
        this.editionStateService.clearIsRowTableView();
    }
}
