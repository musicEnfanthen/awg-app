import { ComponentFixture, fakeAsync, TestBed, waitForAsync } from '@angular/core/testing';

import { Component, DebugElement, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, QueryParamsHandling } from '@angular/router';

import Spy = jasmine.Spy;

import { expectSpyCall, expectToBe, expectToEqual, getAndExpectDebugElementByDirective } from '@testing/expect-helper';
import { ActivatedRouteStub, RouterOutletStubComponent, UrlSegmentStub } from '@testing/router-stubs';

import { SideInfoService } from '@awg-core/services';
import { RouterLinkButton } from '@awg-shared/router-link-button-group/router-link-button.model';

import { SearchOverviewComponent } from './search-overview.component';

// Mock components
@Component({
    selector: 'awg-router-link-button-group',
    template: '',
    standalone: false,
})
class RouterLinkButtonGroupStubComponent {
    @Input()
    routerLinkButtons: RouterLinkButton[];
    @Input() queryParamsHandling?: QueryParamsHandling = 'preserve';
    @Output()
    selectButtonRequest: EventEmitter<RouterLinkButton> = new EventEmitter<RouterLinkButton>();
}

describe('SearchOverviewComponent (DONE)', () => {
    let component: SearchOverviewComponent;
    let fixture: ComponentFixture<SearchOverviewComponent>;
    let compDe: DebugElement;

    let expectedSearchRouterLinkButtons: RouterLinkButton[];

    let mockActivatedRoute: ActivatedRouteStub;
    let expectedRouteUrl: UrlSegmentStub[] = [];
    const expectedPath = 'search';

    let setButtonsSpy: Spy;
    let selectButtonSpy: Spy;
    let updateSearchInfoTitleFromPathSpy: Spy;
    let serviceUpdateSearchInfoTitleSpy: Spy;
    let serviceClearSearchInfoDataSpy: Spy;

    beforeEach(waitForAsync(() => {
        // Create a fake service object with a `updateSearchInfoTitle()` spy
        const mockSideInfoService = jasmine.createSpyObj('SideInfoService', [
            'updateSearchInfoTitle',
            'clearSearchInfoData',
        ]);

        // Spies on service
        serviceUpdateSearchInfoTitleSpy = mockSideInfoService.updateSearchInfoTitle.and.callThrough();
        serviceClearSearchInfoDataSpy = mockSideInfoService.clearSearchInfoData.and.callThrough();

        // Mocked activated route
        // See https://gist.github.com/benjamincharity/3d25cd2c95b6ecffadb18c3d4dbbd80b
        expectedRouteUrl = [{ path: expectedPath }];

        mockActivatedRoute = new ActivatedRouteStub();
        mockActivatedRoute.testUrl = expectedRouteUrl;

        TestBed.configureTestingModule({
            declarations: [SearchOverviewComponent, RouterLinkButtonGroupStubComponent, RouterOutletStubComponent],
            providers: [
                { provide: SideInfoService, useValue: mockSideInfoService },
                {
                    provide: ActivatedRoute,
                    useValue: mockActivatedRoute,
                },
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SearchOverviewComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;

        // Test data
        expectedSearchRouterLinkButtons = [
            new RouterLinkButton('/data', 'search', 'Suche', false),
            new RouterLinkButton('/data', 'timeline', 'Timeline', true),
            new RouterLinkButton('/data', 'bibliography', 'Bibliographie', true),
        ];

        // Spies on component functions
        // `.and.callThrough` will track the spy down the nested describes, see
        // https://jasmine.github.io/2.0/introduction.html#section-Spies:_%3Ccode%3Eand.callThrough%3C/code%3E
        setButtonsSpy = spyOn(component, 'setButtons').and.callThrough();
        selectButtonSpy = spyOn(component, 'onButtonSelect').and.callThrough();
        updateSearchInfoTitleFromPathSpy = spyOn(component, 'updateSearchInfoTitleFromPath').and.callThrough();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    it('... should change urls', () => {
        expectToBe(mockActivatedRoute.snapshot.url[0].path, expectedPath);

        const changedPath = 'other';
        const changedRouteUrl: UrlSegmentStub[] = [{ path: changedPath }];

        mockActivatedRoute.testUrl = changedRouteUrl;

        expectToBe(mockActivatedRoute.snapshot.url[0].path, changedPath);
    });

    describe('BEFORE initial data binding', () => {
        it('... should not have `searchRouterLinkButtons`', () => {
            expect(component.searchRouterLinkButtons).toBeUndefined();
        });

        describe('VIEW', () => {
            it('... should contain one router outlet (stubbed)', () => {
                getAndExpectDebugElementByDirective(compDe, RouterOutletStubComponent, 1, 1);
            });

            it('... should contain no RouterLinkButtonGroupComponent yet', () => {
                getAndExpectDebugElementByDirective(compDe, RouterLinkButtonGroupStubComponent, 0, 0);
            });
        });

        describe('#setButtons()', () => {
            it('... should have a method `setButtons`', () => {
                expect(component.setButtons).toBeDefined();
            });

            it('... should not have been called', () => {
                expectSpyCall(setButtonsSpy, 0);
            });
        });

        describe('#updateSearchInfoTitleFromPath()', () => {
            it('... should have a method `updateSearchInfoTitleFromPath`', () => {
                expect(component.updateSearchInfoTitleFromPath).toBeDefined();
            });

            it('... should not have been called', () => {
                expectSpyCall(updateSearchInfoTitleFromPathSpy, 0);
            });
        });

        describe('#onButtonSelect()', () => {
            it('... should have a method `onButtonSelect`', () => {
                expect(component.onButtonSelect).toBeDefined();
            });

            it('... should not have been called', () => {
                expectSpyCall(selectButtonSpy, 0);
            });

            describe('SideInfoService# updateSearchInfoTitle', () => {
                it('... should not have been called', () => {
                    expect(serviceUpdateSearchInfoTitleSpy).not.toHaveBeenCalled();
                });
            });

            describe('SideInfoService# clearSearchInfoData', () => {
                it('... should not have been called', () => {
                    expect(serviceClearSearchInfoDataSpy).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            // Trigger initial data binding
            fixture.detectChanges();
        });

        describe('VIEW', () => {
            it('... should contain one RouterLinkButtonGroupComponent', () => {
                getAndExpectDebugElementByDirective(compDe, RouterLinkButtonGroupStubComponent, 1, 1);
            });

            it('... should pass down searchRouterLinkButtons to RouterLinkButtonGroupComponent', () => {
                const btnDes = getAndExpectDebugElementByDirective(compDe, RouterLinkButtonGroupStubComponent, 1, 1);
                const btnCmp = btnDes[0].injector.get(
                    RouterLinkButtonGroupStubComponent
                ) as RouterLinkButtonGroupStubComponent;

                expectToEqual(btnCmp.routerLinkButtons, expectedSearchRouterLinkButtons);
            });
        });

        describe('#setButtons()', () => {
            it('... should have been called', () => {
                expectSpyCall(setButtonsSpy, 1);
            });

            it('... should have `searchRouterLinkButtons`', () => {
                expectToEqual(component.searchRouterLinkButtons, expectedSearchRouterLinkButtons);
            });
        });

        describe('#updateSearchInfoTitleFromPath()', () => {
            it('... should have been called', () => {
                expectSpyCall(updateSearchInfoTitleFromPathSpy, 1);
            });

            it('... should update search info title (via Service) if path matches button.link', () => {
                expectSpyCall(updateSearchInfoTitleFromPathSpy, 1);

                // Path == search -> first button
                const expectedButton = expectedSearchRouterLinkButtons[0];

                expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1, expectedButton.label);
            });

            it('... should not update search info title (via Service) if path does not match button.link', () => {
                expectSpyCall(updateSearchInfoTitleFromPathSpy, 1);
                expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1, expectedSearchRouterLinkButtons[0].label);

                const changedRouteUrl = [{ path: 'other' }];
                mockActivatedRoute.testUrl = changedRouteUrl;

                component.updateSearchInfoTitleFromPath();
                fixture.detectChanges();

                expectSpyCall(updateSearchInfoTitleFromPathSpy, 2);
                // Spy count should not have changed
                expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1, expectedSearchRouterLinkButtons[0].label);
            });
        });

        describe('#onButtonSelect()', () => {
            it('... should not have been called', () => {
                expect(component.onButtonSelect).not.toHaveBeenCalled();
            });

            it('... should trigger on event from RouterLinkButtonGroupComponent', fakeAsync(() => {
                const btnDes = getAndExpectDebugElementByDirective(compDe, RouterLinkButtonGroupStubComponent, 1, 1);
                const btnCmp = btnDes[0].injector.get(
                    RouterLinkButtonGroupStubComponent
                ) as RouterLinkButtonGroupStubComponent;

                // Button 1
                btnCmp.selectButtonRequest.emit(expectedSearchRouterLinkButtons[0]);

                expectSpyCall(selectButtonSpy, 1, expectedSearchRouterLinkButtons[0]);

                // Button 2
                btnCmp.selectButtonRequest.emit(expectedSearchRouterLinkButtons[1]);

                expectSpyCall(selectButtonSpy, 2, expectedSearchRouterLinkButtons[1]);

                // Button 3
                btnCmp.selectButtonRequest.emit(expectedSearchRouterLinkButtons[2]);

                expectSpyCall(selectButtonSpy, 3, expectedSearchRouterLinkButtons[2]);
            }));

            describe('... should not do anything if no RouterLinkButton provided', () => {
                let noRouterLinkButton;
                let btnCmp;

                beforeEach(() => {
                    // Get button component
                    const btnDes = getAndExpectDebugElementByDirective(
                        compDe,
                        RouterLinkButtonGroupStubComponent,
                        1,
                        1
                    );
                    btnCmp = btnDes[0].injector.get(
                        RouterLinkButtonGroupStubComponent
                    ) as RouterLinkButtonGroupStubComponent;
                });

                it('... not with undefined', () => {
                    // Emit undefined
                    noRouterLinkButton = undefined;
                    btnCmp.selectButtonRequest.emit(noRouterLinkButton);

                    expectSpyCall(selectButtonSpy, 1, noRouterLinkButton);
                    expectSpyCall(serviceClearSearchInfoDataSpy, 0);
                    // First call was on init
                    expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1);
                });

                it('... not with null', () => {
                    // Emit null
                    noRouterLinkButton = null;
                    btnCmp.selectButtonRequest.emit(noRouterLinkButton);

                    expectSpyCall(selectButtonSpy, 1, noRouterLinkButton);
                    expectSpyCall(serviceClearSearchInfoDataSpy, 0);
                    // First call was on init
                    expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1);
                });

                it('... not with empty string', () => {
                    // Emit empty string
                    noRouterLinkButton = '';
                    btnCmp.selectButtonRequest.emit(noRouterLinkButton);

                    expectSpyCall(selectButtonSpy, 1, noRouterLinkButton);
                    expectSpyCall(serviceClearSearchInfoDataSpy, 0);
                    // First call was on init
                    expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1);
                });

                it('... not with string', () => {
                    // Emit string
                    noRouterLinkButton = 'test';
                    btnCmp.selectButtonRequest.emit(noRouterLinkButton);

                    expectSpyCall(selectButtonSpy, 1, noRouterLinkButton);
                    expectSpyCall(serviceClearSearchInfoDataSpy, 0);
                    // First call was on init
                    expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1);
                });

                it('... not with number', () => {
                    // Emit number
                    noRouterLinkButton = 101;
                    btnCmp.selectButtonRequest.emit(noRouterLinkButton);

                    expectSpyCall(selectButtonSpy, 1, noRouterLinkButton);
                    expectSpyCall(serviceClearSearchInfoDataSpy, 0);
                    // First call was on init
                    expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1);
                });

                it('... not with router link button without label', () => {
                    // Emit router link button without label
                    noRouterLinkButton = new RouterLinkButton('/data/search', '/fulltext', undefined, false);
                    btnCmp.selectButtonRequest.emit(noRouterLinkButton);

                    expectSpyCall(selectButtonSpy, 1, noRouterLinkButton);
                    expectSpyCall(serviceClearSearchInfoDataSpy, 0);
                    // First call was on init
                    expectSpyCall(serviceUpdateSearchInfoTitleSpy, 1);
                });
            });

            it('... should call SideInfoService# clearSearchInfoData', fakeAsync(() => {
                // Emit button 1
                component.onButtonSelect(expectedSearchRouterLinkButtons[0]);
                expectSpyCall(serviceClearSearchInfoDataSpy, 1);

                // Emit button 2
                component.onButtonSelect(expectedSearchRouterLinkButtons[1]);
                expectSpyCall(serviceClearSearchInfoDataSpy, 2);

                // Emit button 3
                component.onButtonSelect(expectedSearchRouterLinkButtons[2]);
                expectSpyCall(serviceClearSearchInfoDataSpy, 3);
            }));

            it('... should call SideInfoService# updateSearchInfoTitle', fakeAsync(() => {
                // First call was on init

                // Emit button 1
                component.onButtonSelect(expectedSearchRouterLinkButtons[0]);
                expectSpyCall(serviceUpdateSearchInfoTitleSpy, 2, expectedSearchRouterLinkButtons[0].label);

                // Emit button 2
                component.onButtonSelect(expectedSearchRouterLinkButtons[1]);
                expectSpyCall(serviceUpdateSearchInfoTitleSpy, 3, expectedSearchRouterLinkButtons[1].label);

                // Emit button 3
                component.onButtonSelect(expectedSearchRouterLinkButtons[2]);
                expectSpyCall(serviceUpdateSearchInfoTitleSpy, 4, expectedSearchRouterLinkButtons[2].label);
            }));
        });
    });
});
