"use strict";

const http = require("http");
const https = require("https");
const stream = require("stream");
const URL = require("url").URL;

const defaultFields = [
    "kind",
    "id",
    "name",
    "mimeType",
    "description",
    "starred",
    "trashed",
    "explicitlyTrashed",
    "trashingUser",
    "trashedTime",
    "parents",
    "properties",
    "appProperties",
    "spaces",
    "version",
    "webContentLink",
    "webViewLink",
    "iconLink",
    "hasThumbnail",
    "thumbnailLink",
    "thumbnailVersion",
    "viewedByMe",
    "viewedByMeTime",
    "createdTime",
    "modifiedTime",
    "modifiedByMeTime",
    "modifiedByMe",
    "sharedWithMeTime",
    "sharingUser",
    "owners",
    "teamDriveId",
    "lastModifyingUser",
    "shared",
    "ownedByMe",
    "capabilities",
    "viewersCanCopyContent",
    "writersCanShare",
    "hasAugmentedPermissions",
    "folderColorRgb",
    "originalFilename",
    "fullFileExtension",
    "fileExtension",
    "md5Checksum",
    "size",
    "quotaBytesUsed",
    "headRevisionId",
    "contentHints",
    "imageMediaMetadata",
    "videoMediaMetadata",
    "isAppAuthorized"
].join(",");

class GoogleDriveItem {
    constructor({context, resource = {}, id, name, mimeType}) {
        if (id !== void 0) {
            resource.id = id;
        }

        if (name !== void 0) {
            resource.name = name;
        }

        if (mimeType !== void 0) {
            resource.mimeType = mimeType;
        }

        this._context = context;
        this._resource = resource;
    }

    get context() {
        return this._context;
    }

    get resource() {
        return this._resource;
    }

    get id() {
        return this._resource.id;
    }

    get name() {
        return this._resource.name;
    }

    get mimeType() {
        return this._resource.mimeType;
    }

    get starred() {
        return this._resource.starred;
    }

    get trashed() {
        return this._resource.trashed;
    }

    get capabilities() {
        return this._resource.capabilities;
    }

    get viewedByMeTime() {
        return this._resource.viewedByMe ? Date.parse(this._resource.viewedByMeTime) : -1;
    }

    get createdTime() {
        return Date.parse(this._resource.createdTime);
    }

    get modifiedTime() {
        return Date.parse(this._resource.modifiedTime);
    }

    get modifiedByMeTime() {
        return this._resource.modifiedByMe ? Date.parse(this._resource.modifiedByMeTime) : -1;
    }

    get isFolder() {
        return this._resource.mimeType === "application/vnd.google-apps.folder";
    }

    get size() {
        return this._resource.hasOwnProperty("size") ? this._resource.size : 0;
    }

    get md5Checksum() {
        return this._resource.md5Checksum;
    }

    toFile() {
        return new GoogleDriveFile({
            context: this._context,
            resource: this._resource
        });
    }

    toFolder() {
        return new GoogleDriveFolder({
            context: this._context,
            resource: this._resource
        });
    }

    async get({params = {}} = {}) {
        for (const key of ["acknowledgeAbuse", "supportsTeamDrives", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                params[key] = this._context._params[key];
            }
        }

        params.fileId = this._resource.id;

        if (!params.hasOwnProperty("fields")) {
            params.fields = defaultFields;
        }

        const res = await this._context._drive.files.get(params);

        this._resource = res.data;
    }

    async create({params = {}, resource = {}, id, name, mimeType, body} = {}) {
        for (const key of ["ignoreDefaultVisibility", "keepRevisionForever", "ocrLanguage", "supportsTeamDrives", "useContentAsIndexableText", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                params[key] = this._context._params[key];
            }
        }

        if (id !== void 0) {
            resource.id = id;
        }

        if (name !== void 0) {
            resource.name = name;
        }

        if (mimeType !== void 0) {
            resource.mimeType = mimeType;
        }

        if (!params.hasOwnProperty("fields")) {
            params.fields = defaultFields;
        }

        params.resource = Object.assign({}, this._resource, resource);

        if (body !== void 0) {
            params.media = {};

            if (resource.hasOwnProperty("mimeType")) {
                params.media.mimeType = resource.mimeType;
            } else if (this._resource.hasOwnProperty("mimeType")) {
                params.media.mimeType = this._resource.mimeType;
            }

            params.media.body = body;
        }

        const res = await this._context._drive.files.create(params);

        this._resource = res.data;
    }

