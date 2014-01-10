// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.


var dependencies = [
    "ui.bootstrap",
    "minionAdminGroupsModule",
    "minionAdminInvitesModule",
    "minionAdminPlansModule",
    "minionAdminPluginsModule",
    "minionAdminSitesModule",
    "minionAdminUsersModule"
];

var app = angular.module("MinionApp", dependencies);


// Return an array of controller sections, dependant on the
// `section` passed. Useful for easily compiling a navigation.
app.navContext = function(section) {
    return _.filter(app.navItems, function(route, url) {
        return route.section === section;
    });
};

app.controller("MinionController", function($rootScope, $route, $scope, $http, $location) {
    $rootScope.signOut = function() {
        $http.get('/api/logout').success(function() {
            $rootScope.session = null;
            localStorage.removeItem("session.email");
            localStorage.removeItem("session.role");
            navigator.id.logout();
            $location.path("/login").replace();
        });
    };

    $rootScope.openScan = function (scanId) {
        if (scanId) {
            $location.path("/scan/" + scanId); // .replace();
        }
    };

    $rootScope.openIssue = function (scanId, issueId) {
        if (scanId) {
            $location.path("/scan/" + scanId + "/issue/" + issueId);
        }
    };

    $rootScope.startScan = function (target, plan) {
        $http.put('/api/scan/start', {target: target, plan: plan }).success(function() {
            //$scope.reload();
        });
    };

    $rootScope.stopScan = function (scanId) {
        $http.put('/api/scan/stop', {scanId: scanId}).success(function() {
            //$scope.reload();
        });
    };

    // $route is useful in the scope for knowing "active" tabs, for example.
    $rootScope.$route = $route;

    // Compile all routes available to the application
    app.navItems = _.map($route.routes, function(route, url) {
        route.href = url;
        return route;
    });
});

