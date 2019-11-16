if (typeof MsgSelector !== "undefined") {
    console.log('MsgSelector already loaded')
} else {

function createChildElement(parent, childName) {
    child = document.createElement(childName);
    parent.appendChild(child);
    return child;
}

let headerStyle = `font-size: var(--base-font-size, 18px);
                     margin: var(--input-margin, 0 15px 15px 0);
                     border-color: var(--color-text, black);
                     height: var(--input-height, 35px);
                    `;

class MsgSelector extends HTMLElement {
    constructor(handlerClass, selection, filter, settings) {
        super();
        if (filter !== undefined) {
            this.filter = filter;
        } else {
            this.filter = this.hasAttribute('filter') ? this.getAttribute('filter') : '';
        }

        let msgSelectorStyle = `display: var(--msg-selector-display, block);
                               `;

        this.setAttribute('style', msgSelectorStyle);

        this.shadow = this.attachShadow({mode: 'open'});
        this.parentDiv = createChildElement(this.shadow, 'div');
        this.parentDiv.style = 'display: flex; flex-flow: column; height: 100%;';
        this.headerRow = createChildElement(this.parentDiv, 'div');
        this.headerRow.style = 'flex: 0 1 auto;';
        this.msgLabel = createChildElement(this.headerRow, 'span');
        this.msgLabel.setAttribute('style', headerStyle);
        this.msgLabel.style.display = "none";
        this.msgLabelEditBox = createChildElement(this.headerRow, 'input');
        this.msgLabelEditBox.setAttribute('style', headerStyle);
        this.msgLabelEditBox.onchange = this.msgLabelChanged.bind(this);
        
        if (handlerClass !== undefined) {
            this.handler = handlerClass;
        } else {
            this.handler = this.getAttribute('handler');
        }
        if (selection !== undefined) {
            this.selection = selection;
        } else {
            this.selection = this.getAttribute('selection');
        }
        if (settings !== undefined) {
            this.settings = settings;
        } else {
            this.settings = {};
        }
        // list of dropdowns to navigate message hierarchy
        this.dropdowns = [];
        this.handlerObj = undefined;
        msgtools.DelayedInit.add(this);
    }

    init() {
        // ToDo: instead of creating dropdown list and then modifying them with
        // a value and an event, add a perameter to createDropDownList() to take
        // a pre-selected value, if it exists, and then dispatch an event to force
        // the widget to load its contents

        this.createDropDownList(0, msgtools.msgs);
        // check if there's an attribute for selection default 'selection'
        // if it exists, then load that, otherwise start from top of dropdown
        if(this.selection != undefined) {
            const initialSelections = this.selection.split('.');
            for(let i = 0; i < initialSelections.length; i ++){
                this.dropdowns[i].value = initialSelections[i];
                // force component to load the msg fields
                this.dropdowns[i].dispatchEvent(new Event('change'));
            }
        }
        if('msgLabel' in this.settings) {
            this.msgLabelEditBox.value = this.settings.msgLabel;
            this.msgLabel.textContent = this.settings.msgLabel;
            
            // this is ugly, but force a settingsChanged() here, because
            // we need to have the setting for msgLabel be re-done
            // *after* we set the text in the edit box.  The act of creating
            // the handler object already triggers a settingsChanged(),
            // because it does it for the new selection, and it has the
            // WRONG msgLabel because it happens before we set it
            // just above.  We do want the user making a new selection
            // to normally update the setting, because when they change
            // the selection, it needs to reinit it to the message name.
            this.settingsChanged();
        }
    }

    createDropDownList(depth, msgtree) {

        let dropdownStyle = headerStyle + `
                             min-width: var(--input-width, 100px);
                             background: var(--background-color, white);
                             `;

        let dropdown = createChildElement(this.headerRow, 'select');
        dropdown.setAttribute('style', dropdownStyle);
        dropdown.depth = depth;
        dropdown.onchange = this.ondropdownchange.bind(this);
        let newDropdownCount = 0;
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
                //option.setAttribute('value', name);
                option.textContent = name;
                newDropdownCount++;
            }
        }
        this.dropdowns.push(dropdown);
        if(newDropdownCount > -1) {
            this.itemSelectionChanged(depth);
        }
    }
    ondropdownchange(e) {
        e.stopPropagation();
        let dropdown = e.target;
        let depth = dropdown.depth;
        this.itemSelectionChanged(depth);
    }
    itemSelectionChanged(depth) {
        let node = msgtools.msgs;
        for(let i=0; i<=depth; i++) {
            let dropdownvalue = this.dropdowns[i].value;
            node = node[dropdownvalue];
        }
        // throw away everything after the dropdown that just had something selected
        while(this.dropdowns.length > depth+1) {
            let item = this.dropdowns.pop();
            if(this.headerRow.contains(item)){
                this.headerRow.removeChild(item);
            }
            if(this.parentDiv.contains(item)){
                this.parentDiv.removeChild(item);
            }
        }
        // create a new thing after us: either another dropdown, or a message
        if(node.prototype != undefined) {
            this.handleMsgClick(node);
        } else {
            this.createDropDownList(depth+1, node);
        }
    }
    handleMsgClick(msgclass) {
        this.msgLabelEditBox.value = msgclass.prototype.MSG_NAME;
        this.msgLabel.textContent = msgclass.prototype.MSG_NAME;
        let msgSectionStyle = `flex: 1 1 auto; border:
                               padding: var(--selector-display-padding, 0);
                               `;
        if(this.handler != undefined) {
            let div = createChildElement(this.parentDiv, 'div');

            let htmlStr = '<'+this.handler+" showMsgName=false msgName='"+msgclass.prototype.MSG_NAME+"'></"+this.handler+'>';
            div.innerHTML = htmlStr;
            div.style = msgSectionStyle;
            this.dropdowns.push(div);
            this.handlerObj = div.firstElementChild;
            // not sure why this is necessary, but without it, plots see their parent's
            // getBoundingClientRect() as 150 pixels tall.
            this.handlerObj.resize();
            this.handlerObj.updateSettings(this.settings);
            this.handlerObj.addEventListener('settingsChanged', this.settingsChanged.bind(this));

            this.settingsChanged();
        }
    }
    
    settingsChanged() {
        var settings = this.currentSettings();
        //console.log(settings);
        // used to dispatch an event that includes the user's current choice
        var event = new CustomEvent('settingsChanged', {
            detail: settings
        })
        this.dispatchEvent(event);
    }

    currentSettings(){
        var settings = {msgLabel : this.msgLabelEditBox.value };
        if(this.handlerObj != undefined) {
            settings = {...this.handlerObj.currentSettings(), ...settings};
        }
        console.log(settings);
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
    }
    
    msgLabelChanged() {
        this.msgLabel.textContent = this.msgLabelEditBox.value;
        this.settingsChanged();
    }
}

customElements.define('msgtools-msgselector', MsgSelector);
window.MsgSelector = MsgSelector;
}
