
//ons.disableAutoStatusBarFill();  // (Monaca enables StatusBar plugin by  
var MSG_RETUIREDNETWORK = {title:'Internet Connection',content:'Sorry, a network connection is required, please try later.'};
var MSG_LOGINFAILED = {title:'Incorrect Password',content:'Please check password and try again.'};
var MSG_SYSTEMERROR = {title:'System Error',content:'There has been an error,Please contact a member of the Aga Khan Health Board. \r\n Error Code:{0}'};

var module = ons.bootstrap('AKHB', ['onsen']);
AKHB.user = { id:null, authcode:null,appVersion:'1.0'};

var DB = new AKHB.services.db();
AKHB.openContentPage =  function(navigation,$templateCache){
    if(navigation.type == 1){

    }else if(!isNaN(navigation.content)){
        DB.getArticleById(navigation.content,function(err,article){
            // if(article.type == 2){
            //     window.open(article.content);
            // }else if(article.type == 1){
                //$scope.myNavigator.pushPage('pages/content.html',{article:article});
                $templateCache.put('article', article);
                //app.slidingMenu.setMainPage('pages/content.html',{closeMenu: true});
                myNavigator.pushPage('pages/content.html',{article:article});
            // }
        });
    }
}


module.controller('AppController',['$scope','$rootScope',function($scope,$rootScope){
    //var scope = $scope;
    $rootScope.$on("BUSY", function(){ 
        $scope.busy = true;
        $scope.waitNetwork = false;
        console.log('emit BUSY',$scope.busy,$scope.$id);
    });
    $rootScope.$on("NOTBUSY", function(){    
        $scope.busy = false;
        $scope.waitNetwork = false;
        console.log('emit NOTBUSY',$scope.busy,$scope.$id);
    });
    $rootScope.$on("WAITINGNETWORK", function(){    
        $scope.busy = true;
        $scope.waitNetwork = true;
        console.log('emit WAITINGNETWORK',$scope.busy,$scope.$id);
    });


}]);

module.controller('SlidingMenuController',['$scope',function($scope){
    $scope.$on("isready", function(event,data){ 
        console.log('SlidingMenuController broadcast isready');
        $scope.isready = data;
    });
}]);
module.controller('LandingPageController',['$scope','$sce',function($scope,$sce){
    var scope = $scope;
    DB.getHomeArticle(function(err,result){
        console.log(result);
        DB.getMessageCount(function(err,count){
            
            scope.$apply( function() {
                $scope.hasMessage = count > 0;
                $scope.article = $sce.trustAsHtml(result.content);
            });
        });
        
            
       
    });

}]);

module.controller('MessageListController',['$scope','$templateCache',function($scope,$templateCache){
    var scope = $scope;
    scope.openMessageDetail = function(msg){
        console.log(msg);
        msg.type = 2;
        // if(msg.type == 1){
        //     DB.setMessageUsed(msg.server_id,function(err,result){
        //         msg.type = 2;
        //         console.log(err,result);
        //     });
        // }
        // AKHB.notification.alert(msg.content,null,msg.title);
        $templateCache.put('message', msg);
        myNavigator.pushPage('pages/messagedetail.html');
    };
//{{moment(msg.last_modified).format('yyyy-MM-dd')}}
    DB.getMessages(function(err,messages){
        scope.$apply( function() {
            scope.messages = messages;
            console.log(JSON.stringify(messages));
        });
    })
}]);



