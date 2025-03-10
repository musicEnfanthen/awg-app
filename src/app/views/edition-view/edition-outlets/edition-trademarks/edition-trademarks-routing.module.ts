import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { EditionTrademarksComponent } from './edition-trademarks.component';

/* Routes of the EditionTrademarksModule */
const EDITION_TRADEMARKS_ROUTES: Routes = [
    {
        path: '',
        component: EditionTrademarksComponent,
        data: { title: 'AWG Online Edition – Trademarks' },
    },
];

/**
 * Routed components of the {@link EditionTrademarksModule}:
 * {@link EditionTrademarksComponent}.
 */
export const routedEditionTrademarksComponents = [EditionTrademarksComponent];

/**
 * EditionTrademarks module routing.
 *
 * It activates the EDITION_TRADEMARKS_ROUTES.
 */
@NgModule({
    imports: [RouterModule.forChild(EDITION_TRADEMARKS_ROUTES)],
    exports: [RouterModule],
})
export class EditionTrademarksRoutingModule {}
