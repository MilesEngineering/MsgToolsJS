

if (typeof MsgElement !== "undefined") {
    //console.log('MsgField already loaded')
} else {
function createChildElement(parent, childName) {
    child = document.createElement(childName)
    parent.appendChild(child)
    return child
}

/*
 * Creates a widget based on definition of a message.
 */
class MsgElement extends HTMLElement {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super();
        this.classList = 'msgtools-component';
        this.msgName = (msgName != undefined) ? msgName : this.getAttribute('msgName');
        this.settings = (settings != undefined) ? settings : {};
        if(showHeader != undefined) {
            this.showHeader = showHeader;
        } else {
            this.showHeader = this.hasAttribute('showHeader') ? this.getAttribute('showHeader').toLowerCase() === 'true' : true;
        }
        if(showMsgName != undefined) {
            this.showMsgName = showMsgName;
        } else {
            this.showMsgName = this.hasAttribute('showMsgName') ? this.getAttribute('showMsgName').toLowerCase() === 'true' : false;
        }
        this.shadow = this.attachShadow({mode: 'open'});
        this.editable = editable;
        msgtools.DelayedInit.add(this);
    }
    destroy() {
        msgtools.DelayedInit.remove(this);
    }
    init() {
        this.msgClass = msgtools.findMessageByName(this.msgName);
        if(typeof this.msgClass == "undefined") {
            let error_string = "Error! Message name " + this.msgName + " is not defined";
            let error_elem = createChildElement(this.shadow, 'div');
            error_elem.textContent = error_string;
            console.log(error_string);
            return;
        }

        var fieldNames;
        if(this.hasAttribute('fields')) {
            fieldNames = this.getAttribute('fields').split(",");
        } else {
            fieldNames = [];
        }

        // list of Field Info objects from auto-generated JavaScript code.
        this.fieldInfos = [];
        if(fieldNames.length === 0) {
            for(var i=0; i<this.msgClass.prototype.fields.length; i++) {
                var fi = this.msgClass.prototype.fields[i];
                this.fieldInfos.push(fi);
                fieldNames.push(fi.name);
            }
        } else {
            for(var i=0; i<fieldNames.length; i++) {
                fi = msgtools.findFieldInfo(this.msgClass, fieldNames[i]);
                this.fieldInfos.push(fi);
            }
        }
        this.fieldNames = fieldNames;
        if(this.hasAttribute('labels')) {
            this.fieldNames = this.getAttribute('labels').split(",");
        }
        // list with a HTML element for each field
        this.fields = [];

        // a table that holds everything else
        this.table = createChildElement(this.shadow, 'table');

        if(this.hasAttribute('border')) {
            this.table.setAttribute('border', this.getAttribute('border'));
        } else {
            //TODO default border for table
            //this.table.setAttribute('border', 1);
        }
        this.createFields();

        if('fieldsDisplayed' in this.settings) {
            let fieldNames = Object.keys(this.settings.fieldsDisplayed);
            for(var i=0; i<fieldNames.length; i++) {
                let fieldName = fieldNames[i];
                let fieldSettings = this.settings.fieldsDisplayed[fieldName];
                this.enableField(fieldName, fieldSettings.displayed, fieldSettings.value);
            }
        }
        this.setEditable(this.editable);
    }
    enableField(fieldName, enable, value) {
        if(this.fieldNames != undefined) {
            for(var i=0; i<this.fieldNames.length; i++) {
                if(fieldName == this.fieldNames[i]) {
                    this.fields[i].checkbox.checked = enable;
                    return;
                }
            }
        }
    }

    currentSettings() {
        var settings = {selection : this.msgName};
        if(this.fieldNames != undefined) {
            settings.fieldsDisplayed = {};
            for(var i=0; i<this.fieldNames.length; i++) {
                let fieldName = this.fieldNames[i];
                var fieldSettings = {displayed : this.fields[i].checkbox.checked};
                if (this.fields[i].value != undefined) {
                    fieldSettings.value = this.fields[i].value;
                }
                settings.fieldsDisplayed[fieldName] = fieldSettings;
            }
        }
        return settings;
    }
    settingsChanged() {
        // used to dispatch an event that includes the user's current choice
        var event = new CustomEvent('settingsChanged', {
            detail: this.currentSettings()
        })
        this.dispatchEvent(event);
    }
    // implement resize, so we support the interface required by things that
    // go in MsgSelector
    resize() {
    }
}

