import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { Folio, FolioConvolute } from '@awg-views/edition-view/models/folio.model';

import { EditionFoliosViewerSvgComponent } from '../../viewer/svg/edition-folios-viewer-svg.component';

/**
 * The EditionFoliosPaging component (design prototype).
 *
 * It displays one folio of the selected convolute at a time ("light table"),
 * with previous/next buttons, arrow key navigation and a filmstrip of all folios.
 */
@Component({
    selector: 'awg-edition-folios-paging',
    templateUrl: './edition-folios-paging.component.html',
    styleUrls: ['./edition-folios-paging.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EditionFoliosViewerSvgComponent, FaIconComponent],
})
export class EditionFoliosPagingComponent {
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
     * Public readonly variables: faChevronLeft, faChevronRight.
     *
     * They hold the font awesome icons for the paging buttons.
     */
    readonly faChevronLeft = faChevronLeft;
    readonly faChevronRight = faChevronRight;

    /**
     * Readonly computed signal: folios.
     *
     * It holds the folios of the selected convolute.
     */
    readonly folios = computed<Folio[]>(() => this.selectedConvolute().folios ?? []);

    /**
     * Readonly computed signal: selectedSegmentId.
     *
     * It holds the content segment id of the selected svg sheet,
     * i.e. its full id (incl. partial).
     */
    readonly selectedSegmentId = computed<string>(() => this.selectedSvgSheet()?.fullId ?? '');

    /**
     * Readonly linked signal: currentIndex.
     *
     * It holds the index of the displayed folio.
     * It starts with the folio that contains the selected svg sheet (or the first folio)
     * whenever the folios or the selected svg sheet change.
     */
    readonly currentIndex = linkedSignal<number>(() => {
        const segmentId = this.selectedSegmentId();
        const index = this.folios().findIndex(folio => folio.content.some(content => content.sheetId === segmentId));

        return Math.max(index, 0);
    });

    /**
     * Readonly computed signal: currentFolio.
     *
     * It holds the displayed folio.
     */
    readonly currentFolio = computed<Folio | undefined>(() => this.folios()[this.currentIndex()]);

    /**
     * Public method: goTo.
     *
     * It displays the folio with the given index (cycling at both ends).
     *
     * @param {number} index The given index.
     * @returns {void} Sets the current index.
     */
    goTo(index: number): void {
        const length = this.folios().length;
        if (length === 0) {
            return;
        }
        this.currentIndex.set((index + length) % length);
    }

    /**
     * Public method: previous.
     *
     * It displays the previous folio.
     *
     * @returns {void} Sets the current index.
     */
    previous(): void {
        this.goTo(this.currentIndex() - 1);
    }

    /**
     * Public method: next.
     *
     * It displays the next folio.
     *
     * @returns {void} Sets the current index.
     */
    next(): void {
        this.goTo(this.currentIndex() + 1);
    }
}
