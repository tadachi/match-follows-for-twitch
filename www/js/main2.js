/**
 * Similar to what you find in Java"s format.
 * Usage: chatsrc = "http://twitch.tv/chat/embed?channel={channel}&amp;popout_chat=true".format({ channel: streamer});
 */
if (!String.prototype.format) {
	String.prototype.format = function() {
		var str = this.toString();
		if (!arguments.length)
			return str;
		var args = typeof arguments[0],
			args = (("string" == args || "number" == args) ? arguments : arguments[0]);
		for (arg in args)
			str = str.replace(RegExp('\\{' + arg + '\\}', 'gi'), args[arg]);
		return str;
	}
}

/**
 * Usage:
 * opts = {"offset":25}
 */
function getAllFollowedStreams(name, opts, callback) {
    // Verify opts (options).
    var direction = "DESC";
    var limit = 1000;
    var offset = 0 // get the next 25 people if you follow more than 25 people so increase offset by 25.

    if (opts["direction"]) { direction = opts["direction"]; }
    if (opts["limit"]) { limit = opts["limit"]; }
    if (opts["offset"]) { offset = opts["offset"]; }
    console.log(name);
    var url = "https://api.twitch.tv/kraken/users/{name}/follows/channels?direction={direction}&limit={limit}&offset={offset}&sortby=created_at"
                                    .format({direction: direction, name: name, limit: limit, offset: offset })
    
    $.ajax({
        url: "https://api.twitch.tv/kraken/users/{name}/follows/channels?direction={direction}&limit={limit}&offset={offset}&sortby=created_at"
                                    .format({direction: direction, name: name, limit: limit, offset: offset }),
        jsonp: "callback",
        dataType: "jsonp", // tell jQuery we're expecting JSONP. Script and JSONP requests are not subject to the same origin policy restrictions.

        success: function(streams) {
            callback(streams);
        },
        error: function(streams) {
            console.log("The request could not be made.");
        }
    });
}


function userExists(name, callback) {
    $.ajax({
        url: "https://api.twitch.tv/kraken/users/{name}/"
                                    .format({name: name}),
        jsonp: "callback",
        dataType: "jsonp", // tell jQuery we're expecting JSONP. Script and JSONP requests are not subject to the same origin policy restrictions.

        success: function(streams) {
            if (streams["error"] || streams["status"] == 404 ) {
                callback(false) ;  
            }else {
                callback(true);
            }
        },
        error: function(streams) {
            console.log("The request could not be made.");
            console.log(streams);
            callback(false) ; 
        }
    });
}



// User is "finished typing," do something
// Pass an object with key/values
// Pass this to verify as a first class citizen to a verify function.
function doneTyping(dom_id, name, opts) {
    console.log(name);
    var id = null;
    
    userExists(name, function(result) {
        if (result) { // Success.
            $(dom_id).text("yes");
            if (opts["users"] && opts["id"]) {
                opts["users"][opts["id"]] = name;
            }
            console.log(finalCheck(users));
        } else {
            $(dom_id).text("no");
            if (opts["users"] && opts["id"]) {
                opts["users"][opts["id"]] = null;
            }
            console.log(finalCheck(users));
        }
    });
}

/**
 *
 * 
 */
function verify(input_dom_id, output_dom_id, funcObj, doneTypingInterval) {
    var typingTimer;
    
    // On keyup, start the countdown. Ideally, this happens when the user finishes typing in the user name.
    $(input_dom_id).keyup(function(){
        // Clear timer again. 
        clearTimeout(typingTimer);
        // Requres function() { funcObj() } for setTimeout to execute interval expires.
        if( $(this).val().length > 0 ) { 
            typingTimer = setTimeout( function() 
             {funcObj() }, doneTypingInterval
            );
        }
    });
    
    // On keydown, keep clearing the countdown.
    $(input_dom_id).keydown(function(){
        clearTimeout(typingTimer);
        // If input is empty just set text to an empty string.
        if( $(this).val().length <= 1 ) { // Account for an empty character.
            $(output_dom_id).text("");
        } else { // Still checking so..
            $(output_dom_id).text("checking..");
        }
    });
    
}

function finalCheck(users) {
    for ( x in users ) {
        if (!users[x]) {
            return false;   
        }
    }
    return true;
}

function findMatchingFollows(users, callback) {
    opts = {"offset":0, "direction":"ASC", "limit":1000}
    var asyncTasks = [];
    console.log(users);
    
//    for ( key in users ) {
//        console.log(users[key]);
//
//        asyncTasks.push(
//            function(callback) {
//                getAllFollowedStreams(users[key], opts, function(result) {
//                    callback(null, result);
//                });
//            }
//        );
//    }
    
     asyncTasks.push(
        function(callback) {
            getAllFollowedStreams(users[1], opts, function(result) {
                callback(null, result);
            });
        }
    );

     asyncTasks.push(
        function(callback) {
            getAllFollowedStreams(users[2], opts, function(result) {
                callback(null, result);
            });
        }
    );

    async.parallel( asyncTasks,
        function(err, result) { // Each task will push their callbacks into an array.
            callback(result);
        }
    );
}

function matchFollowers(input) {
    // Followers and timestamp.
//    for (i=0; i < input.follows.length; i++) {
//        console.log(input.follows[i].channel.name + " " + input.follows[i].created_at);
//    }
    var name1;
    var name2;
    for (i = 0; i < input[0].follows.length; i++ ) {
        name1 = input[0].follows[i].channel.name
        for (x = 0; x < input[1].follows.length; x++) {
            name2 = input[1].follows[x].channel.name;
            if ( name1 === name2 ) {
                console.log(name1);   
            }
        }
    }
}

var users = {
    1 : "jackafur",
    2 : "puri_puri"
}

// A $( document ).ready() block.
$( document ).ready(function() {
    console.log( "Document is ready!" );
    opts = {"offset":0, "direction":"ASC", "limit":1000}

    // Test.
//    userExists("asdfasdasdfsafas", function(result) {
//        console.log(result)
//    });
    
    
    findMatchingFollows(users, function(result) {
        console.log(result); // [Object, Object]
        matchFollowers(result);
    });
    
    getAllFollowedStreams("serokichimpo", opts, function(result) {
        console.log(result);
        matchFollowers(result);
    });
    
    // function(){func(args)} syntax to prevent executing function after passing it in as an argument
    verify("#input1", "#output1", function(){doneTyping("#output1", $("#input1").val(), {"users":users, "id":1})}, 400);
    verify("#input2", "#output2", function(){doneTyping("#output2", $("#input2").val(), {"users":users, "id":2})}, 400);

    // Event Handlers, Button clicks, etc.
    $("#submit").click(function() {
        $("#result").text(finalCheck(users));
        findMatchingFollows(users, function(result) {
            console.log(result); // [Object, Object]
        });
    });
    
});
