angular.module('coursestitch-maps', [
    'parse-angular',
    'coursestitch-resources', 'coursestitch-concepts'
]).

service('fetchMap', function() {
    Parse.Object.extend('Map', {
        understanding: function() {
            var resources = this.get('resources');

            var us = resources.reduce(function(u, r) {
                if (r.understanding())
                    return u + r.understanding();
                else
                    return r;
            }, 0);

            return us / resources.length;
        },
    });

    Parse.Object.extend('Resource', {
        understanding: function() {
            if (this.understandingObj)
                return this.understandingObj.get('understands');
            else
                return undefined;
        },
    });

    Parse.Object.extend('Concept', {
        understanding: function() {
            if (this.understandingObj)
                return this.understandingObj.get('understands');
            else
                return undefined;
        },
    });

    var ConceptUnderstanding = Parse.Object.extend('ConceptUnderstanding');

    return function(mapId, userId) {
        return Parse.Cloud.run('getUnderstandingMap', {mapId: mapId, userId: userId})
        .then(function(result) {
            // Add understandings to resources
            result.understandings.forEach(function(u) {
                var resource = result.map.get('resources').find(function(resource) {
                    return resource.id === u.get('resource').id;
                });

                resource.understandingObj = u;
                u.get('resource').understandingObj = u;
            });

            // Get a list of concepts
            var concepts = result.map.get('resources')
                .map(function(resource) {
                    return resource.get('teaches').concat(resource.get('requires'));
                })
                .reduce(function (a, b) {
                        return a.concat(b);
                }, [])
                .filter(function(a) { return a; });

            // Add understandings for each concept
            concepts.forEach(function(concept) {
                var understanding = result.conceptUnderstandings.find(function(u) {
                    return concept.id === u.get('concept').id;
                });

                if (understanding) {
                    concept.understandingObj = understanding;
                } else {
                    // Create a new concept understanding if one doesn't already exist
                    new ConceptUnderstanding()
                        .set('user', Parse.User.current())
                        .set('concept', concept)
                        .set('understands', 0)
                    .save()
                    .then(function(u) {
                        concept.understandingObj = u;
                    });
                }
            });

            return result.map;
        });
    };
}).

service('getMap', function(fetchMap) {
    var maps = {};

    // Return cached versions of maps if they exist
    // Otherwise fetch the map and cache it
    return function(mapId, userId) {
        if (maps[mapId+userId])
            return maps[mapId+userId]
        else
            return maps[mapId+userId] = fetchMap(mapId, userId)
    };
}).

controller('MapsCtrl', function($scope) {
    new Parse.Query('Map')
        .find()
    .then(function(maps) {
        $scope.maps = maps;
    });
}).
controller('MapCtrl', function($scope, $routeParams, deurlizeFilter, getMap, getConcept, newResource) {
    $scope.newResource = newResource;

    var mapId = $routeParams.mapId;
    var mapTitle = $routeParams.mapTitle;
    var viewType = $routeParams.viewType;
    var viewId = $routeParams.viewId;
    var viewTitle = $routeParams.viewTitle;
    var viewSubtitle = $routeParams.viewSubtitle;

    if (viewType == 'concept' || viewType == 'resource') {
      $scope.viewType = viewType;
    } else {
      // Do something if the type is not concept or resource. Or something.
    }

    var userId;
    if (Parse.User.current())
        userId = Parse.User.current().id
    else
        userId = undefined;

    getMap(mapId, userId)
    .then(function(map) {
        // The map has been loaded!
        $scope.status = 'loaded';

        $scope.map = map;
        if (map.get('resources')) {
            var resources = map.get('resources')
            // Set the map's resources to be used in the scope, which allows it to be rendered.
            // This could be empty if the map has no associated resources.
            $scope.resources = resources;

            if ($scope.viewType === 'resource') {
                // Retrieve the resource with the given ID parsed from the route, regardless of
                // whether the resource is in the map or not.
                var resource = resources.find(function(resource) {
                    return resource.id === viewId;
                });

                if (resource === undefined)
                    new Parse.Query('Resource')
                        .include(['teaches', 'requires'])
                        .get(viewId)
                    .then(function(resource) {
                        $scope.resource = resource;
                    });
                else
                    $scope.resource = resource;

            } else if ($scope.viewType === 'concept')
                // Retrieves the Concept object given with the ID, as well as all resources that
                // teach the concept.
                getConcept(viewId)
                .then(function(concept, resources) {
                    if (concept) {
                        $scope.concept = concept;
                        $scope.concept.resources = resources;
                    }
                });
            else {
                $scope.resource = resources[0];
                $scope.viewType = 'resource';
            }
        }
    });
});
