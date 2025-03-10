import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditionTrademarkCatalogueComponent } from './edition-trademarks.component';

describe('EditionTrademarkCatalogueComponent', () => {
    let component: EditionTrademarkCatalogueComponent;
    let fixture: ComponentFixture<EditionTrademarkCatalogueComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [EditionTrademarkCatalogueComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionTrademarkCatalogueComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
