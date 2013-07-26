
# Requirements

1. An installation of Drupal 7.x
2. Services Module 3.4+ (implements the CSRF token for updated REST security)
3. REST Server module enabled
4. A Titanium project - probably works with most versions since this only uses Ti.Network.HTTPClient


# Usage

Create a Service and enable (at least) the Resources called "system" and "user". Call `setRestPath()` with the url of your server/endpoint.

```javascript
var drupal = require('drupal');

drupal.setRestPath(url);
```

Get a session by calling system.connect:

```javascript
drupal.systemConnect(
	//success
	function(sessionData) {
		alert('yay!');
	},
	//failure
	function(error) {
		alert('boo :(');
	}
);
```

Create an account:

```javascript 
var user = {
	name: username,
	pass: createRandomString(8),
	mail: username+'@drupalspec.com',
	status: 1
};

drupal.createAccount(user,
	//success
	function(userData) {
		alert('yay!');
	},
	//failure
	function(error) {
		alert('boo :(');
	}
);	
```


# Jasmine

The included spec is intended to be run with TiShadow and Jasmine. To make it work, copy the spec into your root spec/ folder and set your service endpoint to "api".

