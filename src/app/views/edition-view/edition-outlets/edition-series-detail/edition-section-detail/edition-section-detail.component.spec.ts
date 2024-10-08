import { Component, DebugElement, Input } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { Observable, of as observableOf } from 'rxjs';
import Spy = jasmine.Spy;

import {
    expectSpyCall,
    expectToBe,
    expectToContain,
    expectToEqual,
    getAndExpectDebugElementByCss,
    getAndExpectDebugElementByDirective,
} from '@testing/expect-helper';
import { ActivatedRouteStub } from '@testing/router-stubs';

import { EDITION_ROUTE_CONSTANTS } from '@awg-views/edition-view/edition-route-constants';
import { EditionOutlineComplexItem, EditionOutlineSection, EditionOutlineSeries } from '@awg-views/edition-view/models';
import { EditionComplexesService, EditionOutlineService, EditionService } from '@awg-views/edition-view/services';

import { EditionSectionDetailComponent } from './edition-section-detail.component';

@Component({ selector: 'awg-edition-complex-card', template: '' })
class EditionComplexCardStubComponent {
    @Input()
    complexes: EditionOutlineComplexItem[];
}

describe('EditionSectionDetailComponent (DONE)', () => {
    let component: EditionSectionDetailComponent;
    let fixture: ComponentFixture<EditionSectionDetailComponent>;
    let compDe: DebugElement;

    let mockActivatedRoute: ActivatedRouteStub;
    let mockEditionService: Partial<EditionService>;

    let updateSectionFromRouteSpy: Spy;
    let editionServiceGetSelectedEditionSeriesSpy: Spy;
    let editionOutlineServiceGetEditionSectionByIdSpy: Spy;
    let editionServiceUpdateSelectedEditionSectionSpy: Spy;

    let expectedSelectedSeries: EditionOutlineSeries;
    let expectedSelectedSection: EditionOutlineSection;
    let expectedSeriesId: string;
    let expectedSectionId: string;

    beforeAll(() => {
        EditionComplexesService.initializeEditionComplexesList();
        EditionOutlineService.initializeEditionOutline();
    });

    beforeEach(async () => {
        // Mock edition service
        mockEditionService = {
            getSelectedEditionSeries: (): Observable<EditionOutlineSeries> => observableOf(expectedSelectedSeries),
            updateSelectedEditionSection: (editionSection: EditionOutlineSection): void => {},
        };

        // Mocked activated route
        mockActivatedRoute = new ActivatedRouteStub();

        await TestBed.configureTestingModule({
            declarations: [EditionSectionDetailComponent, EditionComplexCardStubComponent],
            providers: [
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: EditionService, useValue: mockEditionService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditionSectionDetailComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;

        // TestData
        expectedSelectedSeries = EditionOutlineService.getEditionOutline()[0];
        expectedSelectedSection = expectedSelectedSeries.sections[4];
        expectedSeriesId = expectedSelectedSeries.series.route;
        expectedSectionId = expectedSelectedSection.section.route;

        // Spies on component functions
        // `.and.callThrough` will track the spy down the nested describes, see
        // https://jasmine.github.io/2.0/introduction.html#section-Spies:_%3Ccode%3Eand.callThrough%3C/code%3E
        updateSectionFromRouteSpy = spyOn(component, 'updateSectionFromRoute').and.callThrough();
        editionServiceGetSelectedEditionSeriesSpy = spyOn(
            mockEditionService,
            'getSelectedEditionSeries'
        ).and.callThrough();
        editionServiceUpdateSelectedEditionSectionSpy = spyOn(
            mockEditionService,
            'updateSelectedEditionSection'
        ).and.callThrough();
        editionOutlineServiceGetEditionSectionByIdSpy = spyOn(
            EditionOutlineService,
            'getEditionSectionById'
        ).and.callThrough();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    describe('BEFORE initial data binding', () => {
        it('... should not have `selectedSeries`', () => {
            expect(component.selectedSeries).toBeUndefined();
        });

        it('... should not have `selectedSection`', () => {
            expect(component.selectedSection).toBeUndefined();
        });

        describe('#updateSectionFromRoute()', () => {
            it('... should have a method `updateSectionFromRoute`', () => {
                expect(component.updateSectionFromRoute).toBeDefined();
            });

            it('... should not have been called', () => {
                expectSpyCall(updateSectionFromRouteSpy, 0);
            });
        });

        describe('VIEW', () => {
            it('... should contain no outer div.awg-edition-section-detail yet', () => {
                getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 0, 0);
            });

            it('... should contain no div.alert-info', () => {
                getAndExpectDebugElementByCss(compDe, 'div.alert-info', 0, 0);
            });
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            // Set route params via ActivatedRoute mock
            mockActivatedRoute.testParamMap = { id: expectedSectionId };

            // Trigger initial data binding
            fixture.detectChanges();
        });

        describe('#updateSectionFromRoute()', () => {
            it('... should have been called', () => {
                expectSpyCall(updateSectionFromRouteSpy, 1);
            });

            it('... should have called editionService.getSelectedEditionSeries', () => {
                expectSpyCall(editionServiceGetSelectedEditionSeriesSpy, 1);
            });

            it('... should have set selectedSeries (via EditionService)', waitForAsync(() => {
                expectSpyCall(updateSectionFromRouteSpy, 1);
                expectSpyCall(editionServiceGetSelectedEditionSeriesSpy, 1);

                expectToEqual(component.selectedSeries, expectedSelectedSeries);
            }));

            it('... should have called EditionOutlineService.getEditionSectionById', () => {
                expectSpyCall(editionOutlineServiceGetEditionSectionByIdSpy, 1, [expectedSeriesId, expectedSectionId]);
            });

            it('... should have set selectedSection (via EditionOutlineService)', waitForAsync(() => {
                expectSpyCall(updateSectionFromRouteSpy, 1);
                expectSpyCall(editionOutlineServiceGetEditionSectionByIdSpy, 1, [expectedSeriesId, expectedSectionId]);

                expectToEqual(component.selectedSection, expectedSelectedSection);
            }));

            it('... should have called editionService.updateSelectedEditionSection with selectedSection', () => {
                expectSpyCall(editionServiceUpdateSelectedEditionSectionSpy, 1, expectedSelectedSection);
            });
        });

        describe('VIEW', () => {
            describe('... with given complexes', () => {
                describe('... should contain 1 outer div.awg-edition-section-detail, but no div.alert-info ...', () => {
                    it('... if selected section is given and not empty', waitForAsync(() => {
                        getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(compDe, 'div.alert-info', 0, 0);
                    }));

                    it('... if selected section has empty opus complexes, but given mnr complexes', waitForAsync(() => {
                        const shallowCopy = { ...component.selectedSection };
                        shallowCopy.complexTypes = { ...component.selectedSection.complexTypes, opus: undefined };
                        component.selectedSection = shallowCopy;
                        fixture.detectChanges();

                        getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(compDe, 'div.alert-info', 0, 0);
                    }));

                    it('... if selected section has empty mnr complexes, but given opus complexes', waitForAsync(() => {
                        const shallowCopy = { ...component.selectedSection };
                        shallowCopy.complexTypes = { ...component.selectedSection.complexTypes, mnr: undefined };
                        component.selectedSection = shallowCopy;
                        fixture.detectChanges();

                        getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(compDe, 'div.alert-info', 0, 0);
                    }));
                });

                describe('... opus complexes', () => {
                    it('... should contain 1 inner div.awg-edition-section-detail-opus if opus complexes are given', () => {
                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(divDe[0], 'div.awg-edition-section-detail-opus', 1, 1);
                    });

                    it('... should contain no inner div.awg-edition-section-detail-opus if no opus complexes are given', () => {
                        const shallowCopy = { ...component.selectedSection };
                        shallowCopy.complexTypes = { ...component.selectedSection.complexTypes, opus: undefined };
                        component.selectedSection = shallowCopy;
                        fixture.detectChanges();

                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(divDe[0], 'div.awg-edition-section-detail-opus', 0, 0);
                    });

                    it('... should display header (h5) in div.awg-edition-section-detail-opus', () => {
                        const divDe = getAndExpectDebugElementByCss(
                            compDe,
                            'div.awg-edition-section-detail-opus',
                            1,
                            1
                        );
                        const headerDe = getAndExpectDebugElementByCss(divDe[0], 'h5', 1, 1);
                        const headerEl = headerDe[0].nativeElement;

                        const expectedHeaderText = 'nach Opusnummer:';

                        expectToBe(headerEl.textContent, expectedHeaderText);
                    });

                    it('... should contain 1 edition complex card component (stubbed)', () => {
                        const divDe = getAndExpectDebugElementByCss(
                            compDe,
                            'div.awg-edition-section-detail-opus',
                            1,
                            1
                        );

                        getAndExpectDebugElementByDirective(divDe[0], EditionComplexCardStubComponent, 1, 1);
                    });

                    it('... should pass down complexes to edition complex card component', () => {
                        const divDe = getAndExpectDebugElementByCss(
                            compDe,
                            'div.awg-edition-section-detail-opus',
                            1,
                            1
                        );
                        const complexCardDes = getAndExpectDebugElementByDirective(
                            divDe[0],
                            EditionComplexCardStubComponent,
                            1,
                            1
                        );
                        const complexCardCmp = complexCardDes[0].injector.get(
                            EditionComplexCardStubComponent
                        ) as EditionComplexCardStubComponent;

                        expectToEqual(complexCardCmp.complexes, expectedSelectedSection.complexTypes.opus);
                    });
                });

                describe('... mnr complexes', () => {
                    it('... should contain 1 inner div.awg-edition-section-detail-mnr if mnr complexes are given', () => {
                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(divDe[0], 'div.awg-edition-section-detail-mnr', 1, 1);
                    });

                    it('... should contain no inner div.awg-edition-section-detail-mnr if no mnr complexes are given', () => {
                        const shallowCopy = { ...component.selectedSection };
                        shallowCopy.complexTypes = { ...component.selectedSection.complexTypes, mnr: undefined };
                        component.selectedSection = shallowCopy;
                        fixture.detectChanges();

                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 1, 1);
                        getAndExpectDebugElementByCss(divDe[0], 'div.awg-edition-section-detail-mnr', 0, 0);
                    });

                    it('... should display header (h5) in div.awg-edition-section-detail-mnr', () => {
                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail-mnr', 1, 1);
                        const headerDe = getAndExpectDebugElementByCss(divDe[0], 'h5', 1, 1);
                        const headerEl = headerDe[0].nativeElement;

                        const expectedHeaderText = 'nach Moldenhauer-Nummer:';

                        expectToBe(headerEl.textContent, expectedHeaderText);
                    });

                    it('... should contain 1 edition complex card component (stubbed)', () => {
                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail-mnr', 1, 1);

                        getAndExpectDebugElementByDirective(divDe[0], EditionComplexCardStubComponent, 1, 1);
                    });

                    it('... should pass down complexes to edition complex card component', () => {
                        const divDe = getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail-mnr', 1, 1);
                        const complexCardDes = getAndExpectDebugElementByDirective(
                            divDe[0],
                            EditionComplexCardStubComponent,
                            1,
                            1
                        );
                        const complexCardCmp = complexCardDes[0].injector.get(
                            EditionComplexCardStubComponent
                        ) as EditionComplexCardStubComponent;

                        expectToEqual(complexCardCmp.complexes, expectedSelectedSection.complexTypes.mnr);
                    });
                });
            });

            describe('... with no complexes', () => {
                describe('... should contain no outer div.awg-edition-section-detail, but 1 div.alert-info ...', () => {
                    it('... if selectedSection has no complexes...', waitForAsync(() => {
                        const shallowCopy = { ...component.selectedSection };
                        shallowCopy.complexTypes = undefined;
                        component.selectedSection = shallowCopy;
                        fixture.detectChanges();

                        getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 0, 0);
                        getAndExpectDebugElementByCss(compDe, 'div.alert-info', 1, 1);
                    }));

                    it('... if selectedSection has empty opus and mnr complexes', waitForAsync(() => {
                        const shallowCopy = { ...component.selectedSection };
                        shallowCopy.complexTypes = {
                            ...component.selectedSection.complexTypes,
                            opus: undefined,
                            mnr: undefined,
                        };
                        component.selectedSection = shallowCopy;
                        fixture.detectChanges();

                        getAndExpectDebugElementByCss(compDe, 'div.awg-edition-section-detail', 0, 0);
                        getAndExpectDebugElementByCss(compDe, 'div.alert-info', 1, 1);
                    }));
                });

                it('... should contain 1 p.text-muted in div.alert-info', () => {
                    const shallowCopy = { ...component.selectedSection };
                    shallowCopy.complexTypes = undefined;
                    component.selectedSection = shallowCopy;
                    fixture.detectChanges();

                    const divDe = getAndExpectDebugElementByCss(compDe, 'div.alert-info', 1, 1);
                    const pDe = getAndExpectDebugElementByCss(divDe[0], 'p', 1, 1);
                    const pEl = pDe[0].nativeElement;

                    expectToContain(pEl.classList, 'text-muted');
                });

                it('... should display info message in p.text-muted', () => {
                    const shallowCopy = { ...component.selectedSection };
                    shallowCopy.complexTypes = undefined;
                    component.selectedSection = shallowCopy;
                    fixture.detectChanges();

                    const divDe = getAndExpectDebugElementByCss(compDe, 'div.alert-info', 1, 1);
                    const pDe = getAndExpectDebugElementByCss(divDe[0], 'p', 1, 1);
                    const pEl = pDe[0].nativeElement;

                    const awg = EDITION_ROUTE_CONSTANTS.EDITION.short;
                    const series = expectedSelectedSeries.series.short;
                    const section = expectedSelectedSection.section.short;

                    const expectedNoComplexesMsg = `[Diese Inhalte erscheinen im Zusammenhang der vollständigen Edition von ${awg} ${series}/${section}.]`;

                    expectToBe(pEl.textContent.trim(), expectedNoComplexesMsg.trim());
                });
            });
        });
    });
});
