//define a few constants
var PERM_COPY = 0x00008000;
var PERM_MODIFY = 0x00004000;
var PERM_TRANSFER = 0x00002000;

//make a fix for console.log so it doesn't crash the script in browsers that
//don't have it.
if (!window.hasOwnProperty('console')) {
    window.console = {};
    window.console.log = function(msg) {
        //do nothing
    }
}


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

Schmo.grabURLParams = function() {
    Schmo._baseURL = Schmo.qParam('url');
    Schmo.userkey = Schmo.qParam('userkey');
}

Schmo.grabURL = function(path) {
    var url = Schmo._baseURL + path + '?callback=?';
    url += "&userkey=" + Schmo.userkey;
    url += "&tok=" + Schmo.tok;
    return url; 
}

//TODO: figure out a way to put the templates in this js file instead of in the
//html file
//
var fixHeight = function() {
    //make shown inv block as tall as inv box
    var title = $('.inv_title');
    console.log(title.length);
    var list = $('.inv_list');
    var newheight = title.height() + list.height();
    $('#inv_wrap').height(newheight + 44);
}

Schmo.inventory = {
    fillContents: function(container, items) {
        var template = '#item_template';
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
        
        //bind a function to each item in the box that will make it fill the
        //info pane on touch
        var items_q = $(container).find('.inv_item');
        $(items_q).parent().click(function() {
            console.log('inv item clicked');
            var item = $(this).find('.inv_item')
            var give_url = $(container).data('box_url') + '&item=' + encodeURIComponent($(item).text());
            var info = $(item).data('info');
            var info_guts = $('#info_item_template').tmpl(info).html();
            $('#info_container').html(info_guts);
            highlightItem(item);
            $('#info_container .bigassbutton').click(function() {
                console.log('deliver button clicked');
                $('#item_send_status').removeClass('success');
                $('#item_send_status').addClass('loading');
                $.getJSON(give_url, function(data){
                    $('#item_send_status').removeClass('loading');
                    $('#item_send_status').addClass('success');
                });
            }); 
        });
    },

    bindChildSlider: function() {
        console.log('bindChildSlider');
        $('.inv_child').click(function() {
            console.log('child clicked');
            //create 'new' inv box
            var info = $(this).data('info');
            info.classes = 'child';
            $('#box_template').tmpl(info).appendTo('#inv_container');
            //slide over
            $('.inv_block.shown').addClass('dying');
            $('.inv_block.child').animate({left: '5px'});
            
            console.log($('.inv_block.shown'));
            $('.inv_block.shown').animate({left: '-305px'}, function() {
                console.log('finished child slide');
                $('.inv_block.dying').remove();
                $('.inv_block.child').addClass('shown').removeClass('child');
                history.pushState({}, '', info.link);
                //Schmo.inventory.bindChildSlider();
                requestInfo();
            });
        });
    },
    
    bindParentSlider: function(element, data) {
        console.log('bindParentSlider name: ' + data.name);
        console.log('bindParentSlider elementtext: ' + element.text());
        element.data('info', data);
        element.click(function() {
            console.log('inv parent clicked');
            //create 'new' inv box
            var info = $(this).data('info');
            info.classes = 'parent';
            $('#box_template').tmpl(info).appendTo('#inv_container');
            //slide over
            $('.inv_block.shown').addClass('dying');
            $('.inv_block.parent').animate({left: '5px'});

            //this flag is an ugly hack to prevent a double call on clicking
            //the parent.  It's ugly because I don't know why the double call
            //was happening in the first place :(
            var infoRequested = false;

            $('.inv_block.shown').animate({left: '305px'}, function() {
                console.log('finished parent slide');
                if (!infoRequested) {
                    $('.inv_block.dying').remove();
                    $('.inv_block.parent').addClass('shown').removeClass('parent');
                    history.pushState({}, '', info.link);
                    //Schmo.inventory.bindParentSlider();
                    requestInfo();
                    infoRequested = true;
                }
            });
        });
    },

    buildLink: function(prim_url) {
        return '?url=' + prim_url + '&userkey=' + Schmo.qParam('userkey');
    },

    fillChildren: function(container, children) {
        console.log('fillChildren');

        //sort the children in order of obj name
        children.sort(function(a, b) {
            a = a.objname.toLowerCase();
            b = b.objname.toLowerCase();
            if (a < b) {
                return -1;
            } else if (a > b) {
                return 1;
            } else {
                return 0;
            }
        });
        var template = '#child_template';
        for (i in children) {
            var child = children[i];
            child.link = Schmo.inventory.buildLink(child.url)
            $(template).tmpl(child).appendTo(container);
            $('#' + child.objkey).data('info', child);            
        }
        Schmo.inventory.bindChildSlider();
    },
}

var highlightItem = function(item) {
    //remove highlight class from all inv_item parents
    $('.item_li').removeClass('highlight');
    //add highlight class to the parent of the one just clicked
    $(item).parent().addClass('highlight');
}

var fixHeight = function(list, container) {
    
}

var renderInfo = function(obj_data) {
    console.log('renderInfo');

    var rendered = $('#av_template').tmpl(obj_data);
    $('#av_container').html(rendered);

    //if this box has a parent url, create a full link for it.
    if (obj_data.parenturl) {
        obj_data.parentlink = Schmo.inventory.buildLink(obj_data.parenturl);
    }

    //create a new box for this inv box
    obj_data.classes = 'shown';
    $('#box_template').tmpl(obj_data).appendTo('#inv_container');


    if (obj_data.parenturl) {
        //stick the parent's data on its element
        var parentdata = {
            "key": obj_data.parentkey,
            "link": obj_data.parentlink,
            "name": obj_data.parentname,
            "url": obj_data.parenturl
        };
        var parentbutton = $('#' + obj_data.parentkey);
        //console.log('binding parent info to parent button');
        //console.log(parentdata);
        Schmo.inventory.bindParentSlider(parentbutton, parentdata);
    }

    //stash some data in the new box
    var new_box = $('#' + obj_data.objkey);
    $(new_box).data('box_url', Schmo.grabURL('/give/'));

    //show_children
    var children_url = Schmo.grabURL('/children/');
    $.getJSON(children_url, function(data) {
        Schmo.inventory.fillChildren(new_box, data);
    });

    //show inventory
    var inventory_url = Schmo.grabURL('/inv/'); 
    $.getJSON(inventory_url, function(data) {
        Schmo.inventory.fillContents(new_box, data);
        fixHeight();
    });
}

var requestInfo = function() {
    console.log('requestInfo');
    Schmo.grabURLParams();
    
    var info_url = Schmo.grabURL('/info/');
    $.getJSON(info_url, function(obj_data) {
        //personalize
        renderInfo(obj_data);
    });
}

$(document).ready(function() {
    console.log('domready!');
    requestInfo();
});

//$(window).bind('popstate', function(event) {
    //console.log('popstate!');
    ////console.log(event);
    ////requestInfo();
//})