app.config(function($routeProvider, $locationProvider, $httpProvider) {
    // Configure routes. Every route has an access field that contains either public
    // user or administrator. We use that in the $routeChangeStart event handler to
    // check if the user has access to that page.

    $locationProvider.hashPrefix('!');

    // Main route, redirects to the default page

    $routeProvider.when("/", {
        redirectTo: "/home/sites"
    });

    // Routes for session Management

    $routeProvider.when("/login", {
        templateUrl: "static/partials/login.html",
        controller: "LoginController",
        access: "public"
    });

    // Routes for error pages

    $routeProvider.when("/404", {
        templateUrl: "static/partials/404.html",
        controller: "404Controller",
        access: "public"
    });

    // Routes for reports

    $routeProvider.when("/home/sites", {
        templateUrl: "static/partials/home.html",
        controller: "SitesController",
        access: "user"
    });

    $routeProvider.when("/home/history", {
        templateUrl: "static/partials/history.html",
        controller: "HistoryController",
        access: "user"
    });

    $routeProvider.when("/home/issues", {
        templateUrl: "static/partials/issues.html",
        controller: "IssuesController",
        access: "user"
    });

    // Routes for invites

    $routeProvider.when("/invite/:inviteId", {
        templateUrl: "static/partials/invite.html",
        controller: "InviteController",
        access: "public"
    });

    // Routes for inspecting plans, issues and scans

    $routeProvider.when("/scan/:scanId", {
        templateUrl: "static/partials/scan.html",
        controller: "ScanController",
        access: "user"
    });

    $routeProvider.when("/scan/:scanId/raw", {
        templateUrl: "static/partials/raw.html",
        controller: "RawController",
        access: "user"
    });

    $routeProvider.when("/scan/:scanId/issue/:issueId", {
        templateUrl: "static/partials/issue.html",
        controller: "IssueController",
        access: "user"
    });

    $routeProvider.when("/scan/:scanId/session/:sessionIdx/failure", {
        templateUrl: "static/partials/session-failure.html",
        controller: "SessionFailureController",
        access: "user"
    });

    $routeProvider.when("/plan/:planName", {
        templateUrl: "static/partials/plan.html",
        controller: "PlanController",
        access: "user"
    });

    // Routes for the administration pages

    $routeProvider.when("/admin/sites", {
        section: "admin",
        templateUrl: "static/partials/admin/sites.html",
        controller: "AdminSitesController",
        label: "Sites",
        slug: "sites",
        access: "administrator"
    });

    $routeProvider.when("/admin/users", {
        section: "admin",
        templateUrl: "static/partials/admin/users.html",
        controller: "AdminUsersController",
        label: "Users",
        slug: "users",
        access: "administrator"
    });

    $routeProvider.when("/admin/groups", {
        section: "admin",
        templateUrl: "static/partials/admin/groups.html",
        controller: "AdminGroupsController",
        label: "Groups",
        slug: "groups",
        access: "administrator"
    });

    $routeProvider.when("/admin/groups/:groupName", {
        section: "admin:groups",
        templateUrl: "static/partials/admin/group.html",
        controller: "AdminGroupController",
        label: "Group Editor",
        slug: "group",
        access: "administrator"
    });

    $routeProvider.when("/admin/plugins", {
        section: "admin",
        templateUrl: "static/partials/admin/plugins/plugins.html",
        controller: "AdminPluginsController",
        label: "Plugins",
        slug: "plugins",
        access: "administrator"
    });

    $routeProvider.when("/admin/plans", {
        section: "admin",
        templateUrl: "static/partials/admin/plans/plans.html",
        controller: "AdminPlansController",
        label: "Plans",
        slug: "plans",
        access: "administrator"
    });

    $routeProvider.when("/admin/invites", {
        section: "admin",
        templateUrl: "static/partials/admin/invites.html",
        controller: "AdminInvitesController",
        label: "Invites",
        slug: "invites",
        access: "administrator"
    });

    // Unknown routes go to / which will redirect to either the default page or
    // to the login page.

    $routeProvider.otherwise({
        redirectTo: "/"
    });

    // This http interceptor looks at the responses of API requests and redirects
    // the user to login if any of them fail with a false success and
    // 'not-logged-in' as the reason.

    var interceptor = ['$rootScope','$q', '$location', function(scope, $q, $location) {
        function success(response) {
            if (_.isObject(response.data)) {
                if (response.data.success === false) {
                    if (response.data.reason === "not-logged-in") {
                        $location.path("/login");
                        return $q.reject(response);
                    }
                }
            }
            return response;
        }

        function error(response) {
            return response;
        }

        return function(promise) {
            return promise.then(success, error);
        };
    }];

    $httpProvider.responseInterceptors.push(interceptor);
});

app.run(function($rootScope, $location) {
    // If we have (or had) an active session then retrieve that. If the session has expired
    // then the first API call that returns a 401 will trigger a logout via the above
    // interceptor.

    if (localStorage.getItem('session.email') && localStorage.getItem('session.role')) {
        $rootScope.session = {
            email: localStorage.getItem('session.email'),
            role: localStorage.getItem('session.role')
        };
    }

    // Before each route change, check if the destination is public. If it is not then
    // check if we are logged in. If we are not then remember the destination url and
    // redirect to the login page.

    $rootScope.$on('$routeChangeStart', function(event, next, current) {
        if (next.access !== "public") {
            if (!$rootScope.session) {
                sessionStorage.setItem('nextPath', $location.path());
                $location.path("/login");
            }
        }
    });
});

// app.controller("LoginController", function($scope, $rootScope, $location, $http) {
//     $scope.signIn = function() {
//         navigator.id.request();
//     };
// 
//     $scope.$on('$viewContentLoaded', function() {
//         // When the login screen is loaded, we logout from Persona and kill our session
//         // from both the root scope and from localStorage.
// 
//         navigator.id.logout();
//         $rootScope.session = null;
//         localStorage.setItem('session.email', null);
//         localStorage.setItem('session.role', null);
// 
//         navigator.id.watch({
//             onlogin: function(assertion) {
//                 var data = {assertion: assertion};
//                 $http.post('/api/login', data).success(function(response) {
//                     if (response.success) {
//                         // Remember the session in the scope
//                         $rootScope.session = response.data;
//                         // Remember the session in local storage
//                         localStorage.setItem('session.email', response.data.email);
//                         localStorage.setItem('session.role', response.data.role);
//                         localStorage.setItem('invitation.id', null);
//                         // Go to either the nextPath or to the main page
//                         var nextPath = sessionStorage.getItem('nextPath');
//                         if (nextPath) {
//                             $location.path(nextPath).replace();
//                             sessionStorage.setItem(nextPath, null);
//                         } else {
//                             $location.path("/").replace();
//                         }
//                     }
//                 });
//             },
//             onlogout: function() {
//                 // Not used
//             }
//         });
//     });
// });


