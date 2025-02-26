import {
    HttpClient,
    HttpErrorResponse,
    HttpRequest,
    provideHttpClient,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { Data } from '@angular/router';

import { EMPTY, of as observableOf } from 'rxjs';
import { defaultIfEmpty } from 'rxjs/operators';
import Spy = jasmine.Spy;

import { cleanStylesFromDOM } from '@testing/clean-up-helper';
import { expectSpyCall, expectToBe, expectToEqual } from '@testing/expect-helper';
import { mockEditionData } from '@testing/mock-data';
import { mockConsole } from '@testing/mock-helper';

import { EDITION_ASSETS_DATA } from '@awg-views/edition-view/data';
import { EDITION_ROUTE_CONSTANTS } from '@awg-views/edition-view/edition-route-constants';
import {
    EditionComplex,
    EditionRowTablesList,
    EditionSvgSheet,
    EditionSvgSheetList,
    FolioConvolute,
    FolioConvoluteList,
    Graph,
    GraphList,
    Intro,
    IntroList,
    PrefaceList,
    Source,
    SourceDescription,
    SourceDescriptionList,
    SourceEvaluation,
    SourceEvaluationList,
    SourceList,
    Textcritics,
    TextcriticsList,
} from '@awg-views/edition-view/models';
import { EditionComplexesService } from '@awg-views/edition-view/services';

import { EditionDataService } from './edition-data.service';

describe('EditionDataService (DONE)', () => {
    let editionDataService: EditionDataService;

    let consoleSpy: Spy;
    let generateAssetPathSpy: Spy;
    let getFolioConvoluteDataSpy: Spy;
    let getGraphDataSpy: Spy;
    let getIntroDataSpy: Spy;
    let getJsonDataSpy: Spy;
    let getPrefaceDataSpy: Spy;
    let getRowTablesDataSpy: Spy;
    let getSourceListDataSpy: Spy;
    let getSourceDescriptionListDataSpy: Spy;
    let getSourceEvaluationListDataSpy: Spy;
    let getSvgSheetsDataSpy: Spy;
    let getTextcriticsListDataSpy: Spy;

    let httpClient: HttpClient;
    let httpTestingController: HttpTestingController;

    let expectedPrefaceData: PrefaceList;
    let expectedRowTablesData: EditionRowTablesList;

    let expectedEditionComplex: EditionComplex;
    let expectedComplexRoute: string;
    let expectedIntroRoute: string;
    let expectedSeriesRoute: string;
    let expectedSectionRoute: string;
    let expectedAssetPath: string;
    let regexBase: RegExp;

    let expectedFolioConvoluteFilePath: string;
    let expectedGraphFilePath: string;
    let expectedIntroFilePath: string;
    let expectedPrefaceFilePath: string;
    let expectedRowTablesFilePath: string;
    let expectedSheetsFilePath: string;
    let expectedSourceListFilePath: string;
    let expectedSourceDescriptionFilePath: string;
    let expectedSourceEvaluationFilePath: string;
    let expectedTextcriticsFilePath: string;

    const delimiter = '/';
    const expectedAssetPathBaseRoute = EDITION_ASSETS_DATA.BASE_ROUTE;
    const files = EDITION_ASSETS_DATA.FILES;

    beforeAll(() => {
        EditionComplexesService.initializeEditionComplexesList();
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [],
            providers: [EditionDataService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
        });

        // Inject services and http client handler
        editionDataService = TestBed.inject(EditionDataService);
        httpClient = TestBed.inject(HttpClient);
        httpTestingController = TestBed.inject(HttpTestingController);

        // Test data
        expectedEditionComplex = EditionComplexesService.getEditionComplexById('OP12');
        expectedSeriesRoute = expectedEditionComplex.pubStatement.series.route;
        expectedSectionRoute = expectedEditionComplex.pubStatement.section.route;
        expectedIntroRoute =
            delimiter +
            EDITION_ROUTE_CONSTANTS.SERIES.route +
            delimiter +
            expectedSeriesRoute +
            delimiter +
            EDITION_ROUTE_CONSTANTS.SECTION.route +
            delimiter +
            expectedSectionRoute;
        expectedComplexRoute = expectedIntroRoute + expectedEditionComplex.complexId.route;
        expectedAssetPath = expectedAssetPathBaseRoute + expectedComplexRoute;
        regexBase = new RegExp(expectedAssetPath);

        expectedFolioConvoluteFilePath = `${expectedAssetPath}/${files.folioConvoluteFile}`;
        expectedGraphFilePath = `${expectedAssetPath}/${files.graphFile}`;
        expectedIntroFilePath = `${expectedAssetPath}/${files.introFile}`;
        expectedPrefaceFilePath = `${expectedAssetPathBaseRoute}/${files.prefaceFile}`;
        expectedRowTablesFilePath = `${expectedAssetPathBaseRoute}/${files.rowTablesFile}`;
        expectedSheetsFilePath = `${expectedAssetPath}/${files.svgSheetsFile}`;
        expectedSourceListFilePath = `${expectedAssetPath}/${files.sourceListFile}`;
        expectedSourceDescriptionFilePath = `${expectedAssetPath}/${files.sourceDescriptionListFile}`;
        expectedSourceEvaluationFilePath = `${expectedAssetPath}/${files.sourceEvaluationListFile}`;
        expectedTextcriticsFilePath = `${expectedAssetPath}/${files.textcriticsFile}`;

        expectedPrefaceData = JSON.parse(JSON.stringify(mockEditionData.mockPrefaceData));
        expectedRowTablesData = JSON.parse(JSON.stringify(mockEditionData.mockRowTablesData));

        // Spies on console logs
        consoleSpy = spyOn(console, 'error').and.callFake(mockConsole.log);

        generateAssetPathSpy = spyOn(editionDataService as any, '_generateAssetPath').and.callThrough();
        getFolioConvoluteDataSpy = spyOn(editionDataService as any, '_getFolioConvoluteData').and.callThrough();
        getGraphDataSpy = spyOn(editionDataService as any, '_getGraphData').and.callThrough();
        getIntroDataSpy = spyOn(editionDataService as any, '_getIntroData').and.callThrough();
        getJsonDataSpy = spyOn(editionDataService as any, '_getJsonData').and.callThrough();
        getPrefaceDataSpy = spyOn(editionDataService as any, '_getPrefaceData').and.callThrough();
        getRowTablesDataSpy = spyOn(editionDataService as any, '_getRowTablesData').and.callThrough();
        getSourceListDataSpy = spyOn(editionDataService as any, '_getSourceListData').and.callThrough();
        getSourceDescriptionListDataSpy = spyOn(
            editionDataService as any,
            '_getSourceDescriptionListData'
        ).and.callThrough();
        getSourceEvaluationListDataSpy = spyOn(
            editionDataService as any,
            '_getSourceEvaluationListData'
        ).and.callThrough();
        getSvgSheetsDataSpy = spyOn(editionDataService as any, '_getSvgSheetsData').and.callThrough();
        getTextcriticsListDataSpy = spyOn(editionDataService as any, '_getTextcriticsListData').and.callThrough();
    });

    // After every test, assert that there are no more pending requests
    afterEach(() => {
        // Clear mock stores after each test
        mockConsole.clear();
    });

    afterAll(() => {
        cleanStylesFromDOM();
    });

    it('... should create', () => {
        expect(editionDataService).toBeTruthy();
    });

    it('... should have empty assetPath', () => {
        expectToBe((editionDataService as any)._assetPath, '');
    });

    describe('httpTestingController', () => {
        it('... should issue a mocked http get request', waitForAsync(() => {
            const testData: Data = { name: 'TestData' };

            httpClient.get<Data>('/foo/bar').subscribe({
                next: data => {
                    expectToEqual(data, testData);
                },
            });

            // Match the request url
            const call = httpTestingController.expectOne({
                url: '/foo/bar',
            });

            // Check for GET request
            expectToBe(call.request.method, 'GET');

            // Respond with mocked data
            call.flush(testData);
        }));
    });

    describe('#getEditionGraphData()', () => {
        it('... should have a method `getEditionGraphData`', () => {
            expect(editionDataService.getEditionGraphData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPath);
            }));

            it('... should call #getGraphData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getGraphDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct url', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getGraphDataSpy, 1);
                expectSpyCall(getJsonDataSpy, 1, expectedGraphFilePath);
            }));

            it('... should perform an HTTP GET request to graph file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to every file with given settings
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 1, expectedGraphFilePath);

                expectToBe(call.length, 1);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[0]?.request.url, expectedGraphFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('response', () => {
            describe('success', () => {
                it('... should return an Observable(GraphList)', waitForAsync(() => {
                    const gl = new GraphList();
                    gl.graph = [];
                    gl.graph.push(new Graph());
                    gl.graph[0].id = 'test-graph-id';

                    const expectedResult = gl;

                    getGraphDataSpy.and.returnValue(observableOf(expectedResult));

                    // Call service function (success)
                    editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                        next: res => {
                            expectToEqual(res, expectedResult);
                            expectToBe(res.graph[0].id, 'test-graph-id');
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getGraphDataSpy, 1);
                }));

                it('... should return an empty GraphList Observable per default', waitForAsync(() => {
                    const expectedResult = new GraphList();

                    getGraphDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(expectedResult)));

                    // Call service function (success)
                    editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                        next: res => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getGraphDataSpy, 1);
                }));
            });

            describe('fail', () => {
                it('... should log an error for every failed request', waitForAsync(() => {
                    const expectedResult = [];

                    // Call service function (success)
                    editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedGraphFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_GRAPHLIST' }));

                    // Check for console output
                    expectSpyCall(
                        consoleSpy,
                        1,
                        `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_GRAPHLIST`
                    );

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [] if request failed', waitForAsync(() => {
                    const expectedResult = [];

                    // Call service function (success)
                    editionDataService.getEditionGraphData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedGraphFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_GRAPHLIST' }));

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));
            });
        });
    });

    describe('#getEditionComplexIntroData', () => {
        it('... should have a method `getEditionComplexIntroData`', () => {
            expect(editionDataService.getEditionComplexIntroData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPath);
            }));

            it('... should call #getIntroData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getIntroDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct url', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getIntroDataSpy, 1);
                expectSpyCall(getJsonDataSpy, 1, expectedIntroFilePath);
            }));

            it('... should perform an HTTP GET request to intro file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to every file with given settings
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 1, expectedIntroFilePath);

                expectToBe(call.length, 1);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[0]?.request.url, expectedIntroFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('response', () => {
            describe('success', () => {
                it('... should return an Observable(IntroList)', waitForAsync(() => {
                    const il = new IntroList();
                    il.intro = [];
                    il.intro.push(new Intro());
                    il.intro[0].id = 'test-intro-id';

                    const expectedResult = il;

                    getIntroDataSpy.and.returnValue(observableOf(expectedResult));

                    // Call service function (success)
                    editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                        next: res => {
                            expectToEqual(res, expectedResult);
                            expectToBe(res.intro[0].id, 'test-intro-id');
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getIntroDataSpy, 1);
                }));

                it('... should return an empty IntroList Observable per default', waitForAsync(() => {
                    const expectedResult = new IntroList();

                    getIntroDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(expectedResult)));

                    // Call service function (success)
                    editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                        next: res => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getIntroDataSpy, 1);
                }));
            });

            describe('fail', () => {
                it('... should log an error for every failed request', waitForAsync(() => {
                    const expectedResult = [];

                    // Call service function (success)
                    editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedIntroFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_INTROLIST' }));

                    // Check for console output
                    expectSpyCall(
                        consoleSpy,
                        1,
                        `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_INTROLIST`
                    );

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [] if request failed', waitForAsync(() => {
                    const expectedResult = [];

                    // Call service function (success)
                    editionDataService.getEditionComplexIntroData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedIntroFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_INTROLIST' }));

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));
            });
        });
    });

    describe('#getEditionSectionIntroData', () => {
        beforeEach(() => {
            expectedAssetPath = expectedAssetPathBaseRoute + expectedIntroRoute;
            expectedIntroFilePath = `${expectedAssetPath}/${files.introFile}`;
            regexBase = new RegExp(expectedAssetPath);
        });

        it('... should have a method `getEditionSectionIntroData`', () => {
            expect(editionDataService.getEditionSectionIntroData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPath);
            }));

            it('... should call #getIntroData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getIntroDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct url', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getIntroDataSpy, 1);
                expectSpyCall(getJsonDataSpy, 1, expectedIntroFilePath);
            }));

            it('... should perform an HTTP GET request to intro file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to every file with given settings
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 1, expectedIntroFilePath);

                expectToBe(call.length, 1);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[0]?.request.url, expectedIntroFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('response', () => {
            describe('success', () => {
                it('... should return an Observable(IntroList)', waitForAsync(() => {
                    const il = new IntroList();
                    il.intro = [];
                    il.intro.push(new Intro());
                    il.intro[0].id = 'test-intro-id';

                    const expectedResult = il;

                    getIntroDataSpy.and.returnValue(observableOf(expectedResult));

                    // Call service function (success)
                    editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                        next: res => {
                            expectToEqual(res, expectedResult);
                            expectToBe(res.intro[0].id, 'test-intro-id');
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getIntroDataSpy, 1);
                }));

                it('... should return an empty IntroList Observable per default', waitForAsync(() => {
                    const expectedResult = new IntroList();

                    getIntroDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(expectedResult)));

                    // Call service function (success)
                    editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                        next: res => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getIntroDataSpy, 1);
                }));
            });

            describe('fail', () => {
                it('... should log an error for every failed request', waitForAsync(() => {
                    const expectedResult = [];

                    // Call service function (success)
                    editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                        next: (res: any) => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedIntroFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_INTROLIST' }));

                    // Check for console output
                    expectSpyCall(
                        consoleSpy,
                        1,
                        `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_INTROLIST`
                    );

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [] if request failed', waitForAsync(() => {
                    const expectedResult = [];

                    // Call service function (success)
                    editionDataService.getEditionSectionIntroData(expectedSeriesRoute, expectedSectionRoute).subscribe({
                        next: (res: any) => {
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedIntroFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_INTROLIST' }));

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));
            });
        });
    });

    describe('#getEditionPrefaceData()', () => {
        it('... should have a method `getEditionPrefaceData`', () => {
            expect(editionDataService.getEditionPrefaceData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionPrefaceData().subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPathBaseRoute);
            }));

            it('... should call #_getPrefaceData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionPrefaceData().subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getPrefaceDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct url', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionPrefaceData().subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getPrefaceDataSpy, 1);
                expectSpyCall(getJsonDataSpy, 1, expectedPrefaceFilePath);
            }));

            it('... should perform an HTTP GET request to preface file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionPrefaceData().subscribe({
                    next: res => {
                        expectToEqual(res, new PrefaceList());
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to every file with given settings
                regexBase = new RegExp(expectedAssetPathBaseRoute);
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 1, expectedPrefaceFilePath);

                expectToBe(call.length, 1);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[0]?.request.url, expectedPrefaceFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('success', () => {
            it('... should return an Observable(PrefaceList)', waitForAsync(() => {
                const rt = expectedPrefaceData;

                const expectedResult = rt;

                getPrefaceDataSpy.and.returnValue(observableOf(expectedResult));

                // Call service function (success)
                editionDataService.getEditionPrefaceData().subscribe({
                    next: res => {
                        expectToEqual(res, expectedResult);
                        expectToBe(res.preface[0].id, 'de');
                        expectToBe(res.preface[1].id, 'en');
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getPrefaceDataSpy, 1);
            }));

            it('... should return an empty PrefaceList Observable per default', waitForAsync(() => {
                const expectedResult = new PrefaceList();

                getPrefaceDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(expectedResult)));

                // Call service function (success)
                editionDataService.getEditionPrefaceData().subscribe({
                    next: res => {
                        expectToEqual(res, expectedResult);
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getPrefaceDataSpy, 1);
            }));
        });

        describe('fail', () => {
            it('... should log an error for every failed request', waitForAsync(() => {
                const expectedResult = [];

                // Call service function (success)
                editionDataService.getEditionPrefaceData().subscribe({
                    next: (res: any) => {
                        expectToEqual(res, expectedResult);
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to to every file with given settings
                regexBase = new RegExp(expectedAssetPathBaseRoute);
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectToBe(call[0]?.request.url, expectedPrefaceFilePath);

                // Resolve request with mocked error
                call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_PREFACELIST' }));

                // Check for console output
                expectSpyCall(
                    consoleSpy,
                    1,
                    `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_PREFACELIST`
                );

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));

            it('... should return [] if request failed', waitForAsync(() => {
                const expectedResult = [];

                // Call service function (success)
                editionDataService.getEditionPrefaceData().subscribe({
                    next: (res: any) => {
                        expectToEqual(res, expectedResult);
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to to every file with given settings
                regexBase = new RegExp(expectedAssetPathBaseRoute);
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectToBe(call[0]?.request.url, expectedPrefaceFilePath);

                // Resolve request with mocked error
                call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_PREFACELIST' }));

                // Check for console output
                expectSpyCall(consoleSpy, 1);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });
    });

    describe('#getEditionReportData()', () => {
        it('... should have a method `getEditionReportData`', () => {
            expect(editionDataService.getEditionReportData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPath);
            }));

            it('... should call #getSourceListData, #getSourceDescriptionListData, #getSourceEvaluationListData, #getTextcriticsListData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getSourceListDataSpy, 1);
                expectSpyCall(getSourceDescriptionListDataSpy, 1);
                expectSpyCall(getSourceEvaluationListDataSpy, 1);
                expectSpyCall(getTextcriticsListDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct urls', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getJsonDataSpy, 4);
                expectToBe(getJsonDataSpy.calls.allArgs()[0][0], expectedSourceListFilePath);
                expectToBe(getJsonDataSpy.calls.allArgs()[1][0], expectedSourceDescriptionFilePath);
                expectToBe(getJsonDataSpy.calls.allArgs()[2][0], expectedSourceEvaluationFilePath);
                expectToBe(getJsonDataSpy.calls.allArgs()[3][0], expectedTextcriticsFilePath);
            }));

            it('... should perform an HTTP GET request to sourceList, sourceDescription, sourceEvaluation & textcritics file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to to every file with given settings
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 4);

                expectToBe(call.length, 4);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[1]?.request.method, 'GET');
                expectToBe(call[2]?.request.method, 'GET');
                expectToBe(call[3]?.request.method, 'GET');

                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[1]?.request.responseType, 'json');
                expectToBe(call[2]?.request.responseType, 'json');
                expectToBe(call[3]?.request.responseType, 'json');

                expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('response', () => {
            describe('success', () => {
                it('... should return a forkJoined Observable(SourceList, SourceDescriptionList, SourceEvaluationList,  TextcriticsList)', waitForAsync(() => {
                    const sl = new SourceList();
                    sl.sources = [];
                    sl.sources.push(new Source());
                    sl.sources[0].siglum = 'test-sources-id';

                    const sdl = new SourceDescriptionList();
                    sdl.sources = [];
                    sdl.sources.push(new SourceDescription());
                    sdl.sources[0].id = 'test-source-description-id';

                    const sel = new SourceEvaluationList();
                    sel.sources = [];
                    sel.sources.push(new SourceEvaluation());
                    sel.sources[0].id = 'test-source-evaluation-id';

                    const tcl = new TextcriticsList();
                    tcl.textcritics = [];
                    tcl.textcritics.push(new Textcritics());
                    tcl.textcritics[0].id = 'test-textcritics-id';

                    const expectedResult = [sl, sdl, sel, tcl];

                    getSourceListDataSpy.and.returnValue(observableOf(sl));
                    getSourceDescriptionListDataSpy.and.returnValue(observableOf(sdl));
                    getSourceEvaluationListDataSpy.and.returnValue(observableOf(sel));
                    getTextcriticsListDataSpy.and.returnValue(observableOf(tcl));

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: res => {
                            const resSl = res[0] as SourceList;
                            const resSdl = res[1] as SourceDescriptionList;
                            const resSel = res[2] as SourceEvaluationList;
                            const resTcl = res[3] as TextcriticsList;

                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(resSl, expectedResult[0] as SourceList);
                            expectToEqual(resSdl, expectedResult[1] as SourceDescriptionList);
                            expectToEqual(resSel, expectedResult[2] as SourceEvaluationList);
                            expectToEqual(resTcl, expectedResult[3] as TextcriticsList);

                            expectToBe(resSl.sources[0].siglum, 'test-sources-id');
                            expectToBe(resSdl.sources[0].id, 'test-source-description-id');
                            expectToBe(resSel.sources[0].id, 'test-source-evaluation-id');
                            expectToBe(resTcl.textcritics[0].id, 'test-textcritics-id');
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getSourceListDataSpy, 1);
                    expectSpyCall(getSourceDescriptionListDataSpy, 1);
                    expectSpyCall(getSourceEvaluationListDataSpy, 1);
                    expectSpyCall(getTextcriticsListDataSpy, 1);
                }));

                it('... should return an empty forkJoined Observable per default', waitForAsync(() => {
                    const expectedResult = [
                        new SourceList(),
                        new SourceDescriptionList(),
                        new SourceEvaluationList(),
                        new TextcriticsList(),
                    ];

                    getSourceListDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(new SourceList())));
                    getSourceDescriptionListDataSpy.and.returnValue(
                        EMPTY.pipe(defaultIfEmpty(new SourceDescriptionList()))
                    );
                    getSourceEvaluationListDataSpy.and.returnValue(
                        EMPTY.pipe(defaultIfEmpty(new SourceEvaluationList()))
                    );
                    getTextcriticsListDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(new TextcriticsList())));

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: res => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getSourceListDataSpy, 1);
                    expectSpyCall(getSourceDescriptionListDataSpy, 1);
                    expectSpyCall(getSourceEvaluationListDataSpy, 1);
                    expectSpyCall(getTextcriticsListDataSpy, 1);
                }));
            });

            describe('fail', () => {
                it('... should log an error for every failed request', waitForAsync(() => {
                    const expectedResult = [[], [], [], []];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                            expectToEqual(res[3], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELIST' }));
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTDESCRIPTION' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTEVALUATION' })
                    );
                    call[3].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICS' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 4);
                    expectToBe(
                        consoleSpy.calls.allArgs()[0][0],
                        `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_SOURCELIST`
                    );
                    expectToBe(
                        consoleSpy.calls.allArgs()[1][0],
                        `_getJsonData failed: Http failure response for ${call[1]?.request.url}: 400 ERROR_LOADING_SOURCELISTDESCRIPTION`
                    );
                    expectToBe(
                        consoleSpy.calls.allArgs()[2][0],
                        `_getJsonData failed: Http failure response for ${call[2]?.request.url}: 400 ERROR_LOADING_SOURCELISTEVALUATION`
                    );
                    expectToBe(
                        consoleSpy.calls.allArgs()[3][0],
                        `_getJsonData failed: Http failure response for ${call[3]?.request.url}: 400 ERROR_LOADING_TEXTCRITICS`
                    );

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], [], [], []] if all requests failed', waitForAsync(() => {
                    const expectedResult = [[], [], [], []];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                            expectToEqual(res[3], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELIST' }));
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTDESCRIPTION' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTEVALUATION' })
                    );
                    call[3].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICS' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 4);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [sourceList, [], [], []] if all but sourceList request failed', waitForAsync(() => {
                    const expectedResult = [new SourceList(), [], [], []];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0]);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                            expectToEqual(res[3], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(expectedResult[0]);
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTDESCRIPTION' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTEVALUATION' })
                    );
                    call[3].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICS' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 3);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], sourceDescriptionList, [], []] if all but sourceDescriptionList request failed', waitForAsync(() => {
                    const expectedResult = [[], new SourceDescriptionList(), [], []];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], expectedResult[1]);
                            expectToEqual(res[2], []);
                            expectToEqual(res[3], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELIST' }));
                    call[1].flush(expectedResult[1]);
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTEVALUATION' })
                    );
                    call[3].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICS' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 3);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], [], sourceEvaluationList, []] if all but sourceEvaluationList request failed', waitForAsync(() => {
                    const expectedResult = [[], [], new SourceEvaluationList(), []];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], expectedResult[2]);
                            expectToEqual(res[3], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELIST' }));
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELISTDESCRIPTION' })
                    );
                    call[2].flush(expectedResult[2]);
                    call[3].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICS' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 3);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], [], [], textcritics] if all but textcritics request failed', waitForAsync(() => {
                    const expectedResult = [[], [], [], new TextcriticsList()];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                            expectToEqual(res[3], expectedResult[3]);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELIST' }));
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCEDESCRIPTIONLIST' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCEEVALUATIONLIST' })
                    );
                    call[3].flush(expectedResult[3]);

                    // Check for console output
                    expectSpyCall(consoleSpy, 3);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [sourcelist, SourceDescriptionList, SourceEvaluationList, []] if textcritics request failed', waitForAsync(() => {
                    const expectedResult = [
                        new SourceList(),
                        new SourceDescriptionList(),
                        new SourceEvaluationList(),
                        [],
                    ];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0]);
                            expectToEqual(res[1], expectedResult[1]);
                            expectToEqual(res[2], expectedResult[2]);
                            expectToEqual(res[3], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(expectedResult[0]);
                    call[1].flush(expectedResult[1]);
                    call[2].flush(expectedResult[2]);
                    call[3].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICS' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [sourceList, [], [], textcritics] if middle requests failed', waitForAsync(() => {
                    const expectedResult = [new SourceList(), [], [], new TextcriticsList()];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0]);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                            expectToEqual(res[3], expectedResult[3]);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(expectedResult[0]);
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCEDESCRIPTIONLIST' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCEEVALUATIONLIST' })
                    );
                    call[3].flush(expectedResult[3]);

                    // Check for console output
                    expectSpyCall(consoleSpy, 2);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], descriptionList, evaluationList, textcritics] if sourcelist request failed', waitForAsync(() => {
                    const expectedResult = [
                        [],
                        new SourceDescriptionList(),
                        new SourceEvaluationList(),
                        new TextcriticsList(),
                    ];

                    // Call service function (success)
                    editionDataService.getEditionReportData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], expectedResult[1]);
                            expectToEqual(res[2], expectedResult[2]);
                            expectToEqual(res[3], expectedResult[3]);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedSourceListFilePath);
                    expectToBe(call[1]?.request.url, expectedSourceDescriptionFilePath);
                    expectToBe(call[2]?.request.url, expectedSourceEvaluationFilePath);
                    expectToBe(call[3]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_SOURCELIST' }));
                    call[1].flush(expectedResult[1]);
                    call[2].flush(expectedResult[2]);
                    call[3].flush(expectedResult[3]);

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));
            });
        });
    });

    describe('#getEditionRowTablesData()', () => {
        it('... should have a method `getEditionRowTablesData`', () => {
            expect(editionDataService.getEditionRowTablesData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionRowTablesData().subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPathBaseRoute);
            }));

            it('... should call #_getRowTablesData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionRowTablesData().subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getRowTablesDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct url', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionRowTablesData().subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getRowTablesDataSpy, 1);
                expectSpyCall(getJsonDataSpy, 1, expectedRowTablesFilePath);
            }));

            it('... should perform an HTTP GET request to rowTables file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionRowTablesData().subscribe({
                    next: res => {
                        expectToEqual(res, new EditionRowTablesList());
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to every file with given settings
                regexBase = new RegExp(expectedAssetPathBaseRoute);
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 1, expectedRowTablesFilePath);

                expectToBe(call.length, 1);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[0]?.request.url, expectedRowTablesFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('success', () => {
            it('... should return an Observable(EditionRowTablesList)', waitForAsync(() => {
                const rt = expectedRowTablesData;

                const expectedResult = rt;

                getRowTablesDataSpy.and.returnValue(observableOf(expectedResult));

                // Call service function (success)
                editionDataService.getEditionRowTablesData().subscribe({
                    next: res => {
                        expectToEqual(res, expectedResult);
                        expectToBe(res.rowTables[0].id, 'SkRT');
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getRowTablesDataSpy, 1);
            }));

            it('... should return an empty EditionRowTablesList Observable per default', waitForAsync(() => {
                const expectedResult = new EditionRowTablesList();

                getRowTablesDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(expectedResult)));

                // Call service function (success)
                editionDataService.getEditionRowTablesData().subscribe({
                    next: res => {
                        expectToEqual(res, expectedResult);
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getRowTablesDataSpy, 1);
            }));
        });

        describe('fail', () => {
            it('... should log an error for every failed request', waitForAsync(() => {
                const expectedResult = [];

                // Call service function (success)
                editionDataService.getEditionRowTablesData().subscribe({
                    next: (res: any) => {
                        expectToEqual(res, expectedResult);
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to to every file with given settings
                regexBase = new RegExp(expectedAssetPathBaseRoute);
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectToBe(call[0]?.request.url, expectedRowTablesFilePath);

                // Resolve request with mocked error
                call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_ROWTABLESLIST' }));

                // Check for console output
                expectSpyCall(
                    consoleSpy,
                    1,
                    `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_ROWTABLESLIST`
                );

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));

            it('... should return [] if request failed', waitForAsync(() => {
                const expectedResult = [];

                // Call service function (success)
                editionDataService.getEditionRowTablesData().subscribe({
                    next: (res: any) => {
                        expectToEqual(res, expectedResult);
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to to every file with given settings
                regexBase = new RegExp(expectedAssetPathBaseRoute);
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectToBe(call[0]?.request.url, expectedRowTablesFilePath);

                // Resolve request with mocked error
                call[0].flush(null, new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_ROWTABLESLIST' }));

                // Check for console output
                expectSpyCall(consoleSpy, 1);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });
    });

    describe('#getEditionSheetsData()', () => {
        it('... should have a method `getEditionSheetsData`', () => {
            expect(editionDataService.getEditionSheetsData).toBeDefined();
        });

        describe('request', () => {
            it('... should set assetPath', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectToBe((editionDataService as any)._assetPath, expectedAssetPath);
            }));

            it('... should call #getFolioConvoluteData, #getSvgSheetsData, #getTextcriticsListData', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getFolioConvoluteDataSpy, 1);
                expectSpyCall(getSvgSheetsDataSpy, 1);
                expectSpyCall(getTextcriticsListDataSpy, 1);
            }));

            it('... should trigger #getJsonData with correct urls', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                expectSpyCall(getJsonDataSpy, 3);
                expectToBe(getJsonDataSpy.calls.allArgs()[0][0], expectedFolioConvoluteFilePath);
                expectToBe(getJsonDataSpy.calls.allArgs()[1][0], expectedSheetsFilePath);
                expectToBe(getJsonDataSpy.calls.allArgs()[2][0], expectedTextcriticsFilePath);
            }));

            it('... should perform an HTTP GET request to convolute, sheets & textcritics file', waitForAsync(() => {
                // Call service function
                editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                    next: res => {
                        expect(res).toBeTruthy();
                    },
                    error: () => {
                        fail('should not call error');
                    },
                });

                // Expect one request to every file with given settings
                const call = httpTestingController.match(
                    (req: HttpRequest<any>) =>
                        req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                );

                expectSpyCall(getJsonDataSpy, 3);

                expectToBe(call.length, 3);
                expectToBe(call[0]?.request.method, 'GET');
                expectToBe(call[1]?.request.method, 'GET');
                expectToBe(call[2]?.request.method, 'GET');

                expectToBe(call[0]?.request.responseType, 'json');
                expectToBe(call[1]?.request.responseType, 'json');
                expectToBe(call[2]?.request.responseType, 'json');

                expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                // Assert that there are no more pending requests
                httpTestingController.verify();
            }));
        });

        describe('response', () => {
            describe('success', () => {
                it('... should return a forkJoined Observable(FolioConvoluteList, EditionSvgSheetList,  TextcriticsList)', waitForAsync(() => {
                    const fcl = new FolioConvoluteList();
                    fcl.convolutes = [];
                    fcl.convolutes.push(new FolioConvolute());
                    fcl.convolutes[0].convoluteId = 'test-convolute-id';

                    const esl = new EditionSvgSheetList();
                    esl.sheets = { workEditions: [], textEditions: [], sketchEditions: [] };
                    esl.sheets.workEditions.push(new EditionSvgSheet());
                    esl.sheets.textEditions.push(new EditionSvgSheet());
                    esl.sheets.sketchEditions.push(new EditionSvgSheet());
                    esl.sheets.workEditions[0].id = 'test-svg-work-sheets-id';
                    esl.sheets.textEditions[0].id = 'test-svg-text-sheets-id';
                    esl.sheets.sketchEditions[0].id = 'test-svg-sketch-sheets-id';

                    const tcl = new TextcriticsList();
                    tcl.textcritics = [];
                    tcl.textcritics.push(new Textcritics());
                    tcl.textcritics[0].id = 'test-textcritics-id';

                    const expectedResult = [fcl, esl, tcl];

                    getFolioConvoluteDataSpy.and.returnValue(observableOf(fcl));
                    getSvgSheetsDataSpy.and.returnValue(observableOf(esl));
                    getTextcriticsListDataSpy.and.returnValue(observableOf(tcl));

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: res => {
                            const resFcl = res[0] as FolioConvoluteList;
                            const resEsl = res[1] as EditionSvgSheetList;
                            const resTcl = res[2] as TextcriticsList;

                            expectToBe(res.length as number, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(resFcl, expectedResult[0] as FolioConvoluteList);
                            expectToEqual(resEsl, expectedResult[1] as EditionSvgSheetList);
                            expectToEqual(resTcl, expectedResult[2] as TextcriticsList);

                            expectToBe(resFcl.convolutes[0].convoluteId, 'test-convolute-id');
                            expectToBe(resEsl.sheets.workEditions[0].id, 'test-svg-work-sheets-id');
                            expectToBe(resEsl.sheets.textEditions[0].id, 'test-svg-text-sheets-id');
                            expectToBe(resEsl.sheets.sketchEditions[0].id, 'test-svg-sketch-sheets-id');
                            expectToBe(resTcl.textcritics[0].id, 'test-textcritics-id');
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getFolioConvoluteDataSpy, 1);
                    expectSpyCall(getSvgSheetsDataSpy, 1);
                    expectSpyCall(getTextcriticsListDataSpy, 1);
                }));

                it('... should return an empty forkJoined Observable per default', waitForAsync(() => {
                    const expectedResult = [new FolioConvoluteList(), new EditionSvgSheetList(), new TextcriticsList()];

                    getFolioConvoluteDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(new FolioConvoluteList())));
                    getSvgSheetsDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(new EditionSvgSheetList())));
                    getTextcriticsListDataSpy.and.returnValue(EMPTY.pipe(defaultIfEmpty(new TextcriticsList())));

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: res => {
                            expectToBe(res.length as number, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0] as FolioConvoluteList);
                            expectToEqual(res[1], expectedResult[1] as EditionSvgSheetList);
                            expectToEqual(res[2], expectedResult[2] as TextcriticsList);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    expectSpyCall(getFolioConvoluteDataSpy, 1);
                    expectSpyCall(getSvgSheetsDataSpy, 1);
                    expectSpyCall(getTextcriticsListDataSpy, 1);
                }));
            });

            describe('fail', () => {
                it('... should log an error for every failed request', waitForAsync(() => {
                    const expectedResult = [[], [], []];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_FOLIOCONVOLUTELIST' })
                    );
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_EDITIONSVGSHEETLIST' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICSLIST' })
                    );

                    expectSpyCall(consoleSpy, 3);
                    expectToBe(
                        consoleSpy.calls.allArgs()[0][0],
                        `_getJsonData failed: Http failure response for ${call[0]?.request.url}: 400 ERROR_LOADING_FOLIOCONVOLUTELIST`
                    );
                    expectToBe(
                        consoleSpy.calls.allArgs()[1][0],
                        `_getJsonData failed: Http failure response for ${call[1]?.request.url}: 400 ERROR_LOADING_EDITIONSVGSHEETLIST`
                    );
                    expectToBe(
                        consoleSpy.calls.allArgs()[2][0],
                        `_getJsonData failed: Http failure response for ${call[2]?.request.url}: 400 ERROR_LOADING_TEXTCRITICSLIST`
                    );

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], [], []] if all requests failed', waitForAsync(() => {
                    const expectedResult = [[], [], []];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_FOLIOCONVOLUTELIST' })
                    );
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_EDITIONSVGSHEETLIST' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICSLIST' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 3);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [folioConvoluteList, [], []] if all but folioConvoluteList request failed', waitForAsync(() => {
                    const expectedResult = [new FolioConvoluteList(), [], []];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0]);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(expectedResult[0]);
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_EDITIONSVGSHEETLIST' })
                    );
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICSLIST' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 2);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], editionSvgSheetList, []] if all but editionSvgSheetList request failed', waitForAsync(() => {
                    const expectedResult = [[], new EditionSvgSheetList(), []];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], expectedResult[1]);
                            expectToEqual(res[2], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_FOLIOCONVOLUTELIST' })
                    );
                    call[1].flush(expectedResult[1]);
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICSLIST' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 2);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], [], textcriticsList] if all but textcriticsList request failed', waitForAsync(() => {
                    const expectedResult = [[], [], new TextcriticsList()];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], expectedResult[2]);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_FOLIOCONVOLUTELIST' })
                    );
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_EDITIONSVGSHEETLIST' })
                    );
                    call[2].flush(expectedResult[2]);

                    // Check for console output
                    expectSpyCall(consoleSpy, 2);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [folioConvoluteList, editionSvgSheetList, []] if textcriticsList request failed', waitForAsync(() => {
                    const expectedResult = [new FolioConvoluteList(), new EditionSvgSheetList(), []];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0]);
                            expectToEqual(res[1], expectedResult[1]);
                            expectToEqual(res[2], []);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(expectedResult[0]);
                    call[1].flush(expectedResult[1]);
                    call[2].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_TEXTCRITICSLIST' })
                    );

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [folioConvoluteList, [], textcriticsList] if middle request failed', waitForAsync(() => {
                    const expectedResult = [new FolioConvoluteList(), [], new TextcriticsList()];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], expectedResult[0]);
                            expectToEqual(res[1], []);
                            expectToEqual(res[2], expectedResult[2]);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(expectedResult[0]);
                    call[1].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_EDITIONSVGSHEETLIST' })
                    );
                    call[2].flush(expectedResult[2]);

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));

                it('... should return [[], editionSvgSheetList, textcriticsList] if folioConvoluteList request failed', waitForAsync(() => {
                    const expectedResult = [[], new EditionSvgSheetList(), new TextcriticsList()];

                    // Call service function (success)
                    editionDataService.getEditionSheetsData(expectedEditionComplex).subscribe({
                        next: (res: any) => {
                            expectToBe(res.length, expectedResult.length);
                            expectToEqual(res, expectedResult);

                            expectToEqual(res[0], []);
                            expectToEqual(res[1], expectedResult[1]);
                            expectToEqual(res[2], expectedResult[2]);
                        },
                        error: () => {
                            fail('should not call error');
                        },
                    });

                    // Expect one request to to every file with given settings
                    const call = httpTestingController.match(
                        (req: HttpRequest<any>) =>
                            req.method === 'GET' && req.responseType === 'json' && regexBase.test(req.url)
                    );

                    expectToBe(call[0]?.request.url, expectedFolioConvoluteFilePath);
                    expectToBe(call[1]?.request.url, expectedSheetsFilePath);
                    expectToBe(call[2]?.request.url, expectedTextcriticsFilePath);

                    // Resolve request with mocked error
                    call[0].flush(
                        null,
                        new HttpErrorResponse({ status: 400, statusText: 'ERROR_LOADING_FOLIOCONVOLUTELIST' })
                    );
                    call[1].flush(expectedResult[1]);
                    call[2].flush(expectedResult[2]);

                    // Check for console output
                    expectSpyCall(consoleSpy, 1);

                    // Assert that there are no more pending requests
                    httpTestingController.verify();
                }));
            });
        });
    });

    describe('#_generateAssetPath()', () => {
        it('... should have a method `_generateAssetPath`', () => {
            expect((editionDataService as any)._generateAssetPath).toBeDefined();
        });

        it('... should generate the correct path without complexIdRoute', () => {
            const seriesRoute = '1';
            const sectionRoute = '5';
            const expectedPath = `${expectedAssetPathBaseRoute}/series/${seriesRoute}/section/${sectionRoute}`;

            const result = (editionDataService as any)._generateAssetPath(seriesRoute, sectionRoute);

            expect(result).toBe(expectedPath);
        });

        it('... should generate the correct path with complexIdRoute', () => {
            const seriesRoute = '2';
            const sectionRoute = '3';
            const complexIdRoute = '/complex1';
            const expectedPath = `${expectedAssetPathBaseRoute}/series/${seriesRoute}/section/${sectionRoute}/complex1`;

            const result = (editionDataService as any)._generateAssetPath(seriesRoute, sectionRoute, complexIdRoute);

            expect(result).toBe(expectedPath);
        });
    });

    describe('#_setAssetPathForEditionComplex()', () => {
        it('... should have a method `_setAssetPathForEditionComplex`', () => {
            expect((editionDataService as any)._setAssetPathForEditionComplex).toBeDefined();
        });

        it('... should call `_generateAssetPath` with the correct parameters', () => {
            const seriesRoute = expectedEditionComplex.pubStatement.series.route;
            const sectionRoute = expectedEditionComplex.pubStatement.section.route;
            const complexIdRoute = expectedEditionComplex.complexId.route;

            (editionDataService as any)._setAssetPathForEditionComplex(expectedEditionComplex);

            expectSpyCall(generateAssetPathSpy, 1, [seriesRoute, sectionRoute, complexIdRoute]);
        });

        it('... should return the generated assetPath', () => {
            const seriesRoute = expectedEditionComplex.pubStatement.series.route;
            const sectionRoute = expectedEditionComplex.pubStatement.section.route;
            const complexIdRoute = expectedEditionComplex.complexId.route;

            const expectedPath = `${expectedAssetPathBaseRoute}/series/${seriesRoute}/section/${sectionRoute}${complexIdRoute}`;

            const result = (editionDataService as any)._setAssetPathForEditionComplex(expectedEditionComplex);

            expectToBe(result, expectedPath);
        });
    });

    describe('#_setAssetPathForSectionIntro()', () => {
        it('... should have a method `_setAssetPathForSectionIntro`', () => {
            expect((editionDataService as any)._setAssetPathForSectionIntro).toBeDefined();
        });

        it('... should call `_generateAssetPath` with the correct parameters', () => {
            const seriesRoute = '1';
            const sectionRoute = '5';

            (editionDataService as any)._setAssetPathForSectionIntro(seriesRoute, sectionRoute);

            expectSpyCall(generateAssetPathSpy, 1, [seriesRoute, sectionRoute]);
        });

        it('... should return the generated assetPath', () => {
            const seriesRoute = '1';
            const sectionRoute = '5';
            const expectedPath = `${expectedAssetPathBaseRoute}/series/${seriesRoute}/section/${sectionRoute}`;

            const result = (editionDataService as any)._setAssetPathForSectionIntro(seriesRoute, sectionRoute);

            expectToBe(result, expectedPath);
        });
    });

    describe('#_getJsonData()', () => {
        it('... should have a method `_getJsonData`', () => {
            expect((editionDataService as any)._getJsonData).toBeDefined();
        });

        it('... should return an Observable<any>', waitForAsync(() => {
            const expectedPath = 'test-url';
            const expectedData = { test: 'data' };

            const result = (editionDataService as any)._getJsonData(expectedPath);

            result.subscribe({
                next: (res: any) => {
                    expect(res).toBeTruthy();
                    expect(res).toEqual(expectedData);
                },
                error: () => {
                    fail('should not call error');
                },
            });

            const call = httpTestingController.expectOne(expectedPath);

            call.flush(expectedData);

            httpTestingController.verify();
        }));
    });
});
