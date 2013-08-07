/**
 * @module drupal
 *
 * Yet another Drupal adapter for Titanium. 
 * This dependency-free module is adapted to the new CSRF token requirement in Services 3.4.
 * 
 * Run the included Jasmine spec with TiShadow.
 * 
 * by Joe Beuckman 2013
 * Github project link: https://github.com/jbeuckm/TitaniumDrupalAdapter
 */


var REST_PATH;
var SITE_ROOT;
var SERVICE_ENDPOINT;


/**
 * Prepare to connect to a Drupal server and Services 3.4 module.
 */
function setRestPath(root, endpoint) {
	SITE_ROOT = root;
	SERVICE_ENDPOINT = endpoint;
	REST_PATH = root + endpoint + '/';
}


/**
 * Retrieve the new Services security token identifying this session with this device.
 */
function getCsrfToken(success, failure) {

	// use previously loaded token
	if (Ti.App.Properties.getString("X-CSRF-Token")) {
		success(Ti.App.Properties.getString("X-CSRF-Token"));
		return;
	}

	var xhr = Ti.Network.createHTTPClient();
	var tokenPath = SITE_ROOT + 'services/session/token';

	xhr.onload = function() {
		Ti.App.Properties.setString("X-CSRF-Token", xhr.responseText);
		Ti.API.info('got CSRF token ' + xhr.responseText);
		success(xhr.responseText);
	};
	xhr.onerror = failure;

	xhr.open('GET', tokenPath);
	xhr.send();
}


var connectObject;


/**
 * Establish a session (or return the stored session).
 */
function systemConnect(success, failure) {

    var cookie = Ti.App.Properties.getString("Drupal-Cookie");
    if (cookie) {
        success(connectObject);
        return;
    }
    
    getCsrfToken(function(){

		var url = REST_PATH + 'system/connect.json';
		var xhr = Ti.Network.createHTTPClient();
		xhr.open("POST", url);
	
		xhr.setRequestHeader('Content-Type', 'application/json');
		xhr.setRequestHeader("X-CSRF-Token", Ti.App.Properties.getString("X-CSRF-Token"));
	
		xhr.onload = function() {
	
			if (xhr.status == 200) {
				var response = xhr.responseText;
				var responseData = JSON.parse(response);
	
	            connectObject = responseData;
	            
	            var cookie = responseData.session_name+'='+responseData.sessid;
	            Ti.App.Properties.setString("Drupal-Cookie", cookie);
	
				success(responseData);
			}
			else {
			    failure(xhr.responseText);
			}
		};
		xhr.onerror = function(e) {
			Ti.API.error("There was an error: " + e.error);
			failure(e);
		};
		xhr.send();
	
	},
	function(err){
	    failure(err);
	});
}


/**
 * Construct and fire arbitrary requests to the connected Drupal server.
 * @TODO: encode and append url params here for GET requests.
 * Config properties:
 * 
 * 		httpCommand: GET, POST, PUT, DELETE, etc.
 * 
 * 		params: An object to be sent to the server
 * 
 * 		servicePath: Path to the resource including any url parameters like resource id
 * 
 * 		contentType: String to send as "Content-Type" HTTP header
 * 
 * 		trace (boolean): If true, echo the request summary with Ti.API.trace()
 */
function makeAuthenticatedRequest(config, success, failure) {
	
	var trace = "makeAuthenticatedRequest()\n";

    var url = REST_PATH + config.servicePath;

    var xhr = Titanium.Network.createHTTPClient();
	trace += config.httpCommand+' '+url+"\n";
    
	// optionally override timeout
	if (config.timeout) {
		xhr.timeout = config.timeout;
	}

    xhr.open(config.httpCommand, url);

    xhr.onerror = function(e) {
        Ti.API.error(JSON.stringify(e));

		Ti.API.error('FAILED REQUEST:');
		Ti.API.error(trace);

        failure(e);
    };

    xhr.onload = function() {
        if (xhr.status == 200) {
        	var responseData = JSON.parse(xhr.responseText);
            success(responseData);
        }
        else {
	        Ti.API.trace('makeAuthReq returned with status '+xhr.status);
            failure(xhr.responseText);
        }
    };


	var cookie = Ti.App.Properties.getString("Drupal-Cookie");
    xhr.setRequestHeader("Cookie", cookie);
    trace += "Cookie: " + cookie + "\n";

    if (!config.skipCsrfToken) {
    	var token = Ti.App.Properties.getString("X-CSRF-Token");
        xhr.setRequestHeader("X-CSRF-Token", token);
        trace += "X-CSRF-Token: " + token + "\n";
    }
    
    xhr.setRequestHeader("Accept", "application/json");
	trace += "Accept: application/json\n"
    if (config.contentType) {
        xhr.setRequestHeader("Content-Type", config.contentType);
        trace += "Content-Type: " + config.contentType+"\n";
    }

	// optionally output a summary of the request
	if (config.trace) {
		Ti.API.trace(trace);
		Ti.API.trace(config.params);
	}
	
    xhr.send(config.params);
}


