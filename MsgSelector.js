if (typeof MsgSelector !== "undefined") {
    console.log('MsgSelector already loaded')
} else {

function createChildElement(parent, childName) {
    child = document.createElement(childName);
    parent.appendChild(child);
    return child;
}

class MsgSelector extends HTMLElement {
    constructor(handlerClass = undefined, selection = undefined, filter = undefined) {
        super();
        if (filter !== undefined) {
            this.filter = filter;
        } else {
            this.filter = this.hasAttribute('filter') ? this.getAttribute('filter') : '';
        }

        let msgSelectorStyle = `margin-top: var(--msg-selector-margin-top, 20px);
                                display: var(--msg-selector-display, block);
                               `;

        this.setAttribute('style', msgSelectorStyle);

        this.shadow = this.attachShadow({mode: 'open'});
        if (handler !== undefined) {
            this.handler = handler;
        } else {
            this.handler = this.getAttribute('handler');
        }
        if (selection !== undefined) {
            this.selection = selection;
        } else {
            this.selection = this.getAttribute('selection');
        }
        // list of dropdowns to navigate message hierarchy
        this.dropdowns = [];
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
                console.log(this.dropdowns);
                this.dropdowns[i].value = initialSelections[i];
                // force component to load the msg fields
                this.dropdowns[i].dispatchEvent(new Event('change'));
            }
        }
    }

    createDropDownList(depth, msgtree) {

        let dropdownStyle = `font-size: var(--base-font-size, 18px);
                             margin: var(--input-margin, 0 15px 30px 0);
                             min-width: var(--input-width, 100px);
                             background: var(--background-color, white);
                             border-color: var(--color-text, black);
                             height: var(--input-height, 35px);
                            `;

        let dropdown = createChildElement(this.shadow, 'select');
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
            this.shadow.removeChild(item);
            //TODO Do I need to remove the element from the document, or just from its parent?
            //document.removeElement(item);
        }
        // create a new thing after us: either another dropdown, or a message
        if(node.prototype != undefined) {
            this.handleMsgClick(node);
        } else {
            this.createDropDownList(depth+1, node);
        }
    }
    handleMsgClick(msgclass) {
        let msgSectionStyle = `display: block;
                               padding: var(--selector-display-padding, 0);
                               width: var(--selector-display-width, 100%);
                              `;
        if(this.handler != undefined) {
            let div = createChildElement(this.shadow, 'div');

            let htmlStr = '<'+this.handler+" showMsgName=true msgName='"+msgclass.prototype.MSG_NAME+"'></"+this.handler+'>';
            div.innerHTML = htmlStr;
            div.setAttribute('style', msgSectionStyle);
            this.dropdowns.push(div);

            // used to dispatch an event that includes the user's current choice
            var event = new CustomEvent('settingsChanged', {
                detail: this.currentSettings()
            })
            this.dispatchEvent(event);
        }
    }

    currentSettings(){
        // look inside the div to see what the selection was and return the string
        var handlerObj = this.shadowRoot.querySelector('div > *');
        return handlerObj.currentSettings();
    }
}

customElements.define('msgtools-msgselector', MsgSelector);
window.MsgSelector = MsgSelector;
}
