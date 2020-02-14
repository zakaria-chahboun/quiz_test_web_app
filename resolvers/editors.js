import {
    admin
} from '../private/firebase_conf.js'

import {
    data
} from '../schema/editors.gql';

import {
    myfirebase
} from '../other/_database_settings.js';

import {
    isEmptyObject
} from '../other/_myprop.js';

//----------------------------------------------------------//

const db = admin.firestore();

//----------------------------------------------------------//

/*
FOR NOW
    We do not store anything in Firesore Collections
    Because all data we want for Editors/Admins is stored in USER section of firebase
    such as name, photoUrl, email, UID, password, roles (custum claims), etc 
    BUT!! we want to create a "/editors" collection for an important reason:
        Feching Editors quickly and Fetching Only the Editors!
            Because USER section in firebase has all users types (admins/editors/users)

    - ZAKI

    Becuase of all editors is just a few persons, we don't need any complex queries to get them!
    Such as use paginations or anything like this ..
*/

export const typeDefs = data;

export const resolvers = {
    Query: {
        editors: async (_, args, context) => {
            let editor = {
                isAdmin: false
            }; // by default

            try {
                let UserFromFireBase = await db.collection(myfirebase.editorsRoot).get();

                return UserFromFireBase.docs.map(async user => {
                    let userRecord = await admin.auth().getUser(user.id);

                    editor.id = userRecord.uid;
                    editor.name = userRecord.displayName;
                    editor.email = userRecord.email;
                    editor.password = userRecord.passwordHash;
                    if (userRecord.customClaims && userRecord.customClaims.isAdmin === true) {
                        editor.isAdmin = true;
                    }
                    return editor;
                })
            } catch (error) {
                throw error;
            }
        }
    },
    Mutation: {
        // Create Editor
        addEditor: async (_, args, context) => {
            let user;
            try {
                // Add user to USER section in firebase
                console.log("************* USER *************");

                let userR = await admin.auth().createUser({
                    displayName: args.data.name,
                    email: args.data.email,
                    password: args.data.password,
                });

                console.log("************* CLAIMS *************");
                // Add custom claims to the user (roles) :)
                await admin.auth().setCustomUserClaims(userR.uid, {
                    isAdmin: args.data.isAdmin,
                    isEditor: true,
                });

                user = userR;

            } catch (error) {
                throw error;
            }

            try {
                // Finaly Add this user to firstore "/editors" collection
                console.log("************* COLLCTIONS *************");
                await db.collection(myfirebase.editorsRoot).doc(user.uid).set({
                    createdDate: new Date(user.metadata.creationTime).toISOString() || "" //just to set a thing into this doc :)
                });

                return user.uid;
            } catch (error) {
                // just in case user created in USER section only and not in /editors collection!
                await admin.auth().deleteUser(user.uid);
                throw error;
            }
        },

        // Delete Editor
        deleteEditor: async (_, args, context) => {
            try {
                await db.collection(myfirebase.editorsRoot).doc(args.id).delete()
                await admin.auth().deleteUser(args.id);
                return {
                    status: true,
                    message: `Editor '${args.id}' has been successfully deleted.`
                }
            } catch (error) {
                return {
                    status: false,
                    message: `Cannot Remove this editor: ${error}`
                }
            }
        },

        // Update Ediror
        updateEditor: async (_, args, context) => {
            // check data
            let data = {};
            let isAdmin = false;

            if (args.data.name)
                data.displayName = args.data.name;
            if (args.data.password)
                data.password = args.data.password;
            if (args.data.email)
                data.email = args.data.email;
            if (args.data.isAdmin)
                isAdmin = args.data.isAdmin;

            // if nothing is changed - return
            if (isEmptyObject(data)) {
                return {
                    status: true,
                    message: "Nothing is changed!"
                }
            }


            try {
                await admin.auth().updateUser(args.id, data);
                await admin.auth().setCustomUserClaims(args.id, {
                    isAdmin
                });

                return {
                    status: true,
                    message: `Editor '${args.id}' has been successfully updated.`
                }
            } catch (error) {
                return {
                    status: false,
                    message: `cannot update '${args.id}'! or it doesn't exist at all!`
                }
            }
        }
    }
}