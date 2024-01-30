"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { validateCredentials, getItemsFromDb, createNewUser, addNewItemToDB, modifyTodoItemInDB, deleteTodoItem } = require("./db.js");
/*Object contains function for handling requests from the server*/
const RequestHandler = {
    /**
     * Authorises the user. Checks if provided credentials are valid,
     * if so - sets storageId which is id of the user to the session object
     */
    handleLogin: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                request.session.regenerate(() => {
                    console.log("regenrated session");
                });
                const { login, pass } = request.body;
                let storageId = yield validateCredentials(login, pass);
                if (storageId) {
                    request.session.storageId = storageId;
                    request.session.loggedIn = true;
                    response.status(201).json({ ok: true });
                }
                else {
                    response.status(400).json({ ok: false });
                }
            }
            catch (err) {
                return response.status(500).json({ error: err.message });
            }
        });
    },
    /**
     * Handles request for acc creation
     */
    handleRegister: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { login, pass } = request.body;
                if (login && pass) {
                    yield createNewUser(login, pass);
                    request.session.regenerate(() => {
                        console.log("regenerated session");
                    });
                    response.status(201).json({ ok: true });
                }
                else {
                    response.status(400).json({ ok: false });
                }
            }
            catch (err) {
                console.log(err);
                return response.status(500).json({ error: err.message }).end();
            }
        });
    },
    /**
     * Desctroys the session
     */
    handleLogout: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                request.session.destroy((err) => {
                    if (err) {
                        response.status(203).json({ ok: false });
                    }
                    else {
                        response.status(203).json({ ok: true });
                    }
                });
            }
            catch (err) {
                return response.status(500).json({ error: err.message }).end();
            }
        });
    },
    /**
     * Returns items for authorised account based on storage id of logged in account
     */
    handelGetItems: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let itemsArray;
                console.log(request.session);
                if (request.session.loggedIn) {
                    itemsArray = yield getItemsFromDb(request.session.storageId);
                }
                else {
                    return response.status(403).json({ error: "forbidden" });
                }
                return response.status(200).json({ items: itemsArray });
            }
            catch (err) {
                return response.status(500).json({ error: err.message });
            }
        });
    },
    /**
     * Add item if the acc is logged in
     */
    handleAddItem: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let itemText = request.body.text;
                let storageId;
                if (!request.session.loggedIn) {
                    return response.status(403).json({ error: "forbidden" });
                }
                if (typeof itemText === typeof "") {
                    storageId = request.session.storageId;
                    const itemId = yield addNewItemToDB(itemText, storageId);
                    return response.status(201).json({ id: itemId });
                }
                else {
                    return response.status(400).json({ error: "Invalid input" });
                }
            }
            catch (err) {
                console.log(err);
                return response.status(500).json({ error: err.message }).end();
            }
        });
    },
    /**
     * Edits item if accout is logged in bassed on provided index
     */
    handleEditItem: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let storageId;
                if (!request.session.loggedIn) {
                    return response.status(403).json({ error: "forbidden" });
                }
                let modifiedItem = request.body;
                const { text, id, checked } = modifiedItem;
                if (text && id && (checked !== undefined)) {
                    storageId = request.session.storageId;
                    let isOk = yield modifyTodoItemInDB(modifiedItem, storageId);
                    return response.status(200).json(isOk);
                }
                else {
                    return response.status(400).json({ error: "Request body is not full" });
                }
            }
            catch (err) {
                return response.status(500).json({ error: err.message }).end();
            }
        });
    },
    /**
     * Deletes item if accout is logged in bassed on provided index
     */
    handleDeleteItem: function (request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!request.session.loggedIn) {
                    return response.status(403).json({ error: "forbidden" });
                }
                let itemId = request.body;
                if (itemId) {
                    let storageId = request.session.storageId;
                    let isOk = yield deleteTodoItem(itemId, storageId);
                    return response.status(203).json(isOk);
                }
                else {
                    return response.status(400).json({ error: "Non valid id" });
                }
            }
            catch (err) {
                return response.status(500).json({ error: err.message }).end();
            }
        });
    }
};
module.exports = RequestHandler;
