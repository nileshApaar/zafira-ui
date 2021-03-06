'use strict'

const TestsRunsSearchController = function TestsRunsSearchController(windowWidthService, DEFAULT_SC, testsRunsService, $rootScope, TestRunService, ProjectService, $q, FilterService, $mdDateRangePicker, $timeout) {
    'ngInject';

    const subjectName = 'TEST_RUN';
    const SELECT_CRITERIAS = ['ENV', 'PLATFORM', 'PROJECT', 'STATUS'];
    const STATUSES = ['PASSED', 'FAILED', 'SKIPPED', 'ABORTED', 'IN_PROGRESS', 'QUEUED', 'UNKNOWN'];

    const vm = {
        isMobile: windowWidthService.isMobile,
        isMobileSearchActive: false,
        fastSearchBlockExpand: false,
        isFilterActive: testsRunsService.isFilterActive,
        isSearchActive: testsRunsService.isSearchActive,
        isOnlyAdditionalSearchActive: testsRunsService.isOnlyAdditionalSearchActive,
        fastSearch: {},
        statuses: STATUSES,
        selectedRange: {
            selectedTemplate: null,
            selectedTemplateName: null,
            dateStart: null,
            dateEnd: null,
            showTemplate: false,
            fullscreen: false
        },
        getActiveSearchType: testsRunsService.getActiveSearchType,
        searchParams: testsRunsService.getLastSearchParams(),
        onChangeSearchCriteria: onChangeSearchCriteria,
        openDatePicker: openDatePicker,
        onReset: onReset,
        showSearchFilters: showSearchFilters,
        resetSearchQuery: resetSearchQuery,
        showAdvancedSearchFilters: false,
    };

    vm.$onInit = init;

    return vm;

    function init() {
        vm.fastSearchBlockExpand = true;
        loadFilters();
        readStoredParams();
    }

    function readStoredParams() {
        if (vm.isSearchActive()) {
            let fromDate = testsRunsService.getSearchParam('fromDate');
            let toDate = testsRunsService.getSearchParam('toDate');
            const date = testsRunsService.getSearchParam('date');

            date && (fromDate = toDate = date);
            fromDate && (vm.selectedRange.dateStart = new Date(fromDate));
            toDate && (vm.selectedRange.dateEnd = new Date(toDate));

            testsRunsService.getSearchTypes().forEach(function(type) {
                const searchValue = testsRunsService.getSearchParam(type);

                searchValue && (vm.fastSearch[type] = searchValue);
            });
        }
    }

    function onReset() {
        vm.selectedRange.dateStart = null;
        vm.selectedRange.dateEnd = null;
        vm.selectedRange.selectedTemplate = null;
        vm.selectedRange.selectedTemplateName = null;
        vm.searchParams = angular.copy(DEFAULT_SC);
        vm.fastSearch = {};
        testsRunsService.resetFilteringState();
        vm.onFilterChange();
        vm.chipsCtrl && (delete vm.chipsCtrl.selectedChip);
    }

    function onApply() {
        $timeout(function() {
            vm.onFilterChange();
        }, 0);
    }

    function loadFilters() {
        const loadFilterDataPromises = [];

        loadFilterDataPromises.push(loadEnvironments());
        loadFilterDataPromises.push(loadPlatforms());
        loadFilterDataPromises.push(loadProjects());

        return $q.all(loadFilterDataPromises).then(function() {
            loadSubjectBuilder();
        });
    }

    function loadEnvironments() {
        return TestRunService.getEnvironments().then(function(rs) {
            if (rs.success) {
                vm.environments = rs.data.filter(function (env) {
                    return !!env;
                });

                return vm.environments;
            } else {
                alertify.error(rs.message);
                $q.reject(rs.message);
            }
        });
    }

    function loadPlatforms() {
        return TestRunService.getPlatforms().then(function (rs) {
            if (rs.success) {
                vm.platforms = rs.data.filter(function (platform) {
                    return platform && platform.length;
                });

                return vm.platforms;
            } else {
                alertify.error(rs.message);

                return $q.reject(rs.message);
            }
        });
    }

    function loadProjects() {
        return ProjectService.getAllProjects().then(function (rs) {
            if (rs.success) {
                vm.allProjects = rs.data.map(function(proj) {
                    return proj.name;
                });

                return rs.data;
            } else {
                $q.reject(rs.message);
            }
        });
    }

    function loadSubjectBuilder() {
        FilterService.getSubjectBuilder(subjectName).then(function (rs) {
            if(rs.success) {
                vm.subjectBuilder = rs.data;
                vm.subjectBuilder.criterias.forEach(function(criteria) {
                    if (isSelectCriteria(criteria)) {
                        switch(criteria.name) {
                            case 'ENV':
                                criteria.values = vm.environments;
                                break;
                            case 'PLATFORM':
                                criteria.values = vm.platforms;
                                break;
                            case 'PROJECT':
                                criteria.values = vm.allProjects;
                                break;
                            case 'STATUS':
                                criteria.values = STATUSES;
                                break;
                        }
                    }
                });
            }
        });
    }

    function isSelectCriteria(criteria) {
        return criteria && SELECT_CRITERIAS.indexOf(criteria.name) >= 0;
    }

    function onChangeSearchCriteria() {
        angular.forEach(vm.searchParams, function (value, name) {
            if (vm.searchParams[name]) {
                testsRunsService.setSearchParam(name, value);
            } else {
                testsRunsService.deleteSearchParam(name);
            }
        });
        onApply();
    }

    function openDatePicker($event, showTemplate) {
        if (vm.isFilterActive()) { return; }

        vm.selectedRange.showTemplate = showTemplate;

        $mdDateRangePicker.show({
            targetEvent: $event,
            model: vm.selectedRange
        })
        .then(function(result) {
            if (result) {
                vm.selectedRange = result;
                if (vm.selectedRange.dateStart && vm.selectedRange.dateEnd) {
                    if (vm.selectedRange.dateStart.getTime() !==
                        vm.selectedRange.dateEnd.getTime()) {
                        testsRunsService.deleteSearchParam('date');
                        testsRunsService.setSearchParam('fromDate', vm.selectedRange.dateStart);
                        testsRunsService.setSearchParam('toDate', vm.selectedRange.dateEnd);
                    } else {
                        testsRunsService.deleteSearchParam('fromDate');
                        testsRunsService.deleteSearchParam('toDate');
                        testsRunsService.setSearchParam('date', vm.selectedRange.dateStart);
                    }
                }

                onChangeSearchCriteria();
            }
        })
    }

    function resetSearchQuery() {
        vm.searchParams.query = null;
        vm.onChangeSearchCriteria('query');
    };

    function showSearchFilters() {
        vm.showAdvancedSearchFilters = ! vm.showAdvancedSearchFilters;
    };
}

export default TestsRunsSearchController;
