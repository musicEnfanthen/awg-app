import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { MetaPage } from '@awg-core/core-models';

/**
 * The FooterCopyright component.
 *
 * It contains the copyright section of the footer.
 */
@Component({
    selector: 'awg-footer-copyright',
    templateUrl: './footer-copyright.component.html',
    styleUrls: ['./footer-copyright.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class FooterCopyrightComponent {
    /**
     * Input variable: pageMetaData.
     *
     * It keeps the page metadata for the component.
     */
    @Input()
    pageMetaData: MetaPage;
}
