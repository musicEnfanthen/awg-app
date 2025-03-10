import { ChangeDetectionStrategy, Component, OnInit, Pipe, PipeTransform } from '@angular/core';

import { EDITION_TRADEMARKS_DATA } from '@awg-views/edition-view/data';

@Pipe({
    name: 'groupByType',
    standalone: false,
})
export class GroupByTypePipe implements PipeTransform {
    transform(trademarks: any): any {
        const groupedTrademarks = trademarks.reduce((acc, trademark) => {
            const type = trademark.value.short;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(trademark);
            return acc;
        }, {});
        return Object.keys(groupedTrademarks).map(key => ({ type: key, trademarks: groupedTrademarks[key] }));
    }
}
@Component({
    selector: 'awg-edition-trademark-catalog',
    templateUrl: './edition-trademarks.component.html',
    styleUrl: './edition-trademarks.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class EditionTrademarksComponent implements OnInit {
    /**
     * Public variable: title.
     *
     * It keeps the title of the edition trademarks.
     */
    title = 'Firmenzeichenkatalog';

    // Filter variables
    idFilter = '';
    systemsFilter = '';
    dimensionsFilter = '';
    descriptionFilter = '';

    // Catalog
    filteredTrademarksCatalog = [];
    trademarksCatalog = [];

    ngOnInit() {
        this.trademarksCatalog = this.createCatalog(EDITION_TRADEMARKS_DATA);
        this.filteredTrademarksCatalog = this.trademarksCatalog;
    }

    createCatalog(trademarksCatalog: typeof EDITION_TRADEMARKS_DATA) {
        // Create a new object with the trademarks grouped by type
        this.filteredTrademarksCatalog = Object.entries(trademarksCatalog).map(([key, value]) => ({
            id: key,
            route: value.route,
            short: value.short,
            description: value.full,
            systems: this.getSystems(key),
            variant: this.getVariant(key),
        }));
        return this.filteredTrademarksCatalog;
    }

    filterCatalog() {
        // Filter the variants based on the input values
        this.filteredTrademarksCatalog = this.trademarksCatalog.filter(trademark => (
                trademark.id.includes(this.idFilter) &&
                trademark.systems.toString().includes(this.systemsFilter) &&
                trademark.description.includes(this.descriptionFilter)
            ));
    }

    getVariant(trademarkId: string): string {
        const parsedTrademark = this._parseTrademarkId(trademarkId);
        return parsedTrademark.variant;
    }

    getSystems(trademarkId: string): string {
        const parsedTrademark = this._parseTrademarkId(trademarkId);
        return parsedTrademark.lines;
    }

    private _parseTrademarkId(trademarkId: string) {
        const regex = /^([A-Z]+)_NO([A-Za-z0-9]+)_LIN(\d+)_([A-Z0-9_]+)$/;
        const match = trademarkId.match(regex);

        if (!match) {
            throw new Error(`Invalid trademark ID format: ${trademarkId}`);
        }

        const [, company, number, lines, variant] = match;

        return {
            company,
            number,
            lines,
            variant,
        };
    }
}
