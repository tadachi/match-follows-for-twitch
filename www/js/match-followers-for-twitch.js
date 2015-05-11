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
 * Parses the URL for querystring params.
 * Example usage:
 * url = "http://dummy.com/?technology=jquery&blog=jquerybyexample".
 * var tech = getQueryStringParams("technology"); //outputs: "jquery"
 * var blog = getQueryStringParams("blog");       //outputs: "jquerybyexample"
 *
 * @param sParam
 * @returns {*}
 */
// Read a page's GET URL variables and return them as an associative array.
function getQueryStringParams() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}


/**
 * Logging with colors.
 * log("Hows life?", "green"); // Will be green
 * @param msg
 * @param color
 */
function log(msg, color){
    if (msg === undefined) {
        console.log("%c" + msg, " color: " + color + ";font-weight: bold; background: #F0FFFF;");
    } else {

    }
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
            log("The request could not be made.", "red");
            callback(false) ; 
        }
    });
}

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
    var id = null;
    
    // Progress or checking.
    //$(dom_id).text("checking..");
    userExists(name, function(result) {
        if (result) { // Success.
            //$(dom_id).text("found");
            $(dom_id).addClass("valid");
            if (opts["users"] && opts["id"]) {
                // We can proceed since a user with that username is found.
                opts["users"][opts["id"]] = name;
            }
        } else {
            $(dom_id).addClass("error");
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

    // Race condition with submit. disable button?
    $(input_dom_id).on('paste', function () {
        var element = $(input_dom_id);
        $(output_dom_id).removeClass("error");
        $(output_dom_id).removeClass("valid");
        //console.log(element.val());
        setTimeout(function () {
            console.log(element.val() + " pasted.");
            proceed();
        }, 5);
    });

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
        $(output_dom_id).removeClass("error");
        $(output_dom_id).removeClass("valid");
        // If input is empty just set text to an empty string or remove classes.
        if( $(input_dom_id).val().length <= 1 ) { // Account for an empty character.
            if (opts["users"] && opts["id"]) { opts["users"][opts["id"]] = null; }
            $(input_dom_id).empty();
            $(output_dom_id).empty();
            $(output_dom_id).removeClass("error");
            $(output_dom_id).removeClass("valid");
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

    // Works for 2 people.
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

    // Works for 2 people.
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

/**
 * Append a list of follows of the 1st person has that 2nd person doesn't have and vice versa.
 *
 * @param dom_id0
 * @param dom_id1
 * @param table_id0
 * @param table_id1
 * @param list
 * @param opts
 */
function updateNonMatching(dom_id0, dom_id1, table_id0, table_id1, list, opts) {
    var html0 = "";
    var html1 = "";

    // Reset the dom;
    $(dom_id0).empty();
    $(dom_id1).empty();

    // Our data.
    nonMatchedFollows = findNonMatchFollowers(list); // Sorted. //this.name, this.game, this.followers,
    sortedNomMatchedFollows = [sortByName(nonMatchedFollows[0]), sortByName(nonMatchedFollows[1])];

    if (opts["users"][0] && opts["users"][1]) {
        user1 = "<span class=\"{class}\">{user1}</span>".format({user1: opts["users"][0], class: "red"})
        user2 = "<span class=\"{class}\">{user2}</span>".format({user2: opts["users"][1], class: "blue"})
        html0 += "<p>{user1} follows ({count}) that {user2} doesn't</p>".format({user1: user1, user2: user2, count: sortedNomMatchedFollows[0].length})
        html1 += "<p>{user2} follows ({count}) that {user1} doesn't</p>".format({user1: user1, user2: user2, count: sortedNomMatchedFollows[1].length})
    }


    html0 += process(table_id0, sortedNomMatchedFollows[0]);
    html1 += process(table_id1, sortedNomMatchedFollows[1]);

    // Add the HTML.
    $(dom_id0).append(html0).show('slow');;
    $(dom_id1).append(html1).show('slow');;

    // Apply table sort plugin to the table. You must do it after HTML is appended.
    $(table_id0).tablesorter();
    $(table_id1).tablesorter();

}

/**
 * Append a list of follows of the 1st person 2nd person share.
 *
 * @param dom_id
 * @param table_id
 * @param list
 * @param opts
 */
function updateMatching(dom_id, table_id, list, opts) {
    var html = "";

    // Reset the dom;
    $(dom_id).empty();

    // Our data.
    var matchedFollows = findMatchFollowers(list).sort(); // Sorted. //this.name, this.game, this.followers,

    //console.log(matchedFollows.length);

    // They share one or more follows.

    user1 = "<span class=\"{class}\">{user1}</span>".format({user1: opts["users"][0], class: "red"})
    user2 = "<span class=\"{class}\">{user2}</span>".format({user2: opts["users"][1], class: "blue"})
    if (opts["users"][0] && opts["users"][1] && matchedFollows.length > 0) {
        html += "<p>{user1} and {user2} share these follows ({count})</p>".format({user1: user1, user2: user2 , count: matchedFollows.length});
        // Process
        html += process(table_id, matchedFollows);
    // They do not share follows.
    } else if (opts["users"][0] && opts["users"][1] && matchedFollows.length <= 0) {
        html += "<p>{user1} and {user2} do not share any follows ({count})</p>".format({user1: user1, user2: user2 , count: matchedFollows.length});
    // Input wasn't validated properly.
    } else {
        html += "<p>Something went wrong</p>";
    }

    // Add the HTML.
    $(dom_id).append(html).show('slow');

    // Apply table sort plugin to the table. You must do it after HTML is appended.
    $(table_id).tablesorter();
}

/**
 * Process twitch json data into a clean html table.
 *
 * @param table_id
 * @param list
 * @returns {string}
 */
function process(table_id, list) {
    var html = "";

    table_id = table_id.replace("#","");

    // Build HTML table with data.
    html += "<div class=\"table-responsive\">";
    html += "<table id=\"{id}\" class=\"{classes}\">".format({id: table_id, classes: "table table-striped table-curved table-hover table-bordered table-condensed tablesorter"});
    html += "<thead>";
    html += "<tr>";
    html += "<th class=\"text-center cursor-pointer\">" + "Logo" + "</th>"
    html += "<th class=\"text-center cursor-pointer\">" + "Name" + "</th>";
    //html += "<th class=\"text-center\">" + "Last Game Played" + "</th>";
    html += "<th class=\"text-center cursor-pointer\">" + "Follows"+ "</th>";
    html += "</tr>";
    html += "</thead>";
    html += "<tbody>";

    for ( i = 0; i < list.length; i++ ) {
        id = table_id + "-" + i;

        html += "<tr id=\"{id}\" title=\"Last Played: {game}\">".format({id: id, game: list[i].game});
        html += "<td class=\"vert-align\">" + "<img class=\"{class}\" height=\"50\" width=\"50\" src=\"{src}\" onerror=\"this.src='{default}'\""
                    .format({src: list[i].logo, class: "img-responsive img-border to-center img-rounded",
                    default: "http://s.jtvnw.net/jtv_user_pictures/hosted_images/GlitchIcon_WhiteonPurple.png"}) + "</td>";
        html += "<td class=\"vert-align\">" + "<a href=\"{url}\" target=\"_blank\">{value}</a>".format({url: list[i].url, value: list[i].name}) + "</td>";
        //html += "<td class=\"vert-align\">" + list[i].game + "</td>";
        html += "<td class=\"vert-align\">" + list[i].followers + "</td>";
        html += "</tr>";
    }

    html += "</tbody>";
    html += "</table>";

    html += "</div>";

    return html;
}

/**
 * Adds params to the URL.
 *
 * @param url
 * @param param
 * @param value
 * @returns {string|*}
 */
function addURLParameter(url, param, value){
    var hash       = {};
    var parser     = document.createElement("a");

    parser.href    = url;

    var parameters = parser.search.split(/\?|&/);

    for(var i = 0; i < parameters.length; i++) {
        if(!parameters[i])
            continue;

        var ary      = parameters[i].split("=");
        hash[ary[0]] = ary[1];
    }

    hash[param] = value;

    var list = [];
    Object.keys(hash).forEach(function (key) {
        list.push(key + "=" + hash[key]);
    });

    parser.search = "?" + list.join('&');
    return parser.href;
}

/**
 * A final check to see if there are any nulls in the userlist to be processed.
 *
 * @param users
 * @returns {boolean}
 */
function finalCheck() {
    var incompleteForm = false;

    if( $("#input0").val().length === 0 ) {
        $("#input0").addClass("error");
        incompleteForm = true;
    } else {
        $("#input0").removeClass("error");
    }

    if( $("#input1").val().length === 0 ) {
        $("#input1").addClass("error");

        $("#input1").addClass("run-flash");
        incompleteForm = true;
    } else {
        $("#input1").removeClass("error");
    }

    if (!$("#input0").hasClass("valid")) {
        incompleteForm = true;
    }

    if (!$("#input1").hasClass("valid")) {
        incompleteForm = true;
    }

    if (incompleteForm) {
        return false;
    }

    if (users.length <= 1) {
        return false;
    }

    for (i = 0; i < users.length; i++) {
        if (!users[i]) {
            return false;
        }
    }
    return true;
}

// Globals
var params = getQueryStringParams();
var users = [];



// A $( document ).ready() block.
$( document ).ready(function() {
    console.log( "Document is ready!" );

    // Semaphore for preventing more than one submission at at time.
    var stillProcessing = false;

    // Setup text in copy-share-link and set its size.
    $("#calc-text-width").val(window.location.href);
    $("#copy-share-link").val(window.location.href);

    // ZeroClipBoard initlize, one-liner.
    var zeroClipBoardClient = new ZeroClipboard($("#copy-button"));

    // Setup verification in input boxes.
    var opts = {"offset":0, "direction":"ASC", "limit":1000};
    
    // function(){func(args)} syntax to prevent executing function after passing it in as an argument
    verify("#input0", "#input0", function(){doneTyping("#input0", $("#input0").val(), {"users":users, "id":"0"})}, 400, {"users":users, "id":"0"});
    verify("#input1", "#input1", function(){doneTyping("#input1", $("#input1").val(), {"users":users, "id":"1"})}, 400, {"users":users, "id":"1"});

    // Use stuff from params or do a example run with default twitch usernames;
    if (params.a && params.b) {
        users[0] = params.a;
        users[1] = params.b;

        // Set input boxes text to the user naems in params.
        $("#input0").val(params.a);
        $("#input1").val(params.b);

        // Validate and show user validation resutls.
        userExists(params.a, function(result) {
            if (result) { //True
                $("#input0").addClass("valid");
            } else {
                $("#input0").addClass("error");
            }
        });

        userExists(params.b, function(result) {
            if (result) { //True
                $("#input1").addClass("valid");
            } else {
                $("#input1").addClass("error");
            }
        });

        run(opts);
    } else {
        // Default users;
        //users[0] = "cosmowright";
        //users[1] = "trihex";

        // Default run.
        //run();
    }

    // Event Handlers, Button clicks, etc.
    $("#copy-button").click(function() {
        $(this).text("Copied!");
    });

    $("#submit").click(function() {
        if (finalCheck()) {
            var url = location.href;
            url = addURLParameter(url, "a", users[0]);
            url = addURLParameter(url, "b", users[1]);

            $("#copy-share-link").val(url);
            $("#copy-share-link").text("Copy to Clipboard");

            run();
        }
    });

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

    function run() {
        // Erase to show the next.
        if (!finalCheck()) {
            throw "There's a username that's not found.";
        }

        // Passed the check so show loading gif.
        $("#loading").removeClass("img-hide");

        if (!stillProcessing) {
            stillProcessing = true;
            console.log(users[0] + " " + users[1] + " submitted.");
            getEachUserFollows(users, function(result) {


                // Hide loading gif since we got our data.
                $("#loading").addClass("img-hide");

                // Clean any passed submissions by emptying them.
                $("#scrollable_result0").empty();
                $("#scrollable_result1").empty();

                var opts = {users: users};

                // Inverse is checked, Find nonMatching.
                if ($("#checkbox0").is(':checked')) {
                    updateNonMatching("#scrollable_result0", "#scrollable_result1", "#table0", "#table1", result, opts);
                    // Just find matching.
                } else {
                    updateMatching("#scrollable_result0", "#table0", result, opts)
                }

                //Finished.
                stillProcessing = false;
            });
        } else {
            log("Cannot process request since there is already one in progress.", "red");
        }

    }

});



