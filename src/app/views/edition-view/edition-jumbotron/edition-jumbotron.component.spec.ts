import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { expectToBe, getAndExpectDebugElementByCss } from '@testing/expect-helper';

import { EditionJumbotronComponent } from './edition-jumbotron.component';

describe('EditionJumbotronComponent', () => {
    let component: EditionJumbotronComponent;
    let fixture: ComponentFixture<EditionJumbotronComponent>;
    let compDe: DebugElement;

    const expectedTitle = 'Inhalt';
    const expectedId = 'awg-edition-view';

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [EditionJumbotronComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditionJumbotronComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    describe('BEFORE initial data binding', () => {
        it('... should not have jumbotronId', () => {
            expect(component.jumbotronId).toBeUndefined();
        });

        it('... should not have jumbotronTitle', () => {
            expect(component.jumbotronTitle).toBeUndefined();
        });

        describe('VIEW', () => {
            it('... should have one div.awg-jumbotron', () => {
                getAndExpectDebugElementByCss(compDe, 'div.awg-jumbotron', 1, 1);
            });
        });
    });

    describe('AFTER initial data binding', () => {
        beforeEach(() => {
            // Simulate the parent setting the input properties
            component.jumbotronId = expectedId;
            component.jumbotronTitle = expectedTitle;

            // Trigger initial data binding
            fixture.detectChanges();
        });

        it('... should have jumbotronId', () => {
            expectToBe(component.jumbotronId, expectedId);
        });

        it('... should have jumbotronTitle', () => {
            expectToBe(component.jumbotronTitle, expectedTitle);
        });

        describe('VIEW', () => {
            it('... should have a heading (h3) in jumbotron', () => {
                const jumbotronDes = getAndExpectDebugElementByCss(compDe, 'div.awg-jumbotron', 1, 1);

                getAndExpectDebugElementByCss(jumbotronDes[0], 'h3', 1, 1);
            });

            it('... should pass down `jumbotronId` and `jumbotronTitle`to jumbotron heading', () => {
                const hDes = getAndExpectDebugElementByCss(compDe, 'div.awg-jumbotron > h3', 1, 1);
                const hEl: HTMLHeadingElement = hDes[0].nativeElement;

                expectToBe(hEl.id, expectedId);
                expectToBe(hEl.textContent.trim(), expectedTitle);
            });
        });
    });
});
