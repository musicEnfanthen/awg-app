import { Injectable } from '@angular/core';

import { D3Selection } from '@awg-views/edition-view/models';
import {
    D3DragBehaviour,
    D3ForceSimulation,
    D3ForceSimulationOptions,
    D3Simulation,
    D3SimulationLink,
    D3SimulationNode,
    D3SimulationNodeTriple,
} from '../models';

import * as D3_DRAG from 'd3-drag';
import * as D3_SELECTION from 'd3-selection';
import * as D3_ZOOM from 'd3-zoom';

/**
 * The ForceGraphD3 service.
 *
 * It provides methods to enable user interaction with elements
 * while maintaining the d3 simulations physics.
 */
@Injectable()
export class ForceGraphD3Service {
    /**
     * Public method: applyDragBehaviour.
     *
     * It binds a draggable behaviour to an svg element.
     *
     *  @param {D3Selection} dragContext The given context element that shall be dragged.
     *  @param {D3Simulation} simulation The given force simulation.
     *
     *  @returns {void} Sets the drag behaviour.
     */
    applyDragBehaviour(dragContext: D3Selection, simulation: D3Simulation): void {
        // Const dragElement: D3Selection = D3_SELECTION.select(element);

        const dragStart = (event: any, d: D3SimulationNode) => {
            // Prevent propagation of dragstart to parent elements
            event.sourceEvent.stopPropagation();

            if (!event.active) {
                simulation.alphaTarget(0.3).restart();
            }

            d.fx = d.x;
            d.fy = d.y;
        };

        const dragged = (event: any, d: D3SimulationNode) => {
            d.fx = event.x;
            d.fy = event.y;
        };

        const dragEnd = (event: any, d: D3SimulationNode) => {
            if (!event.active) {
                simulation.alphaTarget(0);
            }

            d.fx = null;
            d.fy = null;
        };

        // Create drag behaviour
        const dragBehaviour: D3DragBehaviour = D3_DRAG.drag()
            .on('start', dragStart)
            .on('drag', dragged)
            .on('end', dragEnd);

        // Apply drag behaviour
        dragContext.call(dragBehaviour);
    }

    /**
     * Public method: applyZoomBehaviour.
     *
     * It binds a pan and zoom behaviour to an svg element.
     *
     *  @param {any} svgElement The given svg element that contains the zoomContainer.
     *  @param {any} zoomContainerElement The given zoom container.
     *  @returns {void} Sets the zoom behaviour.
     */
    applyZoomBehaviour(zoomContainerElement: any, svgElement: any): void {
        // Select the elements
        const svg: D3Selection = D3_SELECTION.select(svgElement);
        const zoomContainer: D3Selection = D3_SELECTION.select(zoomContainerElement);

        // Perform the zooming
        const zoomed = (event: any) => {
            const currentTransform = event.transform;
            // Update d3 zoom context
            zoomContainer.attr('transform', currentTransform);
        };

        // Create zoom behaviour that calls the zoomActions on zoom
        const zoomBehaviour = D3_ZOOM.zoom().on('zoom', zoomed);

        // Apply zoom behaviour
        svg.call(zoomBehaviour);
    }

    /**
     * Public method: getForceSimulation.
     *
     * It creates a new D3ForceSimulation instance and provides all relevant calculations for the new simulation.
     * This method does not interact with the document, purely physical calculations with d3.
     *
     * @returns {D3ForceSimulation} The new D3ForceSimulation.
     */
    getForceSimulation(
        nodes: D3SimulationNode[],
        links: D3SimulationLink[],
        options: D3ForceSimulationOptions
    ): D3ForceSimulation {
        const simulation: D3ForceSimulation = new D3ForceSimulation(nodes, links, options);
        return simulation;
    }

