import { type NextFunction, type Request, type Response } from "express";
const { validateCredentials, getItemsFromDb, createNewUser, addNewItemToDB, modifyTodoItemInDB, deleteTodoItem, isLoginAvailable } = require("./db.js")

/*Object contains function for handling requests from the server*/ 
const RequestHandler = {
    /**
     * Authorises the user. Checks if provided credentials are valid, 
     * if so - sets storageId which is id of the user to the session object
     */
    handleLogin: async function (request: any, response: Response) {
        try {
            request.session.regenerate(() => {
                console.log("regenrated session")
            })
            const { login, pass } = request.body;

            let storageId = await validateCredentials(login, pass)
            if (storageId) {

                request.session.storageId = storageId;
                request.session.loggedIn = true;
                response.status(201).json({ ok: true });
            } else {
                response.status(400).json({ ok: false });
            }
        } catch (err: any) {
            return response.status(500).json({ error: err.message });
        }
    },
    /**
     * Handles request for acc creation
     */
    handleRegister: async function (request: any, response: Response) {
        try {
            const { login, pass } = request.body;
            if (login && pass) {

               let isSuccess = await createNewUser(login, pass)
               if(isSuccess) {
                request.session.regenerate(() => {
                    console.log("regenerated session")
                });
                response.status(201).json({ ok: true });
               } else {
                response.status(403).json({ ok: false });
               }
               
                
            } else {
                response.status(400).json({ ok: false });
            }
        } catch (err: any) {
            console.log(err)
            return response.status(500).json({ error: err.message }).end();
        }
    },
    /**
     * Desctroys the session
     */
    handleLogout: async function (request: any, response: Response) {
        try {

            request.session.destroy((err: Error) => {
                if (err) {
                    response.status(203).json({ ok: false })
                } else {
                    response.status(203).json({ ok: true })
                }
            })

        }
        catch (err: any) {
            return response.status(500).json({ error: err.message }).end();
        }

    },
    /**
     * Returns items for authorised account based on storage id of logged in account
     */
    handelGetItems: async function (request: any, response: Response) {
        try {

            let itemsArray;
            console.log(request.session)
            if (request.session.loggedIn) {
                itemsArray = await getItemsFromDb(request.session.storageId);

            } else {
                return response.status(403).json({ error: "forbidden" })
            }
            return response.status(200).json({ items: itemsArray });

        } catch (err: any) {

            return response.status(500).json({ error: err.message });
        }
    },
    /**
     * Add item if the acc is logged in
     */
    handleAddItem: async function (request: any, response: Response) {
        try {
            let itemText = request.body.text;
            let storageId;

            if (!request.session.loggedIn) {
                return response.status(403).json({ error: "forbidden" });
            }


            if (typeof itemText === typeof "") {
                storageId = request.session.storageId;
                const itemId = await addNewItemToDB(itemText, storageId);
                return response.status(201).json({ id: itemId })
            } else {
                return response.status(400).json({ error: "Invalid input" })
            }
        } catch (err: any) {
            console.log(err)
            return response.status(500).json({ error: err.message }).end();
        }
    },
    /**
     * Edits item if accout is logged in bassed on provided index
     */
    handleEditItem: async function (request: any, response: Response) {
        try {
            let storageId;
            if (!request.session.loggedIn) {
                return response.status(403).json({ error: "forbidden" });
            }
            let modifiedItem = request.body;
            const { text, id, checked } = modifiedItem;
            if (text && id && (checked !== undefined)) {
                storageId = request.session.storageId;
                let isOk = await modifyTodoItemInDB(modifiedItem, storageId);
                return response.status(200).json(isOk);
            } else {
                return response.status(400).json({ error: "Request body is not full" });
            }

        } catch (err: any) {
            return response.status(500).json({ error: err.message }).end();
        }
    },
    /**
     * Deletes item if accout is logged in bassed on provided index
     */
    handleDeleteItem: async function (request: any, response: Response) {
        try {
            if (!request.session.loggedIn) {
                return response.status(403).json({ error: "forbidden" })
            }

            let itemId = request.body;

            if (itemId) {
                let storageId = request.session.storageId;
                let isOk = await deleteTodoItem(itemId, storageId);
                return response.status(203).json(isOk);
            } else {
                return response.status(400).json({ error: "Non valid id" });
            }

        } catch (err: any) {
            return response.status(500).json({ error: err.message }).end();
        }
    }
}
module.exports = RequestHandler;