"use strict";

const path = require("path");

class GoogleDriveFs {
    constructor(options) {
        this.id = options.id;
        this.context = options.context;
        this.property = options.property || null;
    }

    initialize() {
        if (this.property === null) {
            return this.context.checkToken().then(() => {
                return new Promise((resolve, reject) => {
                    this.context.settings.drive.files.get({
                        fileId: this.id
                    }, (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        this.property = res;

                        resolve();
                    });
                });
            });
        } else {
            return Promise.resolve();
        }
    }

    toFile() {
        return new GoogleDriveFile({
            id: this.id,
            context: this.context,
            property: this.property
        });
    }

    toFolder() {
        return new GoogleDriveFolder({
            id: this.id,
            context: this.context,
            property: this.property
        });
    }

    parents() {
        var promise = Promise.resolve();
        var items = [];

        this.property.parents.forEach(parent => {
            promise = promise.then(() => {
                var folder = new GoogleDriveFolder({
                    id: parent.id,
                    context: this.context
                });

                return folder.initialize().then(() => {
                    items.push(folder);

                    return;
                });
            });
        });

        promise = promise.then(() => {
            return items;
        });

        return promise;
    }

    copy(name) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.copy({
                    fileId: this.id,
                    resource: {
                        name: name
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    var item = new GoogleDriveFs({
                        id: res.id,
                        context: this.context,
                        property: res
                    });

                    resolve(item.isFolder ? item.toFolder() : item.toFile());
                });
            });
        });
    }

    delete() {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.delete({
                    fileId: this.id
                }, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        });
    }

    get isFolder() {
        return this.property.mimeType === "application/vnd.google-apps.folder";
    }

    get name() {
        return this.property.name;
    }

    get base() {
        return path.basename(this.property.name, path.extname(this.property.name));
    }

    get ext() {
        return path.extname(this.property.name);
    }
}

class GoogleDriveFile extends GoogleDriveFs {
    constructor(options) {
        super(options);
    }

    update(stream) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.update({
                    media: {
                        body: stream
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    this.property = res;

                    resolve();
                });
            });
        });
    }

    download() {
        return this.context.checkToken().then(() => {
            return new Promise(resolve => {
                resolve(this.context.settings.drive.files.get({
                    fileId: this.id,
                    alt: "media"
                }));
            });
        });
    }
}

class GoogleDriveFolder extends GoogleDriveFs {
    constructor(options) {
        super(options);
    }

    createFolder(name) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.create({
                    resource: {
                        name: name,
                        mimeType: "application/vnd.google-apps.folder",
                        parents: [{id: this.id}]
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    var folder = new GoogleDriveFolder({
                        id: res.id,
                        context: this.context,
                        property: res
                    });

                    resolve(folder);
                });
            });
        });
    }

    createFile(name, mimeType) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.create({
                    resource: {
                        name: name,
                        mimeType: mimeType,
                        parents: [{id: this.id}]
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    var file = new GoogleDriveFile({
                        id: res.id,
                        context: this.context,
                        property: res
                    });

                    resolve(file);
                });
            });
        });
    }

    uploadFile(name, mimeType, stream) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.create({
                    resource: {
                        name: name,
                        mimeType: mimeType,
                        parents: [{id: this.id}]
                    },
                    media: {
                        mimeType: mimeType,
                        body: stream
                    }
                }, (err, res) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    var file = new GoogleDriveFile({
                        id: res.id,
                        context: this.context,
                        property: res
                    });

                    resolve(file);
                });
            });
        });
    }

    children(query) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                var children = [];
                var getChildren;

                (getChildren = pageToken => {
                    this.context.settings.drive.files.list({
                        folderId: this.id,
                        pageToken: pageToken,
                        q: query ? `${query} and 'parent_id' in parents` : ""
                    }, (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        children = children.concat(res.files);

                        if (res.hasOwnProperty("nextPageToken")) {
                            getChildren(res.nextPageToken);
                        } else {
                            resolve(children);
                        }
                    });
                })();
            });
        }).then(children => {
            var promise = Promise.resolve();
            var items = [];

            children.forEach(child => {
                promise = promise.then(() => {
                    var item = new GoogleDriveFs({
                        id: child.id,
                        context: this.context,
                        property: child
                    });

                    return item.initialize().then(() => {
                        items.push(item.isFolder ? item.toFolder() : item.toFile());

                        return;
                    });
                });
            });

            promise = promise.then(() => {
                return items;
            });

            return promise;
        });
    }

    childFiles(query) {
        return this.children(query).then(children => {
            return children.filter(child => {
                return !child.isFolder;
            });
        });
    }

    childFolders(query) {
        return this.children(query).then(children => {
            return children.filter(child => {
                return child.isFolder;
            });
        });
    }
}

module.exports = {
    File: GoogleDriveFile,
    Folder: GoogleDriveFolder
};
