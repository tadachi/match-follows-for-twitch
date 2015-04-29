/*
* Debug: "orange"
* Error: "red"
*/

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
 * Logging with colors.
 * log("Hows life?", "green"); // Will be green
 * @param msg
 * @param color
 */
function log(msg, color){
    console.log("%c" + msg, " color: " + color + ";font-weight: bold; background: #F0FFFF;");
}

/**
 * Usage:
 * opts = {"offset":25}
 * @param name
 * @param opts
 * @param callback
 */
function getAllFollowedStreams(name, opts, callback) {
    // Verify opts (options).
    var direction = "DESC";
    var limit = 1000;
    var offset = 0; // get the next 25 people if you follow more than 25 people so increase offset by 25.

    if (opts["direction"]) { direction = opts["direction"]; }
    if (opts["limit"]) { limit = opts["limit"]; }
    if (opts["offset"]) { offset = opts["offset"]; }
    
    var url = "https://api.twitch.tv/kraken/users/{name}/follows/channels?direction={direction}&limit={limit}&offset={offset}&sortby=created_at"
                                    .format({direction: direction, name: name, limit: limit, offset: offset });
    
    $.ajax({
        url: "https://api.twitch.tv/kraken/users/{name}/follows/channels?direction={direction}&limit={limit}&offset={offset}&sortby=created_at"
                                    .format({direction: direction, name: name, limit: limit, offset: offset }),
        jsonp: "callback",
        dataType: "jsonp", // tell jQuery we're expecting JSONP. Script and JSONP requests are not subject to the same origin policy restrictions.

        success: function(streams) {
            callback(streams);
        },
        error: function(streams) {
            log("The request could not be made.", "red");
            console.log("The request could not be made.");
        }
    });
}

/**
 * Checks if a twitch user exists.
 *
 * @param name
 * @param callback
 */
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
            callback(false) ; 
        }
    });
}



// User is "finished typing," do something
// Pass an object with key/values
// Pass this to verify as a first class citizen to a verify function.

/**
 * Pass an object with key/values
 * Pass this to verify as a first class citizen to a verify function.
 * User is "finished typing," do something
 *
 * @param dom_id
 * @param name
 * @param opts
 */
function doneTyping(dom_id, name, opts) {
    console.log(name);
    var id = null;
    
    // Progress or checking.
    $(dom_id).text("checking..");
    userExists(name, function(result) {
        if (result) { // Success.
            $(dom_id).text("found.");
            if (opts["users"] && opts["id"]) {
                // We can proceed since a user with that username is found.
                opts["users"][opts["id"]] = name;
            }
        } else {
            $(dom_id).text("not found.");
            if (opts["users"] && opts["id"]) {
                // Set it to null so that other functions know not to proceed.
                opts["users"][opts["id"]] = null;
            }
        }
    });
}

/**
 * Does the legwork of verifying a user.
 * Validates input boxes.
 * Give an output dom to show the user it succeeded or failed.
 *
 * @param input_dom_id
 * @param output_dom_id
 * @param funcObj
 * @param doneTypingInterval
 * @param opts
 */
function verify(input_dom_id, output_dom_id, funcObj, doneTypingInterval, opts) {
    var typingTimer;
    
    // On keyup, start the countdown. Ideally, this happens when the user finishes typing in the user name.
    $(input_dom_id).keyup(function(){
        // Clear timer again. 
        clearTimeout(typingTimer);
        proceed();
    });
    
    // On keydown, keep clearing the countdown.
    $(input_dom_id).keydown(function(e){
        var code = e.keyCode || e.which;
        // Detected a tab so proceed since the user is finished inputting.
        if (code == '9') {
            proceed();
        }
        
        clearTimeout(typingTimer);
        $(output_dom_id).empty();
        // If input is empty just set text to an empty string.
        if( $(input_dom_id).val().length <= 1 ) { // Account for an empty character.
            if (opts["users"] && opts["id"]) { opts["users"][opts["id"]] = null; }
            $(output_dom_id).empty();
        }// else still checking so..
    });
    
    function proceed() {
        // Requres function() { funcObj() } for setTimeout to execute interval expires.
        if( $(input_dom_id).val().length > 0 ) {
            typingTimer = setTimeout( function() 
                {funcObj() }, doneTypingInterval
            );
        }
    }
}

/**
 * Given an array of user names.
 * Get a follows object for each one.
 * Return them in an array through a callback.
 *
 * @param names
 * @param callback
 */
function getEachUserFollows(names, callback) {
    opts = {"offset":0, "direction":"ASC", "limit":1000};
    var asyncTasks = [];
    
    names.forEach(function(name) {
        asyncTasks.push(
            function(callback) {
                getAllFollowedStreams(name, opts, function(result) {
                    console.log(result);
                    callback(null, result);
                });
            }
        );        
    });
    
    async.parallel( asyncTasks,
        function(err, result) { // Each task will push their callbacks into an array.
            callback(result);
        }
    );
}

/**
 * Finds the follow matches for two people.
 *
 * @param input
 * @param opts
 * @returns {Array}
 */
function findMatchFollowers(input) {
    // Followers and timestamp.
//    for (i=0; i < input.follows.length; i++) {
//        console.log(input.follows[i].channel.name + " " + input.follows[i].created_at);
//    }
    var name0;
    var name1;
    
    result = [];

    // Works for 2.
    for (i = 0; i < input[0].follows.length; i++ ) {
        name0 = input[0].follows[i].channel.name;
        for (x = 0; x < input[1].follows.length; x++) {
            name1 = input[1].follows[x].channel.name;

            if ( name0 === name1 ) {
                result.push(input[0].follows[i].channel);
                break; // Break here to pass the rest of the follows because we found a match.
            }
        }
    }
    log(result, "orange");
    return result;
}

