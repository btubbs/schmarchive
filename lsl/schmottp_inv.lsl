integer HTTP_RESPONSE = -85432;

integer mychannel;

list inv_types = [
    "0", "texture",
    "1", "sound",
    "3", "landmark",
    "5", "clothing",
    "6", "object",
    "7", "notecard",
    "10", "script",
    "13", "bodypart",
    "20", "animation",
    "21", "gesture"
];

integer LIMIT = 30;

string CACHE;
integer CACHE_PAGE = -1;

string InventoryString(integer type, integer page) {
    list out;
    integer n;
    integer stop = llGetInventoryNumber(type);
    
    if (page < 0) {
        page = 0;
    }
    
    //now calculate offset based on page
    integer offset = page * LIMIT;
    
    integer more = FALSE;
    // if offset + limit < stop, then stop sooner
    if (offset + LIMIT < stop) {
        stop = offset + LIMIT;
        more = TRUE;
    }
    
    for (n = offset; n < stop; n++) {
        string name = llGetInventoryName(type, n);
        out += [Item2JSON(name)];
    }
    
    //last item is info about whether there are more things to request
    out += Strided2JSON([
        "page", page,
        "more", more,
        "type", "info"
    ]);
    
    return List2JS(out);
}

string Item2JSON(string name) {
    //return a JSON string with info about the item.
    integer type = llGetInventoryType(name);
    list info = [
        "name", name, 
        "type", GetParam(inv_types, (string)type),
        "key", llGetInventoryKey(name),
        "creatorkey", llGetInventoryCreator(name),
        "owner_perms_mask", llGetInventoryPermMask(name, MASK_OWNER),
        "next_perms_mask", llGetInventoryPermMask(name, MASK_NEXT)        
    ];
    
    //add thumbnail if item is a texture, or if there's a .thumb image in the prim for it.
    //if there's both, then .thumb wins (allows creating thumbnails for textures that aren't
    //in sl search, like those with alpha in them.
    string thumbname = ".thumb:" + name;
    if (llGetInventoryType(thumbname) == INVENTORY_TEXTURE) {
        info += ["thumb", llGetInventoryKey(thumbname)];
    } else if (type == INVENTORY_TEXTURE) {
        info += ["thumb", llGetInventoryKey(name)];
    }

    return Strided2JSON(info);   
}

string List2JS(list things) {
    string inner = llDumpList2String(things, ",");
    return "[" + inner + "]";
}

string Strided2JSON(list strided)
{//takes a 2-strided list and returns a JSON-formatted string representing the list as an object
    list outlist;
    integer n;
    integer stop = llGetListLength(strided);
    for (n = 0; n < stop; n += 2)
    {
        string token = llList2String(strided, n);
        string value = llList2String(strided, n + 1);
        integer type = llGetListEntryType(strided, n + 1);
        if (type != TYPE_INTEGER && type != TYPE_FLOAT)
        {//JSON needs quotes around everything but integers and floats
            value = "\"" + value + "\"";
        }
        token = "\"" + token + "\"";
        
        outlist += [token + ": " + value];
    }
    return "{" + llDumpList2String(outlist, ", ") + "}";
}

string GetParam(list things, string tok) {
    //return "-1" if not found
    integer index = llListFindList(things, [tok]);
    if (index == -1) {
        return "-1";
    } else {
        return llList2String(things, index + 1);
    }
}

string WrapCallback(string resp, string callback) {
    return callback + "(" + resp + ")";
}

debug(string text) {
//    llOwnerSay(llGetScriptName() + ": " + text);
}

default {
    state_entry()
    {
        //set my channel from my script name
        string myname = llGetScriptName();
        list parts = llParseString2List(myname, [":"], []);
        mychannel = (integer)llList2String(parts, -1);
        CACHE = InventoryString(INVENTORY_ALL, 0);
        CACHE_PAGE = 0;
    }    
    
    link_message(integer sender, integer num, string qstring, key id) {
        if (num == mychannel) {
            list qparams = llParseString2List(qstring, ["&", "="], []);
            string callback = GetParam(qparams, "callback");
            integer page = (integer)GetParam(qparams, "p");
            if (page < 0) {
                page = 0;
            }
            
            if (page != CACHE_PAGE) {
                CACHE = InventoryString(INVENTORY_ALL, page);
                CACHE_PAGE = page;                
            }

            llMessageLinked(LINK_SET, HTTP_RESPONSE, WrapCallback(CACHE, callback), id);
            
            // keep page 0 around when not actively loading
            if (CACHE_PAGE != 0) {
                llSetTimerEvent(10);
            }
        }
    }
    
    timer() {
        llSetTimerEvent(0);
        CACHE = InventoryString(INVENTORY_ALL, 0);
        CACHE_PAGE = 0;        
    }
}

