import {
    myfirebase
} from '../other/_database_settings.js';
import {
    admin
} from '../privte/firebase_conf.js'

import {
    data
} from '../schema/users.gql';

import {
    GraphQLDateTime
} from 'graphql-iso-date';


//----------------------------------------------------------//

const db = admin.firestore();

//----------------------------------------------------------//

// to avoid duplicate things ^^
function UserFetchData({
    UserFromFireBase,
    userRecord
}) {
    let country = UserFromFireBase.data().country;
    let city = UserFromFireBase.data().city;
    let a_user = {
        id: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email,
        password: userRecord.passwordHash,
        avatar: userRecord.photoURL,
        createdDate: new Date(userRecord.metadata.creationTime).toISOString(),
        lateSign: userRecord.metadata.lastSignInTime === null ? null : new Date(userRecord.metadata.lastSignInTime).toISOString(),
        country: country,
        city: city
    }
    return a_user;
}

//* **************************************************************************** */

export const typeDefs = data;

export const resolvers = {
    DateTime: GraphQLDateTime,

    Query: {
        users: async (_, {
            whereID,
            orderBy
        }) => {

            // [ OPTION 1 ]: get user by ID (return one element)
            if (whereID != undefined) {
                try {
                    let userRecord = await admin.auth().getUser(whereID);
                    // because data fron userRecord 'USER section' doesn't cotain 'country' and 'city'
                    // so we have to get them by "/users/{user_ID}" document ^^
                    let UserFromFireBase = await db.collection(myfirebase.usersRoot).doc(userRecord.uid).get();
                    let aUser = UserFetchData({
                        UserFromFireBase,
                        userRecord
                    });

                    return [aUser]; // we return list of 1 element, because of the rules in our grpahql schema.

                } catch (error) {
                    throw error;
                };
            }
            
            // [ OPTION 2 ]: (return list of element)
            if (orderBy != undefined) {
                //we have to choose one way to 'order by', so for that reason we create an Enum in graphql schema ^^
                try {
                    let UserFromFireBase = await db.collection(myfirebase.usersRoot).orderBy(orderBy).get();

                    return UserFromFireBase.docs.map(async user => {
                        let userRecord = await admin.auth().getUser(user.id);
                        return UserFetchData({
                            UserFromFireBase: user,
                            userRecord
                        });
                    })

                } catch (error) {
                    throw error;
                }
            }

            // [ OPTION 3 ]: get all users list
            try {
                // because data fron userRecord 'USER section' doesn't cotain 'country' and 'city'
                // so we have to get them by "/users/{user_ID}" document ^^
                let UserFromFireBase = await db.collection(myfirebase.usersRoot).get();

                return UserFromFireBase.docs.map(async user => {
                    let userRecord = await admin.auth().getUser(user.id);
                    return UserFetchData({
                        UserFromFireBase: user,
                        userRecord
                    });
                })

            } catch (error) {
                throw error;
            };

        }
    },
    Mutation: {
        createUser: async (_, args) => {

            // The user data to be send in 'USER' section into firetore
            let User = {};

            // Check: we add only the not-null fields (for optional fields in GraphQL)
            if (args.data.avatar != undefined)
                User.photoURL = args.data.avatar;

            // this is required fields ^^
            User.email = args.data.email;
            User.displayName = args.data.name;
            User.password = args.data.password;

            let UserRecord = {};
            try {
                UserRecord = await admin.auth().createUser(User);
            } catch (error) {
                throw error;
            }

            try {
                // the duplication of data (from User section to /users collection) is to be fine with 'order by'
                // we only duplicate the static data (created date, country, and city)
                // so now, we add this data to '/users' collection
                await db.collection(myfirebase.usersRoot).doc(UserRecord.uid).set({
                    createdDate: new Date(UserRecord.metadata.creationTime).toISOString() || "",
                    country: args.data.country || "",
                    city: args.data.city || ""
                });

                return UserRecord.uid;
            } catch (error) {
                await admin.auth().deleteUser(UserRecord.uid);
                throw error;
            }
        }
    }
}