angular.module('coursestitch-components', []).

directive('switch', function() {
    return {
        restrict: 'AE',
        template: '<div ng-click="model = disabled && model || !disabled && !model;" ng-class="{\'deactivate\': disabled, \'switch-square\': square}" class="switch has-switch"><div ng-class="{\'switch-off\': !model, \'switch-on\': model}" class="switch-animate"><span class="switch-left">{{onLabel}}<i class="{{onIcon}}"></i></span><label>&nbsp</label><span class="switch-right">{{offLabel}}<i class="{{offIcon}}"></i></span></div></div>',
        replace: true,
        scope: {
            model: '=',
            disabled: '@',
            square: '@',
            onLabel: '@',
            offLabel: '@',
            onIcon: '@',
            offIcon: '@',
        },
        compile: function(element, attrs) {
            if (attrs.onLabel === void 0 && attrs.onIcon === void 0) {
                attrs.onLabel = 'ON';
            }
            if (attrs.offLabel === void 0 && attrs.offIcon === void 0) {
                attrs.offLabel = 'OFF';
            }
            if (attrs.disabled === void 0) {
                attrs.disabled = false;
            } else {
                attrs.disabled = true;
            }
            if (attrs.square === void 0) {
                attrs.square = false;
            } else {
                attrs.square = true;
            }
        }
    };
}).

directive('actionButton', function($timeout) {
    return {
        restrict: 'E',
        templateUrl: '/templates/action-button.html',
        scope: {
            action: '&',
            label: '@',
            idleStyle: '@',
            pendingStyle: '@',
            successStyle: '@',
            errorStyle: '@',
            idleIcon: '@',
            pendingIcon: '@',
            successIcon: '@',
            errorIcon: '@',
        },
        replace: true,
        link: function(scope, element, attrs) {
            // Default status
            scope.status = 'idle';

            // Action consequences
            scope.doAction = function() {
                scope.status = 'pending';

                scope.action()
                .then(function() {
                    scope.status = 'success';
                })
                .fail(function(error) {
                    scope.status = 'error';
                    
                    // Show a helpful error message
                    element.popover({
                        content: error.message,
                        placement: 'top',
                        animate: true,
                    })
                    .popover('show');
                })
                .always(function() {
                    $timeout(function() {
                        scope.status = 'idle';
                        element.popover('hide');
                    }, 6000);
                });
            };

            // Status styles and icons
            scope.$watch('status', function(status) {
                var style = status+'Style';
                var icon = status+'Icon';

                // By default show the idle style or icon
                if (scope[style] === undefined)
                    scope.style = scope.idleStyle;
                else
                    scope.style = scope[style];

                if (scope[icon] === undefined)
                    scope.icon = scope.idleIcon;
                else
                    scope.icon = scope[icon];

            });
        },
    };
}).

directive('understandingSlider', function($timeout) {
    return {
        restrict: 'E',
        templateUrl: '/templates/understanding-slider.html',
        scope: {
            ngModel: '=?',
        },
        link: function(scope, element, attrs) {
            // Number of milliseconds an animation takes
            var animateTime = 1000;

            var slider = $(element).children(".ui-slider");
            slider.slider({
                min: -1,
                max: 1,
                step: 0.01,
                value: 0,
                orientation: 'horizontal',
                animate: animateTime,
                range: false,
            });

            slider.on('slidestop', function(event, ui) {
                // Set model value when animation stops
                $timeout(function() {
                    scope.ngModel = ui.value;
                    scope.$apply();
                }, animateTime);
            });

            scope.$watch('ngModel', function() {
                // Update the slider if the model changes
                slider.slider('value', scope.ngModel);
            });
        },
    };
});