/**
 * Finds the NOR product or follows that they do not share.
 * @param input
 * @param opts
 * @returns {Array}
 */
function findNonMatchFollowers(input, opts) {
    var name0;
    var name1;

    var result0 = [];
    var result1 = [];
    var finalResult = [];

    var matchFound;

    // Works for 2.
    for (i = 0; i < input[0].follows.length; i++ ) {
        matchFound = false;
        name0 = input[0].follows[i].channel.name;
        for (x = 0; x < input[1].follows.length; x++) {
            name1 = input[1].follows[x].channel.name;

            if ( name0 === name1 ) {
                matchFound = true;
                break; // Break here to pass the rest of the follows because we found a match.
            }
        }
        if (!matchFound) {
            result0.push(input[0].follows[i].channel);
        }
    }

    // Works for 2.
    for (i = 0; i < input[1].follows.length; i++ ) {
        matchFound = false;
        name1 = input[1].follows[i].channel.name;
        for (x = 0; x < input[0].follows.length; x++) {
            name0 = input[0].follows[x].channel.name;

            if ( name0 === name1 ) {
                matchFound = true;
                break; // Break here to pass the rest of the follows because we found a match.
            }
        }
        if (!matchFound) {
            result1.push(input[1].follows[i].channel);
        }
    }

    finalResult.push(result0);
    finalResult.push(result1);

    return finalResult;

}

/**
 * Sorts a list of followers by name asc order.
 *
 * @param listOfFollows
 * @returns {Array.<T>|*}
 */
function sortByName(listOfFollows) {
    return listOfFollows.sort(function(a,b) { return a.name.localeCompare(b.name) } )
}


function processingNotificationImage(dom_id) {
    
}

function finishedNotificationImage(dom_id) {
    
}

function processingNotificationText(dom_id) {
    
}

function finishedNotificationText(dom_id) {
    
}

/**
 * A final check to see if there are any nulls in the userlist to be processed.
 *
 * @param users
 * @returns {boolean}
 */
function finalCheck(users) {
    for (i = 0; i < users.length; i++) {
        if (!users[i]) {
            return false;
        }
    }
    return true;
}

var users = [];
users[0] = "jackafur";
users[1] = "kittyrawr";

// Semaphore for locking follow matching submission.
var stillProcessing = false;

// A $( document ).ready() block.
$( document ).ready(function() {
    console.log( "Document is ready!" );
    opts = {"offset":0, "direction":"ASC", "limit":1000};

    // Test.
//    userExists("asdfasdasdfsafas", function(result) {
//        console.log(result)
//    });
        
//    $("#scrollable_result").empty();
//    getEachUserFollows(users, function(result) {
//        console.log(result); // [Object, Object]
//        findMatchFollowers(result);
//        
//        console.log(result);
//        matchedFollows = findMatchFollowers(result).sort(); // Sorted.
//        for ( i = 0; i < matchedFollows.length; i++ ) {
//        $("#scrollable_result").append("<p>" + matchedFollows.length + "</p>");
//            $("#scrollable_result").append("<p>" + matchedFollows[i] + "</p>");
//        }
//        
//    });
    
//    getAllFollowedStreams("serokichimpo", opts, function(result) {
//        console.log(result);
//    });
    
    // function(){func(args)} syntax to prevent executing function after passing it in as an argument
    verify("#input0", "#output0", function(){doneTyping("#output0", $("#input0").val(), {"users":users, "id":"0"})}, 400, {"users":users, "id":"0"});
    verify("#input1", "#output1", function(){doneTyping("#output1", $("#input1").val(), {"users":users, "id":"1"})}, 400, {"users":users, "id":"1"});

    // Event Handlers, Button clicks, etc.
    $("#submit").click(function() {
        // Erase to show the next.
        try {
            if (!finalCheck(users)) {
                console.log(users);
                $("#scrollable_result0").html("<p>" + false + "</p>");
                throw "There's a username that's not found.";
            }
            if (!stillProcessing) {
                stillProcessing = true;
                log(users, "orange");
                getEachUserFollows(users, function(result) {
                    $("#scrollable_result0").empty();
                    $("#scrollable_result1").empty();
                    console.log(result);
                    //matchedFollows = findMatchFollowers(result).sort(); // Sorted. //this.name, this.game, this.followers,
                    nonMatchedFollows = findNonMatchFollowers(result); // Sorted. //this.name, this.game, this.followers,
                    sortedNomMatchedFollows = [sortByName(nonMatchedFollows[0]), sortByName(nonMatchedFollows[1])];

                    // Finished processing.
                    stillProcessing = false;
                    //$("#scrollable_result0").append("<p>" + matchedFollows.length + "</p>");
                    //for ( i = 0; i < matchedFollows.length; i++ ) {
                    //    $("#scrollable_result0").append("<p>" + matchedFollows[i].name + "</p>");
                    //}

                    $("#scrollable_result0").append("<p>" + sortedNomMatchedFollows[0].length + "</p>");
                    for ( i = 0; i < sortedNomMatchedFollows[0].length; i++ ) {
                        $("#scrollable_result0").append("<p>" + sortedNomMatchedFollows[0][i].name + "</p>");
                    }
                    $("#scrollable_result1").append("<p>" + sortedNomMatchedFollows[1].length + "</p>");
                    for ( i = 0; i < sortedNomMatchedFollows[1].length; i++ ) {
                        $("#scrollable_result1").append("<p>" + sortedNomMatchedFollows[1][i].name + "</p>");
                    }
                });                
            } else {
                $("#scrollable_result").html("<p>" + false + "</p>");
                throw "Cannot process request since there is already one in progress."
            }               
        } catch (err) {
            log(err, "red");
        } finally {

        }

    });
    
});
