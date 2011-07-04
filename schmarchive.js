//define a few constants
var PERM_COPY = 0x00008000;
var PERM_MODIFY = 0x00004000;
var PERM_TRANSFER = 0x00002000;
var NULL_KEY = "00000000-0000-0000-0000-000000000000"; 

//make a fix for console.log so it doesn't crash the script in browsers that
//don't have it.
if (!window.hasOwnProperty('console')) {
    window.console = {};
    window.console.log = function(msg) {
        //do nothing
    };
}

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
    givePath: '/give/',
    cssPath: '/css/',
    itemTmpl: '#item_tmpl',
    titleTmpl: '#title_tmpl',
    cssTmpl: '#css_tmpl',
    titleContainer: '#title',
    getButton: '.get',
    filters: '#filters a',
    init: function(frame_selector) {
              // store params, request initial data
              this.frame = $(frame_selector);
              this.url = qParam('url');
              this.av = qParam('av');
              this.tok = qParam('tok');

              // add a link to remote css
              var css_url = this.buildURL(this.cssPath);
              $(this.cssTmpl).tmpl({url: css_url}).appendTo('head');
              // set up click handler for the "get" buttons
              var click_data = {
                  widget: this
              };
              this.frame.delegate('.get', 'click', click_data, this.onGetClick);

              // get the inventory list
              this.request(this.buildURL(this.invPath), this.listInventory, this);

              // bind the filters bar
              var filters = $(this.filters);
              filters.click({widget: this}, this.onFilter);

              // request the prim info
              this.request(this.buildURL(this.infoPath), this.onInfo, this);

          },
    
    buildURL: function(path) {
      var url = this.url + path + '?callback=?';
        url += "&av=" + this.av;
        url += "&tok=" + this.tok;
        return url; 
    },
    
    request: function(url, callback, context) {
        $.ajax({
          url: url,
          dataType: 'jsonp',
          success: callback,
          context: context
        });
    },

    listInventory: function(items) {
      // Loop over the items returned from the jsonp call
      for ( var i=0, len=items.length; i<len; ++i ){
        var item = items[i];

        if (item.type != 'info' && item.type !== undefined) {
            // unpack item permissions
            item.mod = item.owner_perms_mask & PERM_MODIFY;
            item.copy = item.owner_perms_mask & PERM_COPY;
            item.trans = item.owner_perms_mask & PERM_TRANSFER;
            
            item.next_mod = item.next_perms_mask & PERM_MODIFY;
            item.next_copy = item.next_perms_mask & PERM_COPY;
            item.next_trans = item.next_perms_mask & PERM_TRANSFER;

            // strip thumbnail if null key
            if (item.thumb === NULL_KEY) {
              delete item.thumb;
            }

            // optionally hide items whose name starts with "."
            if (item.name.charAt(0) === ".") {
                item.hidden = true;
            }
            
            // Using the item template identified by itemTmpl, append a div for
            // this item to the main frame.
            var pane = $(this.itemTmpl).tmpl(item).appendTo(this.frame);
            pane.data('info', item);
        } else {
            if (item.more === 1) {
                var newpage = item.page + 1;
                var url = this.buildURL(this.invPath) + "&p=" + newpage;
                this.request(url, this.insertMore, this);
            }
        }
      }

      // hide broken images (any SL image with alpha in it will have no
      // search.secondlife.com thumbnail)
      $('img.thumb').error(function(ev) {
              //console.log(ev);
              $(this).hide();
          });
      // call the isotope plugin on the frame
      $(this.frame).isotope({
        // options
        itemSelector : '.inv_item',
        layoutMode : 'fitRows',
        filter: '.inv_item:not(.hidden, .about)',
        animationEngine: 'best-available'
      });

      // remove the tmphide class from the 'about' boxes
      $('.tmphide').removeClass('tmphide');
    },

    insertMore: function(items) {
        // render each non-info item as a template and add to string
        // call isotope insert and pass in the jquery wrapped string.
      for ( var i=0, len=items.length; i<len; ++i ){
        var item = items[i];

        if (item.type != 'info' && item.type !== undefined) {
            // unpack item permissions
            item.mod = item.owner_perms_mask & PERM_MODIFY;
            item.copy = item.owner_perms_mask & PERM_COPY;
            item.trans = item.owner_perms_mask & PERM_TRANSFER;
            
            item.next_mod = item.next_perms_mask & PERM_MODIFY;
            item.next_copy = item.next_perms_mask & PERM_COPY;
            item.next_trans = item.next_perms_mask & PERM_TRANSFER;

            // strip thumbnail if null key
            if (item.thumb === NULL_KEY) {
              delete item.thumb;
            }

            // optionally hide items whose name starts with "."
            if (item.name.charAt(0) === ".") {
                item.hidden = true;
            }
            
            var panestr = $.tmpl($(this.itemTmpl), item);
            console.log(item);
            var res = $(this.frame).isotope('insert', panestr);
            console.log(res);
            var pane = $('.inv_item').last();
            pane.data('info', item);
        } else {
            if (item.more === 1) {
                var newpage = item.page + 1;
                var url = this.buildURL(this.invPath) + "&p=" + newpage;
                this.request(url, this.insertMore, this);
            }
        }
      }
      // hide broken images (any SL image with alpha in it will have no
      // search.secondlife.com thumbnail)
      $('img.thumb').error(function(ev) {
              //console.log(ev);
              $(this).hide();
          });
    },

    onGetClick: function(ev) {
        // pull the info for the item off the parent div.
        var self = ev.data.widget;
        var parent = $(this).parent();
        var info = parent.data('info');

        // do a jsonp request to have the item delivered
        //
        var img = $('<img src="loading.gif" class="loading" />').appendTo($(this).parent());
        var url = self.buildURL(self.givePath) + "&item=" + info.name;
        var context = {
            pane: parent,
            spinner: img
        };
        self.request(url, self.onGetResponse, context);
    },

    onGetResponse: function() {
        // remove the loading spinner
        this.spinner.remove();
    },

    onFilter: function(ev) {
        var self = ev.data.widget;
        var selector = $(this).attr('data-filter');
        $(self.frame).isotope({ filter: selector });

        // change highlighting on the filter bar
        $(self.filters + '.selected').removeClass('selected');
        $(this).addClass('selected');
    },

    onInfo: function(info) {
      // update the header
      $(this.titleTmpl).tmpl(info).appendTo(this.titleContainer);
      // update the actual page title
      $.tmpl('<title>${objname}</title>', info).appendTo('head');
      console.log(info);
    }
};
