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
const { MongoClient, ObjectId } = require("mongodb");
const mongoDBuri = "mongodb+srv://arturshmaida:vkH3h7iO5SWO2xvd@cluster0.bnawpzq.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "todo_api";
const USER_COLLECTION_NAME = "users";
const ITEM_COLLECTION_NAME = "items";
const client = new MongoClient(mongoDBuri);
const DB = {
    /**
     * Checks if provided credentials combination exists in database
     * @returns userId if such record exists, otherwise returns undefined
     */
    validateCredentials: function (login, pass) {
        return __awaiter(this, void 0, void 0, function* () {
            let userId = undefined;
            if (login && pass) {
                yield client.connect();
                const userCollection = client.db(DB_NAME).collection(USER_COLLECTION_NAME);
                try {
                    const user = yield userCollection.findOne({ login: login });
                    console.log("Data base search success");
                    if (user !== null && user.pass === pass) {
                        userId = user._id;
                    }
                }
                catch (err) {
                    console.error(`Something went wrong trying to find the user by creadentials: ${err}\n`);
                }
                finally {
                    yield client.close();
                }
            }
            return userId;
        });
    },
    /**
     * Adds new account to the user base
     */
    createNewUser: function (login, pass) {
        return __awaiter(this, void 0, void 0, function* () {
            yield client.connect();
            const userCollection = client.db(DB_NAME).collection(USER_COLLECTION_NAME);
            const newUser = {
                login: login,
                pass: pass
            };
            try {
                yield userCollection.insertOne(newUser);
                console.log(`User was inserted`);
            }
            catch (err) {
                console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
            }
            yield client.close();
        });
    },
    /**
     * @returns all items asociated with provided user id
     */
    getItemsFromDb: function (userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield client.connect();
            const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);
            let itemsArray = [];
            try {
                let cursor = yield itemsCollection.find({ userId: userId });
                itemsArray = yield cursor.toArray();
                console.log(`Items were retreaved`);
            }
            catch (err) {
                console.error(`Something went wrong trying to retreaving items from db: ${err}\n`);
            }
            finally {
                yield client.close();
            }
            return itemsArray;
        });
    },
    /**
   * Adds new item to the database, assigns to the item unique id: string
   */
    addNewItemToDB: function (inputText, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield client.connect();
            const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);
            let newId = new ObjectId().toString();
            const newItem = {
                text: inputText,
                checked: false,
                id: newId,
                userId: userId
            };
            try {
                yield itemsCollection.insertOne(newItem);
                console.log(`Item were added`);
            }
            catch (err) {
                console.error(`Something went wrong trying to retreaving items from db: ${err}\n`);
            }
            finally {
                yield client.close();
            }
            return newId;
        });
    },
    /**
   * Checks if user with certain user id can modify data, with certain id provided
   * If this id belongs to user - modifies it, if not - not
   */
    modifyTodoItemInDB: function (modifiedItem, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield client.connect();
            const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);
            let isSuccess = {
                ok: false,
            };
            const update = {
                $set: {
                    text: modifiedItem.text,
                    checked: modifiedItem.checked,
                    modified: true,
                },
            };
            try {
                let isAuth = yield hasAuth(userId, { id: modifiedItem.id }, itemsCollection);
                if (isAuth) {
                    yield itemsCollection.updateOne({ id: modifiedItem.id }, update, { upsert: true });
                    console.log(`Item was updated in database`);
                    isSuccess.ok = true;
                }
            }
            catch (err) {
                console.error(`Something went wrong trying to update item in db: ${err}\n`);
            }
            finally {
                yield client.close();
            }
            return isSuccess;
        });
    },
    /**
    * Checks if user with certain userId can delete data, with certain itemId provided
    * If this itemId belongs to user - deletes it, if not - not
    */
    deleteTodoItem: function (inputItemId, storageId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield client.connect();
            const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);
            let isSuccess = {
                ok: false,
            };
            let query = { id: inputItemId.id };
            try {
                // check if logged account has access to this item
                if (yield hasAuth(storageId, inputItemId, itemsCollection)) {
                    yield itemsCollection.deleteOne(query);
                    console.log(`Item was deleted from database`);
                    isSuccess.ok = true;
                }
            }
            catch (err) {
                console.error(`Something went wrong trying to delete item from db: ${err}\n`);
            }
            finally {
                yield client.close();
            }
            return isSuccess;
        });
    }
};
/**
 * Method for checking if certain item with certain id, belongs to user with certain userId
 *
 * @param db - connected instance of mongoDB
 * @returns seeekable item or null if item is not found
 */
function hasAuth(userId, itemId, db) {
    return __awaiter(this, void 0, void 0, function* () {
        const cursor = yield db.find({ userId: userId });
        const itemsArray = yield cursor.toArray();
        console.log("has author");
        console.log(itemsArray);
        let targetItem = itemsArray.find((item) => {
            if (item.id == itemId.id) {
                return true;
            }
        });
        return targetItem;
    });
}
module.exports = DB;
