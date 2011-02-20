//make a namespace
if (typeof Schmo === 'undefined') {
    var Schmo = {};
}

Schmo.qParam = function(name) {
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null ) {
        return "";
    } else {
    return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}

Schmo.init = function() {
    Schmo._baseURL = Schmo.qParam('url');
    var userkey = Schmo.qParam('userkey');
    if (userkey != "") {
        Schmo.userkey = userkey;
    }
}

Schmo.getURL = function(path) {
    var url = Schmo._baseURL + path + '?callback=?';
    //add userkey if we have it.
    if (typeof Schmo.userkey != "undefined") {
        url += "&userkey=" + Schmo.userkey;
    }
    return url; 
}

//TODO: figure out a way to put the templates in this js file instead of in the
//html file

Schmo.inventory = {
    appendTemplateItems: function(container, items, template) {
        for (i in items) {
            $(template).tmpl(items[i]).appendTo(container);
        }
    },

    fillContents: function(container, items) {
        Schmo.inventory.appendTemplateItems(container, items, '#item_template');
    },

    fillChildren: function(container, children) {
        Schmo.inventory.appendTemplateItems(container, children, '#child_template');
    },
}

$(document).ready(function() {
    Schmo.init();
    //TODO: show children 
    //show info
    var info_url = Schmo.getURL('/info/');
    console.log('requesting info');
    $.getJSON(info_url, function(obj_data) {
        //personalize the welcome message
        var msg = $('#welcome_template').tmpl(obj_data).text();
        $('#welcome').text(msg);
        //create a new box for this inv box
        $('#box_template').tmpl(obj_data).appendTo('#inv_container');
        var new_box = $('#' + obj_data.objkey);
        //stash some data in the new box
        $(new_box).data('box_url', Schmo.getURL('/give/'));
        //show inventory
        var inventory_url = Schmo.getURL('/inv/'); 
        //make a jsonp call back to the box and put the response in the #item_list
        $.getJSON(inventory_url, function(data) {
            Schmo.inventory.fillContents(new_box, data);
            //bind a function to each item in the box that will make it get delivered on touch
            var items_q = '#' + obj_data.objkey + ' .inv_item';
            console.log(items_q);
            console.log($(new_box).data('box_url'));
            $(items_q).click(function() {
                console.log('clicked an item');
                var give_url = $(new_box).data('box_url') + '&item=' + encodeURIComponent($(this).text());
                console.log(give_url);
                $.getJSON(give_url, function(data){
                    console.log(data);
                });
            });
        });
    });
});