/*
 * Displays field values for a message.
 */
class MsgRx extends MsgElement {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super(msgName, settings, showMsgName, showHeader, editable);

        // used for coloring display according to age.
        if(this.hasAttribute('maxAge')) {
            this.maxAge = parseFloat(this.getAttribute('maxAge'));
        } else {
            this.maxAge = -1;
        }
        // time of last reception
        this.rxTime = 0;

        // used to set the colors for the plots
        var themeClass = document.querySelector('body').classList;
        themeClass = Array.from(themeClass);
        this.themeDark = false;
        if(themeClass.includes('dark')){
            this.themeDark = true;
        }
    }
    init() {
        super.init();

        // set a bound callback once, because it's used in dispatch.register and also dispatch.remove,
        // and it needs to be the same pointer both times or it won't get removed.
        this.boundCallback = this.processMsg.bind(this);

        // Register to receive our messages so we can display fields.
        msgtools.MessageClient.dispatch.register(this.msgClass.prototype.MSG_ID, this.boundCallback);
    }
    destroy() {
        if(this.boundCallback) {
            msgtools.MessageClient.dispatch.remove(this.msgClass.prototype.MSG_ID, this.boundCallback);
        }
        // call base-class function
        MsgElement.prototype.destroy.call(this);
    }
    processMsg(msg) {
        for(var i=0; i<this.fieldInfos.length; i++) {
            var fieldInfo = this.fieldInfos[i];
            var color = 'black';
            if(this.themeDark){
                color = 'white';
            }
            var value;
            var str_value;
            for(var elem_number=0; elem_number<fieldInfo.count; elem_number++) {
                if(fieldInfo.count > 1){
                    value = msg[fieldInfo.get](elem_number);
                    if(elem_number == 0) {
                        str_value = value;
                    } else {
                        str_value = str_value + ", " + value;
                        console.log(str_value);
                    }
                } else {
                    value = msg[fieldInfo.get]();
                    str_value = value;
                }
                if(fieldInfo.type === "enumeration") {
                    let int_value = msg[fieldInfo.get](true);
                    // if value was the same as int_value, then it didn't get decoded,
                    // which should count as a red value
                    if(int_value === value) {
                        color = 'red';
                    }
                    value = int_value;
                }
                if(value < fieldInfo.minVal || value > fieldInfo.maxVal) {
                    color = 'red';
                }
                //TODO Need a way to check yellow limits
                else if (value < fieldInfo.minVal || value > fieldInfo.maxVal) {
                    color = 'yellow';
                }
            }
            this.fields[i].textContent = str_value;
            this.fields[i].setAttribute('style', this.fields[i].baseStyle+'color: '+color);
        }
        if(this.maxAge>0) {
            timer.start(this.maxAge, this.rxTimeout.bind(this));
        }
    }
    rxTimeout() {
        if(now > this.rxTime + this.maxAge()) {
            for(var i=0; i<this.fieldInfos.length; i++) {
                this.fields[i].setAttribute('style', this.fields[i].baseStyle+'color: purple');
            }
        }
    }
    setEditable(editable) {
        if(this.fields == undefined) {
            return;
        }
        let checkboxDisplay = (editable) ? "" : "none";
        for(var i=0; i<this.fields.length; i++) {
            var fieldDisplay = "";
            if(editable) {
                fieldDisplay = "";
            } else {
                if(this.fields[i].checkbox.checked) {
                    fieldDisplay = "";
                } else {
                    fieldDisplay = "none";
                }
            }
            this.fields[i].style.display = fieldDisplay;
            if(this.fields[i].associatedWidget != undefined) {
                this.fields[i].associatedWidget.style.display = fieldDisplay;
            }
            if(this.fields[i].checkbox != undefined) {
                this.fields[i].checkbox.style.display = checkboxDisplay;
            }
        }
    }
}

/*
 * Displays as row
 */
