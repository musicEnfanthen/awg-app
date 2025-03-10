import { NgModule } from '@angular/core';

import { SharedModule } from '@awg-shared/shared.module';

import { EditionTrademarksRoutingModule, routedEditionTrademarksComponents } from './edition-trademarks-routing.module';
import { GroupByTypePipe } from './edition-trademarks.component';

/**
 * The EditionTrademarks module.
 *
 * It embeds the {@link EditionTrademarksComponent} and its
 * [routing definition]{@link EditionTrademarksRoutingModule}
 * as well as the {@link SharedModule}.
 */
@NgModule({
    imports: [SharedModule, EditionTrademarksRoutingModule],
    declarations: [routedEditionTrademarksComponents, GroupByTypePipe],
})
export class EditionTrademarksModule {}
