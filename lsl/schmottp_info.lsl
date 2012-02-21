integer HTTP_RESPONSE = -85432;

integer mychannel;

//strided list of key/value pairs for returning on INFO_REQUEST
list info;

string version = "2.3";

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

string GetCallback(string qstring) {
    list qparams = llParseString2List(qstring, ["&", "="], []);
    return GetParam(qparams, "callback");
}

string WrapCallback(string resp, string callback) {
    return callback + "(" + resp + ")";
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

list GetQuickInfo(string qstring) {
    //return a list of information about this prim and request.
    //only include info from functions that can be called synchronously.
    list things = [
        "objkey", llGetKey(),
        "objname", llGetObjectName(),
        "objdesc", llGetObjectDesc(),
        "pos", llGetPos(),
        "regioncorner", llGetRegionCorner(),
        "regionname", llGetRegionName(),
        "ownerkey", llGetOwner(),
        "schmarchive_version", version
    ];
    
    //add userkey if present in querystring
    list qparams = llParseString2List(qstring, ["&", "="], []);
    string userkey = GetParam(qparams, "userkey");
    if (userkey != "-1") {
        things += ["userkey", userkey];
        string username = llGetUsername((key)userkey);
        if (username != "") {
            things += ["username", username];
            things += ["displayname", llGetDisplayName(userkey)];
        }
    }
    
    return things;
}

//for fetching owner name reliably.
key nameid;

default
{
    state_entry()
    {
        //set my channel from my script name
        string myname = llGetScriptName();
        list parts = llParseString2List(myname, [":"], []);
        mychannel = (integer)llList2String(parts, -1);
        nameid = llRequestAgentData(llGetOwner(), DATA_NAME);
    }

    link_message(integer sender, integer num, string str, key id) {
        if (num == mychannel) {
            list all_info = info + GetQuickInfo(str);
            string json = Strided2JSON(all_info);
            string callback = GetCallback(str);
            llMessageLinked(LINK_SET, HTTP_RESPONSE, WrapCallback(json, callback), id);
        }
    }
    
    dataserver(key id, string data) {
        if (id == nameid) {
            //update info list with name.  assume that it's not already in there.
            info += ["ownername", data];
        }
    }
}