    async delete({params = {}} = {}) {
        for (const key of ["supportsTeamDrives", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                params[key] = this._context._params[key];
            }
        }

        params.fileId = this._resource.id;

        await this._context._drive.files.delete(params);

        delete this._resource.id;
    }

    async update({params = {}, resource = {}, id, name, mimeType, body} = {}) {
        for (const key of ["addParents", "keepRevisionForever", "ocrLanguage", "removeParents", "supportsTeamDrives", "useContentAsIndexableText", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                params[key] = this._context._params[key];
            }
        }

        if (id !== void 0) {
            resource.id = id;
        }

        if (name !== void 0) {
            resource.name = name;
        }

        if (mimeType !== void 0) {
            resource.mimeType = mimeType;
        }

        params.fileId = this._resource.id;

        if (!params.hasOwnProperty("fields")) {
            params.fields = defaultFields;
        }

        params.resource = resource;

        if (body !== void 0) {
            params.media = {};

            if (resource.hasOwnProperty("mimeType")) {
                params.media.mimeType = resource.mimeType;
            } else if (this._resource.hasOwnProperty("mimeType")) {
                params.media.mimeType = this._resource.mimeType;
            }

            params.media.body = body;
        }

        const res = await this._context._drive.files.update(params);

        this._resource = res.data;
    }

    async trash({params = {}} = {}) {
        const resource = {
            trashed: true
        };

        await this.update({ params, resource });
    }

    async untrash({params = {}} = {}) {
        const resource = {
            trashed: false
        };

        await this.update({ params, resource });
    }

    async star({params = {}} = {}) {
        const resource = {
            starred: true
        };

        await this.update({ params, resource });
    }

    async unstar({params = {}} = {}) {
        const resource = {
            starred: false
        };

        await this.update({ params, resource });
    }

    async getParents({params = {}} = {}) {
        const folders = [];

        for (const parent of this._resource.parents) {
            const folder = new GoogleDriveFolder({
                context: this._context,
                id: parent
            });

            await folder.get(params);

            folders.push(folder);
        }

        return folders;
    }
}

class GoogleDriveFile extends GoogleDriveItem {
    constructor(options) {
        super(options);
    }

    async copy({params = {}, resource = {}, id, name, mimeType} = {}) {
        for (const key of ["ignoreDefaultVisibility", "keepRevisionForever", "ocrLanguage", "supportsTeamDrives", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                params[key] = this._context._params[key];
            }
        }

        if (id !== void 0) {
            resource.id = id;
        }

        if (name !== void 0) {
            resource.name = name;
        }

        if (mimeType !== void 0) {
            resource.mimeType = mimeType;
        }

        params.fileId = this._resource.id;

        if (!params.hasOwnProperty("fields")) {
            params.fields = defaultFields;
        }

        params.resource = resource;

        const res = await this._context._drive.files.copy(params);

        const file = new GoogleDriveFile({
            context: this._context,
            resource: res.data
        });

        return file;
    }

