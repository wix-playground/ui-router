/**
 * @ngdoc directive
 * @name ui.router.state.diretive.ui-view
 *
 * @requires ui.router.state.$state
 * @requires $compile
 * @requires $controller
 * @requires $injector
 *
 * @restrict ECA
 *
 * @description
 * The ui-view directive tells $state where to place your templates.
 * A view can be unnamed or named.
 *
 * @param {string} ui-view A view name.
 */
$ViewDirective.$inject = ['$state', '$view', '$compile', '$controller', '$injector', '$uiViewScroll', '$document'];
function $ViewDirective(   $state,   $view,   $compile,   $controller,   $injector,   $uiViewScroll,   $document) {

  function getService() {
    return ($injector.has) ? function(service) {
      return $injector.has(service) ? $injector.get(service) : null;
    } : function(service) {
      try {
        return $injector.get(service);
      } catch (e) {
        return null;
      }
    };
  }

  var viewIsUpdating = false,
      service = getService(),
      $animator = service('$animator'),
      $animate = service('$animate');

  // Returns a set of DOM manipulation functions based on whether animation
  // should be performed
  function getRenderer(element, attrs, scope) {
    var statics = function() {
      return {
        leave: function (element) { element.remove(); },
        enter: function (element, parent, anchor) { anchor.after(element); }
      };
    };

    if ($animate) {
      return function(shouldAnimate) {
        return !shouldAnimate ? statics() : {
          enter: function(element, parent, anchor) { $animate.enter(element, null, anchor); },
          leave: function(element) { $animate.leave(element, function() { element.remove(); }); }
        };
      };
    }

    if ($animator) {
      var animate = $animator && $animator(scope, attrs);

      return function(shouldAnimate) {
        return !shouldAnimate ? statics() : {
          enter: function(element, parent, anchor) { animate.enter(element, parent); },
          leave: function(element) { animate.leave(element.contents(), element); }
        };
      };
    }

    return statics;
  }

  var directive = {
    restrict: 'ECA',
    compile: function (element, attrs) {
      var initial   = element.html(),
          isDefault = true,
          anchor    = angular.element($document[0].createComment(' ui-view-anchor ')),
          parentEl  = element.parent();

      element.prepend(anchor);

      return function ($scope) {
        var inherited = parentEl.inheritedData('$uiView');

        var currentScope, currentEl, viewConfig, unregister,
            name      = attrs[directive.name] || attrs.name || '$default',
            onloadExp = attrs.onload || '',
            autoscrollExp = attrs.autoscroll,
            renderer  = getRenderer(element, attrs, $scope);

        // Find the details of the parent view directive (if any) and use it
        // to derive our own qualified view name, then hang our own details
        // off the DOM so child directives can find it.
        var viewData = { name: inherited ? inherited.name + "." + name : name };
        element.data('$uiView', viewData);

        unregister = $view.register(viewData.name, function(config) {
          var nothingToDo = (config === viewConfig) || (config && viewConfig && (
            config.$controller === viewConfig.$controller &&
            config.$template   === viewConfig.$template &&
            config.$locals     === viewConfig.$locals
          ));
          if (nothingToDo) return;

          updateView(true, config);
        });

        $scope.$on("$destroy", function() {
          unregister();
        });

        // Check if the $view.register callback beat us to it
        if (!viewConfig) updateView(false);

        function cleanupLastView() {
          if (currentEl) {
            renderer(true).leave(currentEl);
            currentEl = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }
        }

        function updateView(shouldAnimate, config) {
          if (isDefault && config) {
            isDefault = false;
            element.replaceWith(anchor);
          }

          if (!config) {
            cleanupLastView();
            currentEl = element.clone();
            currentEl.html(initial);
            renderer(shouldAnimate).enter(currentEl, parentEl, anchor);

            currentScope = $scope.$new();
            $compile(currentEl.contents())(currentScope);
            return;
          }

          if (config === viewConfig) return; // nothing to do

          cleanupLastView();

          currentEl = element.clone();
          currentEl.html(config.$template ? config.$template : initial);
          renderer(true).enter(currentEl, parentEl, anchor);

          currentEl.data('$uiView', viewData);

          viewConfig = config;
          var link = $compile(currentEl.contents());

          currentScope = $scope.$new();

          if (config.$controller) {
            config.$scope = currentScope;
            var controller = $controller(config.$controller, config.$locals);
            currentEl.children().data('$ngControllerController', controller);
          }

          link(currentScope); // viewScope
          currentScope.$emit('$viewContentLoaded', copy(viewData, {}));
          if (onloadExp) currentScope.$eval(onloadExp);

          if (!angular.isDefined(autoscrollExp) || !autoscrollExp || $scope.$eval(autoscrollExp)) {
            $uiViewScroll(currentEl);
          }
        }
      };
    }
  };

  return directive;
}

angular.module('ui.router.state').directive('uiView', $ViewDirective);
