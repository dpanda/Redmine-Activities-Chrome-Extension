

$(document).ready(function(){

	var configuration = chrome.extension.getBackgroundPage().config;
	var isConfigured =  chrome.extension.getBackgroundPage().isConfigured;
	
	for (key in configuration){
		var input = $("input[name="+key+"]");
		var value = configuration[key];
		var type= input.attr("type");
		if (type=='text'){
			input.val(value);
		}else if (type=='checkbox'){
			if (value=="true"){
				input.attr("checked","checked");
			}else{
				input.removeAttr("checked");
			}
		}
	}

	$("input").change(function(){
		var value = $(this).val();
		if ($(this).attr("type") == "checkbox" ){
			value = $(this).is(":checked")+"";
		}
		chrome.extension.getBackgroundPage().updateConfiguration( $(this).attr("name"), value);
	});

});