app.controller("LoginController", function($scope, $rootScope, $location, $http) {
    $scope.signIn = function() {
        //navigator.id.request();
        data = { "user": document.getElementById('user').value, "password": document.getElementById('password').value }
        // code below would need to be a function call, shared between LDAP and Persona auth
        $http.post('/api/login', data).success(function(response) { 
             if (response.success) {
                 // Remember the session in the scope
                 $rootScope.session = response.data;
                 // Remember the session in local storage
                 localStorage.setItem('session.email', response.data.email);
                 localStorage.setItem('session.role', response.data.role);
                 localStorage.setItem('invitation.id', null);
                 // Go to either the nextPath or to the main page
                 var nextPath = sessionStorage.getItem('nextPath');
                 if (nextPath) {
                      $location.path(nextPath).replace();
                      sessionStorage.setItem(nextPath, null);
                 } else {
                      $location.path("/").replace();
                 }
             }
        });
    };

    $scope.$on('$viewContentLoaded', function() {
        // When the login screen is loaded, we logout from Persona and kill our session
        // from both the root scope and from localStorage.

        navigator.id.logout();
        $rootScope.session = null;
        localStorage.setItem('session.email', null);
        localStorage.setItem('session.role', null);

   });
});

app.controller("404Controller", function($scope, $rootScope, $location) {
   // do nothing
});

app.controller('SitesController', function($scope, $timeout, $http, $location) {
    var reloadPromise = null;

    $scope.group = null;
    $scope.groups = [];

    $scope.getContent = function() {
        var api_url = "/api/sites";
        if ($scope.group) {
            api_url = api_url + "?group_name=" + $scope.group;
        }
        $http.get(api_url).success(function(response, status, headers, config){
            _.each(response.data, function (r, idx) {
                r.label = r.target;
                if (idx > 0) {
                    if (r.target === response.data[idx-1].target) {
                        r.label = "";
                    }
                }
            });
            $scope.report = response.data;
        });
        // Schedule the next reload
        reloadPromise = $timeout($scope.reloadSites, 2000);
    };

    $scope.reloadSites = function() {
        $timeout.cancel(reloadPromise);
        if ($location.path() == "/home/sites" || $location.path() == "/") {
            $scope.getContent();
        }
    };

    $scope.changeGroup = function() {
        localStorage.setItem("HomeController.group", $scope.group);
        $scope.reloadSites();
    };

    $scope.$on('$viewContentLoaded', function() {
        $http.get("/api/profile").success(function(response) {
            if (response.success) {
                $scope.groups = response.data.groups;
                var selectedGroup = localStorage.getItem("HomeController.group");
                if (selectedGroup && $scope.groups.indexOf(selectedGroup) != -1) {
                    $scope.group = selectedGroup;
                } else {
                    $scope.group = $scope.groups[0];
                }
                // Call this once to trigger polling
                $scope.reloadSites();
            }
        });
    });
});


app.controller("IssuesController", function($scope, $http, $location, $timeout) {
    $scope.filterName = 'all';
    $scope.reload = function () {
        $http.get('/api/issues').success(function(response, status, headers, config){
        $scope.report = response.data;
        });
    };
    $scope.$on('$viewContentLoaded', function() {
        $scope.reload();
    });
});

