/*
 * Plots fields of a message.
 */
if (typeof MsgPlot !== "undefined") {
    console.log('MsgPlot already loaded')
} else {

 class MsgPlot extends MsgBasePlot {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super();
        this.msgName = (msgName != undefined) ? msgName : this.getAttribute('msgName');
        this.settings = settings;
        this.editable = editable;

        msgtools.DelayedInit.add(this);
    }
    init() {
        this.msgClass = msgtools.findMessageByName(this.msgName);
        if(typeof this.msgClass == "undefined") {
            let error_string = "Error! Message name " + this.msgName + " is not defined";
            let error_elem = document.createElement('div');
            this.shadow.appendChild(error_elem);
            error_elem.textContent = error_string;
            console.log(error_string);
            return;
        }
        // List of field info for each field we want to plot
        this.fieldInfos = [];
        // for any fields we're plotting that are arrays, this is a hash table to store a
        // list of the array element numbers to plot for each field, looked up by field name
        this.fieldArrayElems = {}

        if(this.hasAttribute('labels')) {
            var fieldNames = this.getAttribute('labels').split(",");
        }
        if(this.hasAttribute('fields')) {
            var fieldNames = this.getAttribute('fields').split(",");
        }
        if(fieldNames == undefined) {
            //# Do we need to limit this if there's too many?  What if there's thousands of fields?
            //# What about plotting bitfields?
            let labels = [];
            for(var i=0; i<this.msgClass.prototype.fields.length; i++) {
                var fi = this.msgClass.prototype.fields[i];
                //# skip string fields
                if(fi.units == 'ASCII')
                {
                    continue;
                }
                this.fieldInfos.push(fi);
                if(fi.count > 1){
                    // list of array elements to plot
                    this.fieldArrayElems[fi.name] = []
                    for(var elem_number=0; elem_number<fi.count; elem_number++) {
                        labels.push(fi.name+"["+elem_number+"]");
                        this.fieldArrayElems[fi.name].push(elem_number);
                    }
                }
                else {
                    labels.push(fi.name);
                }
            }
            // If field names aren't defined, we should plot every field, and use the field names
            // as labels in the plot legend
            this.configureDataSets(labels);
            // resize after configuring labels, or they don't show up on the legend
            this.resize();
        } else {
            // Make lists of field info and labels for plots based on field names.
            let labels = [];
            for(var i=0; i<fieldNames.length; i++) {
                var fieldName = fieldNames[i];

                // if the name looks like an array index, handle it like an array
                if(fieldName.includes('[') && fieldName.includes(']') ) {
                    fieldBaseName = fieldName;
                    fieldBaseName.remove("[.*]");
                    let fieldInfo = msgtools.findFieldInfo(this.msgClass, fieldBaseName);
                    if (fieldInfo === undefined) {
                        console.log('error: fieldName ' + fieldBaseName + ' is not in ' + this.msgName);
                    } else {
                        this.fieldInfos.push(fieldInfo);
                    }

                    // if the hash table of lists of array elements to plot doesn't have a list
                    // for our field yet, add it.
                    if(!fieldBaseName in this.fieldArrayElems) {
                        this.fieldArrayElems[fieldBaseName] = [];
                    }

                    // figure out what element it is
                    var elem_number = fieldName;
                    elem_number.removeStart(fieldBaseName);
                    elem_number.removeStart("[");
                    elem_number.removeStart("]");
                    elem_number = int(elem_number);
                    if(elem_number != undefined) {
                        // if they specified an array element number, use it
                        //# check if it's valid
                        this.fieldArrayElems[fieldBaseName].push(elem_number);
                        labels.push(fieldName);
                    } else {
                        // if they gave empty brackets, then plot all array elements
                        //# do we need to limit the count here?  what if it's thousands of array elements?
                        for(var elem_number=0; elem_number<fi.count; elem_number++) {
                            this.fieldArrayElems[fi.name].push(elem_number);
                            var elemName = fieldBaseName+"["+elem_number+"]";
                        }
                    }
                } else {
                    let fieldInfo = msgtools.findFieldInfo(this.msgClass, fieldName);
                    if (fieldInfo === undefined) {
                        console.log('error: fieldName ' + fieldName + ' is not in ' + this.msgName);
                    } else {
                        this.fieldInfos.push(fieldInfo);
                        labels.push(fieldName);
                    }
                }
            }
            // only actually set the plot legend labels if the user *DIDN'T* specify them
            // separately from fieldNames.  If they specified both fieldNames and labels,
            // assume they know what they're doing and want to override the labels
            // specifically instead of using field names as labels.
            if(!this.hasAttribute('labels')) {
                this.configureDataSets(labels);
                // resize after configuring labels, or they don't show up on the legend
                this.resize();
            }
        }

        // set a bound callback once, because it's used in dispatch.register and also dispatch.remove,
        // and it needs to be the same pointer both times or it won't get removed.
        this.boundCallback = this.plot.bind(this);

        // Register to receive our messages so we can plot fields from them.
        msgtools.MessageClient.dispatch.register(this.msgClass.prototype.MSG_ID, this.boundCallback);
    }

    destroy() {
        msgtools.DelayedInit.remove(this);
        if(this.boundCallback) {
            msgtools.MessageClient.dispatch.remove(this.msgClass.prototype.MSG_ID, this.boundCallback);
        }
    }

    plot(msg) {
        var time = msg.hdr.GetTime();
        var newData = [];
        // iterate over all our field infos, and get the value of each field
        for(var i=0; i<this.fieldInfos.length; i++) {
            // if we have a list of array elements for a field, iterate over the
            // values at the specified indicies and get those values.
            var fieldInfo = this.fieldInfos[i];
            if(fieldInfo.name in this.fieldArrayElems) {
                let fieldElemsToPlot = this.fieldArrayElems[fieldInfo.name];
                for(var elem_index=0; elem_index<fieldElemsToPlot.length; ++elem_index) {
                    let elem_number = fieldElemsToPlot[elem_index];
                    let value = msg[fieldInfo.get](elem_number);
                    newData.push(value);
                }
            } else {
                var value;
                if(fieldInfo.enumLookup == []) {
                    value = msg[fieldInfo.get]();
                } else {
                    // for enums, plot the integer value
                    value = msg[fieldInfo.get](/*enumAsInt=*/true);
                }
                newData.push(value);
            }
        }
        super.plot(time, newData);
    }

    currentSettings() {
        return {selection : this.msgName};
    }
    updateSettings(settings) {
        if('fieldsDisplayed' in settings) {
            Object.keys(settings.fieldsDisplayed).forEach(function (fieldName) {
                var displayed = settings.fieldsDisplayed[fieldName];
                console.log(fieldName + " = " + displayed);
            })
        }
    }

    setEditable(editable) {
        console.log('setEditable('+editable+')');
        if(editable) {
        } else {
        }
    }
}

customElements.define('msgtools-msgplot', MsgPlot);
window.MsgPlot = MsgPlot;

}
