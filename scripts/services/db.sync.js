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
			try{
				async.waterfall([
						function(callback){
							console.log("syncMessage 1");
							dbServices.getTableLastUpdateTime('messages',function(err,result){
								var requestData = Request('messages',AKHB.user,getLastModified(result));
								var url = remoteAddress+'/webservice.php?'+ decodeURIComponent($.param(requestData));
								callback(null,url);
							});
						},
						function(url,callback){
							console.log("syncMessage 2",url);
							jQuery.ajax({
			                    url: url,
			                    type: "get",
			                    dataType: "json",
			                    success: function(msg) {
			                        callback(null,result);
			                    },
			                    error: function(XMLHttpRequest, textStatus, errorThrown) {
			                    	console.log(errorThrown);
			                        callback(true,null);
			                    },
			                    complete: function(XMLHttpRequest, textStatus) {
			                        //this; // 调用本次AJAX请求时传递的options参数
			                    }
			                });
						},
						function(result,callback){
							console.log("syncMessage 3");
							if(result.response == 1){    
								var lastModified;
								async.each(result.content,function(_message,callback){
									_message.read = 0;
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
							console.log("syncMessage 4");
							dbServices.setTableLastUpdateTime(true,'messages',lastModified,function(err,result){
								console.log('updated messages last_content_synced');
								callback(false,result,affectCount);
							})
						}
					],function(err,result){
						if(err){
							console.log(err,result);
							callback(null);
						}else{
							function syncSuccess(){
								console.log("Sync messages success.");
								dbServices.getLatestActiveMessage(function(err,messsage){
									console.log(messsage);
									if(messsage){
										AKHB.notification.alert(messsage.content,function(){
											messsage.read = 1;
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
			}catch(ex){
				callback(null);
				console.log(ex);
			}
			
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
		this.syncUsage = function(callback,tx){
			var url = remoteAddress+'/webservice.php?type=3';
			function sendUsage(type,callback){
				DB.getUsage(type,function(err,data){
					var request = [];

					if(data.length == 0) {
						callback(null);
						return;
					}

					$.each(data,function(index,_usage){
						
						request.push({
							type:_usage.type,
							id:AKHB.user.id,
							content_id:_usage.content_id,
							date_time:_usage.date_time
						});
					});
					var postdata = {
						type:type,
						usage:request
					};
					console.log('sendUsage:',url,JSON.stringify(postdata));
					$.post(url,postdata,function(res, textStatus, jqXHR){

						if(textStatus=="success"){
							$.each(data,function(index,_usage){
								persistence.remove(_usage);
							});
						}
					});
					callback(null);
				});
			}
			try{
				async.series([
					function(callback){
						sendUsage(1,callback);
						console.log("Send Use age 1");
					},
					function(callback){
						sendUsage(2,callback);
						console.log("Send Use age 2");
					}
				],function(err){
					persistence.flush(null,function() {
					  callback(err);
					});
					
				});
			}catch(e){
				console.log(e);
				callback(e);
			}
			
		};
		this.runInBackGround = function(callback){
			var self = this;
			console.log("runInBackGround");
			async.series([
				function(callback){
					console.log("syncArticle");
					self.syncArticle(function(){
						console.log("syncArticle finish");
						callback(null);
					},true);
				},
				function(callback){
					console.log("syncNavigation");
					self.syncNavigation(function(){
						console.log("syncNavigation finish");
						callback(null);
					},true);
				},
				function(callback){
					console.log("syncMessage");
					self.syncMessage(function(){
						console.log("syncMessage finish");
						callback(null);
					},true);
				},
				function(callback){
					console.log("syncUsage");
					self.syncUsage(function(){
						console.log("syncUsage finish");
						callback(null);
					},true);
				}
			],function(err){
				console.log("runInBackGround finish");
				persistence.flush(null,function() {
					if(callback && typeof callback == 'function') 
						callback(err);			 
				});
			})
		}
	}
})();


