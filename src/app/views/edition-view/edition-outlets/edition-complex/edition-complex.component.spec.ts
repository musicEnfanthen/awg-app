import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { Observable, ReplaySubject } from 'rxjs';
import Spy = jasmine.Spy;

import { expectSpyCall, expectToEqual } from '@testing/expect-helper';
import { ActivatedRouteStub } from '@testing/router-stubs';

import { EDITION_ROUTE_CONSTANTS } from '@awg-views/edition-view/edition-route-constants';
import { EditionComplex, EditionComplexesList } from '@awg-views/edition-view/models';
import { EditionComplexesService, EditionService } from '@awg-views/edition-view/services';

import { EditionComplexComponent } from './edition-complex.component';

describe('EditionComplexComponent (DONE)', () => {
    let component: EditionComplexComponent;
    let fixture: ComponentFixture<EditionComplexComponent>;
    let compDe: DebugElement;

    let mockActivatedRoute: ActivatedRouteStub;
    let mockEditionService: Partial<EditionService>;

    let mockEditionComplexSubject: ReplaySubject<EditionComplex>;

    let updateEditionComplexFromRouteSpy: Spy;
    let editionServiceGetSelectedEditionComplexSpy: Spy;
    let editionServiceUpdateSelectedEditionComplexSpy: Spy;
    let editionServiceClearSelectedEditionComplexSpy: Spy;

    let expectedEditionComplexes: EditionComplexesList;
    let expectedSelectedEditionComplex: EditionComplex;
    let expectedSelectedEditionComplexId: string;
    const expectedEditionRouteConstants: typeof EDITION_ROUTE_CONSTANTS = EDITION_ROUTE_CONSTANTS;

    beforeAll(() => {
        EditionComplexesService.initializeEditionComplexesList();
    });

    beforeEach(async () => {
        mockEditionComplexSubject = new ReplaySubject<EditionComplex>(1);

        // Mock edition service
        mockEditionService = {
            getSelectedEditionComplex: (): Observable<EditionComplex> => mockEditionComplexSubject.asObservable(),
            updateSelectedEditionComplex: (editionComplex: EditionComplex): void =>
                mockEditionComplexSubject.next(editionComplex),
            clearSelectedEditionComplex: (): void => mockEditionComplexSubject.next(null),
        };

        // Mocked activated route
        mockActivatedRoute = new ActivatedRouteStub();

        await TestBed.configureTestingModule({
            imports: [RouterModule],
            declarations: [EditionComplexComponent],
            providers: [
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                { provide: EditionService, useValue: mockEditionService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditionComplexComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;

        // TestData

        expectedSelectedEditionComplex = EditionComplexesService.getEditionComplexById('OP12');
        expectedSelectedEditionComplexId = 'OP12';

        // Spies on component functions
        // `.and.callThrough` will track the spy down the nested describes, see
        // https://jasmine.github.io/2.0/introduction.html#section-Spies:_%3Ccode%3Eand.callThrough%3C/code%3E
        updateEditionComplexFromRouteSpy = spyOn(component, 'updateEditionComplexFromRoute').and.callThrough();
        editionServiceGetSelectedEditionComplexSpy = spyOn(
            mockEditionService,
            'getSelectedEditionComplex'
        ).and.callThrough();
        editionServiceUpdateSelectedEditionComplexSpy = spyOn(
            mockEditionService,
            'updateSelectedEditionComplex'
        ).and.callThrough();
        editionServiceClearSelectedEditionComplexSpy = spyOn(
            mockEditionService,
            'clearSelectedEditionComplex'
        ).and.callThrough();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    describe('BEFORE initial data binding', () => {
        it('... should not have `selectedEditionComplex$`', () => {
            expect(component.selectedEditionComplex$).toBeUndefined();
        });

        it('... should have `editionRouteConstants`', () => {
            expectToEqual(component.editionRouteConstants, expectedEditionRouteConstants);
        });

        describe('#updateEditionComplexFromRoute()', () => {
            it('... should have a method `updateEditionComplexFromRoute`', () => {
                expect(component.updateEditionComplexFromRoute).toBeDefined();
            });

            it('... should not have been called', () => {
                expectSpyCall(updateEditionComplexFromRouteSpy, 0);
            });
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            // Set route params via ActivatedRoute mock
            expectedSelectedEditionComplexId = 'OP12';
            mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId }; // Op. 12

            // Trigger initial data binding
            fixture.detectChanges();
        });

        describe('#updateEditionComplexFromRoute()', () => {
            it('... should have been called', () => {
                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
            });

            it('... should trigger `EditionComplexesService.getEditionComplexById`', () => {
                const getEditionComplexByIdSpy = spyOn(
                    EditionComplexesService,
                    'getEditionComplexById'
                ).and.callThrough();

                component.updateEditionComplexFromRoute();
                fixture.detectChanges();

                expectSpyCall(getEditionComplexByIdSpy, 1);
            });

            it('... should get id from router', () => {
                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById(expectedSelectedEditionComplexId)
                );
            });

            it('... should get correct complex from router id', () => {
                // Call with op. 12 (default)
                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById('OP12')
                );

                // ----------------
                // Change to op. 25
                mockActivatedRoute.testParamMap = { complexId: 'OP25' };

                // Trigger initial data binding
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    2,
                    EditionComplexesService.getEditionComplexById('OP25')
                );
            });

            it('... should only get complex from valid router id', () => {
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById('OP12')
                );

                // Change to non-existing id
                mockActivatedRoute.testParamMap = { complexId: 'fail' };

                // Trigger initial data binding
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById('OP12')
                );

                // ------------------
                // Change to empty id
                mockActivatedRoute.testParamMap = { complexId: '' };

                // Trigger initial data binding
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById('OP12')
                );

                // ----------------------
                // Change to another key
                mockActivatedRoute.testParamMap = { anotherId: 'OP12' };

                // Trigger initial data binding
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById('OP12')
                );
            });

            it('... should have updated selectedEditionComplex$ (via EditionService)', () => {
                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById(expectedSelectedEditionComplexId)
                );
            });

            it('... should get edition complex from EditionService and set selectedEditionComplex$', () => {
                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById(expectedSelectedEditionComplexId)
                );
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 1);

                expect(component.selectedEditionComplex$).toBeDefined();
            });

            it('... should get correct edition complex from EditionService when complex id changes', () => {
                // ----------------
                // Check for op. 12
                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    1,
                    EditionComplexesService.getEditionComplexById(expectedSelectedEditionComplexId)
                );
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 1);

                // ----------------
                // Change to op. 25
                expectedSelectedEditionComplexId = 'op25';
                mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId };

                // Apply changes
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(
                    editionServiceUpdateSelectedEditionComplexSpy,
                    2,
                    EditionComplexesService.getEditionComplexById(expectedSelectedEditionComplexId)
                );
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 2);

                expect(component.selectedEditionComplex$).toBeDefined();
            });

            it('... should get an edition complex with opus number from EditionService', () => {
                const opusComplex = new EditionComplex(
                    {
                        title: 'Test Opus Complex',
                        catalogueType: 'OPUS',
                        catalogueNumber: '100',
                    },
                    {
                        editors: [],
                        lastModified: '---',
                    },
                    { series: '1', section: '5' }
                );
                expectedSelectedEditionComplexId = 'op100';

                spyOn(EditionComplexesService, 'getEditionComplexById').and.callFake((id: string) => {
                    if (id.toUpperCase() === expectedSelectedEditionComplexId.toUpperCase()) {
                        return opusComplex;
                    }
                    return null;
                });

                mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId };
                editionServiceUpdateSelectedEditionComplexSpy.and.callThrough();

                // Apply changes
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(editionServiceUpdateSelectedEditionComplexSpy, 2, opusComplex);
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 2);

                expect(component.selectedEditionComplex$).toBeDefined();
            });

            it('... should get an edition complex with M number from EditionService', () => {
                const mnrComplex = new EditionComplex(
                    {
                        title: 'Test M Complex',
                        catalogueType: 'MNR',
                        catalogueNumber: '100',
                    },
                    {
                        editors: [],
                        lastModified: '---',
                    },
                    { series: '1', section: '5' }
                );
                expectedSelectedEditionComplexId = 'm100';

                // Spy on the static method and provide a custom implementation
                spyOn(EditionComplexesService, 'getEditionComplexById').and.callFake((id: string) => {
                    if (id.toUpperCase() === expectedSelectedEditionComplexId.toUpperCase()) {
                        return mnrComplex;
                    }
                    return null;
                });

                mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId };
                editionServiceUpdateSelectedEditionComplexSpy.and.callThrough();

                // Apply changes
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(editionServiceUpdateSelectedEditionComplexSpy, 2, mnrComplex);
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 2);

                expect(component.selectedEditionComplex$).toBeDefined();
            });

            it('... should get an edition complex with M* number from EditionService', () => {
                const mnrPlusComplex = new EditionComplex(
                    {
                        title: 'Test M* Complex',
                        catalogueType: 'MNR_PLUS',
                        catalogueNumber: '100',
                    },
                    {
                        editors: [],
                        lastModified: '---',
                    },
                    { series: '1', section: '5' }
                );
                expectedSelectedEditionComplexId = 'mPlus100';

                // Spy on the static method and provide a custom implementation
                spyOn(EditionComplexesService, 'getEditionComplexById').and.callFake((id: string) => {
                    if (id.toUpperCase() === expectedSelectedEditionComplexId.toUpperCase()) {
                        return mnrPlusComplex;
                    }
                    return null;
                });

                mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId };
                editionServiceUpdateSelectedEditionComplexSpy.and.callThrough();

                // Apply changes
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(editionServiceUpdateSelectedEditionComplexSpy, 2, mnrPlusComplex);
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 2);

                expect(component.selectedEditionComplex$).toBeDefined();
            });

            it('... should get an edition complex with missing values from EditionService', () => {
                const incompleteComplex = new EditionComplex(
                    {
                        title: 'Test Incomplete Complex',
                        catalogueType: 'OPUS',
                        catalogueNumber: '100',
                    },
                    null,
                    null
                );
                expectedSelectedEditionComplexId = 'op100';

                // Spy on the static method and provide a custom implementation
                spyOn(EditionComplexesService, 'getEditionComplexById').and.callFake((id: string) => {
                    if (id.toUpperCase() === expectedSelectedEditionComplexId.toUpperCase()) {
                        return incompleteComplex;
                    }
                    return null;
                });

                mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId };
                editionServiceUpdateSelectedEditionComplexSpy.and.callThrough();

                // Apply changes
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(editionServiceUpdateSelectedEditionComplexSpy, 2, incompleteComplex);
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 2);

                expect(component.selectedEditionComplex$).toBeDefined();
            });

            it('... should get an edition complex with missing titleStatement from EditionService', () => {
                const incompleteComplex = new EditionComplex(
                    null,
                    {
                        editors: [],
                        lastModified: '---',
                    },
                    { series: '1', section: '5' }
                );
                expectedSelectedEditionComplexId = 'op100';

                // Spy on the static method and provide a custom implementation
                spyOn(EditionComplexesService, 'getEditionComplexById').and.callFake((id: string) => {
                    if (id.toUpperCase() === expectedSelectedEditionComplexId.toUpperCase()) {
                        return incompleteComplex;
                    }
                    return null;
                });

                mockActivatedRoute.testParamMap = { complexId: expectedSelectedEditionComplexId };
                editionServiceUpdateSelectedEditionComplexSpy.and.callThrough();

                // Apply changes
                fixture.detectChanges();

                expectSpyCall(updateEditionComplexFromRouteSpy, 1);
                expectSpyCall(editionServiceUpdateSelectedEditionComplexSpy, 2, incompleteComplex);
                expectSpyCall(editionServiceGetSelectedEditionComplexSpy, 2);

                expect(component.selectedEditionComplex$).toBeDefined();
            });
        });

        describe('#ngOnDestroy()', () => {
            it('... should have cleared selectedEditionComplex$ on destroy (via EditionService)', () => {
                component.ngOnDestroy();

                expectSpyCall(editionServiceClearSelectedEditionComplexSpy, 1);
            });
        });
    });
});
