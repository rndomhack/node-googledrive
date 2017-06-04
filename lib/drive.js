"use strict";

const EventEmitter = require("events").EventEmitter;
const google = require("googleapis");
const GoogleAuth = require("google-auth-library");
const googleDriveFs = require("./fs");

class GooleDrive extends EventEmitter {
    constructor(options) {
        options = options || {};

        this._client = options.client || null;
        this._token = options.token || null;

        this.initialize();
    }

    initialize() {
        const googleAuth = new GoogleAuth();
        const clientId = this.client.installed.client_id;
        const clientSecret = this.client.installed.client_secret;
        const redirectUri = this.client.installed.redirect_uris[0];

        this._oAuth2 = new googleAuth.OAuth2(clientId, clientSecret, redirectUri);
        this._oAuth2.credentials = this._token || {};
        this._drive = google.drive({
            version: "v3",
            auth: this._oAuth2
        });
    }

    generateAuthUrl() {
        return this._oAuth2.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/drive"]
        });
    }

    getToken(code) {
        return new Promise((resolve, reject) => {
            this._oAuth2.getToken(code, (err, token) => {
                if (err) {
                    reject(err);
                    return;
                }

                this._token = token;
                this._oAuth2.credentials = token;

                this.emit("token", token);

                resolve(token);
            });
        });
    }

    refreshToken() {
        return new Promise((resolve, reject) => {
            this._oAuth2.refreshAccessToken((err, token) => {
                if (err) {
                    reject(err);
                    return;
                }

                this._token = token;
                this._oAuth2.credentials = token;

                this.emit("token", token);

                resolve(token);
            });
        });
    }

    checkToken() {
        if (Date.now() > this._token.expiry_date) {
            return this.refreshToken();
        }

        return Promise.resolve();
    }

    getRootFolder() {
        const folder = new googleDriveFs.Folder({
            id: "root",
            context: this
        });

        return folder.initialize().then(() => folder);
    }

    getFolder(id) {
        const folder = new googleDriveFs.Folder({
            id: id,
            context: this
        });

        return folder.initialize().then(() => folder);
    }

    getFile(id) {
        const folder = new googleDriveFs.Folder({
            id: id,
            context: this
        });

        return folder.initialize().then(() => folder);
    }
}

module.exports = GooleDrive;
