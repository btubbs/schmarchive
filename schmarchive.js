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

//TODO: figure out a way to put the templates in this js file instead of in the
//html file

//when the dom is ready, query the prim.
$(document).ready(function() {
    console.log('domready');
    Schmarchive.requestInfo();
});

//$(window).bind('popstate', function(event) {
    //console.log('popstate');
    ////console.log(event);
    ////requestInfo();
//})

Schmarchive = {

    requestInfo: function() {
        console.log('requestInfo');
        Schmarchive.getURLParams();
        
        var info_url = Schmarchive.buildURL('/info/');
        $.getJSON(info_url, function(obj_data) {
            //personalize
            Schmarchive.renderInfo(obj_data);
        });
    },
    
    getURLParams: function() {
        Schmarchive._baseURL = Schmarchive.qParam('url');
        Schmarchive.userkey = Schmarchive.qParam('userkey');
    },
    
    qParam: function(name) {
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( window.location.href );
        if( results == null ) {
            return "";
        } else {
            return decodeURIComponent(results[1].replace(/\+/g, " "));
        }
    },
    
    buildURL: function(path) {
        var url = Schmarchive._baseURL + path + '?callback=?';
        url += "&userkey=" + Schmarchive.userkey;
        url += "&tok=" + Schmarchive.tok;
        return url; 
    },

    renderInfo: function(obj_data) {
        console.log('renderInfo');

        var rendered = $('#av_template').tmpl(obj_data);
        $('#av_container').html(rendered);

        //if this box has a parent url, create a full link for it.
        if (obj_data.parenturl) {
            obj_data.parentlink = Schmarchive.buildLink(obj_data.parenturl);
        }

        //create a new box for this inv box
        //the ugliness starts here.... It would be better if I didn't use classes for the swapping.  So instead of "shown" i need to figure out a way to use an ID.
        obj_data.classes = 'shown';
        $('#inv_template').tmpl(obj_data).appendTo('#inv_container');

        Schmarchive.current_inv_block = $('#inv_block_' + obj_data.objkey);
        
        if (obj_data.parenturl) {
            //stick the parent's data on its element
            var parentdata = {
                "key": obj_data.parentkey,
                "link": obj_data.parentlink,
                "name": obj_data.parentname,
                "url": obj_data.parenturl
            };
            var parentbutton = $('#parent_button_' + obj_data.parentkey);
            //console.log('binding parent info to parent button');
            //console.log(parentdata);
            Schmarchive.bindParentSlider(parentbutton, parentdata);
        }

        //stash some data in the new box
        var inv_list = $('#inv_list_' + obj_data.objkey);
        $(inv_list).data('box_url', Schmarchive.buildURL('/give/'));

        //show_children
        var children_url = Schmarchive.buildURL('/children/');
        $.getJSON(children_url, function(data) {
            Schmarchive.fillChildren(inv_list, data);
        });

        //show inventory
        var inventory_url = Schmarchive.buildURL('/inv/'); 
        $.getJSON(inventory_url, function(data) {
            Schmarchive.fillContents(inv_list, data);
            Schmarchive.fixHeight();
        });
    },

    fillChildren: function(container, children) {
        // 'container' is jquery of ul that children are being appended to
        // 'children' is array of json objects returned from inworld.

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
            child.link = Schmarchive.buildLink(child.url)
            $(template).tmpl(child).appendTo(container);
            $('#' + child.objkey).data('info', child);            
        }
        Schmarchive.bindChildSliders(container);
    },
    
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
            Schmarchive.highlightItem(item);
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

    bindChildSliders: function(container) {
        console.log('bindChildSliders');
        container.find('.inv_child').click(function() {
            console.log('child clicked');
            Schmarchive.slideChildIn(this);
        });
    },

    slideChildIn: function(element) {
        //create child inv box in overflow
        var info = $(element).data('info');
        info.classes = 'child';
        $('#inv_template').tmpl(info).appendTo('#inv_container');

        var new_block = $('#inv_block_' + info.objkey);
        var old_block = Schmarchive.current_inv_block;
        
        //slide over
        new_block.animate({left: '5px'}, function() {
            console.log('finished child slide');
            new_block.addClass('shown').removeClass('child');
            history.pushState({}, '', info.link);
            //Schmarchive.bindChildSliders();
            Schmarchive.requestInfo();
        });
        
        old_block.animate({left: '-305px'}, function() {
            old_block.remove();
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
            $('#inv_template').tmpl(info).appendTo('#inv_container');
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
                    //Schmarchive.bindParentSlider();
                    Schmarchive.requestInfo();
                    infoRequested = true;
                }
            });
        });
    },

    buildLink: function(prim_url) {
        return '?url=' + prim_url + '&userkey=' + Schmarchive.qParam('userkey');
    },

    highlightItem: function(item) {
        //remove highlight class from all inv_item parents
        $('.item_li').removeClass('highlight');
        //add highlight class to the parent of the one just clicked
        $(item).parent().addClass('highlight');
    },
    

    fixHeight: function() {
        //make shown inv block as tall as inv box
        var title = $('.inv_title');
        console.log(title.length);
        var list = $('.inv_list');
        var newheight = title.height() + list.height();
        $('#inv_wrap').height(newheight + 44);
    }
}