class MsgRxRow extends MsgRx {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super(msgName, settings, showMsgName, showHeader, editable);
    }
    createFields() {

        if(this.showMsgName) {
            var tr = createChildElement(this.table, 'tr');
            var td = createChildElement(tr, 'td');
            //tr.setAttribute('style', trStyle);
            td.setAttribute('colspan', this.fieldInfos.length);
            td.textContent = this.msgName;
        }
        if(this.showHeader) {
            var headerRow = createChildElement(this.table, 'tr');
        }
        var tr = createChildElement(this.table, 'tr');
        this.checkboxRow = createChildElement(this.table, 'tr');
        for(var i=0; i<this.fieldInfos.length; i++) {
            var td = createChildElement(tr, 'td');
            td.textContent = '';
            td.baseStyle = 'height: 1em; border: 1px gray solid;';
            td.setAttribute('style', td.baseStyle);

            if(this.showHeader) {
                var headerCell = createChildElement(headerRow, 'td');
                headerCell.textContent = this.fieldNames[i];
                td.associatedWidget = headerCell;
            }

            var checkbox_td = createChildElement(this.checkboxRow, 'td');
            var checkbox = createChildElement(checkbox_td, 'input');
            checkbox.setAttribute('type', 'checkbox');
            checkbox.setAttribute('checked', 'checked');
            checkbox.onclick = this.settingsChanged.bind(this);
            td.checkbox = checkbox;

            this.fields.push(td);
        }
    }
    setEditable(editable) {
        if(this.fields == undefined) {
            return;
        }
        if(editable) {
            this.checkboxRow.style.display = "";
        } else {
            this.checkboxRow.style.display = "none";
        }
        MsgRx.prototype.setEditable.call(this, editable);
    }
}

/*
 * Displays as column.
 */
class MsgRxColumn extends MsgRx {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super(msgName, settings, showMsgName, showHeader, editable);
    }
    createFields() {
        if(this.showMsgName) {
            var tr = createChildElement(this.table, 'tr');
            var td = createChildElement(tr, 'td');
            td.setAttribute('colspan', '2');
            td.textContent = this.msgName;
        }
        for(var i=0; i<this.fieldInfos.length; i++) {
            var tr = createChildElement(this.table, 'tr');
            if(this.showHeader) {
                let td = createChildElement(tr, 'td');
                let tdHeadStyle = `color: var(--color-text, black);
                                   text-align: right;
                                   padding-right: 15px;
                                   width: 10%;
                                  `;
                td.setAttribute('style', tdHeadStyle);
                td.textContent = this.fieldNames[i];
            }
            var td = createChildElement(tr, 'td');
            var tdStyle = `background-color: var(--background-color, white);
                           color: var(--color-dark, black);
                           border-radius: var(--input-radius, 2px);
                           width: 50%;
                           min-width: 300px;
                           padding: var(--input-padding, 10px 15px);
                           height: 30px;
                          `
            td.textContent = '';
            td.setAttribute('style', tdStyle);

            var checkbox_td = createChildElement(tr, 'td');
            var checkbox = createChildElement(checkbox_td, 'input');
            checkbox.setAttribute('type', 'checkbox');
            checkbox.setAttribute('checked', 'checked');
            checkbox.onclick = this.settingsChanged.bind(this);
            td.checkbox = checkbox;
            td.associatedWidget = tr;

            this.fields.push(td);
        }
    }
}

/*
 * Edit field values for a message.
 */
