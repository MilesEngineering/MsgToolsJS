// a version of settings storage that uses browser local storage.
// not that useful except as a demonstration, because the settings
// can't be shared between multiple PCs (or even two different
// browsers on the same PC, like firefox and chrome).
class SettingsStorage {
    constructor() {
    }
    save(filename, contents) {
        localStorage.setItem( 'savedState.'+filename, contents );
        console.log(contents);
    }
    load(filename) {
        const contents = localStorage.getItem( 'savedState.'+filename );
        console.log(contents);
        return contents;
    }
    rm(filename) {
        localStorage.deleteItem( 'savedState.'+filename );
    }
    list(path='') {
        var ret = {entries:[]};
        for ( var i = 0, len = localStorage.length; i < len; ++i ) {
            const key = localStorage.key(i);
            if(key.startsWith('savedState.')) {
                const filename = key.replace("savedState.", "");
                ret.entries.push({name: filename});
            }
        }
        return ret;
    }
    create(name) {
    }
}
