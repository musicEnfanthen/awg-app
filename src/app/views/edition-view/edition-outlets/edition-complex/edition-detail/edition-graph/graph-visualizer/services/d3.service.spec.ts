import { TestBed } from '@angular/core/testing';

import { expectToBe } from '@testing/expect-helper';

import { D3Selection } from '@awg-app/views/edition-view/models';

import { ForceGraphD3Service } from './d3.service';

import * as D3_SELECTION from 'd3-selection';

describe('ForceGraphD3Service', () => {
    let forceGraphD3Service: ForceGraphD3Service;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ForceGraphD3Service],
        });
        forceGraphD3Service = TestBed.inject(ForceGraphD3Service);
    });

    it('... should create', () => {
        expect(forceGraphD3Service).toBeTruthy();
    });

    describe('#updateNodePositions', () => {
        it('... should have a method `updateNodePositions`', () => {
            expect(forceGraphD3Service.updateNodePositions).toBeDefined();
        });

        describe('... should do nothing if', () => {
            it('... no nodes are provided', () => {
                const nodes = undefined;

                forceGraphD3Service.updateNodePositions(nodes, 'cx', 'cy', 0, 0);
            });
        });
    });

    describe('#test', () => {
        let d3Selection: D3Selection;

        beforeEach(() => {
            const node1 = document.createElement('circle');
            node1.setAttribute('id', 'text-node-1');
            node1.setAttribute('class', 'instance');
            node1.setAttribute('r', '11');
            node1.setAttribute('x', '10');
            node1.setAttribute('y', '10');

            const node2 = document.createElement('circle');
            node2.setAttribute('id', 'text-node-2');
            node2.setAttribute('class', 'instance');
            node2.setAttribute('r', '9');
            node2.setAttribute('x', '20');
            node2.setAttribute('y', '20');

            d3Selection = D3_SELECTION.selectAll([node1, node2]);
        });

        it('should correctly update node positions with cx and cy values', () => {
            forceGraphD3Service.updateNodePositions(d3Selection, 'cx', 'cy');

            expectToBe(d3Selection.attr('cx'), 200);
        });

        it('should correctly update node positions with custom offsets', () => {
            forceGraphD3Service.updateNodePositions(d3Selection, 'x', 'y', 10, 20);
        });

        it('should not update positions if invalid attrX is provided', () => {
            forceGraphD3Service.updateNodePositions(d3Selection, 'invalid', 'y', 10, 20);

            expect(d3Selection.attr).not.toHaveBeenCalledWith('invalid', jasmine.any(Function));
            expect(d3Selection.attr).not.toHaveBeenCalledWith('y', jasmine.any(Function));
        });

        it('should not update positions if invalid attrY is provided', () => {
            forceGraphD3Service.updateNodePositions(d3Selection, 'x', 'invalid', 10, 20);

            // Attr should not be called with 'x' or 'invalid'
            expect(d3Selection.attr).not.toHaveBeenCalledWith('x', jasmine.any(Function));
            expect(d3Selection.attr).not.toHaveBeenCalledWith('invalid', jasmine.any(Function));
        });

        it('should not update positions if selection is null', () => {
            forceGraphD3Service.updateNodePositions(null, 'x', 'y', 10, 20);

            // Attr should not be called since selection is null
            expect(d3Selection.attr).not.toHaveBeenCalled();
        });
    });
});