module.controller('LoginController',['$scope','$http','$templateCache','$rootScope',
    function($scope, $http, $templateCache,$rootScope) {
        console.log('LoginController',$scope.$id,$rootScope.$id);

        var Auth = new AKHB.services.authentication(AKHB.config);
        var DBSync = new AKHB.services.db.DBSync(AKHB.config);
        var scope = $scope;
        var rootScope = $rootScope;

        scope.isready = false; 

        ons.ready(function(){
            if(typeof device == 'undefined'){
                AKHB.user.deviceid = '00000000000000031';
                AKHB.user.os = 'test';
                AKHB.user.deviceName = 'browser test';
            }else{
                AKHB.user.deviceid = device.uuid;
                AKHB.user.os = device.version;
                AKHB.user.deviceName = device.model;
                if(typeof getAppVersion == 'function'){
                    getAppVersion(function(version) {
                        AKHB.user.appVersion = version;
                        console.log('Native App Version: ' + version);
                    });
                }
            };
            scope.isready = true; 
            setTimeout(function(){
                initLogin();
            },100);           
        });
        
        function initLogin(){
            var onlineLogin = function(){
                Auth.isWebserviceWorking($http,function(err,result){
                    if(err){
                        AKHB.notification.alert(result.content,function(){
                            rootScope.$emit("NOTBUSY");
                            AKHB.utils.exitApp();
                        },result.title);
                    }else{  
                        scope.login = function(){
                            var password = scope.password;
                            var authData = Auth.AuthenticationRequest(AKHB.user.deviceid,password);
                            rootScope.$emit("BUSY");
                            Auth.checkRemoteAuthentication($http,authData,function(err,result){
                                
                                if(err) {
                                    AKHB.notification.alert(result.content,null,result.title);
                                    rootScope.$emit("NOTBUSY");
                                }
                                else{
                                    
                                    DBSync.runInBackGround(function(err){
                                        rootScope.$emit("NOTBUSY");
                                        app.slidingMenu.setSwipeable(true);
                                        app.slidingMenu.setMainPage('pages/landingpage.html');
                                        syncBackGround();
                                    });
                                }
                                
                            });
                        }
                        rootScope.$emit("NOTBUSY");
                    }
                });
            }
             try{
                rootScope.$emit("BUSY"); 
                // check network and server.
                var syncTimes = 0;
                var syncBackGround = function(){
                    syncTimes ++;
                    if(Auth.checkNetworkConnected()){
                        DBSync.runInBackGround(function(){
                            setTimeout(function(){
                                console.log('sync times:'+syncTimes);
                                syncBackGround();
                            },30000);
                        });
                    }else{
                        setTimeout(function(){
                            console.log('sync times:'+syncTimes);
                            syncBackGround();
                        },60000);
                    }
                }
                if(Auth.isCachedAuthentication()){
                    $rootScope.$emit("NOTBUSY");
                    app.slidingMenu.setSwipeable(true); 
                    app.slidingMenu.setMainPage('pages/landingpage.html');
                    var user = JSON.parse(Auth.getCachedAuthentication());
                    AKHB.user = user;
                    DBSync.runInBackGround(function(err){
                        //$rootScope.$emit("BUSY");
                        syncBackGround();
                    });
                }else{
                    Auth.checkNetworkConnected();
                    onlineLogin();
                }
            }catch(ex){
                console.log(ex);
                rootScope.$emit("WAITINGNETWORK");
                if(ex.message == 'nonetwork')
                    AKHB.notification.alert(MSG_RETUIREDNETWORK.content,function(){
                        //AKHB.utils.exitApp();
                    },MSG_RETUIREDNETWORK.title);
                document.addEventListener("online", function(){
                    rootScope.$emit("NOTBUSY");
                    onlineLogin();
                }, false);
            }
        }
    
}]);


module.controller('MenuController',['$scope','$http','$templateCache',
    function($scope, $http, $templateCache) {
        console.log('MenuController',$scope.$id);
        $scope.openPage = function(nav){
            if(nav.type==2){
                AKHB.openContentPage(nav,$templateCache);
            }else{
                $templateCache.put('navigation',nav);
                myNavigator.pushPage('pages/childmenu.html');
            }
            
        }
        $scope.navigations = [];
        var loadMenu = function(scope){
            DB.getNavigationsByParentId(0,function(err,navigations){
                scope.$apply( function() {
                    scope.navigations = navigations;
                });
            });
        }

        app.slidingMenu.on('preopen',function(){
            loadMenu($scope);
        });

       //  $scope.toggle = function(obj){
       //      console.log(obj);
       //      $templateCache.put('navigation',obj);
       //      myNavigator.pushPage('pages/childmenu.html');
       // }
       
}]);



module.controller('ChildMenuController',['$scope','$http','$templateCache','$sce',
    function($scope, $http, $templateCache,$sce) {
        console.log('ChildMenuController',$scope.$id);
        $scope.navigation = $templateCache.get('navigation');
        $scope.openPage = function(nav){
            if(nav.type==2){
                console.log('open content');
                AKHB.openContentPage(nav,$templateCache);
            }else{
                console.log('open menu');
                $templateCache.put('navigation',nav);
                myNavigator.pushPage('pages/childmenu.html');
            }
        }

        //$scope.contentHTML = $sce.trustAsHtml(article.content);
        DB.getNavigationsByParentId($scope.navigation.server_id, function(err,results){
            async.each(results,function(nav,callback){
                if(nav.type==1){
                    DB.getNavigationsByParentId(nav.server_id,function(err,navigations){
                       nav.children =  navigations;
                       callback(null);
                    });
                }else{
                    callback(null);
                }
            },function(err,result){
                $scope.$apply( function() {
                    $scope.childNavigations = results;
                });
            });
            
        });
}]);


