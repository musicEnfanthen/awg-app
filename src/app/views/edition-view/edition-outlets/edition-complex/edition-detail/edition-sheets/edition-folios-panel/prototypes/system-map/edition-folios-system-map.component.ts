import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { ClickDirective } from '@awg-shared/click/click.directive';
import { ModalService } from '@awg-shared/modal/modal.service';

import { EditionNavigationSheetTarget } from '@awg-views/edition-view/models/edition-navigation.model';
import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { Folio, FolioConvolute } from '@awg-views/edition-view/models/folio.model';
import { EditionNavigationService } from '@awg-views/edition-view/services/edition-navigation.service';

/**
 * Layout constants of the system map (in px).
 */
const AXIS_WIDTH = 28;
const HEADER_HEIGHT = 30;
const COLUMN_WIDTH = 120;
const COLUMN_GAP = 20;
const ROW_HEIGHT = 14;
const BAR_INSET = 2;
const RELATIVE_TO_SYSTEM_SHIFT = 0.4;
const MIN_LABEL_WIDTH = 44;

/**
 * The SystemMapColumn interface.
 *
 * It holds the layout of a folio column of the system map.
 */
interface SystemMapColumn {
    folioId: string;
    x: number;
    numberOfSystems: number;
    reversed: boolean;
}

/**
 * The SystemMapBar interface.
 *
 * It holds the layout and the data of a content bar of the system map.
 */
interface SystemMapBar {
    key: string;
    x: number;
    y: number;
    width: number;
    height: number;
    sigle: string;
    tooltip: string;
    showLabel: boolean;
    selectable: boolean;
    sheetTarget: EditionNavigationSheetTarget;
    linkTo: string;
}

/**
 * The EditionFoliosSystemMap component (design prototype).
 *
 * It displays all folios of the selected convolute in one compact svg matrix:
 * folios as columns, systems as rows and the contents as bars over their systems.
 * Hovering a bar highlights all bars of the same sigle across the folios.
 */
@Component({
    selector: 'awg-edition-folios-system-map',
    templateUrl: './edition-folios-system-map.component.html',
    styleUrls: ['./edition-folios-system-map.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ClickDirective],
})
export class EditionFoliosSystemMapComponent {
    /**
     * Private readonly injection variable: _modalService.
     *
     * It keeps the instance of the injected ModalService.
     */
    private readonly _modalService = inject(ModalService);

    /**
     * Private readonly injection variable: _navigationService.
     *
     * It keeps the instance of the injected EditionNavigationService.
     */
    private readonly _navigationService = inject(EditionNavigationService);

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
     * Readonly signal: hoveredSigle.
     *
     * It holds the sigle of the hovered (or focused) bar, if any.
     */
    readonly hoveredSigle = signal<string | null>(null);

    /**
     * Public readonly variables: layout constants for the template.
     */
    readonly axisWidth = AXIS_WIDTH;
    readonly headerHeight = HEADER_HEIGHT;
    readonly columnWidth = COLUMN_WIDTH;
    readonly rowHeight = ROW_HEIGHT;

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
     * Readonly computed signal: maxNumberOfSystems.
     *
     * It holds the highest number of systems of all folios (number of rows).
     */
    readonly maxNumberOfSystems = computed<number>(() =>
        Math.max(0, ...this.folios().map(folio => Number.parseInt(folio.systems, 10) || 0))
    );

    /**
     * Readonly computed signal: rows.
     *
     * It holds the system numbers of the rows (1 … max).
     */
    readonly rows = computed<number[]>(() => Array.from({ length: this.maxNumberOfSystems() }, (_, i) => i + 1));

    /**
     * Readonly computed signal: columns.
     *
     * It holds the layout of the folio columns.
     */
    readonly columns = computed<SystemMapColumn[]>(() =>
        this.folios().map((folio, index) => ({
            folioId: folio.folioId,
            x: AXIS_WIDTH + index * (COLUMN_WIDTH + COLUMN_GAP),
            numberOfSystems: Number.parseInt(folio.systems, 10) || 0,
            reversed: !!folio.reversed,
        }))
    );

    /**
     * Readonly computed signal: bars.
     *
     * It holds the layout of the content bars of all folios.
     */
    readonly bars = computed<SystemMapBar[]>(() =>
        this.folios().flatMap((folio, folioIndex) => {
            const columnX = AXIS_WIDTH + folioIndex * (COLUMN_WIDTH + COLUMN_GAP);

            return folio.content.flatMap((content, contentIndex) => {
                const segment = content.segments?.[0];
                if (!segment) {
                    return [];
                }
                const split = content.segmentSplit ?? 1;
                const splitIndex = segment.position && segment.position <= split ? segment.position - 1 : 0;
                const splitWidth = COLUMN_WIDTH / split;
                const firstSystem = Math.min(segment.startSystem, segment.endSystem);
                const lastSystem = Math.max(segment.startSystem, segment.endSystem);
                let shift = 0;
                if (segment.relativeToSystem === 'above') {
                    shift = -RELATIVE_TO_SYSTEM_SHIFT;
                } else if (segment.relativeToSystem === 'below') {
                    shift = RELATIVE_TO_SYSTEM_SHIFT;
                }
                const width = splitWidth - 2 * BAR_INSET;
                const height = (lastSystem - firstSystem + 1) * ROW_HEIGHT - 2 * BAR_INSET;
                const label = [content.sigle, content.sigleAddendum].filter(Boolean).join(' ');

                return [
                    {
                        key: `${folio.folioId}-${contentIndex}`,
                        x: columnX + splitIndex * splitWidth + BAR_INSET,
                        y: HEADER_HEIGHT + (firstSystem - 1 + shift) * ROW_HEIGHT + BAR_INSET,
                        width,
                        height,
                        sigle: content.sigle,
                        tooltip: `${label} (Bl. ${folio.folioId}, System ${firstSystem}–${lastSystem})`,
                        showLabel: width >= MIN_LABEL_WIDTH && height >= ROW_HEIGHT - 2 * BAR_INSET,
                        selectable: content.selectable ?? true,
                        sheetTarget: { complexId: content.complexId, sheetId: content.sheetId },
                        linkTo: content.linkTo ?? '',
                    },
                ];
            });
        })
    );

    /**
     * Readonly computed signal: svgWidth.
     *
     * It holds the width of the system map svg.
     */
    readonly svgWidth = computed<number>(
        () => AXIS_WIDTH + this.folios().length * (COLUMN_WIDTH + COLUMN_GAP) - COLUMN_GAP + BAR_INSET
    );

    /**
     * Readonly computed signal: svgHeight.
     *
     * It holds the height of the system map svg.
     */
    readonly svgHeight = computed<number>(() => HEADER_HEIGHT + (this.maxNumberOfSystems() + 1) * ROW_HEIGHT);

    /**
     * Public method: onBarSelect.
     *
     * It navigates to the svg sheet of a selectable bar,
     * or opens the text modal of any other bar.
     *
     * @param {SystemMapBar} bar The given bar.
     * @returns {void} Handles the selection.
     */
    onBarSelect(bar: SystemMapBar): void {
        if (bar.selectable) {
            this._navigationService.navigateToSvgSheet(bar.sheetTarget);
        } else {
            this._modalService.openTextModal(bar.linkTo);
        }
    }
}
