// constants
var KEY_ACTIVITIES 		 = "activities";
var KEY_LAST_UPDATE_DATE = "lastUpdateDate";
var KEY_CONFIGURATION 	 = "config";
// ---
// helper variables
var config = {};
var isLogged 		=false;
var isConfigured	=false;
var isUpdating		=false;
var connectionError	=false;
var updateInterval;
// ----

jQuery.fn.reverse = [].reverse;

function initialize(){
	loadConfiguration(function(){
		schedulePeriodicUpdate();
	});
}

function updateActivities(){
	isUpdating=true;
	// check configuration
	if (!isConfigured){
		isUpdating=false;
		return;
	}
	// retrieve previous stored activities and last update date
	chrome.storage.local.get( [KEY_LAST_UPDATE_DATE, KEY_ACTIVITIES], function(items){
		// check retrieved data
		var activities = items[KEY_ACTIVITIES];
		var lastUpdateTimestamp = items[KEY_LAST_UPDATE_DATE];
		if (activities==null || typeof activities=="undefined"){
			activities = [];
		}
		if (lastUpdateTimestamp==null){
			lastUpdateTimestamp=0;
		}
		lastUpdateDate = moment.unix(lastUpdateTimestamp);
		// get activities feed
		jQuery.get(
			getActivitiesPageUrl() + ".atom",
			function(feed){
				connectionError=false;
				// check if login is required
				if (typeof feed=="string" && feed.indexOf("<!DOCTYPE html ")>-1){
					isUpdating=false;
					return;
				}
				isLogged=true;
				// check feed date
				var feedDate = new moment( $(feed).find("feed > updated").text());
				if (!lastUpdateDate.isSame(feedDate)){
					// get only new entries
					$(feed).find("entry").reverse().each(function () { 
				        var activity = new ActivityEntry($(this));
				        if(activity.moment.isAfter(lastUpdateDate)){
				        	activities.unshift(activity);
				        	if (config.notificationsEnabled=="true"){
				        		notify(activity);
				        	}
				        }
				    });
				    // save updated activities array and last update date
					toSave = {};
					toSave[KEY_LAST_UPDATE_DATE]=feedDate.unix();
					toSave[KEY_ACTIVITIES]=activities.slice(0, config.maxNumberOfActivities);
					chrome.storage.local.set(toSave);
				}else{
					// no new entry from last check
					//console.log("no new entry");
				}
			isUpdating=false;	
			}
		).fail(function(){
			connectionError=true;
			isUpdating=false;
			// stop update to avoid throttling (http://dev.chromium.org/throttling)
			stopPeriodicUpdate();
		});
	});
}

function schedulePeriodicUpdate(){
	if (isConfigured){
		stopPeriodicUpdate();
		updateActivities();
		updateInterval = window.setInterval(updateActivities, config.updateTimeout*1000);
	}
}
function stopPeriodicUpdate(){
	if(typeof updateInterval != "undefined"){
		window.clearInterval(updateInterval);
	}
}

function getActivitiesPageUrl(){
	if (isConfigured){
		return config.redmineUrl + "projects/"+config.project+"/activity";
	}
	return "";
}

function clearActivitiesData(){
	chrome.storage.local.remove([KEY_ACTIVITIES,KEY_LAST_UPDATE_DATE]);
}

function loadConfiguration(callback){
	//console.log("loading configuration");
	chrome.storage.local.get( [KEY_CONFIGURATION], function(items){
		config = items[KEY_CONFIGURATION];
		if (typeof config=="object"){
			isConfigured = config.redmineUrl && config.project;
		}else{
			isConfigured = false;
			config = {};
		}
		// set default values
		config.updateTimeout = config.updateTimeout || 10;
		config.maxNumberOfActivities = config.maxNumberOfActivities || 30;

		if (typeof callback == "function"){
			callback();
		}
	});
}

function updateConfiguration(key, value){
	console.log("updating configuration: "+key+"="+value);
	chrome.storage.local.get( [KEY_CONFIGURATION], function(items){
		config = items[KEY_CONFIGURATION];
		if (typeof config != "object"){
			config = {};
		}
		config[key]=value;
		toSave = {};
		toSave[KEY_CONFIGURATION]=config;
		chrome.storage.local.set(toSave, function(){
			clearActivitiesData();
			initialize();
		});
	});
}

function notify(activity){
	var timeout = 10000;
	if (chrome.notifications){
		var options = {
 			type: "basic",
  			title: activity.title,
  			message: activity.content.text,
  			iconUrl: "/img/logo_128.png"
  		};
  		chrome.notifications.create(Math.random().toString(), options, function (id) {
            window.setTimeout(function () {
               chrome.notifications.clear(id, function(){});
            }, timeout);
        });
	}else if(webkitNotifications && webkitNotifications.createNotification){
		var notification = webkitNotifications.createNotification("/img/logo_128.png", activity.title, activity.content.text);
		notification.show();
		window.setTimeout(function () {
            notification.cancel();
        }, timeout);
	}
}

function ActivityEntry(feedItem){
	this.id = feedItem.find("id").text();	
	this.title = feedItem.find("title").text();
	this.url = feedItem.find("link").attr("href");
	authorEl = feedItem.find("author");
	this.author =  { name : authorEl.find("name").text(), email : authorEl.find("email").text() };
	var parser = $("<div>", { html : feedItem.find("content").text() });
	this.content = { html : parser.html(), text : parser.text() };
	this.timestamp = feedItem.find("updated").text();
	this.moment = new moment(this.timestamp);
}

window.onload = initialize; 