    /**
     * Public method: updateNodePositions.
     *
     * It updates the positions (given x and y attributes)
     * of the nodes (circles) or their texts on a force simulation's tick.
     *
     * @param {D3Selection} selection The given selection.
     * @param {string} attrX The given x attribute, can be 'cx' or 'x'.
     * @param {string} attrY The given y attribute, can be 'cy' or 'y'.
     * @param {number} offsetX The given x offset.
     * @param {number} offsetY The given y offset.
     *
     * @returns {void} Updates the position.
     */
    updateNodePositions(
        selection: D3Selection,
        attrX: string,
        attrY: string,
        offsetX: number = 0,
        offsetY: number = 0
    ): void {
        const VALID_X_ATTRS = ['cx', 'x'];
        const VALID_Y_ATTRS = ['cy', 'y'];

        if (!selection || !VALID_X_ATTRS.includes(attrX) || !VALID_Y_ATTRS.includes(attrY)) {
            return;
        }
        selection
            .attr(attrX, (d: D3SimulationNode) => (d.x ? d.x + offsetX : 0))
            .attr(attrY, (d: D3SimulationNode) => (d.y ? d.y + offsetY : 0));
    }

    /**
     * Public method: updateLinkPositions.
     *
     * It updates the positions of the links
     * on a force simulation's tick.
     * Cf. https://stackoverflow.com/questions/16358905/d3-force-layout-graph-self-linking-node
     *
     * @param {D3Selection} links The given links selection.
     *
     * @returns {void} Updates the position.
     */
    updateLinkPositions(links: D3Selection): void {
        links.attr('d', (d: D3SimulationNodeTriple) => {
            const x1 = d.nodeSubject.x;
            const y1 = d.nodeSubject.y;
            let x2 = d.nodeObject.x;
            let y2 = d.nodeObject.y;
            const dr = 0;

            // Defaults for normal edge.
            let drx = dr;
            let dry = dr;
            let xRotation = 0; // Degrees
            let largeArc = 0; // 1 or 0
            const sweep = 1; // 1 or 0

            // Self edge.
            if (x1 === x2 && y1 === y2) {
                // Fiddle with this angle to get loop oriented.
                xRotation = -45;

                // Needs to be 1.
                largeArc = 1;

                // Change sweep to change orientation of loop
                // Sweep = 0;

                // Make drx and dry different to get an ellipse instead of a circle.
                drx = 30;
                dry = 20;

                /* For whatever reason the arc collapses to a point if the beginning
                 * and ending points of the arc are the same, so kludge it.
                 */
                x2 = x2 + 1;
                y2 = y2 + 1;
            }

            return (
                'M' +
                x1 +
                ',' +
                y1 +
                'A' +
                drx +
                ',' +
                dry +
                ' ' +
                xRotation +
                ',' +
                largeArc +
                ',' +
                sweep +
                ' ' +
                x2 +
                ',' +
                y2
            );
        });
    }

    /**
     * Public method: updateLinkTextPositions.
     *
     * It updates the positions of the link texts
     * on a force simulation's tick.
     *
     * @param {D3Selection} linkTexts The given linkTexts selection.
     *
     * @returns {void} Updates the position.
     */
    updateLinkTextPositions(linkTexts: D3Selection): void {
        linkTexts
            .attr('x', (d: D3SimulationNodeTriple) => {
                if (d.nodeSubject.x === d.nodeObject.x && d.nodeSubject.y === d.nodeObject.y) {
                    return 20 + (d.nodeSubject.x + d.nodePredicate.x + d.nodeObject.x) / 3;
                }

                return 10 + (d.nodeSubject.x + d.nodePredicate.x + d.nodeObject.x) / 3;
            })
            .attr('y', (d: D3SimulationNodeTriple) => {
                if (d.nodeSubject.x === d.nodeObject.x && d.nodeSubject.y === d.nodeObject.y) {
                    return -40 + (d.nodeSubject.y + d.nodePredicate.y + d.nodeObject.y) / 3;
                }
                return 4 + (d.nodeSubject.y + d.nodePredicate.y + d.nodeObject.y) / 3;
            });
    }
}
