"use strict";

const path = require("path");
const stream = require("stream");
const url = require("url");
const https = require("https");

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

    update(readable) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.update({
                    media: {
                        body: readable
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
                        parents: [this.id]
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
                        parents: [this.id]
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

    uploadFile(name, mimeType, readable) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                this.context.settings.drive.files.create({
                    resource: {
                        name: name,
                        mimeType: mimeType,
                        parents: [this.id]
                    },
                    media: {
                        mimeType: mimeType,
                        body: readable
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

    uploadFileResumable(name, mimeType, contentLength, readableCallback) {
        return this.context.checkToken().then(() => {
            return new Promise((resolve, reject) => {
                var opt = {
                    host: "www.googleapis.com",
                    path: "/upload/drive/v3/files?uploadType=resumable",
                    method: "POST",
                    headers: {
                        Authorization: `${this.context.settings.token.token_type} ${this.context.settings.token.access_token}`,
                        "Content-Type": "application/json",
                        "X-Upload-Content-Type": mimeType,
                        "X-Upload-Content-Length": contentLength
                    }
                };

                var req = https.request(opt, res => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Status code is ${res.statusCode}`));
                        return;
                    }

                    resolve(res.headers.location);
                });

                req.on("error", err => {
                    reject(err);
                });

                req.write(JSON.stringify({
                    name: name,
                    parents: [this.id]
                }));

                req.end();
            }).then(sessionUri => {
                return new Promise((resolve, reject) => {
                    var promise = Promise.resolve();

                    var upload = () => {
                        promise = promise.then(() => {
                            return new Promise((resolve2, reject2) => {
                                var opt = {
                                    host: url.parse(sessionUri).host,
                                    path: url.parse(sessionUri).path,
                                    method: "PUT",
                                    headers: {
                                        "Content-Length": "0",
                                        "Content-Range": `bytes */${contentLength}`
                                    }
                                };

                                var req = https.request(opt, res => {
                                    if (res.statusCode === 200) {
                                        resolve();
                                        reject2();
                                        return;
                                    }
                                    if (res.statusCode === 308) {
                                        var rangeKey = Object.keys(res.headers).find(key => key.toLowerCase() === "range");
                                        if (rangeKey === void 0) {
                                            resolve2(0);
                                        } else {
                                            resolve2(Number.parseInt(res.headers[rangeKey].split("-")[1], 10) + 1);
                                        }
                                        return;
                                    }

                                    reject(new Error(`Status code is ${res.statusCode}`));
                                    reject2();
                                });

                                req.on("error", err => {
                                    reject(err);
                                    reject2();
                                });

                                req.end();
                            });
                        }).then(position => {
                            return Promise.all([Promise.resolve(position), readableCallback(position)]);
                        }).then(arg => {
                            return new Promise((resolve2, reject2) => {
                                var position = arg[0];
                                var readable = arg[1];

                                if (!(readable instanceof stream.Stream)) {
                                    reject(new Error("Readable is not stream"));
                                    reject2();
                                    return;
                                }

                                var opt = {
                                    host: url.parse(sessionUri).host,
                                    path: url.parse(sessionUri).path,
                                    method: "PUT",
                                    headers: {
                                        "Content-Length": contentLength - position,
                                        "Content-Range": `bytes ${position}-${contentLength - 1}/${contentLength}`,
                                        "Content-Type": mimeType
                                    }
                                };

                                var req = https.request(opt, res => {
                                    if (res.statusCode !== 200) {
                                        upload();
                                        resolve2();
                                        return;
                                    }

                                    resolve();
                                    reject2();
                                });

                                req.on("error", () => {
                                    upload();
                                    resolve2();
                                });

                                readable.on("abort", () => {
                                    readable.unpipe(req);
                                    req.end();
                                    req.abort();

                                    reject(new Error("Abort upload"));
                                    reject2();
                                });

                                readable.pipe(req);
                            });
                        });
                    };

                    upload();
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
                        pageToken: pageToken,
                        q: `${query ? `${query} and ` : ""}'${this.id}' in parents`,
                        fields: "files,kind,nextPageToken"
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
