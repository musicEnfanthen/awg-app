import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';

import { filter, map } from 'rxjs/operators';

import { NgbConfig } from '@ng-bootstrap/ng-bootstrap';

import { AnalyticsService, EditionInitService } from '@awg-core/services';

/**
 * The main component of the AWG App.
 *
 * It contains the {@link NavbarComponent}, {@link ViewContainerComponent} and {@link FooterComponent}.
 */
@Component({
    selector: 'awg-app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    /**
     * Public variable: activateSideOutlet.
     *
     * It keeps track of the side outlet.
     */
    activateSideOutlet = false;

    /**
     * Constructor of the AppComponent.
     *
     * It declares private instances of the Angular router and the AnalyticsService.
     *
     * @param {ActivatedRoute} activatedRoute Instance of the Angular ActivatedRoute.
     * @param {AnalyticsService} analyticsService Instance of the AnalyticsService.
     * @param {NgbConfig} ngbConfig Instance of the NGBootstrap NgbConfig.
     * @param {Router} router Instance of the Angular router.
     * @param {Title} titleService Instance of the Angular Title.
     */
    constructor(
        private readonly activatedRoute: ActivatedRoute,
        private readonly router: Router,
        private analyticsService: AnalyticsService,
        private editionInitService: EditionInitService,
        ngbConfig: NgbConfig,
        private titleService: Title
    ) {
        // Disable Bootstrap animation
        ngbConfig.animation = false;

        // Get app title from index.html
        // Cf. https://blog.bitsrc.io/dynamic-page-titles-in-angular-98ce20b5c334
        const appTitle = this.titleService.getTitle();

        // Init analytics
        this.analyticsService.initializeAnalytics();

        // Init edition complexes and outline
        this.editionInitService.initializeEdition();

        // Track router events
        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map((event: NavigationEnd) => {
                    // Track page view on every NavigationEnd
                    this.analyticsService.trackPageView(event.urlAfterRedirects);

                    // Get page title from route data
                    let child = this.activatedRoute.firstChild;
                    while (child.firstChild) {
                        child = child.firstChild;
                    }
                    if (child.snapshot.data['title']) {
                        return child.snapshot.data['title'];
                    }
                    return appTitle;
                })
            )
            .subscribe({
                next: (pageTitle: string) => {
                    // Set page title
                    this.titleService.setTitle(pageTitle);

                    // Activate side outlet
                    const currentRoute = this.router.routerState.snapshot.root;
                    this.activateSideOutlet = this.hasSideOutlet(currentRoute);
                },
            });
    }

    /**
     * Public method: hasSideOutlet.
     *
     * It checks if a route has a side outlet.
     *
     * @param {ActivatedRouteSnapshot} route The route to check.
     *
     * @returns {boolean} The result of the check.
     */
    hasSideOutlet(route: ActivatedRouteSnapshot): boolean {
        if (route.outlet === 'side') {
            return true;
        }
        for (const child of route.children) {
            if (this.hasSideOutlet(child)) {
                return true;
            }
        }
        return false;
    }
}
