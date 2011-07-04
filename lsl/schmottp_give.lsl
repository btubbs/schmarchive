integer HTTP_RESPONSE = -85432;

integer mychannel;

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

string WrapCallback(string resp, string callback) {
    return callback + "(" + resp + ")";
}

string GetParam(list things, string tok) {
    //return "-1" if not found
    integer index = llListFindList(things, [tok]);
    if (index == -1) {
        return "";
    } else {
        return llList2String(things, index + 1);
    }
}

debug(string text) {
    //llOwnerSay(llGetScriptName() + ": " + text);
}

default
{
    state_entry()
    {
        //set my channel from my script name
        string myname = llGetScriptName();
        list parts = llParseString2List(myname, [":"], []);
        mychannel = (integer)llList2String(parts, -1);
    }

    link_message(integer sender, integer num, string str, key id) {
        if (num == mychannel) {
            //get the userkey and item name from the qstring
            list qparams = llParseString2List(str, ["&", "="], []);            
            key av = (key)GetParam(qparams, "av");
            string item = llUnescapeURL(GetParam(qparams, "item"));
            list info;            
            if (av != "" && item != "" && llGetInventoryType(item) != INVENTORY_NONE) {
                llGiveInventory(av, item);
                info = ["result", "success"];                
            } else {
                info = ["result", "failed"];
            }
            string json = Strided2JSON(info);
            string callback = GetParam(qparams, "callback");
            llMessageLinked(LINK_SET, HTTP_RESPONSE, WrapCallback(json, callback), id);
        }
    }
}

