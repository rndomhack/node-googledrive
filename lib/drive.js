"use strict";

const EventEmitter = require("events");

const {google} = require("googleapis");

const googleDriveFs = require("./fs");

class GoogleDrive extends EventEmitter {
    constructor({client, token = {}, params = {}}) {
        super();

        this._oauth2 = new google.auth.OAuth2(
            client.installed.client_id,
            client.installed.client_secret,
            client.installed.redirect_uris[0]
        );

        Object.defineProperty(this._oauth2, "credentials", {
            get: () => {
                return token;
            },
            set: value => {
                token = value;

                this.emit("token", value);
            }
        });

        this._drive = google.drive({
            version: "v3",
            auth: this._oauth2
        });

        this._params = params;
    }

    generateAuthUrl() {
        return this._oauth2.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/drive"]
        });
    }

    async getToken(code) {
        const res = await this._oauth2.getToken(code);

        this._oauth2.setCredentials(res.tokens);

        return res.tokens;
    }

    async getFileById(id, params = {}) {
        const file = new googleDriveFs.File({
            context: this,
            id: id
        });

        await file.get(params);

        return file;
    }

    async getFolderById(id, params = {}) {
        const folder = new googleDriveFs.Folder({
            context: this,
            id: id
        });

        await folder.get(params);

        return folder;
    }

    createFile(options = {}) {
        options.context = this;

        const file = new googleDriveFs.File(options);

        return file;
    }

    createFolder(options = {}) {
        options.context = this;

        const folder = new googleDriveFs.Folder(options);

        return folder;
    }
}

module.exports = GoogleDrive;
