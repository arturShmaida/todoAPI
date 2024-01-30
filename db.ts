const { MongoClient, ObjectId } = require("mongodb");
const mongoDBuri = "mongodb+srv://arturshmaida:vkH3h7iO5SWO2xvd@cluster0.bnawpzq.mongodb.net/?retryWrites=true&w=majority";
const DB_NAME = "todo_api";
const USER_COLLECTION_NAME = "users";
const ITEM_COLLECTION_NAME = "items";

type Item = { id: string, text: string, checked: boolean };

const client = new MongoClient(mongoDBuri);

const DB = {
    /**
     * Checks if provided credentials combination exists in database
     * @returns userId if such record exists, otherwise returns undefined
     */
    validateCredentials: async function (login: string, pass: string) {
        let userId = undefined;
        if (login && pass) {
            await client.connect();
            const userCollection = client.db(DB_NAME).collection(USER_COLLECTION_NAME);

            try {
                const user = await userCollection.findOne({ login: login });
                console.log("Data base search success")
                if (user !== null && user.pass === pass) {
                    userId = user._id;
                }

            } catch (err: any) {
                console.error(`Something went wrong trying to find the user by creadentials: ${err}\n`);
            }
            finally {
                await client.close();
            }

        }
        return userId;
    },
    /**
     * Adds new account to the user base
     */
    createNewUser: async function (login: string, pass: string) {
        await client.connect();
        const userCollection = client.db(DB_NAME).collection(USER_COLLECTION_NAME);

        const newUser = {
            login: login,
            pass: pass
        }
        try {
            await userCollection.insertOne(newUser);
            console.log(`User was inserted`)

        } catch (err: any) {
            console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
        }
        await client.close();
    },
    /**
     * @returns all items asociated with provided user id
     */
    getItemsFromDb: async function (userId: string) {
        await client.connect();

        const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);
        let itemsArray = [];
        try {
            let cursor = await itemsCollection.find({ userId: userId })
            itemsArray = await cursor.toArray();
            console.log(`Items were retreaved`);
        } catch (err: any) {
            console.error(`Something went wrong trying to retreaving items from db: ${err}\n`);
        }
        finally {
            await client.close();
        }
        return itemsArray;
    },
      /**
     * Adds new item to the database, assigns to the item unique id: string
     */
    addNewItemToDB: async function (inputText: string, userId: string) {
        await client.connect();
        const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);
        let newId = new ObjectId().toString();
        const newItem = {
            text: inputText,
            checked: false,
            id: newId,
            userId: userId
        }
        try {
            await itemsCollection.insertOne(newItem)
            console.log(`Item were added`)
        } catch (err: any) {
            console.error(`Something went wrong trying to retreaving items from db: ${err}\n`);
        }
        finally {
            await client.close();
        }

        return newId;
    },
      /**
     * Checks if user with certain user id can modify data, with certain id provided
     * If this id belongs to user - modifies it, if not - not
     */
    modifyTodoItemInDB: async function (modifiedItem: Item, userId: string) {
        await client.connect();
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
        }

        try {
            let isAuth = await hasAuth(userId, { id: modifiedItem.id }, itemsCollection)
            if (isAuth) {
                await itemsCollection.updateOne({ id: modifiedItem.id }, update, { upsert: true })
                console.log(`Item was updated in database`)
                isSuccess.ok = true;
            }

        } catch (err: any) {
            console.error(`Something went wrong trying to update item in db: ${err}\n`);
        }
        finally {
            await client.close();
        }
        return isSuccess;
    },
     /**
     * Checks if user with certain userId can delete data, with certain itemId provided
     * If this itemId belongs to user - deletes it, if not - not
     */
    deleteTodoItem: async function (inputItemId: { id: string }, storageId: string) {
        await client.connect();
        const itemsCollection = client.db(DB_NAME).collection(ITEM_COLLECTION_NAME);

        let isSuccess = {
            ok: false,
        };

        let query = { id: inputItemId.id };
        try {
            // check if logged account has access to this item

            if (await hasAuth(storageId, inputItemId, itemsCollection)) {
                await itemsCollection.deleteOne(query)
                console.log(`Item was deleted from database`)
                isSuccess.ok = true;
            }
        } catch (err: any) {
            console.error(`Something went wrong trying to delete item from db: ${err}\n`);
        }
        finally {
            await client.close();
        }
        return isSuccess;
    }

}
/**
 * Method for checking if certain item with certain id, belongs to user with certain userId
 * 
 * @param db - connected instance of mongoDB 
 * @returns seeekable item or null if item is not found
 */
async function hasAuth(userId: string, itemId: { id: string }, db: any) {
    const cursor = await db.find({ userId: userId });
    const itemsArray = await cursor.toArray();
    console.log("has author")
    console.log(itemsArray)

    let targetItem = itemsArray.find((item: { id: string }) => {
        if (item.id == itemId.id) {
            return true;
        }
    })
    return targetItem;
}

module.exports = DB;