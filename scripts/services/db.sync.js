if(typeof(AKHB) == 'undefined'){
	AKHB = {};
}
if(typeof(AKHB.services) == 'undefined'){
	AKHB.services = {};
}
if(typeof(AKHB.services.db) == 'undefined'){
	AKHB.services.db = {};
}


AKHB.services.db.DBSync =  (function(){
	
	
	var getLastModified = function(result){
		if(!result){
			return '1900-01-01 00:00:00';
		}else{
			return result.lastUpdatetime;
		}
	}

	Request = function(table,user,lastModified){
		return {
			type:2,
			table:table,
			uuid:user.id,
			os:user.os,
			device:user.deviceName,
			version:user.appVersion,
			last_content_synced:moment(lastModified).format('YYYY-MM-DD')
		}
	};

	return function(appConfig){

		var remoteAddress = appConfig.remoteAddress;
		var dbServices = new AKHB.services.db();
		//http://stage.iiuk.homeip.net/Pages/Healthboard_App/webservice.php?type=2&id=[uuid]&os=8.1&device=iphone6s&version=1.0&last_content_synced=2013-12-12

		this.syncArticle = function(callback,tx){
				async.waterfall([
						function(callback){
							dbServices.getTableLastUpdateTime('articles',function(err,result){
								var requestData = Request('articles',AKHB.user,getLastModified(result));
								var url = remoteAddress+'/webservice.php?'+ decodeURIComponent($.param(requestData));
								callback(null,url);
							});
						},
						function(url,callback){
							$.getJSON(url,function(result){
								callback(null,result);
							});
						},
						function(result,callback){
							if(result.response == 1){    
								var lastModified;
								async.each(result.content,function(article,callback){
									try{
										dbServices.setArticle(true,article,callback);
									}catch(err){
										callback(err);
									}
								},function(err){
									callback(null,result.content.length,result.last_content_synced);
								});
							}else{
								callback(null,0,result.last_content_synced);
							}
						},function(affectCount,lastModified,callback){
							dbServices.setTableLastUpdateTime(true,'articles',lastModified,function(err,result){
								console.log('updated articles last_content_synced');
								callback(false,result,affectCount);
							})
						}
					],function(err,result){
						if(err){
							console.log(err,result);
						}else{
							function syncSuccess(){
								console.log("Sync articles success.");
								if(callback && typeof callback == 'function') callback(null,result);
							}
							if(tx || persistence.flushHooks.length == 0){
								syncSuccess();
							}else{
								persistence.flush(null,function() {
								  syncSuccess();
								});
							}
							
						}
				});
			
		}

		this.syncMessage = function(callback,tx){
				async.waterfall([
						function(callback){
							dbServices.getTableLastUpdateTime('messages',function(err,result){
								var requestData = Request('messages',AKHB.user,getLastModified(result));
								var url = remoteAddress+'/webservice.php?'+ decodeURIComponent($.param(requestData));
								callback(null,url);
							});
						},
						function(url,callback){
							$.getJSON(url,function(result){
								callback(null,result);
							});
						},
						function(result,callback){
							if(result.response == 1){    
								var lastModified;
								async.each(result.content,function(_message,callback){
									try{
										dbServices.setMessage(true,_message,callback);
									}catch(err){
										callback(err);
									}
								},function(err){
									callback(null,result.content.length,result.last_content_synced);
								});
							}else{
								callback(null,0,result.last_content_synced);
							}
						},function(affectCount,lastModified,callback){
							dbServices.setTableLastUpdateTime(true,'messages',lastModified,function(err,result){
								console.log('updated messages last_content_synced');
								callback(false,result,affectCount);
							})
						}
					],function(err,result){
						if(err){
							console.log(err,result);
						}else{
							function syncSuccess(){
								console.log("Sync messages success.");
								dbServices.getLatestActiveMessage(function(err,messsage){
									console.log(messsage);
									if(messsage){
										AKHB.notification.alert(messsage.content,function(){
											messsage.type = 2;
											persistence.flush(null,function() {
												if(callback && typeof callback == 'function') callback(null,result);
											});
										},messsage.title);
									}else{
										if(callback && typeof callback == 'function') callback(null,result);
									}
									
								});
							}
							if(tx || persistence.flushHooks.length == 0){
								syncSuccess();
							}else{
								persistence.flush(null,function() {
								  syncSuccess();
								});
							}
							
						}
				});
			
		}
		this.syncNavigation = function(callback,tx){

				async.waterfall([
						function(callback){
							dbServices.getTableLastUpdateTime('navigations',function(err,result){
								var requestData = Request('navigation',AKHB.user,getLastModified(result));
								var url = remoteAddress+'/webservice.php?'+ decodeURIComponent($.param(requestData));
								callback(null,url);
							});
						},
						function(url,callback){
							$.getJSON(url,function(result){
								callback(false,result)
							});
						},
						function(result,callback){
							if(result.response == 1){    
								var lastModified;
								async.each(result.content,function(navigation,callback){
									try{
										dbServices.setNavigation(true,navigation,callback);
									}catch(err){
										console.log(err);
										callback(err);
									}
								},function(err){
									callback(null,result.content.length,result.last_content_synced);
								});
							}else{
								callback(null,0,result.last_content_synced);
							}
						},function(affectCount,lastModified,callback){
							dbServices.setTableLastUpdateTime(true,'navigations',lastModified,function(result){
								console.log('updated navigations last_content_synced');
								callback(false,result,affectCount);
							})
						}
					],function(err,result){
						if(err){
							console.log(err,result);
						}else{

							function syncSuccess(){
								console.log("Sync navigation success.");
								if(callback && typeof callback == 'function') callback(null,result);
							}
							if(tx || persistence.flushHooks.length == 0){
								syncSuccess();
							}else{
								persistence.flush(null,function() {
								  syncSuccess();
								});
							}
						}
				});
			
		}

		this.runInBackGround = function(callback){
			var self = this;
			async.series([
				function(callback){
					self.syncArticle(function(){
						callback(null);
					},true);
				},
				function(callback){
					self.syncNavigation(function(){
						callback(null);
					},true);
				},
				function(callback){
					self.syncMessage(function(){
						callback(null);
					},true);
				}
			],function(err){
				persistence.flush(null,function() {
					if(callback && typeof callback == 'function') 
						callback(err);			 
				});
			})
		}
	}
})();


