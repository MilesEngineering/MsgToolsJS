if (typeof MsgSelector !== "undefined") {
    console.log('MsgSelector already loaded')
} else {

function stringToClass(str) {
    var arr = str.split(".");

    var fn = (window || this);
    for (var i = 0, len = arr.length; i < len; i++) {
        fn = fn[arr[i]];
    }

    if (typeof fn !== "function") {
        throw new Error("function not found");
    }

    return  fn;
};

function createChildElement(parent, childName) {
    child = document.createElement(childName);
    parent.appendChild(child);
    return child;
}

let headerStyle = `font-size: var(--base-font-size, 18px);
                   margin: var(--input-margin, 0 15px 0 0);
                   border-color: var(--color-text, black);
                   height: var(--input-height, 35px);
                  `;

let spanStyle = `line-height: var(--input-height, 35px);`

let lockButtonStyle = `width: 18px;
                       height: 18px;
                       margin-right: 15px;
                       padding: 1px;
                       border: none;

                      `;
let lockButtoneditableStyle = `background: var(--editable-lock-btn-background,
                               no-repeat center/100% url('/html/msgtools/style/icon-unlock.png'));`;
let lockButtonlockedStyle = `background: var(--locked-lock-btn-background,
                             no-repeat center/100% url('/html/msgtools/style/icon-lock.png'));`;

lockButtoneditableStyle = lockButtonStyle + lockButtoneditableStyle;
lockButtonlockedStyle = lockButtonStyle + lockButtonlockedStyle;

class MsgSelector extends HTMLElement {
    constructor(handler, selection, settings, filter) {
        super();
        if (handler !== undefined) {
            this.handler = stringToClass(handler);
        } else {
            this.handler = stringToClass(this.getAttribute('handler'));
        }
        if (selection !== undefined) {
            this.selection = selection;
        } else {
            this.selection = this.getAttribute('selection');
        }
        if (selection == undefined || selection == "") {
            this.editable = true;
        } else {
            this.editable = false;
        }
        if (settings !== undefined) {
            this.settings = settings;
        } else {
            this.settings = {};
        }
        if (filter !== undefined) {
            this.filter = filter;
        } else {
            this.filter = this.hasAttribute('filter') ? this.getAttribute('filter') : '';
        }

        let msgSelectorStyle = "display: var(--msg-selector-display, block);";

        this.setAttribute('style', msgSelectorStyle);

        let controlDisplay = (this.editable) ? "" : "none";
        let labelDisplay = (this.editable) ? "none" : "";

        this.shadow = this.attachShadow({mode: 'open'});
        this.parentDiv = createChildElement(this.shadow, 'div');
        this.parentDiv.style = 'display: flex; flex-flow: column; height: 100%;';

        this.headerRow = createChildElement(this.parentDiv, 'div');
        this.headerRow.style = 'display: flex; width: auto; align-items: center;';

        this.lockButton = createChildElement(this.headerRow, 'button');
        this.lockButton.classList = this.editable ? 'editable' : 'locked';
        this.lockButton.style = this.editable ? lockButtoneditableStyle : lockButtonlockedStyle;
        this.lockButton.onclick = this.lockClicked.bind(this);

        this.msgLabel = createChildElement(this.headerRow, 'span');
        this.msgLabel.setAttribute('style', headerStyle + spanStyle);
        this.msgLabel.style.display = "none";
        this.msgLabel.style.display = labelDisplay;

        this.msgLabelEditBox = createChildElement(this.headerRow, 'input');
        this.msgLabelEditBox.setAttribute('style', headerStyle);
        this.msgLabelEditBox.onchange = this.msgLabelChanged.bind(this);
        this.msgLabelEditBox.style.display = controlDisplay;

        // list of dropdowns to navigate message hierarchy
        this.dropdowns = [];
        this.handlerObj = undefined;
        msgtools.DelayedInit.add(this);
    }

    init() {
        // Create the top-level drop down list, and specify it's not user activated.
        this.createDropDownList(0, msgtools.msgs, false);

        // If there's a selection, use it.
        if(this.selection != undefined && this.selection != "") {
            const initialSelections = this.selection.split('.');
            for(var i = 0; i < initialSelections.length; i++){
                this.dropdowns[i].value = initialSelections[i];
                // force component to load the msg fields
                this.itemSelectionChanged(i, false);
            }
        } else {
            // disable blanking the first choice...
            //this.dropdowns[0].value = '';

            // kickoff the first choice as if it were user activated.
            // that will end up causing the first choice of each dropdown
            // to be selected.
            this.itemSelectionChanged(0, true);
        }
    }

    destroy() {
        msgtools.DelayedInit.remove(this);
        this.destroyHandler();
    }

    destroyHandler() {
        if(this.handlerObj) {
            this.handlerObj.destroy();
        }
    }

    createDropDownList(depth, msgtree, user_activated) {

        let dropdownStyle = headerStyle + `
                             min-width: var(--input-width, 100px);
                             background: var(--background-color, white);
                             `;

        let controlDisplay = (this.editable) ? "" : "none";
        let dropdown = createChildElement(this.headerRow, 'select');
        dropdown.onchange = this.ondropdownchange.bind(this);
        dropdown.setAttribute('style', dropdownStyle);
        dropdown.style.display = controlDisplay;
        dropdown.depth = depth;
        for(const name of Object.keys(msgtree).sort()) {
            //skip over top-level "Network" messages.
            if(depth == 0 && name == 'Network') {
                continue;
            }
            // only add items if aren't a message (meaning they are a directory)
            // OR if the filter is empty,
            // OR if the filter matches.
            let value=msgtree[name];
            if(value == undefined || value.prototype == undefined || this.filter == '' || name.startsWith(this.filter)) {
                let option = createChildElement(dropdown, 'option');
                option.textContent = name;
            }
        }
        this.dropdowns.push(dropdown);
        if(user_activated) {
            this.itemSelectionChanged(depth, user_activated);
        }
    }
    ondropdownchange(e) {
        e.stopPropagation();
        let dropdown = e.target;
        let depth = dropdown.depth;
        this.itemSelectionChanged(depth, true);
    }
    itemSelectionChanged(depth, user_activated) {
        let node = msgtools.msgs;
        for(let i=0; i<=depth; i++) {
            let dropdownvalue = this.dropdowns[i].value;
            node = node[dropdownvalue];
        }
        // throw away everything after the dropdown that just had something selected
        while(this.dropdowns.length > depth+1) {
            let item = this.dropdowns.pop();
            // call destroy, if it exists on anything we're throwing away.
            if(item.destroy != undefined) {
                item.destroy()
            }
            if(this.headerRow.contains(item)){
                this.headerRow.removeChild(item);
            }
            if(this.parentDiv.contains(item)){
                this.parentDiv.removeChild(item);
            }
        }
        // create a new thing after us: either another dropdown, or a message
        if(node.prototype != undefined) {
            this.createHandlerObj(node, user_activated);
        } else {
            this.createDropDownList(depth+1, node, user_activated);
        }
    }
    createHandlerObj(msgclass, user_activated) {
        // destroy the old handler
        this.destroyHandler();

        // set up labels, with either existing setting, or default value.
        if(user_activated || !('msgLabel' in this.settings)) {
            this.msgLabelEditBox.value = msgclass.prototype.MSG_NAME;
            this.msgLabel.textContent = msgclass.prototype.MSG_NAME;
        } else {
            this.msgLabelEditBox.value = this.settings.msgLabel;
            this.msgLabel.textContent = this.settings.msgLabel;
        }
        if(this.handler != undefined) {
            this.handlerObj = new this.handler(msgclass.prototype.MSG_NAME, this.settings, false, true, this.editable);
            this.handlerObj.style = `flex: 1 1 auto; border:
                                     padding: var(--selector-display-padding, 0);
                                    `;
            this.parentDiv.appendChild(this.handlerObj);
            this.dropdowns.push(this.handlerObj);
            // not sure why this is necessary, but without it, plots see their parent's
            // getBoundingClientRect() as 150 pixels tall.
            this.handlerObj.resize();
            this.handlerObj.addEventListener('settingsChanged', this.settingsChanged.bind(this));

            // If the user made a selection, update settings.
            if(user_activated) {
                this.settingsChanged();
            }
        }
    }

    settingsChanged() {
        var settings = this.currentSettings();
        // used to dispatch an event that includes the user's current choice
        var event = new CustomEvent('settingsChanged', {
            detail: settings
        })
        this.dispatchEvent(event);
    }

    currentSettings(){
        var settings =
        {handler : this.handler.name,
         msgLabel : this.msgLabelEditBox.value};
        if(this.handlerObj != undefined) {
            settings = {...this.handlerObj.currentSettings(), ...settings};
        }
        return settings;
    }

    resize(width, height) {
        if(this.handlerObj != undefined) {
            // for some reason i can't seem to compute an offset that works exactly right,
            // i need to do *2 to seem to come close.
            let top = this.headerRow.scrollHeight+this.parentDiv.offsetTop*2;
            let left = this.parentDiv.offsetLeft+this.handlerObj.offsetLeft*2;
            this.handlerObj.resize(width-left, height-top);
        }
    }

    setEditable(editable) {
        this.editable = editable;
        let controlDisplay = (editable) ? "" : "none";
        let labelDisplay = (editable) ? "none" : "";
        this.msgLabel.style.display = labelDisplay;
        this.msgLabelEditBox.style.display = controlDisplay;
        for(var i=0; i<this.dropdowns.length-1; i++) {
            this.dropdowns[i].style.display = controlDisplay;
        }
        if(this.handlerObj != undefined) {
            this.handlerObj.setEditable(editable);
        }
        this.lockButton.classList = editable ? 'editable' : 'locked';
        this.lockButton.style = editable ? lockButtoneditableStyle : lockButtonlockedStyle;

    }

    lockClicked() {
        if(this.lockButton.classList == 'editable') {
            this.setEditable(false);
        } else {
            this.setEditable(true);
        }
    }

    msgLabelChanged() {
        this.msgLabel.textContent = this.msgLabelEditBox.value;
        this.settingsChanged();
    }
}

customElements.define('msgtools-msgselector', MsgSelector);
window.MsgSelector = MsgSelector;
}
