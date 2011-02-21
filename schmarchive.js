//define a few constants
var PERM_COPY = 0x00008000;
var PERM_MODIFY = 0x00004000;
var PERM_TRANSFER = 0x00002000;

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
    Schmo.userkey = Schmo.qParam('userkey');
    Schmo.tok = Schmo.qParam('tok');
}

Schmo.getURL = function(path) {
    var url = Schmo._baseURL + path + '?callback=?';
    url += "&userkey=" + Schmo.userkey;
    url += "&tok=" + Schmo.tok;
    return url; 
}

//TODO: figure out a way to put the templates in this js file instead of in the
//html file

Schmo.inventory = {
    appendTemplateItems: function(container, items, template) {
        for (i in items) {
            var item = items[i];
            //make a user friendly string out of the permissions mask.
            item.perms_list = [];
            if (item.perms_mask & PERM_MODIFY) {
                item.perms_list.push('Modify');
            }
            if (item.perms_mask & PERM_COPY) {
                item.perms_list.push('Copy');
            }
            if (item.perms_mask & PERM_MODIFY) {
                item.perms_list.push('Transfer');
            }
            item.perms = item.perms_list.join(', ');
            $(template).tmpl(item).appendTo(container);
            //find that item and stick its data in there.
            $('#' + item.key).data('info', item);
        }
    },

    fillContents: function(container, items) {
        Schmo.inventory.appendTemplateItems(container, items, '#item_template');
        //now add each item's whole info object as data
        //for (i in items) {

        //}
    },

    //fillChildren: function(container, children) {
        //Schmo.inventory.appendTemplateItems(container, children, '#child_template');
    //},
}

var highlightItem = function(item) {
    //remove highlight class from all inv_item parents
    $('.item_li').removeClass('highlight');
    //add highlight class to the parent of the one just clicked
    $(item).parent().addClass('highlight');
}

$(document).ready(function() {
    Schmo.init();
    //TODO: show children 
    //show info
    var info_url = Schmo.getURL('/info/');
    console.log('requesting info');
    $.getJSON(info_url, function(obj_data) {
        //personalize
        var rendered = $('#av_template').tmpl(obj_data);
        $('#av_container').html(rendered);
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
            $(items_q).parent().click(function() {
                var item = $(this).find('.inv_item')
                var give_url = $(new_box).data('box_url') + '&item=' + encodeURIComponent($(item).text());
                var info = $(item).data('info');
                var info_guts = $('#info_item_template').tmpl(info).html();
                $('#info_container').html(info_guts);
                highlightItem(item);
                $('#info_container .bigassbutton').click(function() {
                    $('#item_send_status').removeClass('success');
                    $('#item_send_status').addClass('loading');
                    $.getJSON(give_url, function(data){
                        $('#item_send_status').removeClass('loading');
                        $('#item_send_status').addClass('success');
                    });
                }); 
            });
        });
    });
});

