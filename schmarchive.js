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
    };
}

//TODO: figure out a way to put the templates in this js file instead of in the
//html file


var qParam = function(name) {
        name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
        var regexS = "[\\?&]"+name+"=([^&#]*)";
        var regex = new RegExp( regexS );
        var results = regex.exec( window.location.href );
        if( results === null ) {
            return "";
        } else {
            return decodeURIComponent(results[1].replace(/\+/g, " "));
        }
    },
    
Schmarchive2 = {
    infoPath: '/info/',
    invPath: '/inv/',
    itemTmpl: '<div class="inv_item ${type}"><div class="inv_item_name ${type}">${name}</div>{{if thumb}}<img class="thumb" src="http://secondlife.com/app/image/${thumb}/1" />{{/if}}</div>',
    init: function(frame_selector) {
              // store params, request initial data
              this.frame = $(frame_selector);
              this.url = qParam('url');
              this.av = qParam('av');
              this.tok = qParam('tok');
              console.log(this);

              // get some info about the prim
              //this.request(this.infoPath);

              // get the inventory list
              this.request(this.invPath, this.listInventory);
          },
    
    _buildURL: function(path) {
      var url = this.url + path + '?callback=?';
        url += "&av=" + this.av;
        url += "&tok=" + this.tok;
        return url; 
    },
    
    request: function(path, callback, context) {
        var url = this._buildURL(path);
        $.ajax({
          url: url,
          dataType: 'jsonp',
          success: callback,
          context: this
        });
    },

    listInventory:  function(items) {
      for ( var i=0, len=items.length; i<len; ++i ){
        var item = items[i];
        console.log(item);
        $.tmpl(this.itemTmpl, item).appendTo(this.frame);
      }
      $(this.frame).isotope({
        // options
        itemSelector : '.inv_item',
        layoutMode : 'fitRows'
      });
    }
};

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

        //ADD some more data to the context object before rendering the box
        //template
        
        //if this box has a parent url, create a full link for it.
        if (obj_data.parenturl) {
            obj_data.parentlink = Schmarchive.buildLink(obj_data.parenturl);
        }

        // If the inv_box has already been rendered (as when we're coming from a parent or child link), then just replace its content.
        // If it has *not* yet been rendered (as when first loading the page), then just append to container.
        obj_data.classes = 'shown';

        var inv_block = $('#inv_block_' + obj_data.objkey);
        var new_block = $('#inv_template').tmpl(obj_data);
        if (inv_block.length) {
            //replace inv_block with new_block
            inv_block.replaceWith(new_block);
        } else {
            console.log("There's no inv block!");
            new_block.appendTo('#inv_container');
        }


        //store a reference to the current inv block on the Schmarchive object
        Schmarchive.current_inv_block = $('#inv_block_' + obj_data.objkey);
        Schmarchive.current_inv_block.data('info', obj_data);

        //stash some data in the new box
        var inv_list = $('#inv_list_' + obj_data.objkey);
        $(inv_list).data('give_url', Schmarchive.buildURL('/give/'));
       
        //if there's a parent button, bind its clicker 
        if (obj_data.parenturl) {
            var parentbutton = $('#parent_btn_' + obj_data.parentkey);
            Schmarchive.bindParentSlider(parentbutton);
        }

        //show_children
        var child_list = $('#child_list_' + obj_data.objkey);
        var children_url = Schmarchive.buildURL('/children/');
        $.getJSON(children_url, function(data) {
            Schmarchive.fillChildren(child_list, data);
            Schmarchive.fixHeight(Schmarchive.current_inv_block);
        });

        //show inventory
        var inventory_url = Schmarchive.buildURL('/inv/'); 
        $.getJSON(inventory_url, function(data) {
            Schmarchive.fillContents(inv_list, data);
            Schmarchive.fixHeight(Schmarchive.current_inv_block);
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
        console.log('fillContents');
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
            var give_url = $(container).data('give_url') + '&item=' + encodeURIComponent($(item).text());
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
        var children = container.find('.inv_child');
        children.click(function() {
            var child = $(this);
            child.parent().addClass('active');
            console.log('child clicked: ' + child.text());
            Schmarchive.slideChildIn(child);
        });
    },

    slideChildIn: function(element) {
        //create child inv box in overflow
        var info = element.data('info');
        info.classes = 'child';
        $('#inv_template').tmpl(info).appendTo('#inv_container');

        var new_block = $('#inv_block_' + info.objkey);
        var old_block = Schmarchive.current_inv_block;
       
        //request the new info now so it can be in transit while the animation
        //is playing
        history.pushState({}, '', info.link);
        Schmarchive.requestInfo();

        //slide over
        new_block.animate({left: '5px'}, function() {
            console.log('finished child slide');
            new_block.addClass('shown').removeClass('child');
        });
        
        old_block.animate({left: '-305px'}, function() {
            old_block.remove();
        });
    },

    bindParentSlider: function(element) {
        console.log('bindParentSlider name: ' + element.data('name'));
        element.click(function() {
            Schmarchive.slideParentIn($(this));
        });
    },

    slideParentIn: function(element) {
        //element will be the jquery-wrapped parent button that just got clicked.
        console.log('slideParentIn: ' + element.data('name'));
        
        //create new inv box, positioned by 'parent' class, and rendered with
        //data pulled of the parent btn that was passed into this function
        var info = {
            'objname': element.data('name'),
            'objkey': element.data('key'),
            'objlink': element.data('link'),
            'objurl': element.data('url')
        } 

        console.log(info);

        //add 'parent' class to position new box to the left
        info.classes = 'parent';

        //render new box
        $('#inv_template').tmpl(info).appendTo('#inv_container');
        console.log('added new block');
        var new_block = $('#inv_block_' + info.objkey);
        var old_block = Schmarchive.current_inv_block;

        //request the new info now so it can be in transit while the animation
        //is playing
        history.pushState({}, '', info.objlink);
        Schmarchive.requestInfo();
        
        //slide over
        new_block.animate({left: '5px'}, function() {
            console.log('finished parent slide');
            new_block.addClass('shown').removeClass('parent');
        });

        old_block.animate({left: '305px'}, function() {
            //Schmarchive.current_inv_block = new_block;
            old_block.remove();
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
    

    fixHeight: function(element) {
        //make shown inv block as tall as inv box
        //'element' will be jquery obj of the inv_block whose height we're matching.
        var extra = 50;
        var title = element.find('.inv_title');
        var child_list = element.find('.child_list');
        var inv_list = element.find('.inv_list');
        var newheight = title.outerHeight() + child_list.outerHeight() + inv_list.outerHeight() + extra;
        $('#inv_wrap').height(newheight);
    }
}