class MsgTx extends MsgElement {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super(msgName, settings, showMsgName, showHeader, editable);
    }
    init() {
        super.init();
    }
    sendClicked() {
        var msg = new this.msgClass();
        for(var i=0; i<this.fieldInfos.length; i++) {
            var fieldInfo = this.fieldInfos[i];
            if(fieldInfo.count > 1){
                var values = this.fields[i].value.split(",");
                for(var elem_number=0; elem_number<fieldInfo.count; elem_number++) {
                    var value = values[elem_number];
                    msg[fieldInfo.set](value, elem_number);
                }
            } else {
                var value = this.fields[i].value;
                msg[fieldInfo.set](value);
            }
        }
        msgtools.client.sendMessage(msg);
    }
    editWidget(fieldInfo) {
        let inputStyle =  `font-size: var(--base-font-size, 18px);
                           margin: var(--input-margin, 0 15px 0 0);
                           border-color: var(--color-text, black);
                           height: var(--input-height, 35px);
                           background: var(--input-background, white);
                           color: var(--input-color, black);
                           border-color: var(--input-border-color, black);
                          `;
        let selectStyle = `font-size: var(--base-font-size, 18px);
                           color: var(--input-color, black);
                          `;

        var w;
        if(fieldInfo.type === "enumeration") {
            // make a dropdown list for enums
            w = document.createElement('select');
            w.setAttribute('style', inputStyle);

            let lookup = fieldInfo.enumLookup[0]; // forward lookup is #0
            for(var name in lookup) {
                var value = lookup[name];
                var option = createChildElement(w, 'option');
                option.setAttribute('style', selectStyle);
                option.setAttribute('value', value);
                option.textContent = name;
            }
        } else {
            // make a text edit for anything else
            w = document.createElement('input');
            w.setAttribute('style', inputStyle);
            w.setAttribute('type', 'text');
        }
        return w;
    }
    sendButton() {
        var sendBtn = document.createElement('input');
        var btnStyle = `background-color: var(--color-alert, white);
                        border-color: var(--color-alert, black);
                        color: var(--btn-color, black);
                        border-radius: var(--btn-radius, 2px);
                        border-width: var(--btn-border-width, 1px);
                        font-size: var(--lg-font-size, 16px);
                        margin-top: var(--btn-margin-top, 2em);
                        padding: var(--btn-padding, 6px 12px);
                        font-weight: var(--main-font-weight, bold);
                        text-transform: var(--header-text-transform, uppercase);
                        letter-spacing: var(--header-text-letter-spacing, .035em);
                        cursor: pointer;
                        outline: 0;
                       `
        sendBtn.setAttribute('type', 'button');
        sendBtn.setAttribute('value', 'Send');
        sendBtn.onclick = this.sendClicked.bind(this);
        sendBtn.setAttribute('style', btnStyle);
        return sendBtn;
    }
    setEditable(editable) {
        if(this.fields == undefined) {
            return;
        }
        let checkboxDisplay = (editable) ? "" : "none";
        for(var i=0; i<this.fields.length; i++) {
            var fieldDisplay = "";
            if(editable) {
                fieldDisplay = "";
            } else {
                if(this.fields[i].checkbox.checked) {
                    fieldDisplay = "";
                } else {
                    fieldDisplay = "none";
                }
            }
            this.fields[i].style.display = fieldDisplay;
            if(this.fields[i].associatedWidget != undefined) {
                this.fields[i].associatedWidget.style.display = fieldDisplay;
            }
            if(this.fields[i].checkbox != undefined) {
                this.fields[i].checkbox.style.display = checkboxDisplay;
            }
        }
    }
    enableField(fieldName, enable, value) {
        if(this.fieldNames != undefined) {
            for(var i=0; i<this.fieldNames.length; i++) {
                if(fieldName == this.fieldNames[i]) {
                    this.fields[i].checkbox.checked = enable;
                    this.fields[i].value = value;
                    return;
                }
            }
        }
    }
}

/*
 * Edit field values for a message in a row.
 */
