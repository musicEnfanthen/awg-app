import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';

import { GapReportItem } from '../edition-graph-generated.model';
import { STRUCTURAL_GAPS } from '../rdf-generator/rdf-gaps.utils';

/**
 * The EditionGraphGeneratedGaps component.
 *
 * It contains the report of the gaps in the edition data
 * that limit the generated graph.
 */
@Component({
    selector: 'awg-edition-graph-generated-gaps',
    templateUrl: './edition-graph-generated-gaps.component.html',
    styleUrls: ['./edition-graph-generated-gaps.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgbAccordionModule],
})
export class EditionGraphGeneratedGapsComponent {
    /**
     * Readonly input signal: report.
     *
     * It holds the gaps found in the edition data.
     */
    readonly report = input.required<GapReportItem[]>();

    /**
     * Readonly variable: structuralGaps.
     *
     * It holds the gaps that are missing structurally in the edition data.
     */
    readonly structuralGaps = STRUCTURAL_GAPS;

    /**
     * Public method: ratio.
     *
     * It gets the percentage of a gap.
     *
     * @param {GapReportItem} item The given gap.
     * @returns {number} The percentage (0–100).
     */
    ratio(item: GapReportItem): number {
        return item.total ? Math.round((item.count / item.total) * 100) : 0;
    }
}
