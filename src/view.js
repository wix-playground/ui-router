$View.$inject = ['$rootScope', '$templateFactory', '$q', '$rootScope'];
function $View(   $rootScope,   $templateFactory,   $q,   $rootScope) {

  this.$get = $get;

  /**
   * @ngdoc object
   * @name ui.router.state.$view
   *
   * @requires ui.router.util.$templateFactory
   * @requires $rootScope
   *
   * @description
   *
   */
  $get.$inject = ['$rootScope', '$templateFactory'];
  function $get(   $rootScope,   $templateFactory) {

    // $view.load('full.viewName', { template: ..., controller: ..., resolve: ..., async: false, params: ... })
    /**
     * @ngdoc function
     * @name ui.router.state.$view#load
     * @methodOf ui.router.state.$view
     *
     * @description
     *
     * @param {string} name name
     * @param {object} options option object.
     */
    this.load = function load (name, options) {
      var result, defaults = {
        template: undefined,
        templateUrl: undefined,
        templateProvider: undefined,
        controller: null,
        locals: null,
        notify: true,
        async: true,
        params: {}
      };
      options = extend(defaults, options);

      if (options.template || options.templateUrl || options.templateProvider) {
        result = $templateFactory.fromConfig(options, options.params, options.locals);
      }
      if (result && options.notify) {
        options.targetView = name;
        $rootScope.$broadcast('$viewContentLoading', options);
      }
      if (isString(result)) {
        var deferred = $q.defer();
        $rootScope.$evalAsync(function() { deferred.resolve(result); });
        return deferred.promise;
      }
      return result;
    };
  }
}

angular.module('ui.router.state').service('$view', $View);
