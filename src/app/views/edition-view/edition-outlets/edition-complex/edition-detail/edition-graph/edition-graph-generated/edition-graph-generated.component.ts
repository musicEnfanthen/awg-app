import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBook, faCubes, faDownload, faFilter, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { FullscreenToggleComponent } from '@awg-shared/fullscreen/fullscreen-toggle.component';
import { FullscreenService } from '@awg-shared/fullscreen/fullscreen.service';
import { TwelveToneSpinnerComponent } from '@awg-shared/twelve-tone-spinner/twelve-tone-spinner.component';
import { POPPER_UTILS } from '@awg-shared/utils/popper-utils';

import { GraphVisualizerComponent } from '../graph-visualizer/graph-visualizer.component';
import { EditionGraphGeneratedLoaderService } from './edition-graph-generated-loader.service';
import {
    DEFAULT_GENERATED_GRAPH_FACETS,
    EditionRdfBundle,
    GENERATED_GRAPH_FACETS,
    GeneratedGraphFacet,
    GeneratedGraphScope,
} from './edition-graph-generated.model';
import { EditionGraphGeneratedGapsComponent } from './gaps/edition-graph-generated-gaps.component';
import { buildGapReport } from './rdf-generator/rdf-gaps.utils';
import { generateRdfData } from './rdf-generator/rdf-generator.utils';

/**
 * The ScopeOption interface.
 *
 * It represents a selectable scope of the generated graph.
 */
interface ScopeOption {
    readonly scope: GeneratedGraphScope;
    readonly label: string;
    readonly icon: IconDefinition;
}

/**
 * The EditionGraphGenerated component.
 *
 * It contains an experimental graph whose RDF data is generated
 * automatically from the edition data (sources, writing materials, folios,
 * sheets, textcritics, cross references) of the selected edition complex
 * or the whole edition. The data is visualized with the existing
 * {@link GraphVisualizerComponent}.
 */
@Component({
    selector: 'awg-edition-graph-generated',
    templateUrl: './edition-graph-generated.component.html',
    styleUrls: ['./edition-graph-generated.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        EditionGraphGeneratedGapsComponent,
        FaIconComponent,
        FullscreenToggleComponent,
        GraphVisualizerComponent,
        NgbDropdownModule,
        TwelveToneSpinnerComponent,
    ],
})
export class EditionGraphGeneratedComponent {
    private readonly _loader = inject(EditionGraphGeneratedLoaderService);

    /**
     * Readonly signal: isFullscreen.
     *
     * It holds the fullscreen status.
     */
    readonly isFullscreen = inject(FullscreenService).isFullscreen;

    /**
     * Readonly variable: scopeOptions.
     *
     * It holds the selectable scopes.
     */
    readonly scopeOptions: readonly ScopeOption[] = [
        { scope: 'complex', label: 'Werkkomplex', icon: faCubes },
        { scope: 'edition', label: 'Gesamte Edition', icon: faBook },
    ];

    /**
     * Readonly variable: facetOptions.
     *
     * It holds the selectable facets.
     */
    readonly facetOptions = GENERATED_GRAPH_FACETS;

    /**
     * Readonly variable: dropdownPopperOptions.
     *
     * It holds the popper options for the facet dropdown (fixed, to work in fullscreen mode).
     */
    readonly dropdownPopperOptions = POPPER_UTILS.fixedDropdownPopperOptions;

    /**
     * Readonly variables: icons.
     */
    readonly faDownload = faDownload;
    readonly faFilter = faFilter;

    /**
     * Readonly signal: scope.
     *
     * It holds the selected scope of the generated graph.
     */
    readonly scope = signal<GeneratedGraphScope>('complex');

    /**
     * Readonly signal: facets.
     *
     * It holds the selected facets of the generated graph.
     */
    readonly facets = signal<ReadonlySet<GeneratedGraphFacet>>(new Set(DEFAULT_GENERATED_GRAPH_FACETS));