class MsgTxRow extends MsgTx {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super(msgName, settings, showMsgName, showHeader, editable);
    }
    createFields() {
        let checkboxStyle = `font-size: var(--base-font-size, 18px);
                             margin: var(--checkbox-margin, 3px);
                             border-color: var(--color-text, black);
                             height: var(--checkbox-height, 35px);
                             background: var(--input-background, white);
                             color: var(--input-color, black);
                             `;

        if(this.showMsgName) {
            var tr = createChildElement(this.table, 'tr');
            var td = createChildElement(tr, 'td');
            td.setAttribute('colspan', this.fieldInfos.length);
            td.textContent = this.msgName;
        }
        if(this.showHeader) {
            var headerRow = createChildElement(this.table, 'tr');
        }
        var tr = createChildElement(this.table, 'tr');
        this.checkboxRow = createChildElement(this.table, 'tr');
        for(var i=0; i<this.fieldInfos.length; i++) {
            var fieldInfo = this.fieldInfos[i];
            var td = createChildElement(tr, 'td');
            var editWidget = this.editWidget(fieldInfo);
            editWidget.addEventListener('change', this.settingsChanged.bind(this));
            td.appendChild(editWidget);

            if(this.showHeader) {
                var headerCell = createChildElement(headerRow, 'td');
                headerCell.textContent = this.fieldNames[i];
                editWidget.associatedWidget = headerCell;
            }

            var checkbox_td = createChildElement(this.checkboxRow, 'td');
            var checkbox = createChildElement(checkbox_td, 'input');
            checkbox.setAttribute('style', checkboxStyle);
            checkbox.setAttribute('type', 'checkbox');
            checkbox.setAttribute('checked', 'checked');
            checkbox.onclick = this.settingsChanged.bind(this);
            editWidget.checkbox = checkbox;

            this.fields.push(editWidget);
        }
        var tr = createChildElement(this.table, 'tr');
        var td = createChildElement(tr, 'td');
        td.setAttribute('colspan', this.fieldInfos.length);
        td.appendChild(this.sendButton());
    }
    setEditable(editable) {
        if(this.fields == undefined) {
            return;
        }
        if(editable) {
            this.checkboxRow.style.display = "";
        } else {
            this.checkboxRow.style.display = "none";
        }
        MsgTx.prototype.setEditable.call(this, editable);
    }
}

/*
 * Edit field values for a message in a column.
 */
class MsgTxColumn extends MsgTx {
    constructor(msgName = undefined, settings = undefined, showMsgName = undefined, showHeader = undefined, editable = false) {
        super(msgName, settings, showMsgName, showHeader, editable);
    }
    createFields() {
        let checkboxStyle = `font-size: var(--base-font-size, 18px);
                             margin: var(--checkbox-margin, 3px);
                             border-color: var(--color-text, black);
                             height: var(--checkbox-height, 35px);
                             background: var(--input-background, white);
                             color: var(--input-color, black);
                             `;
        if(this.showMsgName) {
            var tr = createChildElement(this.table, 'tr');
            var td = createChildElement(tr, 'td');
            td.setAttribute('colspan', '2');
            td.textContent = 'Message: ' + this.msgName;
        }
        for(var i=0; i<this.fieldInfos.length; i++) {
            var fieldInfo = this.fieldInfos[i];
            var tr = createChildElement(this.table, 'tr');
            if(this.showHeader) {
                var td = createChildElement(tr, 'td');
                td.textContent = this.fieldNames[i];
            }
            var td = createChildElement(tr, 'td');
            var editWidget = this.editWidget(fieldInfo);
            editWidget.addEventListener('change', this.settingsChanged.bind(this));
            td.appendChild(editWidget);

            var checkbox_td = createChildElement(tr, 'td');
            var checkbox = createChildElement(checkbox_td, 'input');
            checkbox.setAttribute('style', checkboxStyle);
            checkbox.setAttribute('type', 'checkbox');
            checkbox.setAttribute('checked', 'checked');
            checkbox.onclick = this.settingsChanged.bind(this);
            editWidget.checkbox = checkbox;
            editWidget.associatedWidget = tr;

            this.fields.push(editWidget);
        }
        var tr = createChildElement(this.table, 'tr');
        var td = createChildElement(tr, 'td');
        td.setAttribute('colspan', '2');
        td.appendChild(this.sendButton());
    }

}


// This should be run after we're confident that all of the uses of the
// tag have been defined, so that our calls to getAttribute will succeed.
// (Also after any remaining dependencies are loaded.)
// Best plan is just to import this whole file at the end of your HTML.
customElements.define('msgtools-msgrxrow', MsgRxRow);
customElements.define('msgtools-msgrx', MsgRxColumn);
customElements.define('msgtools-msgtxrow', MsgTxRow);
customElements.define('msgtools-msgtx', MsgTxColumn);

window.MsgRxRow = MsgRxRow;
window.MsgRxColumn = MsgRxColumn;
window.MsgTxRow = MsgTxRow;
window.MsgTxColumn = MsgTxColumn;
}
