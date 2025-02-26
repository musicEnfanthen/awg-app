import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, ParamMap, Params, Router } from '@angular/router';

import { EMPTY, Observable, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';

import { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';

import { DataStreamerService, LoadingService } from '@awg-core/services';
import { SearchResponseJson } from '@awg-shared/api-objects';
import { ViewHandleTypes } from '@awg-shared/view-handle-button-group/view-handle.model';
import { ExtendedSearchParams, SearchParams, SearchQuery, SearchResponseWithQuery } from '@awg-views/data-view/models';
import { DataApiService } from '@awg-views/data-view/services';

/**
 * The SearchPanel component.
 *
 * It contains the search panel section
 * of the data (search) view of the app
 * with a {@link TwelveToneSpinnerComponent},
 * the {@link FulltextSearchFormComponent}
 * and the {@link SearchResultListComponent}.
 */
@Component({
    selector: 'awg-search-panel',
    templateUrl: './search-panel.component.html',
    styleUrls: ['./search-panel.component.scss'],
    standalone: false,
})
export class SearchPanelComponent implements OnInit, OnDestroy {
    /**
     * Public variable: currentQueryParams.
     *
     * It keeps the current ParamMap from the query url.
     */
    currentQueryParams: ParamMap;

    /**
     * Public variable: errorMessage.
     *
     * It keeps an errorMessage for the search response subscription.
     */
    errorMessage: any = undefined;

    /**
     * Public variable: selectedSearchTabId.
     *
     * It keeps the id of the selected tab panel.
     */
    selectedSearchTabId: string;

    /**
     * Public variable: searchParams.
     *
     * It keeps the default parameters for the search.
     */
    searchParams: SearchParams;

    /**
     * Public variable: searchResponseWithQuery.
     *
     * It keeps the query and response of the search request.
     */
    searchResponseWithQuery: SearchResponseWithQuery;

    /**
     * Public variable: searchTabs.
     *
     * It keeps the default objects for the search tab panels.
     */
    searchTabs = {
        fulltext: { id: 'fulltext', title: 'Volltext-Suche' },
        extended: { id: 'extended', title: 'Erweiterte Suche' },
    };

    /**
     * Public variable: viewChanged.
     *
     * If the view has changed.
     */
    viewChanged = false;

    /**
     * Private readonly variable: _destroyed$.
     *
     * Subject to emit a truthy value in the ngOnDestroy lifecycle hook.
     */
    private readonly _destroyed$: Subject<boolean> = new Subject<boolean>();

    /**
     * Private readonly injection variable: _dataApiService.
     *
     * It keeps the instance of the injected DataApiService.
     */
    private readonly _dataApiService = inject(DataApiService);

    /**
     * Private readonly injection variable: _dataStreamerService.
     *
     * It keeps the instance of the injected DataStreamerService.
     */
    private readonly _dataStreamerService = inject(DataStreamerService);

    /**
     * Private readonly injection variable: _loadingService.
     *
     * It keeps the instance of the injected LoadingService.
     */
    private readonly _loadingService = inject(LoadingService);

    /**
     * Private readonly injection variable: _route.
     *
     * It keeps the instance of the injected Angular ActivatedRoute.
     */
    private readonly _route = inject(ActivatedRoute);

    /**
     * Private readonly injection variable: _router.
     *
     * It keeps the instance of the injected Angular Router.
     */
    private readonly _router = inject(Router);

    /**
     * Gets the httpGetUrl from the {@link DataApiService}.
     *
     * @returns {string}
     */
    get httpGetUrl(): string {
        return this._dataApiService.httpGetUrl;
    }

    /**
     * Gets the loading status observable from the {@link LoadingService}.
     *
     * @returns {Observable<boolean>}
     */
    get isLoading$(): Observable<boolean> {
        return this._loadingService.getLoadingStatus();
    }

    /**
     * Angular life cycle hook: ngOnInit.
     *
     * It calls the containing methods
     * when initializing the component.
     */
    ngOnInit() {
        this.resetSearchParams();
        this.getSearchData();
    }

    /**
     * Public method: getSearchData.
     *
     * It gets the query parameters from the route's query params
     * and fetches the corresponding search data
     * from the {@link DataApiService}.
     *
     * @returns {void} Sets the search data.
     *
     */
    getSearchData(): void {
        this._router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                map(() => this._route),
                map((route: ActivatedRoute) => {
                    // Snapshot of tab route
                    let r = route;
                    while (r.firstChild) {
                        r = r.firstChild;
                    }
                    // Set search tab from url if given, otherwise router will redirect to fulltext automatically
                    if (this._isValidTabIdInRoute(r)) {
                        this.selectedSearchTabId = r.snapshot.url[0].path;
                    }

                    return route;
                }),
                switchMap((route: ActivatedRoute) => {
                    // Snapshot of current route query params
                    const qp = route.snapshot.queryParamMap;

                    if (qp !== this.currentQueryParams) {
                        this.currentQueryParams = qp;

                        if (qp.keys.length < 4) {
                            // Update search params
                            this.updateSearchParamsFromRoute(qp, true);
                        } else {
                            // Update search params from route if available
                            this.updateSearchParamsFromRoute(qp, false);

                            if (!this.viewChanged) {
                                if (this.searchParams.query && typeof this.searchParams.query === 'string') {
                                    // Fetch search data
                                    return this._dataApiService.getSearchData(this.searchParams);
                                }
                                if (
                                    typeof this.searchParams.query === 'object' &&
                                    this.searchParams.query.filterByRestype
                                ) {
                                    // Fetch search data
                                    return this._dataApiService.getSearchData(this.searchParams);
                                }
                            }
                        }
                    }
                    // In any other cases return empty observable
                    return EMPTY;
                }),
                takeUntil(this._destroyed$)
            )
            .subscribe({
                next: (searchResponse: SearchResponseJson) => {
                    // Share search data via streamer service
                    this.searchResponseWithQuery = new SearchResponseWithQuery(searchResponse, this.searchParams.query);
                    this._dataStreamerService.updateSearchResponseWithQuery(this.searchResponseWithQuery);
                },
                error: err => {
                    this.errorMessage = err;
                    console.error('SearchPanel# getSearchData subscription error: ', this.errorMessage);
                },
            });
    }

    /**
     * Public method: onPageChange.
     *
     * It sets a new start position value in the searchParams
     * after a page change request and triggers the
     * {@link _routeToSelf} method.
     *
     * @param {string} requestedStartAt The given start position.
     *
     * @returns {void} Sets the search params and routes to itself.
     */
    onPageChange(requestedStartAt: string): void {
        if (requestedStartAt !== this.searchParams.startAt) {
            // View has not changed
            this.viewChanged = false;

            this.searchParams = new SearchParams(
                this.searchParams.query,
                this.searchParams.nRows,
                requestedStartAt,
                this.searchParams.viewType
            );
            // Route to new params
            this._routeToSelf(this.searchParams);
        }
    }

    /**
     * Public method: onRowNumberChange.
     *
     * It sets new row number value in the searchParams
     * after a row change request and triggers the
     * {@link _routeToSelf} method.
     *
     * @param {string} requestedRows The given row.
     *
     * @returns {void} Sets the search params and routes to itself.
     */
    onRowNumberChange(requestedRows: string): void {
        if (requestedRows !== this.searchParams.nRows) {
            // View has not changed
            this.viewChanged = false;

            this.searchParams = new SearchParams(
                this.searchParams.query,
                requestedRows,
                '0',
                this.searchParams.viewType
            );

            // Route to new params
            this._routeToSelf(this.searchParams);
        }
    }

    /**
     * Public method: onSearch.
     *
     * It sets new query value in the searchParams
     * after a search request and triggers the
     * {@link _routeToSelf} method.
     *
     * @param {SearchQuery} requestedQuery The given search query (string or ExtendedSearchParams).
     *
     * @returns {void} Sets the search params and routes to itself.
     */
    onSearch(requestedQuery: SearchQuery): void {
        if (requestedQuery !== this.searchParams.query) {
            // View has not changed
            this.viewChanged = false;

            this.searchParams = new SearchParams(
                requestedQuery,
                this.searchParams.nRows,
                this.searchParams.startAt,
                this.searchParams.viewType
            );

            // Route to new search params
            this._routeToSelf(this.searchParams);
        }
    }

    /**
     * Public method: onSearchTabChange.
     *
     * It resets the search params and triggers the
     * {@link _routeToSelf} method after a tab change request
     * to update the URL.
     *
     * @param {NgbNavChangeEvent} tabEvent The given tabEvent with an id of the next route.
     *
     * @returns {void} Routes to itself with the given id as route.
     */
    onSearchTabChange(tabEvent: NgbNavChangeEvent): void {
        const newTabId = tabEvent.nextId;
        this.resetSearchParams(newTabId);
        this.resetSearchResponse();

        this.errorMessage = undefined;
        // Route to new tab with resetted searchParams
        this._routeToSelf(this.searchParams, newTabId);
    }

    /**
     * Public method: onViewChange.
     *
     * It sets new view type value in the searchParams
     * after a view change request and triggers the
     * {@link _routeToSelf} method.
     *
     * @param {ViewHandleTypes} requestedViewType The given view type.
     *
     * @returns {void} Sets the search params and routes to itself.
     */
    onViewChange(requestedViewType: ViewHandleTypes): void {
        if (requestedViewType !== this.searchParams.viewType) {
            // View has changed
            this.viewChanged = true;

            this.searchParams = new SearchParams(
                this.searchParams.query,
                this.searchParams.nRows,
                this.searchParams.startAt,
                requestedViewType
            );

            // Route to new params
            this._routeToSelf(this.searchParams);
        }
    }

    /**
     * Public method: resetSearchParams.
     *
     * It resets the search params to the default value
     * according to the target tab.
     * @param {string} [tabId] The given tab id.
     *
     * @returns {void} Resets the search params.
     */
    resetSearchParams(tabId?: string): void {
        let query: SearchQuery;
        if (!tabId || tabId === this.searchTabs.fulltext.id) {
            query = '';
        } else if (tabId === this.searchTabs.extended.id) {
            query = new ExtendedSearchParams();
            query.filterByRestype = '';
            query.propertyId = [];
            query.compop = [];
            query.searchval = [];
        }
        this.searchParams = new SearchParams(query, '25', '0', ViewHandleTypes.TABLE);
    }

    /**
     * Public method: resetSearchResponse.
     *
     * It resets the search response to an empty searchResponseWithQuery object.
     *
     * @returns {void} Resets the search response.
     */
    resetSearchResponse(): void {
        this.searchResponseWithQuery = new SearchResponseWithQuery(new SearchResponseJson(), '');

        this._dataStreamerService.updateSearchResponseWithQuery(this.searchResponseWithQuery);
    }

    /**
     * Public method: updateSearchParamsFromRoute.
     *
     * It updates the searchParams from the query params
     * of the current route and routes to the component
     * itself again if 'routing' is truthy.
     *
     * @param {ParamMap} params The given url query params.
     * @param {boolean} routing If the search parameters should be set
     * by routing to the component itself again.
     *
     * @returns {void} Sets the search params and routes to itself if routing is truthy.
     */
    updateSearchParamsFromRoute(params: ParamMap, routing: boolean): void {
        if (!params) {
            return;
        }

        let query: SearchQuery;
        if (
            !this.selectedSearchTabId ||
            this.selectedSearchTabId === this.searchTabs.fulltext.id ||
            typeof this.searchParams.query === 'string'
        ) {
            query = params.get('query') || this.searchParams.query;
        } else if (
            this.selectedSearchTabId === this.searchTabs.extended.id ||
            typeof this.searchParams.query === 'object'
        ) {
            query = new ExtendedSearchParams();
            query.filterByRestype = params.get('filterByRestype') || this.searchParams.query.filterByRestype;
            query.propertyId = params.getAll('propertyId') || this.searchParams.query.propertyId;
            query.compop = params.getAll('compop') || this.searchParams.query.compop;
            query.searchval = params.getAll('searchval') || this.searchParams.query.searchval;
        }

        // Update search params (immutable)
        this.searchParams = new SearchParams(
            query,
            params.get('nrows') || this.searchParams.nRows,
            params.get('startAt') || this.searchParams.startAt,
            ViewHandleTypes[params.get('view')] || this.searchParams.viewType
        );

        if (routing) {
            this._routeToSelf(this.searchParams);
        }
    }

    /**
     * Public method: getSearchQueryType.
     *
     * It checks the type of a SearchQuery value (UNION type)
     * and returns the value typed as string or ExtendedSearchParams.
     *
     * @param {SearchQuery} value The given value.
     *
     * @returns {string | ExtendedSearchParams} The value as string or ExtendedSearchParams type.
     */
    getSearchQueryType(value: SearchQuery): string | ExtendedSearchParams {
        if (typeof value === 'string') {
            return value as string;
        } else if (typeof value === 'object') {
            return value as ExtendedSearchParams;
        }
        return null;
    }

    /**
     * Public method: getSearchQueryAsString.
     *
     * It returns the search query as string.
     *
     * @param {SearchQuery} value The given search query.
     *
     * @returns {string} The search query as string.
     */
    getSearchQueryAsString(value: SearchQuery): string {
        return typeof this.getSearchQueryType(value) === 'string' ? (value as string) : '';
    }

    /**
     * Angular life cycle hook: ngOnDestroy.
     *
     * It calls the containing methods
     * when destroying the component.
     */
    ngOnDestroy() {
        // Emit truthy value to end all subscriptions
        this._destroyed$.next(true);

        // Now let's also complete the subject itself
        this._destroyed$.complete();
    }

    /**
     * Private method: _routeToSelf.
     *
     * It navigates to itself to set
     * new search parameters.
     *
     * @param {SearchParams} sp The given search parameters.
     * @param {string} [route] Optional route parameter.
     * @returns {void} Navigates to itself.
     */
    private _routeToSelf(sp: SearchParams, route?: string): void {
        const commands = route ? [route] : [];
        const params = this._createRouterQueryParams(sp);
        this._router.navigate(commands, {
            relativeTo: this._route,
            queryParams: params,
        });
    }

    /**
     * Private method: _createRouterQueryParams.
     *
     * It creates Router params from a given SearchParams object.
     *
     * @params {SearchParams} sp The given search params.
     *
     * @returns {Params} The router Params object.
     */
    private _createRouterQueryParams(sp: SearchParams): Params {
        const qp: Params = {};
        const q = this.getSearchQueryType(sp.query);
        if (typeof q === 'string') {
            qp['query'] = sp.query;
        } else if (typeof q === 'object') {
            qp['filterByRestype'] = q.filterByRestype || '';

            if (q.propertyId) {
                qp['propertyId'] = q.propertyId || [];
                qp['compop'] = q.compop || [];
                qp['searchval'] = q.searchval || [];
            }
        }
        qp['nrows'] = sp.nRows;
        qp['startAt'] = sp.startAt;
        qp['view'] = sp.viewType;

        return qp;
    }

    /**
     * Private method: _isValidTabIdInRoute.
     *
     * It checks if a given route path provides a valid tab id that is included in the searchTabs.
     *
     * @param {ActivatedRoute} r The given activated route
     *
     * @returns {boolean} The boolean result of the check.
     */
    private _isValidTabIdInRoute(r: ActivatedRoute): boolean {
        return (
            r.snapshot.url &&
            r.snapshot.url.length > 0 &&
            Object.values(this.searchTabs).filter(tab => tab.id === r.snapshot.url[0].path).length > 0
        );
    }
}
