import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ActivatedRouteStub } from '@testing/router-stubs';

import { EditionOutlineSeries } from '@awg-views/edition-view/models';
import { EditionStateService } from '@awg-views/edition-view/services';

import { EditionSeriesDetailComponent } from './edition-series-detail.component';

describe('EditionSeriesDetailComponent', () => {
    let component: EditionSeriesDetailComponent;
    let fixture: ComponentFixture<EditionSeriesDetailComponent>;
    let compDe: DebugElement;

    let mockEditionStateService: Partial<EditionStateService>;

    let expectedEditionSeries: EditionOutlineSeries;

    beforeEach(async () => {
        // Mock edition state service
        mockEditionStateService = {
            updateSelectedEditionSeries: (editionSeries: EditionOutlineSeries): void => {},
        };

        // Mocked activated route
        const mockActivatedRoute: ActivatedRouteStub = new ActivatedRouteStub();

        await TestBed.configureTestingModule({
            imports: [RouterModule],
            declarations: [EditionSeriesDetailComponent],
            providers: [
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: EditionStateService, useValue: mockEditionStateService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditionSeriesDetailComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;

        fixture.detectChanges();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });
});
