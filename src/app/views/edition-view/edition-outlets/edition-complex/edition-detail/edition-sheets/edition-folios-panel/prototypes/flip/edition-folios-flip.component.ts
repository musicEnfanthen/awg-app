import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';

import { EditionSvgSheetSelection } from '@awg-views/edition-view/models/edition-svg-sheets.model';
import { Folio, FolioConvolute } from '@awg-views/edition-view/models/folio.model';

import { EditionFoliosViewerSvgComponent } from '../../viewer/svg/edition-folios-viewer-svg.component';

/**
 * The FolioLeaf interface.
 *
 * It holds a leaf of a convolute with its recto and verso folio (if any).
 */
interface FolioLeaf {
    id: string;
    recto?: Folio;
    verso?: Folio;
}

/**
 * The EditionFoliosFlip component (design prototype).
 *
 * It displays the folios of the selected convolute as leaves
 * that can be turned from recto to verso (3D flip).
 */
@Component({
    selector: 'awg-edition-folios-flip',
    templateUrl: './edition-folios-flip.component.html',
    styleUrls: ['./edition-folios-flip.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EditionFoliosViewerSvgComponent, FaIconComponent],
})
export class EditionFoliosFlipComponent {
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
     * Public readonly variable: faRotate.
     *
     * It holds the font awesome icon for the flip buttons.
     */
    readonly faRotate = faRotate;

    /**
     * Readonly computed signal: leaves.
     *
     * It holds the leaves of the selected convolute,
     * grouped from the folio ids (e.g., `1r` and `1v` form leaf `1`).
     */
    readonly leaves = computed<FolioLeaf[]>(() => {
        const leaves = new Map<string, FolioLeaf>();

        for (const folio of this.selectedConvolute().folios ?? []) {
            const side = folio.folioId.slice(-1).toLowerCase();
            const isSide = side === 'r' || side === 'v';
            const leafId = isSide ? folio.folioId.slice(0, -1) : folio.folioId;
            const leaf = leaves.get(leafId) ?? { id: leafId };

            if (side === 'v') {
                leaf.verso = folio;
            } else {
                leaf.recto = folio;
            }
            leaves.set(leafId, leaf);
        }

        return [...leaves.values()];
    });

    /**
     * Readonly computed signal: turnableLeafIds.
     *
     * It holds the ids of the leaves with both recto and verso.
     */
    readonly turnableLeafIds = computed<string[]>(() =>
        this.leaves()
            .filter(leaf => leaf.recto && leaf.verso)
            .map(leaf => leaf.id)
    );

    /**
     * Readonly linked signal: turnedLeafIds.
     *
     * It holds the ids of the turned leaves (showing their verso).
     * It is reset whenever the leaves change.
     */
    readonly turnedLeafIds = linkedSignal<FolioLeaf[], ReadonlySet<string>>({
        source: this.leaves,
        computation: () => new Set<string>(),
    });

    /**
     * Readonly computed signal: allTurned.
     *
     * It holds the boolean flag if all turnable leaves are turned.
     */
    readonly allTurned = computed<boolean>(() => {
        const turnable = this.turnableLeafIds();

        return turnable.length > 0 && turnable.every(id => this.turnedLeafIds().has(id));
    });

    /**
     * Public method: toggleLeaf.
     *
     * It turns a given leaf.
     *
     * @param {string} leafId The given leaf id.
     * @returns {void} Toggles the turned state of the leaf.
     */
    toggleLeaf(leafId: string): void {
        this.turnedLeafIds.update(turned => {
            const next = new Set(turned);
            if (next.has(leafId)) {
                next.delete(leafId);
            } else {
                next.add(leafId);
            }
            return next;
        });
    }

    /**
     * Public method: toggleAll.
     *
     * It turns all leaves to their verso, or back to their recto if all are turned already.
     *
     * @returns {void} Sets the turned state of all leaves.
     */
    toggleAll(): void {
        this.turnedLeafIds.set(this.allTurned() ? new Set() : new Set(this.turnableLeafIds()));
    }
}
