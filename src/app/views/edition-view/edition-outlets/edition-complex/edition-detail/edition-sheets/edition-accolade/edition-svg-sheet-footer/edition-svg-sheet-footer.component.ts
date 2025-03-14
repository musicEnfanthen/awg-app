import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { UtilityService } from '@awg-core/services';
import { TextcriticalCommentary, Textcritics } from '@awg-views/edition-view/models';

/**
 * The EditionSvgSheetFooter component.
 *
 * It contains the footer of the svg sheet navigation section
 * of the edition view of the app
 * and lets the user display textcritical comments.
 */
@Component({
    selector: 'awg-edition-svg-sheet-footer',
    templateUrl: './edition-svg-sheet-footer.component.html',
    styleUrls: ['./edition-svg-sheet-footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class EditionSvgSheetFooterComponent {
    /**
     * Input variable: selectedTextcriticalCommentary.
     *
     * It keeps the selected textcritical commentary.
     */
    @Input()
    selectedTextcriticalCommentary: TextcriticalCommentary;

    /**
     * Input variable: selectedTextcritics.
     *
     * It keeps the selected textcritics of a selected svg sheet.
     */
    @Input()
    selectedTextcritics: Textcritics;

    /**
     * Input variable: showTkA.
     *
     * If the textcritics shall be displayed.
     */
    @Input()
    showTkA: boolean;

    /**
     * Output variable: navigateToReportFragment.
     *
     * It keeps an event emitter for the selected ids of an edition complex and report fragment.
     */
    @Output()
    navigateToReportFragmentRequest: EventEmitter<{ complexId: string; fragmentId: string }> = new EventEmitter();

    /**
     * Output variable: openModalRequest.
     *
     * It keeps an event emitter to open the modal
     * with the selected modal text snippet.
     */
    @Output()
    openModalRequest: EventEmitter<string> = new EventEmitter();

    /**
     * Output variable: selectSvgSheetRequest.
     *
     * It keeps an event emitter for the selected ids of an edition complex and svg sheet.
     */
    @Output()
    selectSvgSheetRequest: EventEmitter<{ complexId: string; sheetId: string }> = new EventEmitter();

    /**
     * Public variable: faChevronRight.
     *
     * It instantiates fontawesome's faChevronRight icon.
     */
    faChevronRight = faChevronRight;

    /**
     * Public variable: faChevronDown.
     *
     * It instantiates fontawesome's faChevronDown icon.
     */
    faChevronDown = faChevronDown;

    /**
     * Self-referring variable needed for CompileHtml library.
     */
    ref: EditionSvgSheetFooterComponent;

    /**
     * Public variable: showEvaluation.
     *
     * It keeps a boolean flag if the evaluation shall be displayed.
     */
    showEvaluation = false;

    /**
     * Public injection variable: UTILS.
     *
     * It keeps an instance of the injected UtilityService.
     */
    readonly UTILS = inject(UtilityService);

    /**
     * Constructor of the EditionSvgSheetFooterComponent.
     *
     * It initializes the self-referring ref variable needed for CompileHtml library.
     *
     */
    constructor() {
        this.ref = this;
    }

    /**
     * Public method: navigateToReportFragment.
     *
     * It emits the given ids of a selected edition complex and report fragment
     * to the {@link navigateToReportFragmentRequest}.
     *
     * @param {object} reportIds The given report ids as { complexId: string, fragmentId: string }.
     * @returns {void} Emits the ids.
     */
    navigateToReportFragment(reportIds: { complexId: string; fragmentId: string }): void {
        if (!reportIds?.fragmentId) {
            return;
        }
        this.navigateToReportFragmentRequest.emit(reportIds);
    }

    /**
     * Public method: openModal.
     *
     * It emits a given id of a modal snippet text
     * to the {@link openModalRequest}.
     *
     * @param {string} id The given modal snippet id.
     * @returns {void} Emits the id.
     */
    openModal(id: string): void {
        if (!id) {
            return;
        }
        this.openModalRequest.emit(id);
    }

    /**
     * Public method: selectSvgSheet.
     *
     * It emits the given ids of a selected edition complex
     * and svg sheet to the {@link selectSvgSheetRequest}.
     *
     * @param {object} sheetIds The given sheet ids as { complexId: string, sheetId: string }.
     * @returns {void} Emits the ids.
     */
    selectSvgSheet(sheetIds: { complexId: string; sheetId: string }): void {
        if (!sheetIds?.sheetId) {
            return;
        }
        this.selectSvgSheetRequest.emit(sheetIds);
    }

    /**
     * Public method: toggleEvaluation.
     *
     * It toogles the boolean switch for displaying the evaluation.
     *
     * @returns {void} Toggles the boolean flag.
     */
    toggleEvaluation(): void {
        this.showEvaluation = !this.showEvaluation;
    }
}
