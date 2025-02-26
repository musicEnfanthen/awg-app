import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { cleanStylesFromDOM } from '@testing/clean-up-helper';
import { expectToBe, expectToContain, expectToEqual, getAndExpectDebugElementByCss } from '@testing/expect-helper';

import { META_DATA } from '@awg-core/core-data';
import { MetaPage, MetaSectionTypes } from '@awg-core/core-models';

import { FooterCopyrightComponent } from './footer-copyright.component';

describe('FooterCopyrightComponent (DONE)', () => {
    let component: FooterCopyrightComponent;
    let fixture: ComponentFixture<FooterCopyrightComponent>;
    let compDe: DebugElement;

    let expectedPageMetaData: MetaPage;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [FooterCopyrightComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FooterCopyrightComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;

        // Test data
        expectedPageMetaData = META_DATA[MetaSectionTypes.page];
    });

    afterAll(() => {
        cleanStylesFromDOM();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    describe('BEFORE initial data binding', () => {
        it('... should not have pageMetaData', () => {
            expect(component.pageMetaData).toBeUndefined();
        });

        describe('VIEW', () => {
            it('... should contain 1 div.awg-copyright-desc', () => {
                getAndExpectDebugElementByCss(compDe, 'div.awg-copyright-desc', 1, 1);
            });

            it('... should not render copyright period yet', () => {
                const copyDes = getAndExpectDebugElementByCss(compDe, '#awg-copyright-period', 1, 1);
                const copyEl: HTMLElement = copyDes[0].nativeElement;

                expectToBe(copyEl.textContent, '');
            });

            it('... should not render project name yet', () => {
                const nameDes = getAndExpectDebugElementByCss(compDe, '.awg-project-name', 1, 1);
                const nameEl: HTMLElement = nameDes[0].nativeElement;

                expectToBe(nameEl.textContent, '');
            });
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            // Simulate the parent setting the input properties
            component.pageMetaData = expectedPageMetaData;

            // Trigger initial data binding
            fixture.detectChanges();
        });

        it('... should have pageMetaData', () => {
            expectToEqual(component.pageMetaData, expectedPageMetaData);
        });

        describe('VIEW', () => {
            it('... should render copyright period', () => {
                const expectedYearStart = expectedPageMetaData.yearStart;
                const expectedYearCurrent = expectedPageMetaData.yearCurrent;

                const copyDes = getAndExpectDebugElementByCss(compDe, '#awg-copyright-period', 1, 1);
                const copyEl: HTMLElement = copyDes[0].nativeElement;

                expectToContain(copyEl.textContent, expectedYearStart + '–' + expectedYearCurrent);
            });

            it('... should render project name', () => {
                const expectedProjectName = expectedPageMetaData.awgProjectName;

                const nameDes = getAndExpectDebugElementByCss(compDe, '.awg-project-name', 1, 1);
                const nameEl: HTMLElement = nameDes[0].nativeElement;

                expectToContain(nameEl.textContent, expectedProjectName);
            });
        });
    });
});