    async _resumableUpload({uri, method, params = {}, resource = {}, id, name, mimeType, contentLength, readableCallback} = {}) {
        if (id !== void 0) {
            resource.id = id;
        }

        if (name !== void 0) {
            resource.name = name;
        }

        if (mimeType !== void 0) {
            resource.mimeType = mimeType;
        }

        params.uploadType = "resumable";

        if (!params.hasOwnProperty("fields")) {
            params.fields = defaultFields;
        }

        resource = Object.assign({}, this._resource, resource);

        const url = new URL(uri);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const sessionUri = await new Promise((resolve, reject) => {
            const opt = {
                host: url.host,
                path: `${url.pathname}${url.search}`,
                method: method,
                headers: {
                    Authorization: `${this._context._oauth2.credentials.token_type} ${this._context._oauth2.credentials.access_token}`,
                    "Content-Type": "application/json; charset=UTF-8"
                }
            };

            if (resource.hasOwnProperty("mimeType")) {
                opt.headers["X-Upload-Content-Type"] = resource.mimeType;
            } else if (this._resource.hasOwnProperty("mimeType")) {
                opt.headers["X-Upload-Content-Type"] = this._resource.mimeType;
            }

            opt.headers["X-Upload-Content-Length"] = contentLength;

            const req = https.request(opt, res => {
                req.on("close", () => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`));
                        return;
                    }

                    const locationKey = Object.keys(res.headers).find(key => key.toLowerCase() === "location");

                    if (locationKey === void 0) {
                        reject(new Error("Can't find location"));
                    }

                    resolve(res.headers[locationKey]);
                });
            });

            req.on("error", err => {
                reject(err);
            });

            req.write(JSON.stringify(resource));

            req.end();
        });

        const sessionUrl = new URL(sessionUri);

        for (;;) {
            const position = await new Promise((resolve, reject) => {
                const opt = {
                    host: sessionUrl.host,
                    path: `${sessionUrl.pathname}${sessionUrl.search}`,
                    method: "PUT",
                    headers: {
                        "Content-Length": "0",
                        "Content-Range": `bytes */${contentLength}`
                    }
                };

                const req = https.request(opt, res => {
                    let json = "";

                    res.setEncoding("utf8");

                    res.on("data", data => {
                        json += data;
                    });

                    res.on("end", () => {
                        switch (res.statusCode) {
                            case 200:
                            case 201: {
                                try {
                                    this._resource = JSON.parse(json);
                                } catch (err) {
                                    reject(err);
                                    break;
                                }

                                resolve(-1);
                                break;
                            }

                            case 308: {
                                const rangeKey = Object.keys(res.headers).find(key => key.toLowerCase() === "range");

                                if (rangeKey === void 0) {
                                    resolve(0);
                                } else {
                                    resolve(Number.parseInt(res.headers[rangeKey].split("-")[1], 10) + 1);
                                }

                                break;
                            }

                            case 404: {
                                reject(new Error("Session has expired"));
                                break;
                            }

                            default: {
                                reject(new Error(`${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`));
                            }
                        }
                    });
                });

                req.on("error", err => {
                    reject(err);
                });

                req.end();
            });

            if (position === -1) {
                break;
            }

            const readable = await readableCallback(position);

            if (!(readable instanceof stream.Stream)) {
                throw new Error("Readable is not stream");
            }

            const uploaded = await new Promise((resolve, reject) => {
                const opt = {
                    host: sessionUrl.host,
                    path: `${sessionUrl.pathname}${sessionUrl.search}`,
                    method: "PUT",
                    headers: {
                        "Content-Length": contentLength - position,
                        "Content-Range": `bytes ${position}-${contentLength - 1}/${contentLength}`
                    }
                };

                let resolved = false;

                const req = https.request(opt, res => {
                    let json = "";

                    res.setEncoding("utf8");

                    res.on("data", data => {
                        json += data;
                    });

                    res.on("end", () => {
                        if (resolved) return;

                        resolved = true;

                        readable.unpipe(req);
                        readable.emit("readableUnpipe");

                        switch (res.statusCode) {
                            case 200:
                            case 201: {
                                try {
                                    this._resource = JSON.parse(json);
                                } catch (err) {
                                    reject(err);
                                    break;
                                }

                                resolve(true);
                                break;
                            }

                            case 403: {
                                reject(new Error("Rate limit exceeded"));
                                break;
                            }

                            case 404: {
                                reject(new Error("Session has expired"));
                                break;
                            }

                            case 500:
                            case 502:
                            case 503:
                            case 504: {
                                resolve(false);
                                break;
                            }

                            default: {
                                reject(new Error(`${res.statusCode} ${http.STATUS_CODES[res.statusCode]}`));
                            }
                        }
                    });
                });

                req.once("error", () => {
                    if (resolved) return;

                    resolved = true;

                    readable.unpipe(req);
                    readable.emit("readableUnpipe");
                    req.abort();

                    resolve(false);
                });

                readable.once("readableAbort", () => {
                    if (resolved) return;

                    resolved = true;

                    readable.unpipe(req);
                    readable.emit("readableUnpipe");
                    req.abort();

                    reject(new Error("Abort upload"));
                });

                readable.pipe(req);
                readable.emit("readablePipe");
            });

            if (uploaded) {
                break;
            }
        }
    }

    async resumableCreate(options = {}) {
        options.params = options.params || {};

        for (const key of ["ignoreDefaultVisibility", "keepRevisionForever", "ocrLanguage", "supportsTeamDrives", "useContentAsIndexableText", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                options.params[key] = this._context._params[key];
            }
        }

        options.uri = "https://www.googleapis.com/upload/drive/v3/files";
        options.method = "POST";

        await this._resumableUpload(options);
    }

    async resumableUpdate(options = {}) {
        options.params = options.params || {};

        for (const key of ["addParents", "keepRevisionForever", "ocrLanguage", "removeParents", "supportsTeamDrives", "useContentAsIndexableText", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                options.params[key] = this._context._params[key];
            }
        }

        options.uri = `https://www.googleapis.com/upload/drive/v3/files/${this._resource.id}`;
        options.method = "PATCH";

        await this._resumableUpload(options);
    }

    async download({params = {}} = {}) {
        params.fileId = this._resource.id;
        params.alt = "media";

        const res = this._context._drive.files.get(params);

        return res;
    }
}

class GoogleDriveFolder extends GoogleDriveItem {
    constructor(options) {
        super(options);
    }

    async create(options = {}) {
        options.mimeType = "application/vnd.google-apps.folder";

        delete options.body;

        await super.create(options);
    }

    async update(options = {}) {
        options.mimeType = "application/vnd.google-apps.folder";

        delete options.body;

        await super.update(options);
    }

    async getChildren({params = {}, query} = {}) {
        for (const key of ["corpora", "corpus", "includeTeamDriveItems", "orderBy", "pageSize", "pageToken", "q", "spaces", "supportsTeamDrives", "teamDriveId", "alt", "fields", "prettyPrint", "quotaUser", "userIp"]) {
            if (this._context._params.hasOwnProperty(key)) {
                params[key] = this._context._params[key];
            }
        }

        if (query === void 0) {
            params.q = `'${this._resource.id}' in parents`;
        } else {
            params.q = `(${query}) and '${this._resource.id}' in parents`;
        }

        if (params.hasOwnProperty("fields")) {
            params.fields = `kind,nextPageToken,files(${params.fields}),incompleteSearch`;
        } else {
            params.fields = `kind,nextPageToken,files(${defaultFields}),incompleteSearch`;
        }

        const items = [];

        for (;;) {
            const res = await this._context._drive.files.list(params);

            for (const file of res.data.files) {
                const item = new GoogleDriveItem({
                    context: this._context,
                    resource: file
                });

                if (item.isFolder) {
                    items.push(item.toFolder());
                } else {
                    items.push(item.toFile());
                }
            }

            if (res.data.hasOwnProperty("nextPageToken")) {
                params.pageToken = res.data.nextPageToken;
            } else {
                break;
            }
        }

        return items;
    }

    async getChildFiles(options = {}) {
        const items = await this.getChildren(options);
        const files = items.filter(item => !item.isFolder);

        return files;
    }

    async getChildFolders(options = {}) {
        const items = await this.getChildren(options);
        const folders = items.filter(item => item.isFolder);

        return folders;
    }

    createChildFile(options = {}) {
        options.context = this._context;

        if (!options.hasOwnProperty("resource")) {
            options.resource = {};
        }

        if (!options.resource.hasOwnProperty("parents")) {
            options.resource.parents = [];
        }

        options.resource.parents.push(this._resource.id);

        const file = new GoogleDriveFile(options);

        return file;
    }

    createChildFolder(options = {}) {
        options.context = this._context;

        if (!options.hasOwnProperty("resource")) {
            options.resource = {};
        }

        if (!options.resource.hasOwnProperty("parents")) {
            options.resource.parents = [];
        }

        options.resource.parents.push(this._resource.id);

        const folder = new GoogleDriveFolder(options);

        return folder;
    }
}

module.exports = {
    Item: GoogleDriveItem,
    File: GoogleDriveFile,
    Folder: GoogleDriveFolder
};
