angular.module('coursestitch-concepts', []).

service('Concept', function(conceptUnderstandingCache) {
    return Parse.Object.extend('Concept', {
        understandingObj: function() {
            var userId = Parse.User.current().id;
            return conceptUnderstandingCache.get(this.id, userId);
        },
        understanding: function() {
            var u = this.understandingObj();
            return u ? u.get('understands') : undefined;
        },
    })
}).
service('conceptUnderstandingCache', function(objectCache) {
    return objectCache('concept-understanding', function(conceptId, userId) {
        return Parse.Cloud.run('getConceptUnderstanding', {conceptId: conceptId, userId: userId});
    });
}).
service('getConcept', function() {
    return function(conceptId) {
        var conceptQuery = new Parse.Query('Concept')
            .get(conceptId)
        .then(function(concept) {
            var resourceQuery = new Parse.Query('Resource')
                .equalTo('teaches', concept)
                .find();
            return Parse.Promise.when(concept, resourceQuery);
        });
        return conceptQuery;
    };
}).

directive('concept', function(makeURL) {
    return {
        restrict: 'E',
        templateUrl: '/templates/concept.html',
        scope: {
            map: '=',
            concept: '=',
            mode: '@',
        },
        link: function(scope, elem, attrs) {
            scope.makeURL = makeURL;

            // Watch to see if a concept has been loaded
            scope.$watch('concept', function(concept) {
                if(concept !== undefined)
                    scope.status = 'loaded';
            });
        },
    };
});
