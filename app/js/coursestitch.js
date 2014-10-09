angular.module('coursestitch', [
    'ngRoute', 'ngAnimate', 'parse-angular',
    'coursestitch-maps', 'coursestitch-resources',
    'coursestitch-components', 'satellizer'
]).

config(function($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'templates/home.html',
    })
    .when('/login', {
        templateUrl: 'templates/login.html',
    })
    .when('/signup', {
        templateUrl: 'templates/signup.html',
        controller: 'SignupCtrl',
    })
    .when('/profile', {
        templateUrl: 'templates/profile.html',
    })
    .when('/maps', {
        templateUrl: 'templates/maps.html',
        controller: 'MapsCtrl',
    })
    .when('/map/:mapId/:mapTitle?', {
        templateUrl: 'templates/map.html',
        controller: 'MapCtrl',
    })
    .when('/map/:mapId/:mapTitle?/:viewType/:viewId/:viewTitle?/:viewSubtitle?', {
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
config(function($authProvider) {
    $authProvider.github({
        clientId: '06ab2e10e5bb81f8841e',
        scope: ['user:email'],
        optionalUrlParams: ['scope'],
    });
    $authProvider.facebook({
        clientId: '645904488858229',
        // override satellizer's default redirect URI to make it work
        // properly with our site
        redirectUri: window.location.origin + '/#!/',
    });
    $authProvider.google({
        clientId: '580207549424-oss6pia8ldpj7rps65afh18johr1vp2q.apps.googleusercontent.com',
    });
}).

run(['$route', '$rootScope', '$location', function ($route, $rootScope, $location) {
    var original = $location.path;
    $location.path = function (path, reload) {
        if (reload === false) {
            var lastRoute = $route.current;
            var un = $rootScope.$on('$locationChangeSuccess', function () {
                $route.current = lastRoute;
                un();
            });
        }
        return original.apply($location, [path]);
    };
}]).

service('objectCache', function($cacheFactory) {
    // Return an object which caches or fetches objects
    return function(name, fetch) {
        var cache = $cacheFactory(name+'-cache');
        return {
            fetch: fetch,
            cache: cache,
            put: function(id, obj) {
                this.cache.put(id, obj);
                return obj;
            },
            get: function(id, userId) {
                var self = this;
                var objId = userId ? id+userId : id;

                // If we have no cache, then fetch the object
                if (this.cache.get(objId) === undefined) {
                    // Promise to fetch the value
                    var promise = this.fetch(id, userId); 
                    self.put(objId, promise);
                }

                // Return the object
                return this.cache.get(objId);
            },
            putGet: function(id, obj) {
                var cache = this.cache.get(id);

                // Return the cache if it exists
                if (cache)
                    return cache;
                // Otherwise cache the given object
                else
                    return this.put(id, obj);
            }
        };
    };
}).
service('getUserRoles', function() {
    return function() {
        if (Parse.User.current())
            return new Parse.Query('_Role')
                .equalTo('users', Parse.User.current())
                .find();
        else
            return Parse.Promise.as([]);
    };
}).
service('isEditor', function(getUserRoles) {
    return function() {
        return getUserRoles()
        .then(function(roles) {
            if (roles.find(function(role) { return role.get('name') == 'editor'; })) {
                return true;
            } else {
                return false;
            }
        });
    };
}).
service('makeURL', function(urlizeFilter) {
    // Create a URL string from various attributes of a given map
    // and view object (which can be a resource or a concept).
    // The return string should match the URL format given in
    // the routeProvider above.
    return function(mapObject, viewObject) {
        var fields = [
            mapObject.id,
            urlizeFilter(mapObject.attributes.title)
        ];
        if (viewObject) {
            fields = fields.concat([   
                viewObject.className.toLowerCase(),
                viewObject.id,
                urlizeFilter(viewObject.attributes.title),
                urlizeFilter(viewObject.attributes.subtitle)
            ]);
        }
        return '#!/map/' + fields.join('/');
    };
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
filter('result', function() {
    // Return the result of a Parse promise
    return function(promise) {
        if (promise && promise._resolved)
            return promise._result[0]
        else
            return undefined;
    };
}).
filter('understandingClass', function() {
    return function(u) {
        if (u < 0) {
            return 'palette-alizarin';
        } else if (u == 0) {
            return 'palette-midnight-blue';
        } else if (u > 0 && u < 0.5) {
            return 'palette-belize-hole';
        } else if (u >= 0.5 && u < 1) {
            return 'palette-peter-river';
        } else if (u == 1) {
            return 'palette-turquoise';
        } else {
            return 'palette-asbestos';
        }
    };
}).
filter('understandingLabel', function() {
    return function(u) {
        if (u < 0) {
            return 'Confusing';
        } else if (u == 0) {
            return 'Unread';
        } else if (u > 0 && u < 0.5) {
            return 'Getting started';
        } else if (u > 0.5 && u < 1) {
            return 'Almost finished';
        } else if (u == 1) {
            return 'Understood';
        }
    };
}).


controller('RootCtrl', function($scope, $auth, $location, $window, makeURL, isEditor, createMap) {
    $scope.makeURL = makeURL;
    // Creates a new map and the goes to its URL
    $scope.createMap = function(user) {
        createMap(user)
        .then(function(map) {
            // Update URL
            var url = $scope.makeURL(map).slice(2);
            $location.path(url, true);
        });
    };

    var logout = function() {
        $scope.user = null;
        Parse.User.logOut();
        $auth.logout(); // log out of satellizer
        $window.location.href = '/';
    };
    $scope.logout = logout;

    var setUser = function(user) {
        $scope.user = user;
    };
    $scope.setUser = setUser;

    // Does the current user have editor permissions?
    $scope.isEditor = false;
    isEditor().then(function(editor) {
        $scope.isEditor = editor;
    });

    // Fix broken images
    $(document).bind("DOMSubtreeModified", function() {
        $('img').error(function() {
            $(this).attr('src', 'lib/Flat-UI/images/icons/png/Book.png');
        });
    });

    // Temporary user
    if (!Parse.User.current()) {
        var username = 'temp-'+Math.random().toString(36).substring(7);
        var password = Math.random().toString(36).substring(7);

        Parse.User.signUp(username, password, {
            name: 'Temporary User',
            temporary: true,
        })
        .then(function(user) {
            $scope.user = user;
            $auth.login({
                email: username,
                password: password,
                sessionToken: user.getSessionToken(),
            });
        });
        
    } else {
        // Current user
        $scope.user = Parse.User.current();
    }
}).

controller('LoginCtrl', function($scope) {
    if (Parse.User.current()) {
        $scope.loggedIn = true;
        $scope.user = Parse.User.current().attributes;
    } else {
        $scope.loggedIn = false;
    }

    $scope.login = function() {
        Parse.User.logIn($scope.email, $scope.password)
        .then(function(user) {
            $scope.loggedIn = true;
            $scope.user = user;
        })
        .fail(function(error) {
            $scope.loggedIn = false;
            $scope.error = error;
        });
    };
}).
controller('SignupCtrl', function($scope, $auth) {
    $scope.authenticate = function(provider) {
        $auth.authenticate(provider).then(function(res) {
            return Parse.User.become(res.data.token);
        })
        .then(function(user) {
            return user.fetch();
        })
        .then(function(user) {
            $scope.setUser(user);
        });
    };
});