app.controller("InviteController", function ($scope, $rootScope, $routeParams, $http, $location) {
    // To decline an invitation, we simply post it back to the backend to mark it as
    // declined and then go the Minion home page.

    $scope.declineInvite = function(invite) {
        var data = {action: 'decline'};
        $http.put('/api/invites/' + invite['id'], data).success(function() {
            $location.path("/");
        });
    };

    // To accept an invitation, we remember the invitation id in session storage and then
    // start the Persona login flow. At the end of the login flow we pass the invitation
    // id to /api/login which will do the right thing.

    $scope.acceptInvite = function(invite) {
        sessionStorage.setItem("invitation.id", invite['id']);
        navigator.id.request();
    };

    $scope.$on('$viewContentLoaded', function() {
        // To avoid confusion, we always log the currently logged in user out.
        $rootScope.session = null;
        localStorage.removeItem("session.email");
        localStorage.removeItem("session.role");
        sessionStorage.removeItem("nextPath");
        navigator.id.logout();

        $http.get('/api/invites/' + $routeParams.inviteId).success(function(response) {
            if (!response.success) {
                $scope.invite_state_msg = "Your invitation link is invalid.";
                $scope.invite_state = "invalid";
                return;
            }

            $scope.invite = response.data;
            var sent_on = response.data['sent_on'];
            var accepted_on = response.data['accepted_on'];
            var expire_on = response.data['expire_on'];
            var invite_status = response.data['status'];

            if (invite_status === 'declined' || invite_status === 'expired' || invite_status === 'used') {
                $location.path("/login");
                return;
            }

            var timenow = Math.round(new Date().getTime()/1000);
            if ((expire_on - timenow) < 0) {
                $scope.invite_state_msg = "Your invitation is expired.";
                $scope.invite_state = "expired";
                return;
            }

            $scope.invite_state_msg = "Your invitation will expire on "
                + moment.unix(expire_on).format("YYYY-MM-DD HH:mm");
            $scope.invite_state = "available";

            // Setup Persona and its callbacks. There is a lot of code duplication code from the
            // LoginController. We should see if we can extract this and put it into an Angular.JS
            // service. There is also probably a proper way to wrap a library like Persona.

            navigator.id.watch({
                onlogin: function(assertion) {
                    var data = {assertion: assertion, invite_id: sessionStorage.getItem("invitation.id")};
                    sessionStorage.removeItem("invitation.id");
                    $http.post('/api/login', data).success(function(response) {
                        if (response.success) {
                            // Remember the session in the scope
                            $rootScope.session = response.data;
                            // Remember the session in local storage
                            localStorage.setItem('session.email', response.data.email);
                            localStorage.setItem('session.role', response.data.role);
                            localStorage.setItem('invitation.id', null);
                            // Go to the main page
                            $location.path("/").replace();
                        }
                    });
                },
                onlogout: function() {
                    // Not used. Why would you want this?
                }
            });
        });
    });
});

app.controller("HistoryController", function($scope, $http, $location, $timeout) {
    $scope.openScan = function (scanId) {
        $location.path("/scan/" + scanId); // .replace();
    };

    $scope.reload = function () {
        $http.get('/api/history').success(function(response, status, headers, config){
            $scope.history = response.data;
        });
    };

    $scope.$on('$viewContentLoaded', function() {
        $scope.reload();
    });
});

app.controller("RawController", function ($scope, $routeParams, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {
        $http.get('/api/scan/' + $routeParams.scanId).success(function(response) {
            if (response.success) {
                $scope.scan = response.data;
                $scope.formatted_scan = JSON.stringify(response.data, null, 4);
            } else {
                $location.path('/404');
            }
        });
    });
});

app.controller("ScanController", function($scope, $routeParams, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {
        $http.get('/api/scan/' + $routeParams.scanId).success(function(response) {
            if (response.success) {
                var scan = response.data;
                var issues = [];
                $scope.timenow = Math.round(+new Date()/1000);
                var issueCounts = {high: 0, medium: 0, low: 0, info: 0, error: 0};
                _.each(scan.sessions, function (session) {
                    _.each(session.issues, function (issue) {
                        issue.session = session;
                        issues.push(issue);
                        switch (issue.Severity) {
                            case "High":
                                issueCounts.high++;
                                break;
                            case "Medium":
                                issueCounts.medium++;
                                break;
                            case "Low":
                                issueCounts.low++;
                                break;
                            case "Informational":
                            case "Info":
                                issueCounts.info++;
                                break;
                            case "Error":
                                issueCounts.error++;
                                break;
                        }
                    });
                });
            } else {
                $location.path('/404');
            }
            var failures = [];
            _.each(scan.sessions, function (session, idx) {
                if (session.failure) {
                    failures.push({session_idx: idx,
                                   plugin: session.plugin,
                                   failure: session.failure});
                }
            });
            $scope.scan = scan;
            $scope.issues = issues;
            $scope.issueCounts = issueCounts;
            $scope.failures = failures;
        });
    });
});

