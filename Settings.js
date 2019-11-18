function createChildElement(parent, childName) {
    child = document.createElement(childName);
    parent.appendChild(child);
    return child;
}

// UI settings for multiple filenames
class SettingsMenu extends HTMLElement {
    constructor(defaultFileChoice, getFileChoices) {
        super();
        
        this.shadow = this.attachShadow({mode: 'open'});
        
        // currently selected settings
        this.settingsName = undefined;
        
        // save button
        this.saveButton = createChildElement(this.shadow, 'button');
        this.saveButton.textContent = 'Save';
        this.saveButton.onclick = this.saveSettings.bind(this);
        
        // callback to get list of file choices
        this.getFileChoices = getFileChoices;

        // add a way to pick a filename from a list of filenames
        this.chooseSettingsDropdown = createChildElement(this.shadow, 'select');
        this.chooseSettingsDropdown.onchange = this.chooseSettings.bind(this);
        this.processSettingsChoices(defaultFileChoice);
    };
    saveSettings() {
        var event = new CustomEvent('save', {
            detail: this.settingsName
        });
        this.dispatchEvent(event);
    }
    stateClean(clean) {
        this.saveButton.disabled = clean;
    }
    chooseSettings() {
        this.settingsName = this.chooseSettingsDropdown.value;
        var event = new CustomEvent('load', {
            detail: this.settingsName
        });
        this.dispatchEvent(event);
    }
    processSettingsChoices(defaultFileChoice) {
        function flatten(elem, prefix) {
            var elem_name = elem.name;
            if(prefix != undefined) {
                elem_name = prefix + "." + elem_name;
            }
            if(elem.entries == undefined) {
                return elem_name;
            }
            var ret = [];
            for(var i=0; i<elem.entries.length; i++) {
                var f = flatten(elem.entries[i], elem_name);
                if(typeof(f) == "string") {
                    ret.push(f);
                } else {
                    for(var j=0; j<f.length; j++)  {
                        ret.push(f[j]);
                    }
                }
            }
            return ret;
        }
        let fileChoices = flatten(this.getFileChoices());
        for(var i=0; i<fileChoices.length; i++) {
            let option = createChildElement(this.chooseSettingsDropdown, 'option');
            option.textContent = fileChoices[i];
        }
        this.chooseSettingsDropdown.value = defaultFileChoice;
        this.chooseSettings();
    }
}

customElements.define('msgtools-settingsmenu', SettingsMenu);
