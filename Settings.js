// UI settings for multiple filenames
class SettingsGui extends HTMLElement {
    constructor(defaultFileChoice, getFileChoices) {
        super();
        // currently selected settings
        this.settingsName = undefined;

        // save button
        this.saveButton = document.createElement('button');
        this.saveButton.classList = 'btn btn-save btn-primary';
        this.saveButton.textContent = 'Save';
        this.saveButton.onclick = this.saveSettings.bind(this);

        // callback to get list of file choices
        this.getFileChoices = getFileChoices;

        // add a way to pick a filename from a list of filenames
        this.chooseSettingsDropdown = document.createElement('select');
        this.chooseSettingsDropdown.classList = 'config-select';
        this.chooseSettingsDropdown.onchange = this.chooseSettings.bind(this);
        this.processSettingsChoices(defaultFileChoice);

        // save as button and text entry
        this.newFilename = document.createElement('input');
        this.newFilename.classList = 'input-save-as';

        this.saveAsButton = document.createElement('button');
        this.saveAsButton.textContent = 'Save new config';
        this.saveAsButton.classList = 'btn btn-save-as btn-primary';
        this.saveAsButton.onclick = this.newSettings.bind(this);

        // delete button
        this.deleteButton = document.createElement('button');
        this.deleteButton.classList = 'btn btn-delete btn-warning';
        this.deleteButton.textContent = 'Delete config';
        this.deleteButton.onclick = this.deleteSettings.bind(this);

        this.currentConfigHeader = document.createElement('span');
        this.currentConfigHeader.textContent = this.settingsName;

    };
    saveSettings() {
        var event = new CustomEvent('save', {
            detail: this.settingsName
        });
        this.dispatchEvent(event);
    }
    deleteSettings() {
        var event = new CustomEvent('delete', {
            detail: this.settingsName
        });
        this.dispatchEvent(event);
    }
    newSettings() {
        var event = new CustomEvent('save', {
            detail: this.newFilename.value
        });
        this.dispatchEvent(event);
        var event = new CustomEvent('load', {
            detail: this.newFilename.value
        });
        if(event.detail == ""){
            alert('You must enter a name to save a configuration')
        } else {
            this.dispatchEvent(event);
        }
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
            if(prefix != undefined && prefix != "") {
                elem_name = prefix + "/" + elem_name;
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

customElements.define('msgtools-settingsgui', SettingsGui);
