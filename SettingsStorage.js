class SettingsStorage {
    constructor(rootpath="http://127.0.0.1:8000/", configPath='html/configs/') {
        this.configPath = configPath;
        this.webdavfs = WebDAV.Fs(rootpath)
    }
    save(filename, contents) {
        var webdavfile = this.webdavfs.file(this.configPath+filename);
        return webdavfile.write(contents); //, callback);
    }
    load(filename) {
        var webdavfile = this.webdavfs.file(this.configPath+filename);
        let ret = webdavfile.read();// callback);
        if(ret.includes('<title>404 Not Found</title>')){
            return undefined;
        }
        return ret;
    }
    rm(filename) {
        var webdavfile = this.webdavfs.file(this.configPath+filename);
        return webdavfile.rm();// callback);
    }
    list(path='') {
        var children = [];
        // should use a callback for this!  browser prints a warning otherwise:
        // Synchronous XMLHttpRequest on the main thread is deprecated because of its detrimental effects to the end user's experience. For more help http://xhr.spec.whatwg.org/
        // not sure how to make the callback work, though!  Maybe trigger the dir listing in our constructor,
        // have the callback store info to member variable, then have this function return the member variable?
        // need to retrigger the dir listing sometimes though, and when's a good time for that?  by the time the
        // user clicks the dropdown list, they want to make a choice from what they see, not have it refresh
        // out from under them as they are clicking.
        // maybe make a dialog box that a 'select config' button opens, and have that show a hourglass
        // until it's done, and *then* they can make a choice?
        // or maybe just leave it synchronous for ever, and show an hourglass right before we make the request and clear it when request completes?
        var addToListCallback = function() {
            console.log('callback');
            for(var i=0; i<arguments.length; i++) {
                console.log(' arg['+i+"] = ")
                console.log(arguments[i][0]);
                children.push(arguments[i][0]);
            }
        }
        var dir = this.webdavfs.dir(this.configPath + path);
        children = dir.children();/*addToListCallback*/;
        var files = [];
        var subdirs = [];
        for(var i=0; i<children.length; i++) {
            var child = children[i];
            if(child.type == 'file') {
                if(!child.name.startsWith('.')) {
                    files.push({name: child.name});
                }
            } else if (child.type == 'dir') {
                subdirs.push(this.list(child.name));
            }
        }
        return {name: path, entries: files.concat(subdirs)};
    }
    create(name) {
    }
}