module.controller('ContentController',['$scope','$http','$templateCache','$sce','$rootScope',
    function($scope, $http, $templateCache,$sce,$rootScope) {
        var Auth = new AKHB.services.authentication(AKHB.config);

        console.log('ContentController',$scope.$id);
        var article = $templateCache.get('article');
        window.rootScope = $rootScope;
        $scope.article = article;
        if(article.type==2){
            if(!Auth.isNetworkConnected()){
                $scope.contentHTML = $sce.trustAsHtml("<p class=empty-content>"+MSG_RETUIREDNETWORK.content+"</p>");
            }else{
                if(article.content.toLowerCase().indexOf('http') == -1) 
                    article.content = 'http://'+article.content;
                
                if(article.content.indexOf('?') > -1)
                    article.content += '&';
                else
                    article.content += '?';

                article.content +='uuid='+AKHB.user.id;
                $scope.contentHTML = $sce.trustAsHtml('<iframe name="contentFrame" id="content-iframe" src="'+article.content +'" ng-if="article.type==2"></iframe>');
                $rootScope.$emit("BUSY");
                //$scope.contentHTML = $sce.trustAsHtml('<iframe name="contentFrame" id="content-iframe" src="http://127.0.0.1/akhb/" ng-if="article.type==2"></iframe>');
                setTimeout(function(){
                    $('div.loading').addClass('ng-hide');
                },3000);
 //window.rootScope.$emit("NOTBUSY");
                
                //$scope.contentHTML = $sce.trustAsHtml('<iframe id="content-iframe" src="http://127.0.0.1" ng-if="article.type==2"></iframe>');
                // $rootScope.$emit("BUSY");
                // console.log($('#content-iframe'));
                // setTimeout(function(){
                //     var iframe =  $('#content-iframe')[0];
                //     debugger;
                //     console.log(iframe.readyState);
                //    iframe.addEventListener("readystatechange",function(){
                //     debugger;
                //         console.log(iframe.readyState);
                //         $rootScope.$emit("NOTBUSY");
                //     });
                // },500);
                
            }
        }else{

            $scope.contentHTML = $sce.trustAsHtml(article.content);
        }
        DB.getMessageCount(function(err,count){
             $scope.$apply( function() {
                $scope.hasMessage = count > 0;
            });
        });
        
}]);
module.controller('MessageDetailController',['$scope','$http','$templateCache','$sce',
    function($scope, $http, $templateCache,$sce) {

        var message = $templateCache.get('message');
        $scope.message = message;
        if(message.type == 1){
            DB.setMessageUsed(message.server_id,function(err,result){
                console.log(err,result);
            });
        }
}]);
$(document).on('click','a',function(e){

        var $this = $(this);
        var $href = $this.attr('href');
        if($href != ''){
            e.preventDefault();
            if($href.toLowerCase().indexOf('http') == 0){
                window.open( $href, '_blank', 'location=yes');

            }else if($href.toLowerCase().indexOf('mailto') == 0){
                window.plugin.email.open({
                    to:[$href.substring(7)]
                });
            }
        } 
})


//define filter
module.filter('trustHtml', function ($sce) {

    return function (input) {

        return $sce.trustAsHtml(input);

    }

});
module.filter('formatTime', function ($sce) {

    return function (input) {
        if(input)
            return $sce.trustAsHtml(moment(input).format('YYYY/MM/DD h:mm A'));
        return "";
    }

});
/*

function ClickOpen() {
    var dom = $('#childMenu');
    if (dom.hasClass('visibleMenu')) {
        dom.addClass('hiddenMenu');
        dom.removeClass('visibleMenu');
    }
    else if (dom.hasClass('hiddenMenu')) {
        dom.removeClass('hiddenMenu');
        dom.addClass('visibleMenu');            
    }
} 

angular.module('AKHB',[])
.controller('LoginController',['$scope','$http','$templateCache',
    function($scope, $http, $templateCache) {
        var Auth = new AKHB.services.authentication(AKHB.config);

        try{
            // check network and server.
            Auth.checkNetworkConnected();
            Auth.isWebserviceWorking($http,function(err,result){
                if(err){
                    AKHB.notification.alert(result,function(){
                        AKHB.utils.exitApp();
                    });
                }else{
                    doLogin();
                }
            });
        }catch(ex){
            console.log(ex);
            AKHB.notification.alert(ex.message,function(){
                AKHB.utils.exitApp();
            });
        }
        function doLogin(){
            if(Auth.isCachedAuthentication()){
                myNavigator.pushPage('main.html');
            }else{
                $(document).on('click','#btn_login',function(){
                    var pwd = $('#loginpwd').val();
                    var authData = Auth.AuthenticationRequest(AKHB.user.deviceid,pwd);

                    Auth.checkRemoteAuthentication($http,authData,function(err,result){
                        if(err) 
                            AKHB.notification.alert(result);
                        else
                            myNavigator.pushPage('main.html');
                    });
                });
            };
        };
}]);

ons.ready(function() {
      // Init code here
      // init longin button
    AKHB.user = {
        deviceid:null,
        id:null,
        authcode:null,
        os:null,
        deviceName:null
    };
    if(AKHB.config.debug){
        AKHB.user.deviceid = '00000000000000006';
        AKHB.user.os = 'test';
        AKHB.user.deviceName = 'browser test';
    }else{
        AKHB.user.deviceid = device.uuid;
        AKHB.user.os = device.version;
        AKHB.user.deviceName = device.model;
    }
    ;

   

    
})


*/