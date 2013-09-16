
function initPopup(){

  $("body > div").hide();

  if (chrome.extension.getBackgroundPage().connectionError){
    $("#connection-error").show();
    $("#connection-error .btn").click(function(){
      chrome.extension.getBackgroundPage().schedulePeriodicUpdate();
      initPopup();
    });
    enableUrls($("body"));
    return;
  }

  if (!chrome.extension.getBackgroundPage().isConfigured){
    $("#unconfigured").show();
    enableUrls($("body"));
    return;
  }

  if (!chrome.extension.getBackgroundPage().isLogged){
    $("#unlogged").show();
    $("#unlogged .btn").attr("href", chrome.extension.getBackgroundPage().config.redmineUrl);
    enableUrls($("body"));
    return;
  }

  if(chrome.extension.getBackgroundPage().isUpdating){
    $("#updating").show();
    window.setTimeout(initPopup, 5000);
  }

  $("#logged").show();

	var activity_id = 1;
	var list = $("#list");
  chrome.storage.local.get( chrome.extension.getBackgroundPage().KEY_ACTIVITIES, function(items){
    var activities = items[chrome.extension.getBackgroundPage().KEY_ACTIVITIES];

  	for ( i=0; i<activities.length; i++){
  		var template = $("#activity-template").html();
  		var activity = activities[i];
  		template = template.replace("{id}", activity_id);
  		template = template.replace("{title}", activity.title);
      template = template.replace("{url}", activity.url);
  		template = template.replace("{content}", activity.content.html);
      template = template.replace("{author}", activity.author.name);
      template = template.replace("{date}", new moment(activity.timestamp).fromNow());


  		var activityEntry = $("<div>", { id : "activity-"+activity_id, class : "card", html : template});
  		list.append(activityEntry);
  		activity_id++;
    }
    enableUrls($("body"));
  });

}

function enableUrls(container){
  $.each( $("a[href]", container), function(){
    $(this).click(function(){
      chrome.tabs.create({url: $(this).attr("href") });
    });
  });
}


window.onload = initPopup;