    /**
     * Readonly signal: includeCurated.
     *
     * It holds a flag if the curated triples (graph.json) are merged into the generated graph.
     */
    readonly includeCurated = signal(true);

    /**
     * Readonly resource: editionLoad.
     *
     * It holds the (progressing) load state of the whole edition,
     * loaded only when the edition scope is selected.
     */
    readonly editionLoad = rxResource({
        params: () => (this.scope() === 'edition' ? true : undefined),
        stream: () => this._loader.loadEdition(),
    });

    /**
     * Readonly computed signal: editionProgress.
     *
     * It holds the progress of loading the whole edition (if loading).
     */
    readonly editionProgress = computed(() => {
        if (this.scope() !== 'edition') {
            return null;
        }
        const state = this.editionLoad.value();
        return state?.done ? null : { loaded: state?.loaded ?? 0, total: state?.total ?? 0 };
    });

    /**
     * Readonly computed signal: bundles.
     *
     * It holds the edition data bundles of the selected scope.
     */
    readonly bundles = computed<EditionRdfBundle[] | undefined>(() => {
        if (this.scope() === 'edition') {
            const state = this.editionLoad.value();
            return state?.done ? state.bundles : undefined;
        }
        const current = this._loader.currentBundle();
        return current ? [current] : undefined;
    });

    /**
     * Readonly computed signal: hasCuratedTriples.
     *
     * It holds a flag if any bundle of the selected scope has curated triples.
     */
    readonly hasCuratedTriples = computed(() => (this.bundles() ?? []).some(bundle => !!bundle.curatedTriples));

    /**
     * Readonly resource: generated.
     *
     * It holds the generated RDF data (triples, queries) and its key figures.
     */
    readonly generated = resource({
        params: () => {
            const bundles = this.bundles();
            if (!bundles) {
                return undefined;
            }
            return {
                bundles,
                options: { scope: this.scope(), facets: this.facets(), includeCurated: this.includeCurated() },
                complexLabels: this._loader.complexLabels(),
            };
        },
        loader: ({ params }) => generateRdfData(params.bundles, params.options, params.complexLabels),
    });

    /**
     * Readonly computed signal: gapReport.
     *
     * It holds the gaps found in the edition data of the selected scope.
     */
    readonly gapReport = computed(() =>
        buildGapReport(
            this.bundles() ?? [],
            this.scope() === 'edition' ? this._loader.unavailableComplexes() : [],
            Object.keys(this._loader.complexLabels())
        )
    );

    /**
     * Public method: isFacetSelected.
     *
     * It checks if a facet is selected.
     *
     * @param {GeneratedGraphFacet} facet The given facet.
     * @returns {boolean} The selection state.
     */
    isFacetSelected(facet: GeneratedGraphFacet): boolean {
        return this.facets().has(facet);
    }

    /**
     * Public method: toggleFacet.
     *
     * It toggles the selection of a facet.
     *
     * @param {GeneratedGraphFacet} facet The given facet.
     * @returns {void} Toggles the facet.
     */
    toggleFacet(facet: GeneratedGraphFacet): void {
        this.facets.update(facets => {
            const next = new Set(facets);
            if (next.has(facet)) {
                next.delete(facet);
            } else {
                next.add(facet);
            }
            return next;
        });
    }

    /**
     * Public method: downloadTurtle.
     *
     * It downloads the generated triples as Turtle file.
     *
     * @returns {void} Triggers the download.
     */
    downloadTurtle(): void {
        const triples = this.generated.value()?.rdfData.triples;
        if (!triples) {
            return;
        }
        const name =
            this.scope() === 'edition'
                ? 'awg-edition'
                : `awg-${this._loader.currentBundle()?.complex.complexId.route.replace(/^\//, '') ?? 'complex'}`;
        const url = URL.createObjectURL(new Blob([triples], { type: 'text/turtle;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${name}.ttl`;
        anchor.click();
        URL.revokeObjectURL(url);
    }
}
