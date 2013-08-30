describe("Drupal Tests", function() {

    var drupal = require('drupal/drupal');
    drupal.setRestPath('http://localhost:8888/servicestest/', 'api');


	describe("deals with Drupal data types", function(){
		
		it("serializes filter parameters for drupal", function(){
			var params = {
				'arg[]': [1,2,3]
			};
			var request = drupal.serializeDrupalViewsFilter(params);
			
			expect(decodeURIComponent(request)).toEqual('arg[]=1&arg[]=2&arg[]=3');
		});

	});

	describe("can create account & login", function() {
		
		var username = 'drupalspec'+createRandomString(8);
		var user = {
			name: username,
			pass: createRandomString(8),
			mail: username+'@drupalspec.com',
			status: 1
		};
		var uid = 0;
			

		it("calls system.connect", function() {
			
			var connected = false;
			
			runs(function(){
				
				drupal.systemConnect(
					function(responseData) {

						uid = responseData.user.uid;
                        Ti.API.debug('system.connect gives user '+uid);
						connected = true;
					},
					function(responseData) {
						connected = false;
					}
				);
			});
				
			waitsFor(function(){ return connected; }, 'problem connecting', 5000);

		});
		
		it("logs out if necessary", function() {
			
			var loggedout = false;
			
			runs(function() {
				if (uid != 0) {
					Ti.API.info("logging out for user "+uid);
					drupal.logout(
						function(){
							loggedout = true;
						}, 
						function() {
							loggedout = false;
						}
					);
				}
				else {
					loggedout = true;
				}
			});
			
			waitsFor(function(){ return loggedout; }, "could not log out", 5000);
			
		});


		it("registers an account", function() {

			var done = false;
			var error = '';
			var response = '';
						
			runs(function(){
				
				drupal.createAccount(user, 
					//success
					function(res) {
						response = res;
						done = true;
					},
					//failure
					function(e) {
						error = e;
						done = true;
					}
				);
			});
			
			waitsFor(function(){ return done; }, 'problem creating account', 5000);
			
			runs(function(){
				expect(error).toEqual('');
			});

		});


		it("can log in", function() {
			
			var loggedin = false;
			
			// login as the previously created test user
			runs(function() {
				drupal.login(user.name, user.pass,
					function(data) {
					    Ti.API.info('spec login succeeded with '+data);
					    uid = data.uid;
						loggedin = true;
					},
					function(err) {
						Ti.API.error(err);
						loggedin = false;
					}
				);
			});

			waitsFor(function(){ return loggedin; }, 'logged in', 5000);
			
		});

		
		
		it("can load user entity", function() {
			
			var done = false;
			
			runs(function() {
				drupal.getResource('user/'+uid, null, 
					function(data) {
						done = true;
					},
					function(err) {
						Ti.API.error(err);
						done = false;
					}
				);
			});

			waitsFor(function(){ return done; }, 'loaded my user', 5000);
		});

		
		
		xit("can create a node", function() {
			
			var done = false;
			
			var node = {
				type: "article",
				title: drupal.basicField("test node title"),
				body: drupal.basicField("test node body"),				
			};
			
			runs(function() {
				drupal.postResource('node', node, 
					function() {
					    Ti.API.info('POST succeeded');
						done = true;
					},
					function(err) {
						Ti.API.error(err);
						done = false;
					}
				);
			});

			waitsFor(function(){ return done; }, 'posted a node', 5000);
		});
		
		

        it("can log out", function() {
            
            var loggedout = false;
            
            runs(function() {
                if (uid != 0) {
                    drupal.logout(
                        function(){
                            loggedout = true;
                        }, 
                        function() {
                            loggedout = false;
                        }
                    );
                }
                else {
                    loggedout = true;
                }
            });
            
            waitsFor(function(){ return loggedout; }, "could not log out", 5000);
            
        });

	});
	
}); 

function createRandomString(max) {

    if (max == null) max = 20;
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < max; i++ ) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}