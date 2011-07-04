integer HTTP_RESPONSE = -85432;

integer mychannel;

string CSS_FILE = ".css";
key CSS_FILE_KEY;
string css;
list lines;
integer linecount;
key linecountid;

ReadCSS() {
    // read the css file, if present
    // experimenting with a new parallel line-reading method.
    if (llGetInventoryType(CSS_FILE) == INVENTORY_NOTECARD) {
        lines = [];
        linecount = 0;
        linecountid = llGetNumberOfNotecardLines(CSS_FILE);
        CSS_FILE_KEY = llGetInventoryKey(CSS_FILE);
    }    
}

default
{
    state_entry()
    {
        //set my channel from my script name
        string myname = llGetScriptName();
        list parts = llParseString2List(myname, [":"], []);
        mychannel = (integer)llList2String(parts, -1);      
        
        ReadCSS();
    }

    link_message(integer sender, integer num, string str, key id) {
        if (num == mychannel) {
            llMessageLinked(LINK_SET, HTTP_RESPONSE, css, id);            
        }
    }
    
    dataserver(key id, string data) {
        integer index = llListFindList(lines, [id]);
        if (id == linecountid) {
            // we got the number of lines.  Now request them all at once.
            lines = [];
            linecount = (integer)data;
            integer n = 0;
            for (n = 0; n < linecount; n++) {
                lines += [llGetNotecardLine(CSS_FILE, n)];
            }
        } else if (index != -1) {
            linecount--;
            lines = llListReplaceList(lines, [data], index, index);
            
            if (linecount == 0) {
                css = llDumpList2String(lines, "\n");
                lines = [];
            }
        }
    }
    
    changed(integer change) {
        if (change & CHANGED_INVENTORY) {
            // re-read the css file if it has changed.
            if (llGetInventoryKey(CSS_FILE) != CSS_FILE_KEY) {
                ReadCSS();
            }
        }
    }
}

