angular.module('coursestitch', ['ngRoute', 'angularParse']).

config(function($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'templates/home.html',
    })
    .when('/maps', {
        templateUrl: 'templates/maps.html',
        controller: 'MapsCtrl',
    })
    .when('/map/:mapTitle', {
        templateUrl: 'templates/map.html',
        controller: 'MapCtrl',
    })
    .when('/map/:mapTitle/resource/:resourceTitle/:resourceSubtitle', {
        templateUrl: 'templates/map.html',
        controller: 'MapCtrl',
    });

    $locationProvider
        .html5Mode(false)
        .hashPrefix('!');
}).
config(function() {
    var parseKeys = {
        app: 'QrE6nn4lKuwE9Mon6CcxH7nLQa6eScKwBgqh5oTH',
        js: 'NO1PZLeyugXkKDfDPuL8wAINf0356iTWiCVaTfGJ',
    };

    Parse.initialize(parseKeys.app, parseKeys.js);
}).

filter('urlize', function() {
    return function(string) {
        if (string)
            return string.replace(/ /g, '-');
    };
}).

filter('deurlize', function() {
    return function(string) {
        if (string)
            return string.replace(/-/g, ' ');
    };
}).

controller('MapsCtrl', function($scope, parseQuery) {
    parseQuery.new('Map')
        .find()
    .then(function(maps) {
        $scope.maps = maps.map(function(o) { return o.attributes; });
        $scope.$apply();
    });
}).
controller('MapCtrl', function($scope, $routeParams, deurlizeFilter, parseQuery) {
    $scope.tags = ["teaches", "requires"];

    var mapTitle = deurlizeFilter($routeParams.mapTitle);
    var resourceTitle = deurlizeFilter($routeParams.resourceTitle);
    var resourceSubtitle = deurlizeFilter($routeParams.resourceSubtitle);

    parseQuery.new('Map')
        .equalTo('title', mapTitle)
        .include(['resources'])
        .first()
    .then(function(map) {
        $scope.map = map.attributes;

        if (map.get('resources')) {
            $scope.resources = map.get('resources').map(function(o) { return o.attributes; });

            if (resourceTitle && resourceSubtitle)
                $scope.resource = $scope.resources.filter(function(r) {
                    var hasTitle = r.title === resourceTitle;
                    var hasSubtitle = r.subtitle === resourceSubtitle;
                    return hasTitle && hasSubtitle;
                })[0];
            else
                $scope.resource = $scope.resources[0];
        }

        $scope.$apply();
    });
});
