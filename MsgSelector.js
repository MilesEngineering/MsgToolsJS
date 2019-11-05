if (typeof MsgSelector !== "undefined") {
    console.log('MsgSelector already loaded')
} else {

function createChildElement(parent, childName) {
    child = document.createElement(childName);
    parent.appendChild(child);
    return child;
}

class MsgSelector extends HTMLElement {
    constructor() {
        super();
        this.filter = this.hasAttribute('filter') ? this.getAttribute('filter') : '';
        this.shadow = this.attachShadow({mode: 'open'});
        this.handler = this.getAttribute('handler');
        // list of dropdowns to navigate message hierarchy
        this.dropdowns = [];
        msgtools.DelayedInit.add(this);
    }
    init() {
        this.createDropDownList(0, msgtools.msgs);
        // check if there's an attribute for selection default 'selection'
        // if it exists, then load that, otherwise start from top of dropdown
        if(this.hasAttribute('selection' || this.getAttribute('selection') != "")) {
            const initialSelection = this.getAttribute('selection');
            const initialSelections = initialSelection.split('.');
            for(let i = 0; i < initialSelections.length; i ++){
                this.dropdowns[i].value = initialSelections[i];
                // force component to load the msg fields
                this.dropdowns[i].dispatchEvent(new Event('change'));
            }
        }
    }
    createDropDownList(depth, msgtree) {
        var dropdown = createChildElement(this.shadow, 'select');
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
                //console.log("  adding option " + name);
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
            //TODO Do I need to remove the element from the document, or just from it's parent?
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
        if(this.handler != undefined) {
            let div = createChildElement(this.shadow, 'div');
            let htmlStr = '<'+this.handler+" showMsgName=true msgName='"+msgclass.prototype.MSG_NAME+"'></"+this.handler+'>';
            div.innerHTML = htmlStr;
            this.dropdowns.push(div);

            console.log('handleMsgCLick ' + this.handler);
            console.log('handleMsgCLick ' + msgclass.prototype.MSG_NAME);

            var event = new CustomEvent('settingsChanged', {
                settings: this.currentSettings()
            })
            this.dispatchEvent(event);
        }
    }

    currentSettings(){
        // look inside the div and get handler object, and then call currentSettings()
        // on it

        var handlerObj = this.shadowRoot.querySelector('div > *');
        console.log(handlerObj.currentSettings());
    }
}

customElements.define('msgtools-msgselector', MsgSelector);
}
