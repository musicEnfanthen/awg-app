import { DebugElement, isSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
type Spy = ReturnType<typeof vi.spyOn>;

import { detectChangesOnPush } from '@testing/detect-changes-on-push-helper';
import {
    expectSpyCall,
    expectToBe,
    expectToEqual,
    getAndExpectDebugElementByCss,
    getItemAt,
} from '@testing/expect-helper';

import { GraphLayerMode } from '@awg-views/edition-view/models/graph.model';

import { EditionGraphLayersComponent } from './edition-graph-layers.component';

describe('EditionGraphLayersComponent (DONE)', () => {
    let component: EditionGraphLayersComponent;
    let fixture: ComponentFixture<EditionGraphLayersComponent>;
    let compDe: DebugElement;

    let downloadRequestSpy: Spy;

    const btnGroupSelector = 'div.awg-graph-layers-btn-group';
    const generatedHint = 'Automatisch aus den Editionsdaten erzeugte Triples.';

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditionGraphLayersComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        // Create component fixture
        fixture = TestBed.createComponent(EditionGraphLayersComponent);
        component = fixture.componentInstance;
        compDe = fixture.debugElement;

        // Component spies
        downloadRequestSpy = vi.spyOn(component.downloadRequest, 'emit');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('... should create', () => {
        expect(component).toBeTruthy();
    });

    describe('BEFORE initial data binding', () => {
        it('... should have model signal `layerMode` to hold both layers', () => {
            expectToBe(isSignal(component.layerMode), true);

            expectToBe(component.layerMode(), 'both');
        });

        it('... should have input signal `hasCuratedTriples` to hold false', () => {
            expectToBe(isSignal(component.hasCuratedTriples), true);

            expectToBe(component.hasCuratedTriples(), false);
        });

        it('... should hold the layer options with their labels', () => {
            expectToEqual(component.layerOptions, [
                { mode: 'both', label: 'beides' },
                { mode: 'curated', label: 'kuratiert' },
                { mode: 'generated', label: 'automatisch erzeugt' },
            ]);
        });

        it('... should have `groupName` to hold a unique name per instance', () => {
            const otherComponent = TestBed.createComponent(EditionGraphLayersComponent).componentInstance;

            expect(component.groupName).toMatch(/^awg-graph-layers-\d+$/);
            expect(otherComponent.groupName).not.toBe(component.groupName);
        });

        it('... should have computed signal `hint` to hold the hint on generated triples', () => {
            expectToBe(isSignal(component.hint), true);

            expectToBe(component.hint(), generatedHint);
        });
    });

    describe('AFTER initial data binding', () => {
        describe('... without curated triples', () => {
            beforeEach(() => {
                fixture.detectChanges();
            });

            describe('VIEW', () => {
                it('... should contain no radio group', () => {
                    getAndExpectDebugElementByCss(compDe, btnGroupSelector, 0, 0);
                });

                it('... should contain the hint on generated triples', () => {
                    const hintDes = getAndExpectDebugElementByCss(compDe, 'small.awg-graph-layers-hint', 1, 1);
                    const hintEl: HTMLElement = hintDes[0].nativeElement;

                    expectToBe(hintEl.textContent.trim(), generatedHint);
                });

                it('... should emit a download request on click of the download button', () => {
                    const buttonDes = getAndExpectDebugElementByCss(compDe, 'div.awg-graph-layers > button', 1, 1);
                    const buttonEl: HTMLButtonElement = buttonDes[0].nativeElement;

                    buttonEl.click();

                    expectSpyCall(downloadRequestSpy, 1);
                    expectToBe(buttonEl.textContent.trim(), 'Turtle (.ttl) herunterladen');
                });
            });
        });

        describe('... with curated triples', () => {
            const getInputEls = (): HTMLInputElement[] =>
                getAndExpectDebugElementByCss(compDe, `${btnGroupSelector} > input`, 3, 3).map(de => de.nativeElement);

            beforeEach(() => {
                fixture.componentRef.setInput('hasCuratedTriples', true);
                fixture.detectChanges();
            });

            it('... should have computed signal `hint` to hold the hint of the selected layers', async () => {
                component.layerMode.set('curated');
                await detectChangesOnPush(fixture);

                expectToBe(component.hint(), 'Von den Editoren kuratierte Triples.');
            });

            describe('VIEW', () => {
                it('... should contain one radio group with an input and a label per layer option', () => {
                    const groupDes = getAndExpectDebugElementByCss(compDe, btnGroupSelector, 1, 1);
                    const groupEl: HTMLDivElement = groupDes[0].nativeElement;
                    const labelDes = getAndExpectDebugElementByCss(groupDes[0], 'label.btn', 3, 3);
                    const labels = labelDes.map(de => (de.nativeElement as HTMLLabelElement).textContent.trim());

                    expectToBe(groupEl.getAttribute('role'), 'radiogroup');
                    expectToEqual(labels, ['beides', 'kuratiert', 'automatisch erzeugt']);
                });

                it('... should check the input of the selected layers', () => {
                    const checked = getInputEls().map(inputEl => inputEl.checked);

                    expectToEqual(checked, [true, false, false]);
                });

                it('... should set `layerMode` on change of an input', async () => {
                    const generatedInputEl = getItemAt(getInputEls(), 2);

                    generatedInputEl.click();
                    await detectChangesOnPush(fixture);

                    expectToBe(component.layerMode(), 'generated' satisfies GraphLayerMode);
                });

                it('... should contain the hint on both layers', () => {
                    const hintDes = getAndExpectDebugElementByCss(compDe, 'small.awg-graph-layers-hint', 1, 1);
                    const hintEl: HTMLElement = hintDes[0].nativeElement;

                    expectToBe(
                        hintEl.textContent.trim(),
                        'Kuratierte Triples, ergänzt um automatisch aus den Editionsdaten erzeugte Triples.'
                    );
                });
            });
        });
    });
});
