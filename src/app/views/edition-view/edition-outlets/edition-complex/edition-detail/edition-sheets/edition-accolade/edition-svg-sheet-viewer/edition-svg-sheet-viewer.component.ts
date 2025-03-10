import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';

import { faCompressArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { SliderConfig } from '@awg-shared/shared-models';
import {
    D3Selection,
    D3ZoomBehaviour,
    EditionSvgOverlay,
    EditionSvgOverlayActionTypes,
    EditionSvgOverlayTypes,
    EditionSvgSheet,
} from '@awg-views/edition-view/models';
import { EditionSvgDrawingService } from '@awg-views/edition-view/services';

import * as D3_ZOOM from 'd3-zoom';

/**
 * The EditionSvgSheetViewer component.
 *
 * It contains a single svg sheet
 * of the edition view of the app
 * and displays that svg sheet.
 */
@Component({
    selector: 'awg-edition-svg-sheet-viewer',
    templateUrl: './edition-svg-sheet-viewer.component.html',
    styleUrls: ['./edition-svg-sheet-viewer.component.scss'],
    standalone: false,
})
export class EditionSvgSheetViewerComponent implements OnChanges, OnDestroy, AfterViewInit {
    /**
     * ViewChild variable: svgSheetContainerRef.
     *
     * It keeps the reference to the svg sheet container.
     */
    @ViewChild('svgSheetContainer') svgSheetContainerRef: ElementRef<HTMLDivElement> | undefined;

    /**
     * ViewChild variable: svgElementRef.
     *
     * It keeps the reference to the svg element.
     */
    @ViewChild('svgSheetElement') svgSheetElementRef: ElementRef<SVGSVGElement> | undefined;

    /**
     * ViewChild variable: svgRootGroupRef.
     *
     * It keeps the reference to the svg root group.
     */
    @ViewChild('svgSheetRootGroup') svgSheetRootGroupRef: ElementRef<SVGGElement> | undefined;

    /**
     * ViewChild variable: _sliderInput.
     *
     * It keeps the reference to the input range slider.
     */
    @ViewChild('sliderInput') sliderInput: ElementRef | undefined;

    /**
     * ViewChild variable: _sliderInputLabel.
     *
     * It keeps the reference to the input sliderInputLabel.
     */
    @ViewChild('sliderInputLabel') sliderInputLabel: ElementRef | undefined;

    /**
     * Input variable: selectedSvgSheet.
     *
     * It keeps the selected svg sheet.
     */
    @Input() selectedSvgSheet?: EditionSvgSheet;

    /**
     * Output variable: browseSvgSheetRequest.
     *
     * It keeps an event emitter for the next or pevious index of an svg sheet.
     */
    @Output()
    browseSvgSheetRequest: EventEmitter<number> = new EventEmitter();

    /**
     * Output variable: selectLinkBoxRequest.
     *
     * It keeps an event emitter for the selected link box.
     */
    @Output()
    selectLinkBoxRequest: EventEmitter<string> = new EventEmitter();

    /**
     * Output variable: selectOverlaysRequest.
     *
     * It keeps an event emitter for the selected svg overlays.
     */
    @Output()
    selectOverlaysRequest: EventEmitter<EditionSvgOverlay[]> = new EventEmitter();

    /**
     * Public variable: faCompressArrowsAlt.
     *
     * It instantiates fontawesome's faCompressArrowsAlt icon.
     */
    faCompressArrowsAlt = faCompressArrowsAlt;

    /**
     * Public variable: hasAvailableTkaOverlays.
     *
     * It keeps a boolean flag whether there are available tka overlays.
     */
    hasAvailableTkaOverlays = false;

    /**
     * Public variable: sliderConfig.
     *
     * It keeps the default values for the zoom slider input.
     */
    sliderConfig = new SliderConfig(1, 0.1, 10, 0.01, 1);

    /**
     * Public variable: suppliedClasses.
     *
     * It keeps a map of the supplied classes.
     */
    suppliedClasses: Map<string, boolean> = new Map();

    /**
     * Public variable: svgSheetFilePath.
     *
     * It keeps the file path of the svg file.
     */
    svgSheetFilePath = '';

    /**
     * Public variable: svgSheetSelection.
     *
     * It keeps the d3 selection of the svg sheet.
     */
    svgSheetSelection: D3Selection | undefined;

    /**
     * Public variable: svgSheetRootGroupSelection.
     *
     * It keeps the d3 selection of the svg sheet root group.
     */
    svgSheetRootGroupSelection: D3Selection | undefined;

    /**
     * Self-referring variable needed for CompileHtml library.
     */
    ref: EditionSvgSheetViewerComponent;

    /**
     * Private variable: availableOverlays.
     *
     * It keeps a list with id and selection status of the available elements overlays.
     */
    private _availableTkaOverlays: EditionSvgOverlay[] = [];

    /**
     * Private variable: selectedElementsWithComments.
     *
     * It keeps a list of the ids of the selected elements with textcritical comments.
     */
    private _selectedTkaOverlays: EditionSvgOverlay[] = [];

    /**
     * Private variable: _divWidth.
     *
     * It keeps the width of the container div.
     */
    private _divWidth: number;

    /**
     * Private variable: _divHeight.
     *
     * It keeps the height of the container div.
     */
    private _divHeight: number;

    /**
     * Private variable: _isRendered.
     *
     * It keeps a boolean flag whether the sheet has been rendered.
     */
    private _isRendered = false;

    /**
     * Private variable: _zoomBehaviour.
     *
     * It keeps the D3 zoom behaviour.
     */
    private _zoomBehaviour: D3ZoomBehaviour;

    /**
     * Private readonly variable: _destroyed$.
     *
     * Subject to emit a truthy value in the ngOnDestroy lifecycle hook.
     */
    private readonly _destroyed$: Subject<boolean> = new Subject<boolean>();

    /**
     * Private readonly variable: _resize$.
     *
     * It keeps a subject for a resize event.
     */
    private readonly _resize$: Subject<boolean> = new Subject<boolean>();

    /**
     * Private readonly injection variable: _cdr.
     *
     * It keeps the instance of the injected Angular ChangeDetectorRef.
     */
    private readonly _cdr = inject(ChangeDetectorRef);

    /**
     * Private readonly injection variable: _svgDrawingService.
     *
     * It keeps the instance of the injected EditionSvgDrawingService.
     */
    private readonly _svgDrawingService = inject(EditionSvgDrawingService);

    /**
     * Constructor of the EditionSvgSheetViewerComponent.
     *
     * It declares the self-referring variable needed for CompileHtml library.
     */
    constructor() {
        this.ref = this;
    }

    /**
     * HostListener: onResize.
     *
     * It redraws the graph when the window is resized.
     */
    @HostListener('window:resize') onResize() {
        // Guard against resize before view is rendered
        if (!this.svgSheetSelection || !this.svgSheetRootGroupSelection) {
            return;
        }

        // Calculate new width & height
        this._getContainerDimensions(this.svgSheetContainerRef);

        // Fire resize event
        this._resize$.next(true);
    }

    /**
     * Angular life cycle hook: ngOnChanges.
     *
     * It checks for changes of the given input.
     *
     * @param {SimpleChanges} changes The changes of the input.
     */
    ngOnChanges(changes: SimpleChanges) {
        if (changes['selectedSvgSheet'] && this._isRendered) {
            this.renderSheet();
        }
    }

    /**
     * Angular life cycle hook: ngAfterViewInit.
     *
     * It calls the containing methods
     * after initializing the view.
     */
    ngAfterViewInit(): void {
        // Subscribe to resize subject to _redraw on resize with delay until component gets destroyed
        this._resize$.pipe(debounceTime(150), takeUntil(this._destroyed$)).subscribe(() => {
            this.renderSheet();
        });

        this.renderSheet();
        this._isRendered = true;
    }

    /**
     * Angular life cycle hook: ngOnDestroy.
     *
     * It calls the containing methods
     * when destroying the component.
     */
    ngOnDestroy() {
        // Emit truthy value to end all subscriptions
        this._destroyed$.next(true);

        // Now let's also complete the subject itself
        this._destroyed$.complete();
    }

    /**
     * Public method: browseSvgSheet.
     *
     * It emits a given direction to the {@link browseSvgSheetRequest}
     * to browse to the previous or next sheet of the selected svg sheet.
     *
     * @param {number} direction A number indicating the direction of navigation. -1 for previous and 1 for next.
     *
     * @returns {void} Emits the direction.
     */
    browseSvgSheet(direction: number): void {
        if (!direction) {
            return;
        }
        this.browseSvgSheetRequest.emit(direction);
    }

    /**
     * Public method: onSuppliedClassesOpacityToggle.
     *
     * It toggles the opacity of a given supplied class.
     *
     * @param {{string, boolean}} input The given input with the class name and its current visibility.
     *
     * @returns {void} Toggles the opacity of the supplied class.
     */
    onSuppliedClassesOpacityToggle(input: { className: string; isCurrentlyVisible: boolean }): void {
        const { className, isCurrentlyVisible } = input;
        this._svgDrawingService.toggleSuppliedClassOpacity(
            this.svgSheetRootGroupSelection,
            className,
            isCurrentlyVisible
        );
    }

    /**
     * Public method: onTkkClassesHighlightToggle.
     *
     * It toggles the highlighting of the tkk classes.
     *
     * @param {boolean} isCurrentlyHighlighted The current highlighting status.
     *
     * @returns {void} Toggles the transparency of the tkk classes.
     */
    onTkkClassesHighlightToggle(isCurrentlyHighlighted: boolean): void {
        const overlayType = 'tkk';

        const overlayGroups: D3Selection = this._svgDrawingService.getGroupsBySelector(
            this.svgSheetRootGroupSelection,
            overlayType
        );
        overlayGroups.nodes().forEach(overlayGroup => {
            const [overlay, overlayGroupRectSelection] = this._getOverlayAndSelection(overlayGroup.id, overlayType);
            const color = isCurrentlyHighlighted
                ? EditionSvgOverlayActionTypes.fill
                : EditionSvgOverlayActionTypes.transparent;
            this._svgDrawingService.updateTkkOverlayColor(overlay, overlayGroupRectSelection, color);
        });
    }

    /**
     * Public method: onZoomChange.
     *
     * It sets the slider value to a given scale step.
     *
     * @param {number} newSliderValue The new slider value.
     *
     * @returns {void} Sets the new slider value and calls for rescale.
     */
    onZoomChange(newSliderValue: number): void {
        this.sliderConfig.value = newSliderValue;
        this._rescaleZoom();
    }

    /**
     * Public method: renderSheet.
     *
     * It renders the SVG sheet with zoom handler and overlays.
     *
     * @returns {void} Renders the SVG sheet.
     */
    renderSheet(): void {
        this._clearSvg();

        // Clear overlays
        this._availableTkaOverlays = [];
        this._selectedTkaOverlays = [];

        this.svgSheetFilePath = this.selectedSvgSheet?.content?.[0].svg;

        if (!this.svgSheetFilePath) {
            return;
        }

        this._createSvg().then(() => {
            this.resetZoom();
            this._createSvgOverlays();
            this._cdr.detectChanges();
        });
    }

    /**
     * Public method: resetZoom.
     *
     * It sets the slider zoom back to its initial state,
     * removing scale factor and transitions.
     *
     * @returns {void} Sets the initial zoom translation and scale factor.
     */
    resetZoom(): void {
        if (!this.svgSheetSelection || !this.sliderConfig) {
            return;
        }

        this.onZoomChange(this.sliderConfig.initial);
        this._resetZoomTranslation();
    }

    /**
     * Private method: _clearSvg.
     *
     * It removes everything from the D3 SVG sheet selections.
     *
     * @returns {void} Cleans the D3 SVG sheet selections.
     */
    private _clearSvg(): void {
        // Clear svg by removing all child nodes from D3 svg sheet selections
        this.svgSheetRootGroupSelection?.selectAll('*').remove();
        this.svgSheetSelection?.selectAll('*').remove();
    }

    /**
     * Private method: _createSvg.
     *
     * It creates the D3 SVG sheet selections and sets their dimensions and the zoom handler.
     *
     * @returns {Promise<void>} Creates the D3 SVG sheet selections and returns a promise.
     */
    private async _createSvg(): Promise<void> {
        if (!this.svgSheetContainerRef) {
            console.warn('No svg sheet container ref');
            return;
        }

        // Create a D3 selection object of the svg template element via svgDrawingService
        this.svgSheetSelection = await this._svgDrawingService.createSvg(
            this.svgSheetFilePath,
            this.svgSheetElementRef?.nativeElement,
            this.svgSheetRootGroupRef?.nativeElement
        );

        // Create a D3 selection object of the svg root group of the svg template element
        this.svgSheetRootGroupSelection = this.svgSheetSelection.select('#awg-edition-svg-sheet-root-group');

        this._getContainerDimensions(this.svgSheetContainerRef);

        // ==================== ZOOM ====================
        this._zoomHandler(this.svgSheetRootGroupSelection, this.svgSheetSelection);
    }

    /**
     * Private method: _createSvgOverlays.
     *
     * It creates the D3 SVG overlays for the textcritical comments and link boxes.
     *
     * @returns {void} Creates the D3 SVG sheet overlays.
     */
    private _createSvgOverlays(): void {
        if (!this.svgSheetRootGroupSelection) {
            return;
        }

        this._createOverlays('link-box', this._createLinkBoxOverlay.bind(this));
        this._createOverlays('tkk', this._createTkaOverlay.bind(this));
        this.hasAvailableTkaOverlays = !!this._availableTkaOverlays && this._availableTkaOverlays.length > 0;
        this._getSuppliedClasses();
    }

    /**
     * Private method: _createOverlays.
     *
     * It creates the D3 SVG overlays for the given overlayType.
     *
     * @param {string} overlayType The type of the overlay to create.
     * @param {Function} createOverlayFn The function to create the overlay.
     *
     * @returns {void} Creates the D3 SVG link box overlays.
     */
    private _createOverlays(overlayType: string, createOverlayFn: (group: SVGGElement, type: string) => void): void {
        const overlayGroups: D3Selection = this._svgDrawingService.getGroupsBySelector(
            this.svgSheetRootGroupSelection,
            overlayType
        );

        if (!overlayGroups) {
            return;
        }

        overlayGroups.nodes().forEach(overlayGroup => {
            createOverlayFn(overlayGroup as SVGGElement, overlayType);
        });
    }

    /**
     * Private method: _createLinkBoxOverlay.
     *
     * It creates the D3 SVG overlay for the given link box group.
     *
     * @param {SVGGElement} group The given link box group.
     *
     * @returns {void} Creates the D3 SVG link box overlay.
     */
    private _createLinkBoxOverlay(group: SVGGElement): void {
        const linkBoxGroupId: string = group['id'];
        const linkBoxGroupSelection: D3Selection = this._svgDrawingService.getD3SelectionById(
            this.svgSheetRootGroupSelection,
            linkBoxGroupId
        );

        // Color link box
        const linkBoxGroupPathSelection: D3Selection = linkBoxGroupSelection.select('path');
        linkBoxGroupPathSelection.style('fill', this._svgDrawingService.linkBoxFillColor);

        linkBoxGroupSelection
            .on('mouseover', () => {
                const hoverColor = this._svgDrawingService.linkBoxHoverFillColor;
                this._svgDrawingService.fillD3SelectionWithColor(linkBoxGroupPathSelection, hoverColor);
                linkBoxGroupSelection.style('cursor', 'pointer');
            })
            .on('mouseout', () => {
                const fillColor = this._svgDrawingService.linkBoxFillColor;
                this._svgDrawingService.fillD3SelectionWithColor(linkBoxGroupPathSelection, fillColor);
            })
            .on('click', () => {
                this._onLinkBoxSelect(linkBoxGroupId);
            });
    }

    /**
     * Private method: _createTkaOverlay.
     *
     * It creates the D3 SVG overlay for the given tka group.
     *
     * @param {SVGGElement} group The given tka group.
     * @param {string} overlayType The type of the overlay to create.
     *
     * @returns {void} Creates the D3 SVG tka overlay.
     */
    private _createTkaOverlay(group: SVGGElement, overlayType: string): void {
        const id: string = group['id'];
        const dim: DOMRect = group.getBBox();

        this._availableTkaOverlays.push(new EditionSvgOverlay(EditionSvgOverlayTypes.tka, id, false));

        // Get D3 selection of overlay group
        const overlayGroupSelection = this._svgDrawingService.createOverlayGroup(
            this.svgSheetRootGroupSelection,
            id,
            dim,
            overlayType
        );

        const [overlay, overlayGroupRectSelection] = this._getOverlayAndSelection(id, overlayType);

        overlayGroupSelection
            .on('mouseover', () => {
                this._svgDrawingService.updateTkkOverlayColor(
                    overlay,
                    overlayGroupRectSelection,
                    EditionSvgOverlayActionTypes.hover
                );
                overlayGroupRectSelection.style('cursor', 'pointer');
            })
            .on('mouseout', () => {
                this._svgDrawingService.updateTkkOverlayColor(
                    overlay,
                    overlayGroupRectSelection,
                    EditionSvgOverlayActionTypes.fill
                );
            })
            .on('click', () => {
                if (overlay) {
                    overlay.isSelected = !overlay.isSelected;
                }
                this._svgDrawingService.updateTkkOverlayColor(
                    overlay,
                    overlayGroupRectSelection,
                    EditionSvgOverlayActionTypes.hover
                );
                this._selectedTkaOverlays = this._getSelectedOverlays(this._availableTkaOverlays);
                this._onOverlaySelect(this._selectedTkaOverlays);
            });
    }

    /**
     * Private method: _getContainerDimensions.
     *
     * It sets the width and height of the given container div with its provided value
     * or the dimensions (width and height) of the given container.
     *
     * @param {ElementRef<HTMLElement>} containerEl The given container element.
     *
     * @returns {void} Sets width and height of the container div.
     */
    private _getContainerDimensions(containerEl: ElementRef<HTMLElement>): void {
        const dimensions = this._svgDrawingService.getContainerDimensions(containerEl);

        this._divWidth = this._divWidth ? this._divWidth : dimensions.width;
        this._divHeight = this._divHeight ? this._divHeight : dimensions.height;
    }

    /**
     * Private method: _getOverlayById.
     *
     * It finds an overlay from a list of overlays by a given id.
     *
     * @param {EditionSvgOverlay[]} overlays The given svg overlays.
     * @param {string} id The given id.
     *
     * @returns {EditionSvgOverlay | undefined } The found overlays or undefined.
     */
    private _getOverlayById(overlays: EditionSvgOverlay[], id: string): EditionSvgOverlay | undefined {
        return overlays.find((overlay: EditionSvgOverlay) => overlay.id === id);
    }

    /**
     * Private method: _getOverlayAndSelection.
     *
     * It gets the overlay and the D3 selection rectangle for the given id and overlay type.
     *
     * @param {string} id The given id.
     * @param {string} overlayType The given overlay type.
     *
     * @returns {[EditionSvgOverlay, D3Selection]} [overlay, overlayGroupRectSelection] The overlay and the D3 selection rect.
     */
    private _getOverlayAndSelection(id: string, overlayType: string): [EditionSvgOverlay, D3Selection] {
        const overlay = this._getOverlayById(this._availableTkaOverlays, id);
        const overlayGroupRectSelection = this._svgDrawingService.getOverlayGroupRectSelection(
            this.svgSheetRootGroupSelection,
            id,
            overlayType
        );

        return [overlay, overlayGroupRectSelection];
    }

    /**
     * Private method: _getSelectedOverlays.
     *
     * It filters a given list of overlays by its selection status.
     *
     * @param {EditionSvgOverlay[]} overlays The given svg overlays.
     *
     * @returns {EditionSvgOverlay } The selected overlays.
     */
    private _getSelectedOverlays(overlays: EditionSvgOverlay[]): EditionSvgOverlay[] {
        return overlays.filter(overlay => overlay.isSelected);
    }

    /**
     * Private method: _getSuppliedClasses.
     *
     * It gets the supplied classes from the svg sheet root group selection.
     *
     * @returns {void} Gets the supplied classes.
     */
    private _getSuppliedClasses(): void {
        this.suppliedClasses = this._svgDrawingService.getSuppliedClasses(this.svgSheetRootGroupSelection);
    }

    /**
     * Private method: _onLinkBoxSelect.
     *
     * It emits the given link box id
     * to the {@link selectLinkBoxRequest}.
     *
     * @param {string} linkBoxId The given link box id.
     * @returns {void} Emits the id.
     */
    private _onLinkBoxSelect(linkBoxId: string): void {
        if (!linkBoxId) {
            return;
        }
        this.selectLinkBoxRequest.emit(linkBoxId);
    }

    /**
     * Private method: _onOverlaySelect.
     *
     * It emits the given svg overlays
     * to the {@link selectOverlaysRequest}.
     *
     * @param {EditionSvgOverlay[]} overlays The given svg overlays.
     *
     * @returns {void} Emits the overlays.
     */
    private _onOverlaySelect(overlays: EditionSvgOverlay[]): void {
        if (!overlays) {
            return;
        }
        this.selectOverlaysRequest.emit(overlays);
    }

    /**
     * Private method: _rescaleZoom.
     *
     * It rescales the current zoom with a given slider value.
     *
     * @returns {void} Sets the zoom for the rescale.
     */
    private _rescaleZoom(): void {
        if (!this.svgSheetSelection || !this.sliderConfig.value) {
            return;
        }
        this._zoomBehaviour.scaleTo(this.svgSheetSelection, this.sliderConfig.value);
    }

    /**
     * Private method: _resetZoomTranslation.
     *
     * It resets the current zoom translation to the to the origin of the SVG canvas (0,0).
     *
     * @returns {void} Resets the zoom translation.
     */
    private _resetZoomTranslation(): void {
        if (!this.svgSheetSelection || !this.svgSheetRootGroupSelection) {
            return;
        }
        this.svgSheetRootGroupSelection.attr('transform', 'translate(0,0)');
    }

    /**
     * Private method: _roundToScaleStepDecimalPrecision.
     *
     * It rounds a given value to the same number of decimal places as the step size of an input range scale.
     * Cf. https://stackoverflow.com/a/13635455
     *
     * @param {number} value The given value to round.
     * @returns {number} The rounded value.
     */
    private _roundToScaleStepDecimalPrecision(value: number): number {
        const stepSize = this.sliderConfig.stepSize;

        // Count decimals of a given value
        // Cf. https://stackoverflow.com/a/17369245
        const countDecimals = (countValue: number): number => {
            // Return zero if value cannot be rounded
            if (Math.floor(countValue) === countValue) {
                return 0;
            }
            // Convert the number to a string, split at the decimal point and return the length of the last part of the array
            return countValue.toString().split('.')[1].length;
        };

        // Avoid Math.round error
        // Cf. https://www.jacklmoore.com/notes/rounding-in-javascript/
        const round = (roundValue: number, decimalPlaces: number): number =>
            Number(Math.round(Number(roundValue + 'e' + decimalPlaces)) + 'e-' + decimalPlaces);

        return round(value, countDecimals(stepSize));
    }

    /**
     * Private method: _zoomHandler.
     *
     * It binds a pan and zoom behaviour to an svg element.
     *
     * @param {D3Selection} zoomContext The given context that shall be zoomable.
     * @param {D3Selection} svg The given svg container.
     *
     * @returns {void} Sets the zoom behaviour.
     */
    private _zoomHandler(zoomContext: D3Selection, svg: D3Selection): void {
        // Perform the zooming
        const zoomed = (event: any): void => {
            const currentTransform = event.transform;
            const roundedTransformValue = this._roundToScaleStepDecimalPrecision(currentTransform.k);

            // Update d3 zoom context
            zoomContext.attr('transform', currentTransform);

            // Update view
            if (this.sliderInput?.nativeElement) {
                this.sliderInput.nativeElement.value = roundedTransformValue;
                this.sliderConfig.value = roundedTransformValue;
            }
            // Needed because d3 listener does not update ngModel
            if (this.sliderInputLabel?.nativeElement) {
                this.sliderInputLabel.nativeElement.innerText = roundedTransformValue + 'x';
            }
        };

        // Create zoom behaviour
        this._zoomBehaviour = D3_ZOOM.zoom()
            .scaleExtent([this.sliderConfig.min, this.sliderConfig.max])
            .on('zoom', zoomed);

        // Apply zoom behaviour
        svg.call(this._zoomBehaviour);
    }
}