app.controller("PlanController", function($scope, $routeParams, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {
        $http.get('/api/plan/' + $routeParams.planName).success(function(response) {
            $scope.plan = response.data;
        });
    });
});

app.controller("IssueController", function($scope, $routeParams, $http) {
    $scope.$on('$viewContentLoaded', function() {
        $http.get('/api/scan/' + $routeParams.scanId + '/issue/' + $routeParams.issueId).success(function(response, status, headers, config) {
            $scope.issue = response.data.issue;
            $scope.session = response.data.session;
            $scope.scan = response.data.scan;
        });
    });
});

app.controller("SessionFailureController", function($scope, $routeParams, $http) {
    $scope.$on('$viewContentLoaded', function() {
        $http.get('/api/scan/' + $routeParams.scanId).success(function(response, status, headers, config) {
            var scan = response.data;
        $scope.session = scan.sessions[$routeParams.sessionIdx];
        });
    });
});

// Filters

app.filter('classify_issue', function() {
    return function(input, options) {
        if (!input) {
            return undefined;
        }
        var output1 = '';
        var output2 = '';
        var template = '<a href="$url">$name $id</a>';
        var cwe_id = input['cwe_id'];
        var wasc_id = input['wasc_id'];
        if (cwe_id && cwe_id.length > 0) {
            output1 = '<a href="' + input['cwe_url']
                + '">' + 'CWE ' + cwe_id + '</a>';
        }

        if (wasc_id && wasc_id.length > 0) {
            output2 = '<a href="' + input['wasc_url']
                + '">' + 'WASC ' + wasc_id + '</a>';
        }

        return output1 + ' ' + output2;
    };
});
app.filter('moment', function () {
    return function(input, options) {
        return moment(input).format(options.format || "YYYY-MM-DD");
    };
});

app.filter('scan_datetime', function () {
    return function(input, options) {
        return (input > 0) ? moment.unix(input).format("YYYY-MM-DD HH:mm") : undefined;
    };
});

app.filter('scan_datetime_fromnow', function () {
    return function(input, options) {
        return (input > 0) ? moment.unix(input).fromNow() : undefined;
    };
});

app.filter('moment_duration', function () {
    return function(input, timenow) {
        var start, end;
        if (input >= 0) {
            start = moment(0);
            end = moment(input);
            return end.from(start, true);
        } else {
            start = moment(Math.abs(input));
            end = moment(timenow);
            return end.from(start, true);
        };
    };
});

app.filter('session_duration', function () {
    return function(session, options) {
        var start, end;
        if (session.started && session.finished) {
            start = moment(session.started);
            end = moment(session.finished);
            return end.from(start, true);
        } else {
            return undefined;
        };
    };
});

app.filter('link_bugs', function () {
    return function(input, options) {
        if (!input) {
            return "";
        }
        return input.replace(/\#(\d{6,7})/,function (match, bugId) {
            var a = "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugId;
            return '<a href="' + a + '" target="_blank">#' + bugId + '</a>';
        });
    };
});

app.filter('text', function () {
    return function(input, options) {
        var result = "";
        if (input) {
            var paragraphs = input.split("\n");
            for (var i = 0; i < paragraphs.length; i++) {
                result += "<p>" + paragraphs[i] + "</p>";
            }
        }
        return result;
    };
});

app.filter('boolean', function () {
    return function(input, when_true, when_false, when_null) {
        if (input && input == true) {
            return when_true;
        } else if (input == false) {
            return when_false;
        } else {
            return when_null;
        }
    };
});
