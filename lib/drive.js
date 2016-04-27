"use strict";

const fs = require("fs");
const google = require("googleapis");
const GoogleAuth = require("google-auth-library");
const googleDriveFs = require("./fs");

class GooleDrive {
    constructor(options) {
        options = options || {};

        options.settings = options.settings || {};
        this.settings = {
            oAuth2: options.settings.oAuth2 || null,
            drive: options.settings.drive || null,
            client: options.settings.client || null,
            token: options.settings.token || null,
            scopes: options.settings.scopes || ["https://www.googleapis.com/auth/drive"],
            getCode: options.settings.getCode || null
        };

        options.path = options.path || {};
        this.path = {
            client: options.path.client || null,
            token: options.path.token || null
        };
    }

    loadClient() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.path.client, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    this.settings.client = JSON.parse(data);
                } catch (err2) {
                    reject(err2);
                    return;
                }

                resolve();
            });
        });
    }

    loadToken() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.path.token, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    let token = JSON.parse(data);

                    this.settings.token = token;
                    this.settings.oAuth2.credentials = token;
                } catch (err2) {
                    reject(err2);
                    return;
                }

                resolve();
            });
        });
    }

    saveToken(token) {
        return new Promise((resolve, reject) => {
            if (this.path.token === null) {
                resolve();
                return;
            }

            try {
                fs.writeFile(this.path.token, JSON.stringify(token));
            } catch (err) {
                reject(err);
            }

            resolve();
        });
    }

    getAuthUrl() {
        return new Promise(resolve => {
            var url = this.settings.oAuth2.generateAuthUrl({
                access_type: "offline",
                scope: this.settings.scopes
            });

            resolve(url);
        });
    }

    getCode(url) {
        if (this.settings.getCode === null) {
            return new Promise((resolve, reject) => {
                console.log(`Authorize URL: ${url}`);

                var rl = require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                rl.question("Input your code: ", answer => {
                    rl.close();

                    if (answer === "") {
                        reject(new Error("Invalid answer"));
                        return;
                    }

                    resolve(answer);
                });
            });
        } else {
            return this.settings.getCode(url);
        }
    }

    getToken(code) {
        return new Promise((resolve, reject) => {
            this.settings.oAuth2.getToken(code, (err, token) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.settings.token = token;
                this.settings.oAuth2.credentials = token;

                resolve(token);
            });
        });
    }

    refreshToken() {
        return new Promise((resolve, reject) => {
            this.settings.oAuth2.refreshAccessToken((err, token) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.settings.token = token;
                this.settings.oAuth2.credentials = token;

                resolve(token);
            });
        });
    }

    checkToken() {
        return new Promise((resolve, reject) => {
            var currentDate = Date.now();
            var expiryDate = this.settings.token.expiry_date;

            if (currentDate + 60 * 1000 > expiryDate) {
                reject();
                return;
            }

            resolve();
        }).catch(() => {
            return this.refreshToken().then(token => {
                return this.saveToken(token);
            });
        });
    }

    authorize() {
        var installed = this.settings.client.installed;
        var googleAuth = new GoogleAuth();

        this.settings.oAuth2 = new googleAuth.OAuth2(installed.client_id, installed.client_secret, installed.redirect_uris[0]);
        this.settings.drive = google.drive({ version: "v3", auth: this.settings.oAuth2 });

        return this.loadToken().catch(() => {
            return this.getAuthUrl().then(url => {
                return this.getCode(url);
            }).then(code => {
                return this.getToken(code);
            }).then(token => {
                return this.saveToken(token);
            });
        });
    }

    getRootFolder() {
        var folder = new googleDriveFs.Folder({
            id: "root",
            context: this
        });

        return folder.initialize().then(() => folder);
    }

    getFolder(id) {
        var folder = new googleDriveFs.Folder({
            id: id,
            context: this
        });

        return folder.initialize().then(() => folder);
    }

    getFile(id) {
        var folder = new googleDriveFs.Folder({
            id: id,
            context: this
        });

        return folder.initialize().then(() => folder);
    }
}

module.exports = GooleDrive;
