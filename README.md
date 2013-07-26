
***Requirements***

1. An installation of Drupal 7.x
2. Services Module 3.4+ (implements the CSRF token for updated REST security)
3. REST Server module enabled
4. A Titanium project - probably works with most versions since this only uses Ti.Network.HTTPClient


***Usage***

Create a Service and enable (at least) the Resources called System and User. Call `setRestPath()` with the url of your server/endpoint.

```javascript
var drupal = require('drupal');

drupal.setRestPath(url);
```

Get a session by calling system.connect:

```javascript
drupal.systemConnect(
	//success
	function(response) {
		alert('yay!');
	},
	//failure
	function(response) {
		alert('boo :(');
	}
);
```

 If you want to run the Jasmine spec included, set up your service endpoint to "api".

   1. 