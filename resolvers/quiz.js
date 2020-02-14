import {
    admin
} from '../private/firebase_conf.js'

import {
    data
} from '../schema/quiz.gql';

import {
    GraphQLJSONObject
} from 'graphql-type-json'

import {
    convertArrayToObject,
    isEmptyObject,
    my_secret
} from '../other/_myprop';

import {
    myfirebase
} from '../other/_database_settings.js';

import validator from 'validator' // to check isEmail isInt ect ..
import SimpleCrypto from "simple-crypto-js"; // to encrypt/decrypt IDs

import {
    my_authorizations,
    AssertAuthenticationsErrors
} from '../authentification/authentication.js';

//----------------------------------------------------------//

const db = admin.firestore();
const crypto = new SimpleCrypto(my_secret);

//----------------------------------------------------------//

export const typeDefs = data;

export const resolvers = {
    JSONObject: GraphQLJSONObject,
    // Make a relationshape between 'Quiz' and 'tests' type
    Quiz: {
        async tests(quiz) {

            console.log("............... TESTS COLLECTION ...............");
            try {
                const snap = await db
                    .collection(`${myfirebase.root}/${quiz.id}/${myfirebase.tests}`)
                    .get();
                return snap.docs.map(test => {
                    let data = test.data();
                    data.id = test.id;
                    return data;
                });
            } catch (err) {
                throw Error("OwOw ..! (from quiz/tests fecth)");
            }
        }
    },
    // Get Data
    Query: {
        // Get data Quiz from firebase
        quiz: async (parent, {
            whereID,
            limit
        }) => {

            try {
                // check the parameters
                if (whereID != undefined && limit != undefined) {
                    throw Error('cannot define both Limit and WhereID parameter!');
                }

                // get the root of firebase
                let root = db.collection(`${myfirebase.root}`);

                // **** FILTERS ****
                // if only whereID is defined
                if (whereID != undefined) {
                    let snap = await root.doc(`${whereID}`).get();
                    const checkQuiz = snap.exists;
                    console.log(checkQuiz)

                    // if quiz doesn't exist, don't do anything ;)
                    if (!checkQuiz) {
                        throw Error(`'${whereID}' ID is not exist!`);
                    }

                    let data = snap.data();
                    data.id = snap.id;
                    return [data];
                }

                // if only limit is defined
                if (limit != undefined) {
                    let snap = await root.limit(limit).get();
                    return snap.docs.map(quiz => {
                        let data = quiz.data();
                        data.id = quiz.id;
                        return data;
                    });
                }

                // if any of filters is not defined so, get ALL elemets


                let snap = await root.get();
                return snap.docs.map(quiz => {
                    let data = quiz.data();
                    data.id = quiz.id;
                    return data;
                });

            } catch (err) {
                throw Error("OwOw ..! (from quiz fecth): " + err);
            }
        },

        // Generate New ID (with a specific format) : 'quiz_{index}'
        generateID: async (_, args, context) => {
            //console.log(context.body);

            AssertAuthenticationsErrors(await context.data());

            try {
                const snap = await db
                    .collection(`${myfirebase.root}`)
                    .get();

                let id = snap.docs.map(quiz => quiz.id)[snap.docs.length - 1];

                let word = 'quiz_';
                id = parseInt(id.substring(word.length));
                let data_to_send = {};

                // if all is good, send two types of id ^^
                if (validator.isInt(`${id}`)) {
                    data_to_send.realID = `${word}${id+1}`;
                    data_to_send.encryptID = crypto.encrypt(data_to_send.realID);
                    return data_to_send;
                }
                // sort ids .. (but firebase do this by default)
                /*
                IDs = IDs.sort(function(a, b){
                    if(a.toLocaleLowerCase < b.toLocaleLowerCase) { return -1; }
                    if(a.toLocaleLowerCase > b.toLocaleLowerCase) { return 1; }
                    return 0;
                });*/

                // else if validate is fail .. just end id with lenght of data in firebase
                data_to_send.realID = `${word}${snap.docs.length+1}`;
                data_to_send.encryptID = crypto.encrypt(data_to_send.realID);
                return data_to_send;

            } catch (err) {
                throw Error("OwOw ..! (from generateId fecth)");
            }
        }
    },
    // Post, Update, Detele Data
    Mutation: {
        // Create new Quiz to firebase
        createQuiz: async (parent, args) => {

            const _quiz_Doc = args.data.id;
            const _quiz_Title = args.data.title;
            const _quiz_Is_auth = args.data.is_auth;
            const _quiz_Tests = args.data.tests;

            try {
                // point to quizzez collection (ROOT)
                const quizCollection = db.collection(`${myfirebase.root}`);
                const newQuizDocument = quizCollection.doc(_quiz_Doc);
                const checkQuiz = (await newQuizDocument.get()).exists;

                // if quiz alredy exist, don't do anything ;)
                if (checkQuiz) {
                    return {
                        status: false,
                        message: `The '${_quiz_Doc}' quiz already exist!`
                    };
                }
                // check if options array is empty or is just one item!
                for (let el of _quiz_Tests) {
                    if (el.options.length == 0) {
                        return {
                            status: false,
                            message: `No options to add! insert some options. in '${el.id}'`
                        };
                        break;
                    } else if (el.options.length == 1) {
                        return {
                            status: false,
                            message: `What man!? You're a cheater! insert at least second option. in '${el.id}'`
                        };
                        break;
                    }
                }

                // Step1: add new document quiz
                await newQuizDocument
                    .set({
                        is_auth: _quiz_Is_auth,
                        title: _quiz_Title
                    });

                // Step2: add 'tests' collection to the new quiz
                const testsCollection = newQuizDocument.collection(`${myfirebase.tests}`);
                // 'tests' is an array of elements
                _quiz_Tests.forEach(async e => {
                    await testsCollection
                        .doc(e.id)
                        .set({
                            score: e.score,
                            notes: e.notes,
                            question: e.question,
                            //save a map options format : option:{option_1:{....}, option_2:{....}}
                            options: convertArrayToObject(e.options, "id")
                        });
                });

                // Finally return status & message
                return {
                    status: true,
                    message: `The '${_quiz_Doc}' has been successfully added.`
                };
            } catch (err) {
                return {
                    status: false,
                    message: `Something is wrong! Check The Data Format from Query! ${err}`
                };
            }
        },
        // Delete existing Quiz from firebase
        deleteQuiz: async (parent, args) => {
            const _quizID = args.id;

            try {
                const quizDocument = db.collection(`${myfirebase.root}`).doc(_quizID);
                const checkQuiz = (await quizDocument.get()).exists;

                // if quiz not exist, don't do anything ;)
                if (!checkQuiz) {
                    return {
                        status: false,
                        message: `The '${_quizID}' does not exist!`
                    };
                }

                // if quiz exist, so just detele it!
                const quizTestsDocuments = await quizDocument.collection(`${myfirebase.tests}`).get();

                // first step: remove all 'tests' subcollection data
                await quizTestsDocuments.docs.forEach((e) => {
                    e.ref.delete();
                });
                // second step:remove the quiz reference
                await quizDocument.delete();
                // finally send status and message
                return {
                    status: true,
                    message: `The '${_quizID}' has been successfully removed.`
                };
            } catch (err) {
                return {
                    status: false,
                    message: `Something is wrong! Check the existence of your ID '${_quizID}' and '${myfirebase.tests}' Subcollection!`
                };
            }

        },
        // Update existing Quiz
        updateQuiz: async (parent, args) => {
            const _quizID = args.data.id;
            const _quiz_Title = args.data.title;
            const _quiz_Is_auth = args.data.is_auth;

            try {
                const quizDocument = db.collection(`${myfirebase.root}`).doc(_quizID);
                const checkQuiz = (await quizDocument.get()).exists;

                // if quiz not exist, don't do anything ;)
                if (!checkQuiz) {
                    return {
                        status: false,
                        message: `The '${_quizID}' does not exist!`
                    };
                }

                // data object to be send
                let data = {};

                // check data proprties : exist
                if (_quiz_Title !== undefined)
                    data.title = _quiz_Title;

                if (_quiz_Is_auth !== undefined)
                    data.is_auth = _quiz_Is_auth;

                // check if nothing is changed, don't do anything ;)
                if (isEmptyObject(data)) {
                    return {
                        status: true,
                        message: `Nothing is changed!`
                    };
                }

                // if all is ok
                await quizDocument.update(data);

                // finally send status and message
                return {
                    status: true,
                    message: `The '${_quizID}' has been successfully updated.`
                };

            } catch (err) {
                return {
                    status: false,
                    message: `Something is wrong! Check the existence of your ID '${_quizID}'!`
                };
            }
        },
        // Add new Test to existing Quiz
        addTest: async (parent, args) => {
            try {
                // quiz
                const quiz = db.collection(`${myfirebase.root}`).doc(args.quizID);
                const checkQuiz = (await quiz.get()).exists;
                // if quiz doesn't exist, don't do anything ;)
                if (!checkQuiz) {
                    return {
                        status: false,
                        message: `The '${args.quizID}' quiz doesn't exist!`
                    };
                }

                // Test section
                const test = quiz.collection(`${myfirebase.tests}`).doc(args.data.id);
                const checkTest = (await test.get()).exists;
                // if test already exist, don't do anything ;)
                if (checkTest) {
                    return {
                        status: false,
                        message: `The '${args.data.id}' already exist!`
                    };
                }

                // add new test 
                let data = args.data;
                // check if options array is empty or is just one item!
                if (data.options.length == 0) {
                    return {
                        status: false,
                        message: `No options to add! insert some options.`
                    };
                } else if (data.options.length == 1) {
                    return {
                        status: false,
                        message: `What man!? You're a cheater! insert at least second option.`
                    };
                }

                await test
                    .set({
                        score: data.score,
                        notes: data.notes,
                        question: data.question,
                        //save a map options format : option:{option_1:{....}, option_2:{....}}
                        options: convertArrayToObject(data.options, "id")
                    });

                // Finally return status & message
                return {
                    status: true,
                    message: `The '${args.quizID}/${data.id}' has been successfully added.`
                };

            } catch (err) {
                return {
                    status: false,
                    message: `Something is wrong! Check The Data Format from Query! ${err}`
                };
            }
        },
        // Delete Test inside existing Quiz
        deleteTest: async (parent, args) => {

            try {
                const quiz = db.collection(`${myfirebase.root}`).doc(args.quizID);
                const checkQuiz = (await quiz.get()).exists;

                // if quiz not exist, don't do anything ;)
                if (!checkQuiz) {
                    return {
                        status: false,
                        message: `The '${args.quizID}' quiz does not exist!`
                    };
                }
                // Test section
                const test = quiz.collection(`${myfirebase.tests}`).doc(args.testID);
                const checkTest = (await test.get()).exists;
                // if test doesn't exist, don't do anything ;)
                if (!checkTest) {
                    return {
                        status: false,
                        message: `The '${args.testID}' test does not exist!`
                    };
                }

                // if test exist, so just detele it!
                await test.delete();

                // finally send status and message
                return {
                    status: true,
                    message: `The '${args.quizID}/${args.testID}' has been successfully deleted.`
                };
            } catch (err) {
                return {
                    status: false,
                    message: `Something is wrong! Check the existence of your quiz ID '${args.quizID}' and '${myfirebase.tests}' Subcollection!`
                };
            }
        },
        // Update Test in existing Quiz
        updateTest: async (parent, args) => {
            try {
                const quiz = db.collection(`${myfirebase.root}`).doc(args.quizID);
                const checkQuiz = (await quiz.get()).exists;

                // if quiz not exist, don't do anything ;)
                if (!checkQuiz) {
                    return {
                        status: false,
                        message: `The '${args.quizID}' quiz does not exist!`
                    };
                }
                // Test section
                const test = quiz.collection(`${myfirebase.tests}`).doc(args.data.id);
                const checkTest = (await test.get()).exists;
                // if test not exist, don't do anything ;)
                if (!checkTest) {
                    return {
                        status: false,
                        message: `The '${args.data.id}' test does not exist!`
                    };
                }

                // data object to be send
                let data = {};

                // check data proprties exist :  {score}
                if (args.data.score !== undefined)
                    data.score = args.data.score;
                // check data proprties exist :  {notes}
                if (args.data.notes !== undefined)
                    data.notes = args.data.notes;
                // check data proprties exist :  {question}
                if (args.data.question !== undefined)
                    data.question = args.data.question;
                // check data proprties exist :  {options}
                if (args.data.options !== undefined) {
                    data.options = args.data.options;


                    // check if [options array] is empty or is just one item!
                    if (data.options.length == 0) {
                        return {
                            status: false,
                            message: `No options to add! insert some options.`
                        };
                    } else if (data.options.length == 1) {
                        return {
                            status: false,
                            message: `What man!? You're a cheater! insert at least second option.`
                        };
                    }

                    // if options array is good, then conver it to object
                    // save a map options format : option:{option_1:{....}, option_2:{....}}
                    data.options = convertArrayToObject(data.options, "id");
                }

                // check if nothing is changed, don't do anything ;)
                if (isEmptyObject(data)) {
                    return {
                        status: true,
                        message: `Nothing is changed!`
                    };
                }

                // if all is good, change data inside database :)
                await test.update(data);

                // Finally return status & message
                return {
                    status: true,
                    message: `The '${args.quizID}/${args.data.id}' has been successfully updated.`
                };

            } catch (err) {
                return {
                    status: false,
                    message: `Something is wrong! Check the existence of your quiz ID '${args.quizID}' and '${myfirebase.tests}' Subcollection!`
                };
            }
        }

    }
}