/**
 * Attempt to register a new account. user object must include name, pass, mail properties.
 */
function createAccount(user, success, failure) {

	systemConnect(
		
		function(responseData){
			Ti.API.info('Registering new user: '+JSON.stringify(user));	
		
			makeAuthenticatedRequest({
					httpCommand : 'POST',
					servicePath : 'user/register',
					contentType: 'application/json',
					params: JSON.stringify(user)
				}, 
				//success
				function(responseData){
					Ti.API.info('registerNewUser SUCCESS');
					success(responseData);
				},
				//fail
				function(err){
					Ti.API.error('registerNewUser FAIL');
					failure(err);
				}
			);
		},
		function(e){
			Ti.API.error(e);
			failure(e);
		}

	);
}


/**
 * Construct and send the proper login request.
 */
function login(username, password, success, failure) {

	var user = {
		username : username,
		password : password
	};

	systemConnect(function(resp){
		
		Ti.API.trace('systemConnect response: '+JSON.stringify(resp));
		
		if (resp.user.uid != 0) {
			Ti.API.debug('already logged in - returning systemConnect session\'s user');
			success(resp.user);
		}
		else {
			Ti.API.debug('user is anonymous - logging in with new session');
			makeAuthenticatedRequest({
					httpCommand : 'POST',
					servicePath : 'user/login',
		            contentType: "application/json",
					params: JSON.stringify(user)
				},
				function(responseData) {

		            var cookie = responseData.session_name+'='+responseData.sessid;
		            Ti.App.Properties.setString("Drupal-Cookie", cookie);
		            Ti.API.trace('login saving new cookie '+cookie);

					success(responseData.user);
				},
				failure);
		}
	
	}, failure);

};


/**
 * Become user:uid=0
 */
function logout(success, failure) {

	makeAuthenticatedRequest({
		httpCommand : 'POST',
		servicePath : 'user/logout.json'
	}, function() {

        Ti.App.Properties.removeProperty("Drupal-Cookie");

		success();
	}, failure);

}


/**
 * Requires Services Views module
 */
function getView(viewName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath : "views/" + viewName + ".json?" + encodeUrlString(args),
		httpCommand : 'GET',
		contentType : "application/json",
	}, success, failure);
}

/**
 * Convenience function for GET requests
 */
function getResource(resourceName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath : resourceName + ".json?" + encodeUrlString(args),
		httpCommand : 'GET'
	}, success, failure);
}

/**
 * Convenience function for POST requests
 */
function postResource(resourceName, args, success, failure) {
	makeAuthenticatedRequest({
		servicePath : resourceName,
		httpCommand : 'POST',
		params : args
	}, success, failure);
}

/**
 * Convenience function for PUT requests
 */
function putResource(resourceName, object, success, failure) {
	makeAuthenticatedRequest({
		servicePath : resourceName,
		httpCommand : 'PUT',
		contentType: 'application/json',
		params : object
	}, success, failure);
}

/**
 * The fundamental act of Drupal
 */
function createNode(node, success, failure) {

	makeAuthenticatedRequest({
			servicePath : "node",
			httpCommand : "POST",
	
			params : JSON.stringify({
				node : node
			})
		}, function(response) {
			Ti.API.trace(JSON.stringify(response));
			success(response);
		}, function(response) {
			failure(response);
		}
	);
}

/**
 * Haven't tested this in a while but it was working in Services 3.2...
 */
function uploadFile(base64data, filename, filesize, success, failure) {

	var fileDescription = {
		file : base64data,
		filename : filename,
		filesize : "" + filesize,
	};

	makeAuthenticatedRequest({
		servicePath : "file.json",
		httpCommand : "POST",
		contentType : "application/x-www-form-urlencoded; charset=utf-8",
		params : fileDescription
	}, success, failure);
}



/**
 * Do the custom serialization for sending drupal views contextual filter settings
 * 
 * @param {Object} obj
 */
function serializeDrupalViewsFilter(obj) {
	var str = [];
	for(var p in obj) {
  		if (obj[p]  instanceof Array) {
  			
  			for (var i=0, l=obj[p].length; i<l; i++) {
				str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p][i]));
			}
  		}
  		else {
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
		}
	}
	return str.join("&");
}

/**
 * Create a request string from an object of request parameters.
 */
function encodeUrlString(args) {
	var parts = [];
	for (var i in args) {
		var arg = args[i];
		parts.push(i + '=' + encodeURIComponent(arg));
	}
	var url = parts.join('&');
	return url;
}

/**
 * Create the basic field structure for uploading a node field.
 * This function is mainly here to document the "unique" way that field data must be constructed to work with Services.
 */
function basicField(obj) {
	return {
		und : [obj]
	};
}


exports.setRestPath = setRestPath;

exports.systemConnect = systemConnect;
exports.makeAuthenticatedRequest  = makeAuthenticatedRequest;
exports.createAccount  = createAccount;
exports.login  = login;
exports.logout  = logout;

exports.getResource  = getResource;
exports.serializeDrupalViewsFilter = serializeDrupalViewsFilter;
exports.putResource = putResource;
exports.getView  = getView;

